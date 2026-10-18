import type { VerbEntry } from './data/verbs';

/** 게임 → React로 올라가는 값. 사람이 읽는 값만 담고, 바뀔 때만 새 객체가 된다. */
export interface GameSnapshot {
  verb: string | null;
  /** 지금 동사의 뜻(HUD 표시용). */
  meaning: string | null;
  /** 동사를 얻은 순간 띄우는 단어 카드. id가 바뀌면 새 카드. */
  card: { id: number; verb: string; entry: VerbEntry; correct: boolean } | null;
  /** 회사 문에 닿았는가(결과 화면 F11 전까지는 간단한 표시만). */
  cleared: boolean;
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
  cleared: false,
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
