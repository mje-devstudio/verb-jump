import { TILE } from '../../shared/rules/tuning';

export const Tile = {
  Empty: 0,
  /** 땅·언덕·벽 — 모든 방향에서 막는다. */
  Solid: 1,
  /** 공중 발판 — 위에서 내려올 때만 밟힌다(F25). */
  OneWay: 2,
} as const;
export type TileId = (typeof Tile)[keyof typeof Tile];

export interface TileMap {
  readonly cols: number;
  readonly rows: number;
  readonly tiles: Uint8Array;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * 맵 밖 처리: 좌우 바깥은 벽(화면 밖으로 못 나감), 위는 빈칸, 아래는 구멍(빈칸).
 */
export function tileAt(map: TileMap, col: number, row: number): TileId {
  if (col < 0 || col >= map.cols) return Tile.Solid;
  if (row < 0 || row >= map.rows) return Tile.Empty;
  return (map.tiles[row * map.cols + col] ?? Tile.Empty) as TileId;
}

export function mapWidthPx(map: TileMap): number {
  return map.cols * TILE;
}

export function mapHeightPx(map: TileMap): number {
  return map.rows * TILE;
}

export interface ParsedAsciiMap {
  map: TileMap;
  /** 'P' 자리의 발 위치(타일 왼쪽 위 기준 좌표). */
  spawn: Point;
}

/**
 * 회색 상자 단계용 ASCII 맵. Tiled 로더(F08)가 들어오면 테스트 픽스처 용도로만 남는다.
 *   '#' 벽·땅, '-' 한 방향 발판, 'P' 시작 위치, 그 밖은 빈칸.
 */
export function parseAsciiMap(lines: readonly string[]): ParsedAsciiMap {
  const rows = lines.length;
  const cols = Math.max(...lines.map((l) => l.length));
  const tiles = new Uint8Array(cols * rows);
  let spawn: Point | null = null;
  lines.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '#') tiles[r * cols + c] = Tile.Solid;
      else if (ch === '-') tiles[r * cols + c] = Tile.OneWay;
      else if (ch === 'P') spawn = { x: c * TILE, y: r * TILE };
    }
  });
  if (spawn === null) throw new Error('맵에 시작 위치(P)가 없습니다.');
  return { map: { cols, rows, tiles }, spawn };
}
