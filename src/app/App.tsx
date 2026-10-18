import { useState } from 'react';
import { GameCanvas } from '../game/GameCanvas';
import { createGameStore } from '../game/store';
import { VerbChip } from '../features/hud/VerbChip';
import { WordCard } from '../features/hud/WordCard';

export function App() {
  const [store] = useState(createGameStore);
  return (
    <main className="app">
      <div className="hud-top">
        <VerbChip store={store} />
      </div>
      <div className="stage">
        <GameCanvas store={store} />
        <WordCard store={store} />
      </div>
      <p className="hint">
        회색 상자 점검 · ←→ 이동 · Space/Z 점프(길게 누르면 더 높이) · X 동사 능력
      </p>
    </main>
  );
}
