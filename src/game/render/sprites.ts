import { Assets, Spritesheet, type SpritesheetData, type Texture } from 'pixi.js';
import type { AbilityPose } from '../abilities/types';

/**
 * 도트 리소스(F12) 로더. Aseprite에서 "JSON Array" 또는 "JSON Hash"로, 태그를 붙여 내보낸 시트를 그대로 읽는다.
 * 사양: docs/sprite-spec.md. 파일이 없거나 형식이 틀리면 null → 회색 상자로 그린다.
 */

export class SpriteFormatError extends Error {
  override name = 'SpriteFormatError';
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, where: string): number => {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new SpriteFormatError(`${where}: 숫자가 아닙니다.`);
  return v;
};

/** Aseprite JSON(배열·해시, frameTags)을 PixiJS 스프라이트시트 데이터(해시 + animations)로 바꾼다. */
export function asepriteToPixi(raw: unknown): SpritesheetData {
  if (!isRec(raw) || !isRec(raw.meta))
    throw new SpriteFormatError('스프라이트 JSON: meta가 없습니다.');
  const list: [string, Rec][] = Array.isArray(raw.frames)
    ? raw.frames.map((f, i): [string, Rec] => {
        if (!isRec(f)) throw new SpriteFormatError(`frames[${i}]: 객체가 아닙니다.`);
        return [typeof f.filename === 'string' ? f.filename : `frame ${i}`, f];
      })
    : isRec(raw.frames)
      ? Object.entries(raw.frames).map(([k, f]): [string, Rec] => {
          if (!isRec(f)) throw new SpriteFormatError(`frames.${k}: 객체가 아닙니다.`);
          return [k, f];
        })
      : [];
  if (list.length === 0) throw new SpriteFormatError('스프라이트 JSON: 프레임이 없습니다.');

  const frames: SpritesheetData['frames'] = {};
  const names: string[] = [];
  for (const [name, f] of list) {
    if (!isRec(f.frame)) throw new SpriteFormatError(`${name}: frame이 없습니다.`);
    frames[name] = {
      frame: {
        x: num(f.frame.x, `${name}.x`),
        y: num(f.frame.y, `${name}.y`),
        w: num(f.frame.w, `${name}.w`),
        h: num(f.frame.h, `${name}.h`),
      },
    };
    names.push(name);
  }

  const animations: Record<string, string[]> = {};
  const tags = Array.isArray(raw.meta.frameTags) ? raw.meta.frameTags : [];
  for (const t of tags) {
    if (!isRec(t) || typeof t.name !== 'string') continue;
    const from = num(t.from, `tag ${t.name}.from`);
    const to = num(t.to, `tag ${t.name}.to`);
    animations[t.name] = names.slice(from, to + 1);
  }
  return { frames, animations, meta: { scale: 1 } };
}

export interface SpriteSet {
  hero: Record<string, Texture[]>;
  enemy: Record<string, Texture[]>;
  coin: Record<string, Texture[]>;
}

/** 꼭 있어야 하는 태그. 하나라도 없으면 그 시트는 쓰지 않는다. */
export const REQUIRED_TAGS = {
  hero: [
    'idle',
    'walk',
    'jump',
    'fall',
    'climb',
    'float',
    'break',
    'sleep',
    'dance',
    'skid',
    'hurt',
  ],
  enemy: ['walk'],
  coin: ['spin'],
} as const;

async function loadSheet(name: keyof SpriteSet): Promise<Record<string, Texture[]>> {
  const res = await fetch(`/sprites/${name}.json`);
  if (!res.ok) throw new SpriteFormatError(`${name}.json: ${res.status}`);
  const data = asepriteToPixi(await res.json());
  const texture = await Assets.load<Texture>(`/sprites/${name}.png`);
  texture.source.scaleMode = 'nearest'; // 도트가 번지지 않게
  const sheet = new Spritesheet(texture, data);
  await sheet.parse();
  const missing = REQUIRED_TAGS[name].filter((t) => !sheet.animations[t]?.length);
  if (missing.length) throw new SpriteFormatError(`${name}: 태그 없음 ${missing.join(', ')}`);
  return sheet.animations;
}

/** 세 시트를 모두 불러오면 SpriteSet, 하나라도 실패하면 null(회색 상자로 그린다). */
export async function loadSprites(): Promise<SpriteSet | null> {
  try {
    const [hero, enemy, coin] = await Promise.all([
      loadSheet('hero'),
      loadSheet('enemy'),
      loadSheet('coin'),
    ]);
    return { hero, enemy, coin };
  } catch (e) {
    console.warn('도트 리소스를 쓰지 않고 회색 상자로 그립니다:', e);
    return null;
  }
}

/** 능력 자세·물리 상태 → 주인공 애니메이션 태그. 능력 자세가 먼저다(오답 동작이 잘 보이게). */
export function heroAnimation(s: {
  pose: AbilityPose;
  onGround: boolean;
  vx: number;
  vy: number;
  hurt: boolean;
}): string {
  if (s.hurt) return 'hurt';
  if (s.pose === 'skid') return 'skid';
  if (s.pose !== 'none') return s.pose;
  if (!s.onGround) return s.vy < 0 ? 'jump' : 'fall';
  return Math.abs(s.vx) > 5 ? 'walk' : 'idle';
}

/** 프레임 번호: 게임 진행 시간을 1/60초 단위로 센 값으로 정한다(별도 타이머 없이 결정적, 화면 주사율과 무관). */
export function frameIndex(frame: number, count: number, framesPerImage = 9): number {
  return count === 0 ? 0 : Math.floor(frame / framesPerImage) % count;
}
