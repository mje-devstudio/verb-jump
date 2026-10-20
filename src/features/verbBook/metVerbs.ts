import { useSyncExternalStore } from 'react';
import { readJson, writeJson } from '../../shared/lib/storage';

/**
 * F17 동사 도감: 만난(얻은) 동사. 판이 끝나도 남도록 이 기기에 저장한다(저장이 막혀도 이번 실행 동안은 기억).
 * 처음 만난 순서대로 둔다.
 */
const KEY = 'verb-jump:met-verbs';

function load(): readonly string[] {
  const v = readJson(KEY);
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === 'string'))];
}

let current: readonly string[] = load();
const listeners = new Set<() => void>();

export const metVerbs = {
  get: () => current,
  add(verb: string) {
    if (current.includes(verb)) return;
    current = [...current, verb];
    writeJson(KEY, current);
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** 테스트용: 저장소에서 다시 읽는다. */
  reload() {
    current = load();
    for (const l of listeners) l();
  },
};

export function useMetVerbs(): readonly string[] {
  return useSyncExternalStore(metVerbs.subscribe, metVerbs.get, metVerbs.get);
}
