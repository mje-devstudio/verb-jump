import { isSolid, mapHeightPx, Tile, tileAt, type TileMap } from './tilemap';
import { createPlayer, NO_MODS, stepPlayer } from '../physics/player';
import { overlaps } from '../../shared/rules/stomp';
import type { LetterSpawn } from '../world';
import { FLOAT_MAX_FALL } from '../../shared/rules/abilities';
import { PLAYER_H, STEP_S, TILE, type Tuning } from '../../shared/rules/tuning';

export interface EdgeJumpResult {
  col: number;
  row: number;
  dir: -1 | 1;
  /** 착지했으면 착지한 발 x, 구멍에 빠졌으면 null. */
  landX: number | null;
  /** 출발 지점과 착지 지점의 x 거리(px). */
  distance: number | null;
  /** 점프한 프레임부터 착지한 프레임까지 프레임 수(양 끝 포함). 실험실 측정과 같은 방식. */
  frames: number | null;
  /** 땅(맵에서 가장 낮은 윗면)부터 센 발판 높이(칸). 맵 바닥부터 세지 않는다. */
  heightTiles: number;
}

const standable = (m: TileMap, c: number, r: number) => {
  const t = tileAt(m, c, r);
  return isSolid(t) || t === Tile.OneWay;
};
const solid = (m: TileMap, c: number, r: number) => isSolid(tileAt(m, c, r));
/** 위가 막히지 않아 설 수 있는 윗면. */
const surface = (m: TileMap, c: number, r: number) =>
  standable(m, c, r) && !solid(m, c, r - 1) && !solid(m, c, r - 2);

/**
 * 땅의 윗면 행: 설 수 있는 윗면 중 가장 아래 행.
 * 높이를 맵 바닥부터 세면 땅 두께만큼 높게 나와(예: 3칸 언덕이 '5칸') 헷갈리므로 땅부터 센다.
 */
export function groundRow(map: TileMap): number {
  for (let r = map.rows - 1; r >= 0; r--) {
    for (let c = 0; c < map.cols; c++) if (surface(map, c, r)) return r;
  }
  return map.rows;
}

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
  ground = groundRow(map),
): EdgeJumpResult {
  const heightTiles = ground - edge.row;
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
      return { ...edge, heightTiles, landX: p.x, distance: Math.abs(p.x - startX), frames: i + 1 };
    }
    if (p.y > mapHeightPx(map)) break;
  }
  return { ...edge, heightTiles, landX: null, distance: null, frames: null };
}

/**
 * 모든 발판 끝에서 앞뒤로 달려 뛰어, 구멍에 빠지는 곳을 돌려준다.
 * abilityGaps: float처럼 능력이 있어야 건너는 틈의 열 범위. 그 틈 바로 옆 끝에서 빠지는 것은 의도된 배치다.
 */
export function findPitLandings(
  map: TileMap,
  tuning: Readonly<Tuning>,
  abilityGaps: readonly (readonly [number, number])[] = [],
): EdgeJumpResult[] {
  const ground = groundRow(map);
  const facesAbilityGap = (e: { col: number; dir: -1 | 1 }) =>
    abilityGaps.some(([a, b]) => e.col + e.dir >= a && e.col + e.dir <= b);
  return findEdges(map)
    .filter((e) => !facesAbilityGap(e))
    .map((e) => simulateEdgeJump(map, tuning, e, 4, ground))
    .filter((r) => r.landX === null);
}

/** 개발 모드 경고 문구(F29). 예: "col 52 · 땅에서 5칸 · 오른쪽으로 달려 뛰면 구멍" */
export function describePit(r: EdgeJumpResult): string {
  return `col ${r.col} · 땅에서 ${r.heightTiles}칸 · ${r.dir > 0 ? '오른쪽' : '왼쪽'}으로 달려 뛰면 구멍`;
}

/**
 * 철자 코인에 닿을 수 있는가(근사, F29 P0 테스트). 코인 근처의 모든 윗면에서(칸 가운데와 발판 끝 1px)
 * 제자리·좌우로 걷거나 달리며 끝까지 누른 점프를 시뮬레이션해, 몸이 코인 칸에 한 번이라도 겹치면 닿는다고 본다.
 * float가 필요한 코인은 공중에서 float를 누른 채로 시뮬레이션한다.
 * 한계: 시작한 윗면까지 실제로 갈 수 있는지(경로)는 보지 않는다. climb·break 코인은 담장 위·벽 너머 윗면이
 * 능력으로 갈 수 있는 곳이라고 가정한다.
 */
export function canReachLetter(
  map: TileMap,
  tuning: Readonly<Tuning>,
  letter: LetterSpawn,
  opts: { useFloat?: boolean; rangeCols?: number } = {},
): boolean {
  const target = { x: letter.x, y: letter.y, w: TILE, h: TILE };
  const c0 = Math.floor(letter.x / TILE);
  const range = opts.rangeCols ?? 12;
  const steps = Math.ceil(3 / STEP_S);
  for (let r = 0; r < map.rows; r++) {
    for (let c = c0 - range; c <= c0 + range; c++) {
      if (!surface(map, c, r)) continue;
      for (const dir of [-1, 0, 1] as const) {
        // 칸 가운데 출발 + 발판 끝에 1px만 걸친 출발(실제로 가장 멀리 가는 경우)
        const starts =
          dir === 0 ? [c * TILE] : [c * TILE, dir > 0 ? (c + 1) * TILE - 1 : c * TILE - TILE + 1];
        for (const [sx, speed] of starts.flatMap((x) =>
          dir === 0
            ? [[x, 0] as const]
            : [[x, tuning.maxSpeed / 2] as const, [x, tuning.maxSpeed] as const],
        )) {
          const p = createPlayer({ x: 0, y: 0 });
          p.x = sx;
          p.y = r * TILE - PLAYER_H;
          p.vx = dir * speed;
          p.onGround = true;
          p.airMs = 0;
          if (overlaps(p, target)) return true;
          const input = { left: dir < 0, right: dir > 0, jumpPressed: true, jumpHeld: true };
          for (let i = 0; i < steps; i++) {
            const floating = opts.useFloat === true && !p.onGround && p.vy > 0;
            stepPlayer(
              p,
              input,
              map,
              tuning,
              STEP_S,
              floating ? { maxFall: FLOAT_MAX_FALL } : NO_MODS,
            );
            input.jumpPressed = false;
            if (overlaps(p, target)) return true;
            if ((i > 0 && p.onGround) || p.y > mapHeightPx(map)) break;
          }
        }
      }
    }
  }
  return false;
}

/** 닿을 수 없는 철자 코인 목록. 코인의 ability가 float면 float를 쓴다고 보고 검사한다. */
export function findUnreachableLetters(
  map: TileMap,
  tuning: Readonly<Tuning>,
  letters: readonly LetterSpawn[],
): LetterSpawn[] {
  return letters.filter(
    (l) => !canReachLetter(map, tuning, l, { useFloat: l.ability === 'float' }),
  );
}
