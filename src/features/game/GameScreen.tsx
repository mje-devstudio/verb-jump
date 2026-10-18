import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas, type GameController } from '../../game/GameCanvas';
import type { ResultData } from '../../game/result';
import { createGameStore, type GameSnapshot } from '../../game/store';
import type { LevelDef } from '../../game/world';
import { ClearBanner } from '../hud/ClearBanner';
import { Hud, PausedOverlay } from '../hud/Hud';
import { useGameStore } from '../hud/useGameStore';
import { WordCard } from '../hud/WordCard';

/** 클리어 배너를 보여 준 뒤 결과 화면으로 넘어가기까지(ms). */
export const RESULT_DELAY_MS = 1500;

const selectResult = (s: GameSnapshot) => s.result;

/** S2 게임. 판마다 새 저장소를 만든다(다시 하기 = 새 컴포넌트). */
export function GameScreen({
  level,
  onFinish,
}: {
  level: LevelDef;
  onFinish: (result: ResultData) => void;
}) {
  const [store] = useState(createGameStore);
  const controllerRef = useRef<GameController | null>(null);
  const togglePause = useCallback(() => controllerRef.current?.togglePause(), []);
  const result = useGameStore(store, selectResult);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => onFinish(result), RESULT_DELAY_MS);
    return () => clearTimeout(t);
  }, [result, onFinish]);

  return (
    <div className="flex h-full flex-col">
      <Hud store={store} onTogglePause={togglePause} />
      <div className="relative flex min-h-0 flex-1">
        <GameCanvas level={level} store={store} controllerRef={controllerRef} />
        <WordCard store={store} />
        <PausedOverlay store={store} />
        <ClearBanner store={store} />
      </div>
    </div>
  );
}
