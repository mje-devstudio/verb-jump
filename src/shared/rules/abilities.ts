/**
 * 능력·적 수치. PRD 게임 규칙에 있는 값은 그대로, 없는 값은 "제안값"으로 표시한다.
 * 손맛 기본 수치(tuning.ts)와 마찬가지로 이 파일 한 곳에만 둔다.
 */

/** PRD: sleep 2초 졸기, 시계 3초 손해. */
export const SLEEP_MS = 2000;
export const SLEEP_CLOCK_PENALTY_MS = 3000;

/** 제안값: dance 한 번 누르면 제자리에서 춤추는 시간. */
export const DANCE_MS = 1200;
/** 제안값: brake로 멈춘 뒤 '끼익' 자세를 보여 주는 시간. */
export const BRAKE_POSE_MS = 300;
/** 제안값: break 동작을 보여 주는 시간. */
export const BREAK_POSE_MS = 250;
/** 제안값: break가 닿는 거리(몸과 금 간 벽 사이 틈, px). */
export const BREAK_REACH_PX = 3;

/** 제안값: float를 누르고 있을 때 최대 낙하 속도(px/s). 기본 maxFall 320의 약 1/10. */
export const FLOAT_MAX_FALL = 30;
/** 제안값: climb로 벽 꼭대기에 닿으면 위로 살짝 튀어 올라 올라서게 하는 속도(px/s). */
export const CLIMB_LEDGE_HOP_VEL = 130;
export const CLIMB_LEDGE_NUDGE_VX = 45;

/** 제안값: 적을 밟았을 때 튀어 오르는 속도 = jumpVel × 이 배율. */
export const STOMP_BOUNCE = 0.6;
/** PRD: 적의 옆에 닿으면 1초 무적. */
export const HURT_INVINCIBLE_MS = 1000;
/** 제안값: 맞았을 때 뒤로 밀려나는 속도(px/s). */
export const HURT_KNOCKBACK_VX = 70;
export const HURT_KNOCKBACK_VY = 140;
/**
 * 제안값: 맞은 직후 조작을 잠그고 밀려나는 속도를 유지하는 시간(ms).
 * 없으면 공중 감속이 넉백을 0.1초 만에 없애, 다가오던 적 위로 떨어져 그 동사를 얻는다(이슈 003).
 */
export const HURT_STUN_MS = 300;

/** 제안값: 동사 적 크기와 순찰 속도. 도트(F12) 전까지 회색 상자. */
export const ENEMY_W = 12;
export const ENEMY_H = 12;
export const ENEMY_SPEED = 20;
/**
 * 제안값: 밟힌 동사 적이 다시 생기는 시간(ms). 화면 밖일 때만 다시 생긴다.
 * 오답 동사를 밟은 뒤 맞는 동사 적이 이미 사라져 있으면 길이 막히는(소프트락) 일을 막는다.
 */
export const ENEMY_RESPAWN_MS = 5000;
