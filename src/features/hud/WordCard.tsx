import { useEffect, useState } from 'react';
import type { GameSnapshot, GameStore } from '../../game/store';
import { useGameStore } from './useGameStore';

/** PRD: 동사를 얻으면 단어 카드를 1~2초 띄우되 게임은 멈추지 않는다. */
export const WORD_CARD_MS = 1600;

const selectCard = (s: GameSnapshot) => s.card;

export function WordCard({ store }: { store: GameStore }) {
  const card = useGameStore(store, selectCard);
  const [hiddenId, setHiddenId] = useState<number | null>(null);

  useEffect(() => {
    if (!card) return;
    const t = setTimeout(() => setHiddenId(card.id), WORD_CARD_MS);
    return () => clearTimeout(t);
  }, [card]);

  if (!card || hiddenId === card.id) return null;
  const { verb, entry, correct } = card;
  return (
    <div
      role="status"
      className={`pointer-events-none absolute left-1/2 top-3 min-w-56 -translate-x-1/2 rounded-md border-2 bg-panel/90 px-4 py-2.5 text-center ${
        correct ? 'border-accent' : 'border-dashed border-joke'
      }`}
    >
      <p className="text-2xl font-bold">
        {verb} <span className="text-sm font-normal text-muted">{entry.phonetic}</span>
      </p>
      <p>{entry.meaning}</p>
      <p className="text-sm italic text-slate-300">{entry.example}</p>
      {entry.confusedWith && (
        <p className="text-[13px] text-amber-400">{entry.confusedWith}와(과) 발음이 같아요</p>
      )}
    </div>
  );
}
