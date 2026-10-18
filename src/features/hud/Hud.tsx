import type { GameSnapshot, GameStore } from '../../game/store';
import { useGameStore } from './useGameStore';

/**
 * 게임 HUD(F09). 항목마다 자기 값만 구독해서, 시계가 1초마다 바뀌어도 코인·생명은 다시 그려지지 않는다.
 * selector는 모듈 최상위 상수로 두어 렌더마다 새 함수가 생기지 않게 한다.
 */
const sel = {
  lives: (s: GameSnapshot) => s.lives,
  coins: (s: GameSnapshot) => s.coins,
  spell: (s: GameSnapshot) => s.spell,
  clock: (s: GameSnapshot) => s.clock,
  late: (s: GameSnapshot) => s.late,
  verb: (s: GameSnapshot) => s.verb,
  meaning: (s: GameSnapshot) => s.meaning,
  paused: (s: GameSnapshot) => s.paused,
};

export function Lives({ store }: { store: GameStore }) {
  const lives = useGameStore(store, sel.lives);
  return (
    <span aria-label={`생명 ${lives}개`} className="tracking-widest">
      {'♥'.repeat(lives)}
    </span>
  );
}

export function Coins({ store }: { store: GameStore }) {
  const coins = useGameStore(store, sel.coins);
  return <span aria-label={`코인 ${coins}개`}>● {coins}</span>;
}

export function Spell({ store }: { store: GameStore }) {
  const spell = useGameStore(store, sel.spell);
  if (!spell) return null;
  return (
    <span aria-label={`철자 ${spell.replaceAll(' ', '')}`} className="font-mono text-accent">
      {spell}
    </span>
  );
}

export function Clock({ store }: { store: GameStore }) {
  const clock = useGameStore(store, sel.clock);
  const late = useGameStore(store, sel.late);
  return (
    <span className={`font-mono ${late ? 'text-late' : ''}`} aria-label={`지금 ${clock}`}>
      {clock}
      {late && ' 지각'}
    </span>
  );
}

export function VerbChip({ store }: { store: GameStore }) {
  const verb = useGameStore(store, sel.verb);
  const meaning = useGameStore(store, sel.meaning);
  return (
    <span aria-live="polite">
      {verb ? (
        <>
          <strong>{verb}</strong> · {meaning}{' '}
          <kbd className="rounded border border-muted px-1 text-xs">X</kbd>
        </>
      ) : (
        <span className="text-muted">동사 없음</span>
      )}
    </span>
  );
}

export function PauseButton({ store, onToggle }: { store: GameStore; onToggle: () => void }) {
  const paused = useGameStore(store, sel.paused);
  return (
    <button
      type="button"
      onClick={onToggle}
      className="min-h-11 min-w-11 rounded border border-muted px-3 text-sm hover:bg-white/10"
      aria-pressed={paused}
    >
      {paused ? '계속' : '일시정지'}
    </button>
  );
}

export function PausedOverlay({ store }: { store: GameStore }) {
  const paused = useGameStore(store, sel.paused);
  if (!paused) return null;
  return (
    <div
      role="status"
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-panel/90 px-6 py-3 text-lg"
    >
      일시정지 · <kbd className="text-sm">Esc</kbd>로 계속
    </div>
  );
}

export function Hud({ store, onTogglePause }: { store: GameStore; onTogglePause: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 pt-2 text-[15px]">
      <Lives store={store} />
      <Coins store={store} />
      <Spell store={store} />
      <VerbChip store={store} />
      <span className="ml-auto flex items-center gap-3">
        <Clock store={store} />
        <PauseButton store={store} onToggle={onTogglePause} />
      </span>
    </div>
  );
}
