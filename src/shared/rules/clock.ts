import { CLOCK_DEADLINE_MS, CLOCK_START_MS } from './game';

/**
 * 시계(PRD): 8:57에서 실제 시간과 같이 흐르고, sleep 같은 벌칙만큼 더 흐른다.
 * 출근 시각·점수·clearMs는 모두 이 시계 기준이다.
 * @param elapsedMs 게임이 실제로 진행된 시간(일시정지 제외)
 * @param penaltyMs 벌칙으로 더 흐른 시간
 */
export function clockMs(elapsedMs: number, penaltyMs: number): number {
  return CLOCK_START_MS + elapsedMs + penaltyMs;
}

/** 시계 기준 클리어까지 걸린 시간(= API의 clearMs). */
export function clearMs(elapsedMs: number, penaltyMs: number): number {
  return elapsedMs + penaltyMs;
}

/** 9:00:00.000이 되기 전에 닿으면 정시. 9:00:00.000부터 지각. */
export function isOnTime(clock: number): boolean {
  return clock < CLOCK_DEADLINE_MS;
}

/** 9:00까지 남은 초(소수점 아래 버림). 지각이면 0. */
export function secondsLeft(clock: number): number {
  return Math.max(0, Math.floor((CLOCK_DEADLINE_MS - clock) / 1000));
}

/** "8:58:07" — 초 단위로 버림. HUD는 이 문자열이 바뀔 때만 다시 그린다. */
export function formatClock(clock: number): string {
  const s = Math.floor(clock / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
