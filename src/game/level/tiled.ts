import type { VerbEntry } from '../data/verbs';
import type { EnemySpawn } from '../entities/enemy';
import type { Checkpoint, LetterSpawn, LevelDef } from '../world';
import { Tile, type Point, type TileId } from './tilemap';
import type { Box } from '../../shared/rules/stomp';
import { TILE } from '../../shared/rules/tuning';

/**
 * Tiled JSON 맵(.tmj) 로더(F08). 서버·파일에서 온 값은 타입을 믿지 않고 하나씩 확인한다.
 *
 * 맵 규칙 (docs/level-format.md)
 * - 타일 10×10px, 타일 레이어 `tiles` 하나. 타일셋 타일의 `kind` 속성: solid · oneway · cracked
 * - 오브젝트 레이어 `objects`. 오브젝트 type(Tiled의 Class):
 *   spawn · checkpoint(resetAbility) · coin · enemy(verb) · letter(char, ability) · door · ability-gap
 *   위치는 오브젝트 사각형의 왼쪽 위가 든 칸으로 정한다(door·ability-gap은 사각형 전체).
 */

export class MapFormatError extends Error {
  override name = 'MapFormatError';
}

type Json = unknown;

function obj(v: Json, where: string): Record<string, Json> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new MapFormatError(`${where}: 객체가 아닙니다.`);
  }
  return v as Record<string, Json>;
}
function arr(v: Json, where: string): Json[] {
  if (!Array.isArray(v)) throw new MapFormatError(`${where}: 배열이 아닙니다.`);
  return v;
}
function num(v: Json, where: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new MapFormatError(`${where}: 숫자가 아닙니다.`);
  }
  return v;
}
function str(v: Json, where: string): string {
  if (typeof v !== 'string') throw new MapFormatError(`${where}: 문자열이 아닙니다.`);
  return v;
}

/** Tiled 사용자 속성 배열에서 문자열 속성 하나를 꺼낸다. */
function prop(o: Record<string, Json>, name: string): string | null {
  if (o.properties === undefined) return null;
  for (const p of arr(o.properties, 'properties')) {
    const po = obj(p, 'property');
    if (po.name !== name) continue;
    // Tiled에서 bool 속성으로 넣어도 읽는다
    if (typeof po.value === 'boolean') return String(po.value);
    return str(po.value, `property ${name}`);
  }
  return null;
}

const LETTER_ABILITIES = ['climb', 'float', 'break', 'none'] as const;
function isLetterAbility(v: string): v is (typeof LETTER_ABILITIES)[number] {
  return (LETTER_ABILITIES as readonly string[]).includes(v);
}

/** Tiled가 gid 위쪽 비트에 넣는 뒤집기·회전 표시를 지운다. */
const GID_MASK = 0x0fffffff;

const KIND_TO_TILE: Readonly<Record<string, TileId>> = {
  solid: Tile.Solid,
  oneway: Tile.OneWay,
  cracked: Tile.Cracked,
};

function tileKinds(tilesets: Json[]): Map<number, TileId> {
  const kinds = new Map<number, TileId>();
  for (const [i, ts] of tilesets.entries()) {
    const t = obj(ts, `tilesets[${i}]`);
    if (t.source !== undefined) {
      throw new MapFormatError(
        '외부 타일셋(.tsj)은 아직 지원하지 않습니다. 타일셋을 맵에 포함(Embed)하세요.',
      );
    }
    const first = num(t.firstgid, 'firstgid');
    for (const tile of arr(t.tiles ?? [], 'tileset.tiles')) {
      const to = obj(tile, 'tile');
      const kind = prop(to, 'kind');
      if (kind === null) continue;
      const id = KIND_TO_TILE[kind];
      if (id === undefined) throw new MapFormatError(`알 수 없는 타일 kind: ${kind}`);
      kinds.set(first + num(to.id, 'tile.id'), id);
    }
  }
  return kinds;
}

function layer(layers: Json[], name: string, type: string): Record<string, Json> {
  for (const l of layers) {
    const lo = obj(l, 'layer');
    if (lo.name === name && lo.type === type) return lo;
  }
  throw new MapFormatError(`'${name}' ${type} 레이어가 없습니다.`);
}

export function parseTiledMap(raw: Json, verbs: Readonly<Record<string, VerbEntry>>): LevelDef {
  const m = obj(raw, 'map');
  if (m.orientation !== 'orthogonal') throw new MapFormatError('직교(orthogonal) 맵만 지원합니다.');
  if (m.infinite === true) throw new MapFormatError('무한 맵은 지원하지 않습니다.');
  if (num(m.tilewidth, 'tilewidth') !== TILE || num(m.tileheight, 'tileheight') !== TILE) {
    throw new MapFormatError(`타일 크기는 ${TILE}px이어야 합니다.`);
  }
  const cols = num(m.width, 'width');
  const rows = num(m.height, 'height');
  const layers = arr(m.layers, 'layers');
  const kinds = tileKinds(arr(m.tilesets, 'tilesets'));

  const data = arr(layer(layers, 'tiles', 'tilelayer').data, 'tiles.data');
  if (data.length !== cols * rows)
    throw new MapFormatError('tiles 레이어 크기가 맵 크기와 다릅니다.');
  const tiles = new Uint8Array(cols * rows);
  data.forEach((g, i) => {
    const gid = num(g, 'gid') & GID_MASK;
    tiles[i] = gid === 0 ? Tile.Empty : (kinds.get(gid) ?? Tile.Empty);
  });

  let spawn: Point | null = null;
  const checkpoints: Checkpoint[] = [];
  const enemies: EnemySpawn[] = [];
  const letters: LetterSpawn[] = [];
  const coins: Point[] = [];
  const abilityGaps: [number, number][] = [];
  let door: Box | undefined;

  for (const o of arr(layer(layers, 'objects', 'objectgroup').objects, 'objects')) {
    const ob = obj(o, 'object');
    // Tiled 1.9 이전은 type, 이후 UI 이름은 Class지만 JSON 키는 둘 다 쓰인다.
    const type = typeof ob.type === 'string' && ob.type ? ob.type : str(ob.class ?? '', 'class');
    const x = num(ob.x, 'x');
    const y = num(ob.y, 'y');
    const w = num(ob.width ?? 0, 'width');
    const h = num(ob.height ?? 0, 'height');
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    const cell = { x: col * TILE, y: row * TILE };
    switch (type) {
      case 'spawn':
        spawn = cell;
        break;
      case 'checkpoint':
        checkpoints.push(
          prop(ob, 'resetAbility') === 'true' ? { ...cell, resetAbility: true } : cell,
        );
        break;
      case 'enemy': {
        const verb = prop(ob, 'verb');
        if (verb === null || !Object.hasOwn(verbs, verb)) {
          throw new MapFormatError(
            `적(${col},${row})의 verb 속성이 없거나 동사 데이터에 없습니다: ${verb}`,
          );
        }
        enemies.push({ verb, col, row });
        break;
      }
      case 'letter': {
        const char = prop(ob, 'char');
        if (char === null || char.length !== 1) {
          throw new MapFormatError(`철자 코인(${col},${row})의 char가 한 글자가 아닙니다.`);
        }
        const ability = prop(ob, 'ability') ?? 'none';
        if (!isLetterAbility(ability)) {
          throw new MapFormatError(`철자 코인(${col},${row})의 ability가 잘못됐습니다: ${ability}`);
        }
        letters.push({ char, x: cell.x, y: cell.y, ability });
        break;
      }
      case 'coin':
        coins.push(cell);
        break;
      case 'door':
        door = { x, y, w, h };
        break;
      case 'ability-gap':
        abilityGaps.push([col, Math.floor((x + w - 1) / TILE)]);
        break;
      default:
        throw new MapFormatError(`알 수 없는 오브젝트 type: '${type}' (${col},${row})`);
    }
  }
  if (spawn === null) throw new MapFormatError('spawn 오브젝트가 없습니다.');
  const start: Point = spawn;
  checkpoints.sort((a, b) => a.x - b.x);
  const base: LevelDef = {
    map: { cols, rows, tiles },
    spawn: start,
    // 0번 체크포인트는 시작 위치
    checkpoints: [start, ...checkpoints.filter((c) => c.x > start.x)],
    enemies,
    verbs,
    letters,
    coins,
    abilityGaps,
  };
  return door ? { ...base, door } : base;
}
