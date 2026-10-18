import { describe, expect, it } from 'vitest';
import { COMMUTE_VERBS } from '../data/verbs';
import { MapFormatError, parseTiledMap } from './tiled';
import { Tile } from './tilemap';

const tileset = {
  firstgid: 1,
  name: 't',
  tiles: [
    { id: 0, properties: [{ name: 'kind', type: 'string', value: 'solid' }] },
    { id: 1, properties: [{ name: 'kind', type: 'string', value: 'oneway' }] },
    { id: 2, properties: [{ name: 'kind', type: 'string', value: 'cracked' }] },
  ],
};
const o = (type: string, x: number, y: number, props: Record<string, string> = {}) => ({
  type,
  x,
  y,
  width: 10,
  height: 10,
  properties: Object.entries(props).map(([name, value]) => ({ name, type: 'string', value })),
});

function map(objects: unknown[], extra: Record<string, unknown> = {}) {
  return {
    orientation: 'orthogonal',
    infinite: false,
    tilewidth: 10,
    tileheight: 10,
    width: 4,
    height: 2,
    tilesets: [tileset],
    layers: [
      { name: 'tiles', type: 'tilelayer', data: [0, 2, 3, 0, 1, 1, 1, 0x80000001] },
      { name: 'objects', type: 'objectgroup', objects },
    ],
    ...extra,
  };
}

describe('F08 Tiled 맵 로더', () => {
  it('타일 kind 속성으로 타일 종류를 정하고, 뒤집기 비트는 무시한다', () => {
    const lv = parseTiledMap(map([o('spawn', 0, 0)]), COMMUTE_VERBS);
    expect([...lv.map.tiles]).toEqual([
      Tile.Empty,
      Tile.OneWay,
      Tile.Cracked,
      Tile.Empty,
      Tile.Solid,
      Tile.Solid,
      Tile.Solid,
      Tile.Solid,
    ]);
  });

  it('오브젝트를 칸 단위로 읽고 체크포인트는 x 순서로 시작 위치 뒤에 둔다', () => {
    const lv = parseTiledMap(
      map([
        o('checkpoint', 32, 5),
        o('spawn', 3, 0),
        o('checkpoint', 15, 0),
        o('enemy', 21, 0, { verb: 'climb' }),
        o('letter', 30, 0, { char: 'B', ability: 'climb' }),
        { ...o('door', 30, 0), width: 10, height: 20 },
        { ...o('ability-gap', 10, 10), width: 20 },
        o('coin', 12, 3),
      ]),
      COMMUTE_VERBS,
    );
    expect(lv.spawn).toEqual({ x: 0, y: 0 });
    expect(lv.checkpoints).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 30, y: 0 },
    ]);
    expect(lv.enemies).toEqual([{ verb: 'climb', col: 2, row: 0 }]);
    expect(lv.letters).toEqual([{ char: 'B', x: 30, y: 0, ability: 'climb' }]);
    expect(lv.door).toEqual({ x: 30, y: 0, w: 10, h: 20 });
    expect(lv.abilityGaps).toEqual([[1, 2]]);
    expect(lv.coins).toEqual([{ x: 10, y: 0 }]);
  });

  it.each([
    ['spawn이 없으면', map([]), /spawn/],
    ['모르는 오브젝트 type', map([o('spawn', 0, 0), o('gem', 0, 0)]), /알 수 없는 오브젝트/],
    ['동사 데이터에 없는 적', map([o('spawn', 0, 0), o('enemy', 0, 0, { verb: 'jump' })]), /verb/],
    [
      '외부 타일셋',
      map([o('spawn', 0, 0)], { tilesets: [{ firstgid: 1, source: 'a.tsj' }] }),
      /외부 타일셋/,
    ],
    ['타일 크기가 다르면', map([o('spawn', 0, 0)], { tilewidth: 16 }), /타일 크기/],
    ['JSON이 객체가 아니면', '맵', /객체가 아닙니다/],
  ])('%s 알기 쉬운 오류를 낸다', (_, raw, msg) => {
    expect(() => parseTiledMap(raw, COMMUTE_VERBS)).toThrow(MapFormatError);
    expect(() => parseTiledMap(raw, COMMUTE_VERBS)).toThrow(msg);
  });
});
