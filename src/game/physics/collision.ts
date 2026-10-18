import { Tile, tileAt, type TileMap } from '../level/tilemap';
import { TILE } from '../../shared/rules/tuning';

/** 경계에 딱 붙은 상자가 옆 타일과 겹친 것으로 잡히지 않게 하는 여유. */
const EPS = 1e-6;

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

const firstCol = (x: number) => Math.floor(x / TILE);
const lastCol = (x: number, w: number) => Math.floor((x + w - EPS) / TILE);
const firstRow = (y: number) => Math.floor(y / TILE);
const lastRow = (y: number, h: number) => Math.floor((y + h - EPS) / TILE);

/**
 * x축 이동과 충돌. 한 방향 발판은 옆으로 막지 않는다(F25).
 * @returns 벽에 막혔으면 막힌 방향(-1 왼쪽, 1 오른쪽), 아니면 0
 */
export function moveX(body: Body, map: TileMap, dx: number): -1 | 0 | 1 {
  if (dx === 0) return 0;
  body.x += dx;
  const r0 = firstRow(body.y);
  const r1 = lastRow(body.y, body.h);
  if (dx > 0) {
    const c = lastCol(body.x, body.w);
    for (let r = r0; r <= r1; r++) {
      if (tileAt(map, c, r) === Tile.Solid) {
        body.x = c * TILE - body.w;
        body.vx = 0;
        return 1;
      }
    }
  } else {
    const c = firstCol(body.x);
    for (let r = r0; r <= r1; r++) {
      if (tileAt(map, c, r) === Tile.Solid) {
        body.x = (c + 1) * TILE;
        body.vx = 0;
        return -1;
      }
    }
  }
  return 0;
}

/**
 * y축 이동과 충돌.
 * 한 방향 발판은 내려가는 중이고, 이동 전 발이 발판 윗면보다 위(같음 포함)에 있을 때만 막는다.
 * @returns 'ground' 착지, 'ceiling' 머리 부딪힘, null 막히지 않음
 */
export function moveY(body: Body, map: TileMap, dy: number): 'ground' | 'ceiling' | null {
  if (dy === 0) return null;
  const prevBottom = body.y + body.h;
  body.y += dy;
  const c0 = firstCol(body.x);
  const c1 = lastCol(body.x, body.w);
  if (dy > 0) {
    const r = lastRow(body.y, body.h);
    const top = r * TILE;
    for (let c = c0; c <= c1; c++) {
      const t = tileAt(map, c, r);
      if (t === Tile.Solid || (t === Tile.OneWay && prevBottom <= top + EPS)) {
        body.y = top - body.h;
        body.vy = 0;
        return 'ground';
      }
    }
  } else {
    const r = firstRow(body.y);
    for (let c = c0; c <= c1; c++) {
      if (tileAt(map, c, r) === Tile.Solid) {
        body.y = (r + 1) * TILE;
        body.vy = 0;
        return 'ceiling';
      }
    }
  }
  return null;
}
