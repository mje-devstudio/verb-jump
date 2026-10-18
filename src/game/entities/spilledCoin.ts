import { SPILL_PICKUP_DELAY_MS, SPILL_PICKUP_WINDOW_MS } from '../../shared/rules/game';
import { moveX, moveY, type Body } from '../physics/collision';
import type { TileMap } from '../level/tilemap';

/** 피격 때 흘린 코인(F26). 2초 동안만 다시 주울 수 있고 그 뒤 사라진다. */
export interface SpilledCoin extends Body {
  ageMs: number;
}

export const COIN_SIZE = 6;
const GRAVITY = 700;
const BOUNCE = 0.45;

/** 흘린 코인을 부채꼴로 흩뿌린다. 난수 없이 순번으로 정해 재현 가능하게 한다. */
export function spillCoins(cx: number, cy: number, n: number): SpilledCoin[] {
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return {
      x: cx - COIN_SIZE / 2,
      y: cy - COIN_SIZE / 2,
      w: COIN_SIZE,
      h: COIN_SIZE,
      vx: -70 + 140 * t,
      vy: -170 - 40 * Math.sin(t * Math.PI),
      ageMs: 0,
    };
  });
}

export function stepSpilledCoin(c: SpilledCoin, map: TileMap, dt: number): void {
  c.ageMs += dt * 1000;
  c.vy = Math.min(c.vy + GRAVITY * dt, 300);
  const vxBefore = c.vx; // moveX·moveY는 막히면 속도를 0으로 만든다
  if (moveX(c, map, c.vx * dt) !== 0) c.vx = -vxBefore * BOUNCE;
  const vyBefore = c.vy;
  if (moveY(c, map, c.vy * dt) === 'ground') {
    c.vy = -vyBefore * BOUNCE;
    c.vx *= 0.8;
    if (Math.abs(c.vy) < 30) c.vy = 0;
  }
}

export const canPickUp = (c: SpilledCoin) => c.ageMs >= SPILL_PICKUP_DELAY_MS;
export const isExpired = (c: SpilledCoin) => c.ageMs >= SPILL_PICKUP_WINDOW_MS;
