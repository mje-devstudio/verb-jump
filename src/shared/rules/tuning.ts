/**
 * 손맛 기본 수치 — PRD "손맛 기본 수치"의 값을 그대로 옮긴 유일한 출처.
 * 단위: 속도 px/s, 가속도·중력 px/s², 시간 ms. airControl·fallMul·jumpCut은 배율.
 * 값을 바꾸면 레벨 점검(F29)을 다시 돌린다.
 */
export interface Tuning {
  maxSpeed: number;
  accel: number;
  decel: number;
  airControl: number;
  gravity: number;
  fallMul: number;
  jumpVel: number;
  jumpCut: number;
  maxFall: number;
  coyoteMs: number;
  bufferMs: number;
  stompPx: number;
  climbSpeed: number;
}

export const DEFAULT_TUNING: Readonly<Tuning> = Object.freeze({
  maxSpeed: 90,
  accel: 600,
  decel: 900,
  airControl: 0.75,
  gravity: 900,
  fallMul: 1.6,
  jumpVel: 285,
  jumpCut: 0.4,
  maxFall: 320,
  coyoteMs: 100,
  bufferMs: 100,
  stompPx: 4,
  climbSpeed: 60,
});

/** 모바일 판정 완화 — PRD 게임 규칙 "모바일 판정". */
export const MOBILE_COYOTE_MS = 150;
export const MOBILE_STOMP_WIDTH_MUL = 1.2;

export function mobileTuning(base: Readonly<Tuning> = DEFAULT_TUNING): Tuning {
  return { ...base, coyoteMs: MOBILE_COYOTE_MS };
}

/** 월드 기준 크기 — 실험실 기준(타일 10px, 주인공 10×14px, 화면 320×180). */
export const TILE = 10;
export const PLAYER_W = 10;
export const PLAYER_H = 14;
export const VIEW_W = 320;
export const VIEW_H = 180;

/** 고정 갱신 간격(F04). */
export const STEP_S = 1 / 60;
/** 한 번의 rAF에서 따라잡을 최대 스텝 수 — 탭 복귀 등 긴 공백 뒤 폭주 방지. */
export const MAX_STEPS_PER_FRAME = 5;

/**
 * 타일 크기를 바꿀 때 쓰는 변환(PRD: 16px이면 길이·속도·가속도 ×1.6, 시간은 그대로).
 */
export function scaleTuning(base: Readonly<Tuning>, tileSize: number): Tuning {
  const k = tileSize / TILE;
  return {
    ...base,
    maxSpeed: base.maxSpeed * k,
    accel: base.accel * k,
    decel: base.decel * k,
    gravity: base.gravity * k,
    jumpVel: base.jumpVel * k,
    maxFall: base.maxFall * k,
    stompPx: base.stompPx * k,
    climbSpeed: base.climbSpeed * k,
  };
}
