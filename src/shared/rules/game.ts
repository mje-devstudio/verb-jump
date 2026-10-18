/** PRD 게임 규칙 표의 수치(코인·생명·철자·시계·점수). 이 파일 한 곳에만 둔다. */

/** 코인 하나 10점. */
export const COIN_POINTS = 10;
/** 피격 때 흘리는 최대 코인 수. */
export const SPILL_MAX = 10;
/** 흘린 코인을 다시 주울 수 있는 시간(ms). */
export const SPILL_PICKUP_WINDOW_MS = 2000;
/** 제안값: 흘린 직후 바로 다시 줍지 않도록 잠깐 줍지 못하는 시간(ms). */
export const SPILL_PICKUP_DELAY_MS = 300;

export const LIVES_START = 3;
/** 철자를 완성하면 생명 +1, 최대 5개. */
export const LIVES_MAX = 5;

/** 철자 완성 보너스. */
export const WORD_BONUS = 500;
/** 정시 출근이면 9:00까지 남은 초(소수점 아래 버림) × 10. */
export const TIME_BONUS_PER_SEC = 10;

/** 시계: 8:57:00에서 시작, 9:00:00부터 지각. 하루 기준 밀리초. */
export const CLOCK_START_MS = (8 * 3600 + 57 * 60) * 1000;
export const CLOCK_DEADLINE_MS = 9 * 3600 * 1000;
