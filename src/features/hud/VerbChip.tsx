import type { GameSnapshot, GameStore } from '../../game/store';
import { useGameStore } from './useGameStore';

const selectVerb = (s: GameSnapshot) => s.verb;
const selectMeaning = (s: GameSnapshot) => s.meaning;

/** 지금 가진 동사와 뜻. 나머지 HUD(생명·코인·철자·시계)는 F09에서. */
export function VerbChip({ store }: { store: GameStore }) {
  const verb = useGameStore(store, selectVerb);
  const meaning = useGameStore(store, selectMeaning);
  return (
    <p className="verb-chip" aria-live="polite">
      {verb ? (
        <>
          <strong>{verb}</strong> · {meaning} <kbd>X</kbd>
        </>
      ) : (
        '동사 없음 — 적을 밟아 보세요'
      )}
    </p>
  );
}
