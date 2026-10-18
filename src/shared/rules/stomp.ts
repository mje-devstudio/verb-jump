/** 밟기·피격 판정(F06). PixiJS·React와 무관한 순수 함수. */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Contact = 'stomp' | 'hurt' | 'none';

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * @param player 이번 스텝이 끝난 뒤 주인공 상자
 * @param prevBottom 이번 스텝 직전 주인공 발 높이(y). 한 스텝에 4px 넘게 떨어져도 밟기를 놓치지 않게,
 *                   "발이 적 윗면 stompPx 아래보다 위에 있다가 내려왔는가"로 판정한다.
 * @param vy 주인공 세로 속도. 올라가는 중에는 밟을 수 없다.
 * @param stompPx PRD: 적 윗면 4px 아래까지는 밟기
 * @param stompWidthMul 모바일 판정 완화: 밟기 판정 폭 배율(PRD +20% → 1.2)
 */
export function judgeContact(
  player: Box,
  prevBottom: number,
  vy: number,
  enemy: Box,
  stompPx: number,
  stompWidthMul = 1,
): Contact {
  const extra = (enemy.w * (stompWidthMul - 1)) / 2;
  const stompBox = { ...enemy, x: enemy.x - extra, w: enemy.w + extra * 2 };
  const falling = vy >= 0;
  if (falling && prevBottom <= enemy.y + stompPx && overlaps(player, stompBox)) return 'stomp';
  if (overlaps(player, enemy)) return 'hurt';
  return 'none';
}
