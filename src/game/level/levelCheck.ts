import { mapHeightPx, Tile, tileAt, type TileMap } from './tilemap';
import { createPlayer, stepPlayer } from '../physics/player';
import { STEP_S, TILE, type Tuning } from '../../shared/rules/tuning';

export interface EdgeJumpResult {
  col: number;
  row: number;
  dir: -1 | 1;
  /** 착지했으면 착지한 발 x, 구멍에 빠졌으면 null. */
  landX: number | null;
  /** 출발 지점과 착지 지점의 x 거리(px). */
  distance: number | null;
}

const standable = (m: TileMap, c: number, r: number) => {
  const t = tileAt(m, c, r);
  return t === Tile.Solid || t === Tile.OneWay;
};
const solid = (m: TileMap, c: number, r: number) => tileAt(m, c, r) === Tile.Solid;
/** 위가 막히지 않아 설 수 있는 윗면. */
const surface = (m: TileMap, c: number, r: number) =>
  standable(m, c, r) && !solid(m, c, r - 1) && !solid(m, c, r - 2);

/** 발판 끝: 윗면인데 dir 쪽 이웃이 윗면도 벽도 아닌 칸. */
export function findEdges(map: TileMap): { col: number; row: number; dir: -1 | 1 }[] {
  const edges: { col: number; row: number; dir: -1 | 1 }[] = [];
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      if (!surface(map, c, r)) continue;
      for (const dir of [-1, 1] as const) {
        const n = c + dir;
        if (!surface(map, n, r) && !solid(map, n, r - 1) && !solid(map, n, r)) {
          edges.push({ col: c, row: r, dir });
        }
      }
    }
  }
  return edges;
}

/**
 * 발판 끝에서 최고 속도로 달려 끝까지 누른 채 뛰는 시뮬레이션(레벨 설계 규칙 · F29의 핵심).
 * 몸이 발판 끝에 걸친 채로 출발해, 땅을 떠나기 직전 마지막 스텝에 점프한다.
 */
export function simulateEdgeJump(
  map: TileMap,
  tuning: Readonly<Tuning>,
  edge: { col: number; row: number; dir: -1 | 1 },
  maxSeconds = 4,
): EdgeJumpResult {
  const p = createPlayer({ x: 0, y: (edge.row - 1) * TILE });
  // 몸의 대부분이 이미 발판 밖으로 나간 상태(1px만 걸침) = 가장 늦게 뛰는 경우
  p.x = edge.dir > 0 ? (edge.col + 1) * TILE - 1 : edge.col * TILE - p.w + 1;
  p.vx = edge.dir * tuning.maxSpeed;
  p.onGround = true;
  p.airMs = 0;
  const startX = p.x;
  const input = {
    left: edge.dir < 0,
    right: edge.dir > 0,
    jumpPressed: true,
    jumpHeld: true,
  };
  const steps = Math.ceil(maxSeconds / STEP_S);
  for (let i = 0; i < steps; i++) {
    stepPlayer(p, input, map, tuning, STEP_S);
    input.jumpPressed = false;
    if (i > 0 && p.onGround) {
      return { ...edge, landX: p.x, distance: Math.abs(p.x - startX) };
    }
    if (p.y > mapHeightPx(map)) break;
  }
  return { ...edge, landX: null, distance: null };
}

/** 모든 발판 끝에서 앞뒤로 달려 뛰어, 구멍에 빠지는 곳을 돌려준다. */
export function findPitLandings(map: TileMap, tuning: Readonly<Tuning>): EdgeJumpResult[] {
  return findEdges(map)
    .map((e) => simulateEdgeJump(map, tuning, e))
    .filter((r) => r.landX === null);
}
