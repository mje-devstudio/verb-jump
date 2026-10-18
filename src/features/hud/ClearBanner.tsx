import type { GameSnapshot, GameStore } from '../../game/store';
import { useGameStore } from './useGameStore';

const selectCleared = (s: GameSnapshot) => s.cleared;

/** 임시 클리어 표시. 결과 화면(점수 내역·복습·랭킹)은 F11에서 만든다. */
export function ClearBanner({ store }: { store: GameStore }) {
  const cleared = useGameStore(store, selectCleared);
  if (!cleared) return null;
  return (
    <div
      role="status"
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-ok bg-panel/90 px-6 py-3.5 text-center"
    >
      <p className="text-2xl font-bold">{cleared.onTime ? '정시 출근!' : '지각…'}</p>
      <p className="font-mono">
        {cleared.clock} 도착 · {cleared.score.toLocaleString()}점
      </p>
      <p className="text-[13px] text-muted">자세한 결과 화면은 F11에서</p>
    </div>
  );
}
