import { GameCanvas } from '../game/GameCanvas';

export function App() {
  return (
    <main className="app">
      <GameCanvas />
      <p className="hint">회색 상자 손맛 점검 · ←→ 이동 · Space/Z 점프(길게 누르면 더 높이)</p>
    </main>
  );
}
