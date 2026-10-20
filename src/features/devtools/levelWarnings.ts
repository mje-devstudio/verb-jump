import { useSyncExternalStore } from 'react';
import type { LevelDef } from '../../game/world';
import type { LevelWarning } from '../../game/level/levelCheck';
import { DEFAULT_TUNING } from '../../shared/rules/tuning';

/** F29 레벨 점검 결과(개발 모드). 개발자 토글과 게임 화면(맵 위 표시)이 함께 읽는다. */
export interface LevelCheckState {
  status: 'idle' | 'checked' | 'failed';
  warnings: readonly LevelWarning[];
  /** 점검에 걸린 시간(ms). */
  ms: number;
}

let state: LevelCheckState = { status: 'idle', warnings: [], ms: 0 };
const listeners = new Set<() => void>();
let lastLevel: LevelDef | null = null;

export const levelWarnings = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  set(next: LevelCheckState) {
    state = next;
    for (const l of listeners) l();
  },
};

export function useLevelWarnings(): LevelCheckState {
  return useSyncExternalStore(levelWarnings.subscribe, levelWarnings.get, levelWarnings.get);
}

/**
 * 맵을 불러오면 한 번 점검한다(같은 맵이면 다시 하지 않음). 점검 코드는 개발자 토글을 켤 때만 받는다.
 * 경고는 콘솔에도 남긴다.
 */
export async function runLevelCheck(level: LevelDef): Promise<void> {
  if (level === lastLevel) return;
  lastLevel = level;
  try {
    const { checkLevel } = await import('../../game/level/levelCheck');
    const t0 = performance.now();
    const warnings = checkLevel(level, DEFAULT_TUNING);
    const ms = Math.round(performance.now() - t0);
    for (const w of warnings) console.warn(`[레벨 점검] ${w.message}`);
    levelWarnings.set({ status: 'checked', warnings, ms });
  } catch (e) {
    console.error('[레벨 점검] 실패', e);
    levelWarnings.set({ status: 'failed', warnings: [], ms: 0 });
  }
}
