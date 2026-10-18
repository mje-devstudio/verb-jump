import type { GameSnapshot, GameStore } from '../../game/store';
import { useGameStore } from './useGameStore';

const selectCleared = (s: GameSnapshot) => s.cleared;

/** 임시 클리어 표시. 결과 화면(점수·출근 시각·복습)은 F11에서 만든다. */
export function ClearBanner({ store }: { store: GameStore }) {
  const cleared = useGameStore(store, selectCleared);
  if (!cleared) return null;
  return (
    <div className="clear-banner" role="status">
      출근 완료! <span>결과 화면은 F11에서</span>
    </div>
  );
}
