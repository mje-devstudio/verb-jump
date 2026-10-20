import { useSyncExternalStore } from 'react';
import { readJson, writeJson } from '../../shared/lib/storage';

/** F02 API 상황 재현 토글. 값은 delay·fail 쿼리로 서버리스 함수에 전달된다. */
export const DELAY_OPTIONS = [0, 1000, 3000] as const;
export const FAIL_OPTIONS = [0, 0.5, 1] as const;

export interface DevSettings {
  delayMs: (typeof DELAY_OPTIONS)[number];
  failRate: (typeof FAIL_OPTIONS)[number];
  /** F29: 레벨 점검 경고 자리를 게임 화면에 빨간 테두리로 표시. */
  showLevelMarks: boolean;
}

const KEY = 'verb-jump:dev';
const DEFAULT: DevSettings = { delayMs: 0, failRate: 0, showLevelMarks: true };

function load(): DevSettings {
  const v = readJson(KEY);
  if (typeof v !== 'object' || v === null) return DEFAULT;
  const o = v as Record<string, unknown>;
  const delayMs = DELAY_OPTIONS.find((d) => d === o.delayMs) ?? 0;
  const failRate = FAIL_OPTIONS.find((f) => f === o.failRate) ?? 0;
  const showLevelMarks = typeof o.showLevelMarks === 'boolean' ? o.showLevelMarks : true;
  return { delayMs, failRate, showLevelMarks };
}

let current: DevSettings = load();
const listeners = new Set<() => void>();

export const devSettings = {
  get: () => current,
  set(patch: Partial<DevSettings>) {
    current = { ...current, ...patch };
    writeJson(KEY, current);
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useDevSettings(): DevSettings {
  return useSyncExternalStore(devSettings.subscribe, devSettings.get, devSettings.get);
}

/** 개발자 토글을 보여 줄지: 개발 빌드이거나 주소에 ?dev가 있으면(검토자가 배포본에서도 재현할 수 있게). */
export function devToolsEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev');
}
