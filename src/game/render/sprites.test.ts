import { describe, expect, it } from 'vitest';
import heroRaw from '../../../public/sprites/hero.json?raw';
import {
  asepriteToPixi,
  frameIndex,
  heroAnimation,
  REQUIRED_TAGS,
  SpriteFormatError,
} from './sprites';

describe('F12 도트 리소스 로더', () => {
  it('Aseprite JSON Array + frameTags를 애니메이션으로 바꾼다', () => {
    const data = asepriteToPixi(JSON.parse(heroRaw));
    const anims = data.animations ?? {};
    for (const tag of REQUIRED_TAGS.hero) expect(anims[tag]?.length).toBeGreaterThan(0);
    expect(anims.walk).toHaveLength(4);
    const first = anims.idle?.[0] ?? '';
    expect(data.frames[first]?.frame).toEqual({ x: 0, y: 0, w: 16, h: 16 });
  });

  it('JSON Hash 형식도 읽는다', () => {
    const data = asepriteToPixi({
      frames: {
        'a 0': { frame: { x: 0, y: 0, w: 8, h: 8 } },
        'a 1': { frame: { x: 8, y: 0, w: 8, h: 8 } },
      },
      meta: { frameTags: [{ name: 'spin', from: 0, to: 1 }] },
    });
    expect(data.animations?.spin).toEqual(['a 0', 'a 1']);
  });

  it('형식이 틀리면 알기 쉬운 오류', () => {
    expect(() => asepriteToPixi({ frames: [] })).toThrow(SpriteFormatError);
    expect(() => asepriteToPixi({ frames: [{ frame: { x: 'a' } }], meta: {} })).toThrow(/숫자/);
  });
});

describe('F12 주인공 애니메이션 고르기', () => {
  const base = { pose: 'none', onGround: true, vx: 0, vy: 0, hurt: false } as const;
  it.each([
    [{ ...base }, 'idle'],
    [{ ...base, vx: 90 }, 'walk'],
    [{ ...base, onGround: false, vy: -100 }, 'jump'],
    [{ ...base, onGround: false, vy: 100 }, 'fall'],
    [{ ...base, pose: 'climb', onGround: false }, 'climb'],
    [{ ...base, pose: 'sleep' }, 'sleep'],
    [{ ...base, pose: 'skid', vx: 0 }, 'skid'],
    [{ ...base, hurt: true, pose: 'float' }, 'hurt'],
  ] as const)('%o → %s', (s, anim) => {
    expect(heroAnimation(s)).toBe(anim);
  });

  it('프레임 번호는 게임 프레임으로 정해진다', () => {
    expect([0, 8, 9, 17, 18, 36].map((f) => frameIndex(f, 4))).toEqual([0, 0, 1, 1, 2, 0]);
    expect(frameIndex(100, 0)).toBe(0);
  });
});
