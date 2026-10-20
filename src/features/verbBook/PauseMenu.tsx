import { useEffect, useRef, useState } from 'react';
import type { VerbEntry } from '../../game/data/verbs';
import type { GameSnapshot, GameStore } from '../../game/store';
import { useGameStore } from '../hud/useGameStore';
import { VerbBook } from './VerbBook';

const selectPaused = (s: GameSnapshot) => s.paused;

/**
 * 일시정지 메뉴(F17). 계속하기와 동사 도감. 게임은 멈춘 채라 천천히 읽어도 된다.
 * 열리면 계속하기 버튼에 포커스를 둔다(키보드는 Enter로 누른다. Space는 게임 점프 키라 막혀 있다).
 */
export function PauseMenu({
  store,
  verbs,
  touch = false,
  onResume,
}: {
  store: GameStore;
  verbs: Readonly<Record<string, VerbEntry>>;
  touch?: boolean;
  onResume: () => void;
}) {
  const paused = useGameStore(store, selectPaused);
  // 멈출 때마다 새로 그려 메뉴부터 시작한다
  return paused ? <PausePanel verbs={verbs} touch={touch} onResume={onResume} /> : null;
}

function PausePanel({
  verbs,
  touch,
  onResume,
}: {
  verbs: Readonly<Record<string, VerbEntry>>;
  touch: boolean;
  onResume: () => void;
}) {
  const [view, setView] = useState<'menu' | 'book'>('menu');
  const resumeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    resumeRef.current?.focus();
  }, []);
  return (
    <section
      aria-label="일시정지 메뉴"
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-md bg-panel/95 px-5 py-4 text-center">
        <p className="text-lg">
          일시정지
          {/* 터치 기기에는 Esc가 없다(리뷰 13) */}
          {!touch && (
            <span className="ml-2 text-sm text-muted">
              <kbd>Esc</kbd>로 계속
            </span>
          )}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <button
            ref={resumeRef}
            type="button"
            onClick={onResume}
            className="min-h-11 rounded bg-accent px-4 font-bold text-bg"
          >
            계속하기
          </button>
          <button
            type="button"
            aria-pressed={view === 'book'}
            onClick={() => setView(view === 'book' ? 'menu' : 'book')}
            className="min-h-11 rounded border border-muted px-4 aria-pressed:bg-white/15"
          >
            동사 도감
          </button>
        </div>
        {view === 'book' && (
          <div className="mt-3">
            <VerbBook verbs={verbs} />
          </div>
        )}
      </div>
    </section>
  );
}
