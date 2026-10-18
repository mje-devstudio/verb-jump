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
    <div className={`word-card ${correct ? 'is-correct' : 'is-joke'}`} role="status">
      <p className="word-card__verb">
        {verb} <span className="word-card__phonetic">{entry.phonetic}</span>
      </p>
      <p className="word-card__meaning">{entry.meaning}</p>
      <p className="word-card__example">{entry.example}</p>
      {entry.confusedWith && (
        <p className="word-card__note">{entry.confusedWith}와(과) 발음이 같아요</p>
      )}
    </div>
  );
}
