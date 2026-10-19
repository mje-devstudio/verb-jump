import { useSyncExternalStore } from 'react';
import { readJson, writeJson } from '../../shared/lib/storage';

/** 저장 상태: 효과음·발음 켜기/끄기(S1 타이틀). 소리·조용 모드(보스전)는 F15·F16에서 더한다. */
export interface Settings {
  sfx: boolean;
  speech: boolean;
}

const KEY = 'verb-jump:settings';
const DEFAULT: Settings = { sfx: true, speech: true };

function load(): Settings {
  const v = readJson(KEY);
  if (typeof v !== 'object' || v === null) return DEFAULT;
  const o = v as Record<string, unknown>;
  return {
    sfx: typeof o.sfx === 'boolean' ? o.sfx : DEFAULT.sfx,
    speech: typeof o.speech === 'boolean' ? o.speech : DEFAULT.speech,
  };
}

let current = load();
const listeners = new Set<() => void>();

export const settings = {
  get: () => current,
  set(patch: Partial<Settings>) {
    current = { ...current, ...patch };
    writeJson(KEY, current);
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useSettings(): Settings {
  return useSyncExternalStore(settings.subscribe, settings.get, settings.get);
}
