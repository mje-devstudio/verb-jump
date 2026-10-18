import { useCallback, useSyncExternalStore } from 'react';
import type { GameSnapshot, GameStore } from '../../game/store';

/**
 * 게임 저장소의 일부만 구독한다. selector가 같은 값을 돌려주면 컴포넌트는 다시 그려지지 않는다.
 * selector는 스냅숏 안의 값(원시값 또는 이미 있는 객체)을 그대로 돌려줘야 한다 — 새 객체를 만들면 매번 다시 그린다.
 */
export function useGameStore<T>(store: GameStore, selector: (s: GameSnapshot) => T): T {
  const getSnapshot = useCallback(() => selector(store.getSnapshot()), [store, selector]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
