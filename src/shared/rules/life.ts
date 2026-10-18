import { LIVES_MAX, LIVES_START, SPILL_MAX } from './game';

export interface LifeState {
  coins: number;
  lives: number;
}

export interface HitResult extends LifeState {
  /** 흘린 코인 수. */
  spilled: number;
  /** 생명이 0이 되어 체크포인트에서 다시 시작해야 하는가. */
  gameOver: boolean;
}

/** 생명이 0이 되면: 생명 3개, 코인 0개로 다시 시작(시계·철자는 그대로 — 호출하는 쪽이 유지). */
function afterLifeLost(coins: number, lives: number): HitResult {
  if (lives > 0) return { coins, lives, spilled: 0, gameOver: false };
  return { coins: 0, lives: LIVES_START, spilled: 0, gameOver: true };
}

/** 적의 옆에 닿았을 때(F26): 코인이 있으면 최대 10개를 흘리고 생명은 그대로, 없으면 생명 -1. */
export function applyHit(s: LifeState): HitResult {
  if (s.coins > 0) {
    const spilled = Math.min(SPILL_MAX, s.coins);
    return { coins: s.coins - spilled, lives: s.lives, spilled, gameOver: false };
  }
  return afterLifeLost(s.coins, s.lives - 1);
}

/** 구멍에 빠졌을 때: 생명 -1(코인은 그대로, 0이 되면 다시 시작 규칙). */
export function applyFall(s: LifeState): HitResult {
  return afterLifeLost(s.coins, s.lives - 1);
}

/** 철자를 완성했을 때 생명 +1(최대 5). */
export function gainLife(lives: number): number {
  return Math.min(LIVES_MAX, lives + 1);
}
