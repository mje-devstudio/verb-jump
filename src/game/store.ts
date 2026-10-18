import type { VerbEntry } from './data/verbs';

import type { ResultData } from './result';

/**
 * 게임 → React로 올라가는 값(F09). 사람이 읽는 값만 담는다.
 * 모든 필드가 원시값이거나 바뀔 때만 새로 만드는 객체라, 같은 값이면 스냅숏도 같은 객체다.
 */
export interface GameSnapshot {
  verb: string | null;
  /** 지금 동사의 뜻(HUD 표시용). */
  meaning: string | null;
  /** 동사를 얻은 순간(또는 철자를 완성한 순간) 띄우는 단어 카드. id가 바뀌면 새 카드. */
  card: { id: number; verb: string; entry: VerbEntry; correct: boolean } | null;
  lives: number;
  coins: number;
  /** "B _ E _ K" */
  spell: string;
  /** "8:58:07" — 초가 바뀔 때만 바뀐다. */
  clock: string;
  late: boolean;
  paused: boolean;
  /** 회사 문에 닿으면 채워지는 한 판 결과(F11). */
  result: ResultData | null;
}

export interface GameStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): GameSnapshot;
  /** 바뀐 필드가 있을 때만 새 스냅숏을 만들고 알린다. 같은 값이면 아무것도 하지 않는다. */
  update(patch: Partial<GameSnapshot>): void;
}

export const INITIAL_SNAPSHOT: GameSnapshot = Object.freeze({
  verb: null,
  meaning: null,
  card: null,
  lives: 3,
  coins: 0,
  spell: '',
  clock: '8:57:00',
  late: false,
  paused: false,
  result: null,
});

export function createGameStore(initial: GameSnapshot = INITIAL_SNAPSHOT): GameStore {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    update(patch) {
      const changed = (Object.keys(patch) as (keyof GameSnapshot)[]).some(
        (k) => !Object.is(patch[k], snapshot[k]),
      );
      if (!changed) return;
      snapshot = Object.freeze({ ...snapshot, ...patch });
      for (const l of listeners) l();
    },
  };
}
