import type { GameSnapshot, GameStore } from '../../game/store';
import { useGameStore } from './useGameStore';

const selectResult = (s: GameSnapshot) => s.result;

/** 회사 문에 닿은 순간 잠깐 보이는 배너. 곧 결과 화면(F11)으로 넘어간다. */
export function ClearBanner({ store }: { store: GameStore }) {
  const result = useGameStore(store, selectResult);
  if (!result) return null;
  return (
    <div
      role="status"
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-ok bg-panel/90 px-6 py-3.5 text-center"
    >
      <p className="text-2xl font-bold">{result.score.onTime ? '정시 출근!' : '지각…'}</p>
      <p className="font-mono">
        {result.arrival} 도착 · {result.score.total.toLocaleString()}점
      </p>
    </div>
  );
}
