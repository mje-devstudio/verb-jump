import { useSyncExternalStore } from 'react';
import { readJson, writeJson } from '../../shared/lib/storage';

/** 저장 상태: 효과음·발음 켜기/끄기와 볼륨(S1 타이틀·일시정지). 소리·조용 모드(보스전)는 F15·F16에서 더한다. */
export interface Settings {
  sfx: boolean;
  speech: boolean;
  /** 효과음 볼륨 0~1. 낮출수록 발음이 상대적으로 크게 들린다. */
  sfxVolume: number;
  /** 발음(브라우저 TTS) 볼륨 0~1. 1이 브라우저 최대값이다. */
  speechVolume: number;
}

const KEY = 'verb-jump:settings';
/** 제안값: 효과음은 처음부터 조금 낮춰 둔다(발음이 묻히지 않게, 사용자 의견 2026-10-20). */
export const DEFAULT_SETTINGS: Settings = {
  sfx: true,
  speech: true,
  sfxVolume: 0.6,
  speechVolume: 1,
};
const DEFAULT = DEFAULT_SETTINGS;

const volume = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

function load(): Settings {
  const v = readJson(KEY);
  if (typeof v !== 'object' || v === null) return DEFAULT;
  const o = v as Record<string, unknown>;
  return {
    sfx: typeof o.sfx === 'boolean' ? o.sfx : DEFAULT.sfx,
    speech: typeof o.speech === 'boolean' ? o.speech : DEFAULT.speech,
    sfxVolume: volume(o.sfxVolume, DEFAULT.sfxVolume),
    speechVolume: volume(o.speechVolume, DEFAULT.speechVolume),
  };
}

let current = load();
const listeners = new Set<() => void>();

export const settings = {
  get: () => current,
  set(patch: Partial<Settings>) {
    current = { ...current, ...patch };
    current.sfxVolume = volume(current.sfxVolume, DEFAULT.sfxVolume);
    current.speechVolume = volume(current.speechVolume, DEFAULT.speechVolume);
    writeJson(KEY, current);
    for (const l of listeners) l();
  },
  /** 테스트용: 저장소에서 다시 읽는다. */
  reload() {
    current = load();
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
