import { useCallback, useRef, useState } from 'react';
import { GameCanvas, type GameController } from '../game/GameCanvas';
import { createGameStore } from '../game/store';
import { Hud, PausedOverlay } from '../features/hud/Hud';
import { WordCard } from '../features/hud/WordCard';
import { ClearBanner } from '../features/hud/ClearBanner';

export function App() {
  const [store] = useState(createGameStore);
  const controllerRef = useRef<GameController | null>(null);
  const togglePause = useCallback(() => controllerRef.current?.togglePause(), []);
  return (
    <main className="flex h-full flex-col">
      <Hud store={store} onTogglePause={togglePause} />
      <div className="relative flex min-h-0 flex-1">
        <GameCanvas store={store} controllerRef={controllerRef} />
        <WordCard store={store} />
        <PausedOverlay store={store} />
        <ClearBanner store={store} />
      </div>
      <p className="m-0 px-4 py-2 text-center text-sm text-muted">
        ←→ 이동 · Space/Z 점프(길게 누르면 더 높이) · X 동사 능력 · Esc 일시정지
      </p>
    </main>
  );
}
