import { useEffect, useRef, useState } from 'react';
import type { VerbEntry } from '../../game/data/verbs';
import type { GameSnapshot, GameStore } from '../../game/store';
import { useGameStore } from '../hud/useGameStore';
import { VerbBook } from './VerbBook';
import { VolumeControls } from '../settings/VolumeControls';

const selectPaused = (s: GameSnapshot) => s.paused;

/**
 * 일시정지 메뉴(F17). 계속하기, 동사 도감, 소리(볼륨), 처음 화면으로(그만두기). 게임은 멈춘 채라 천천히 읽어도 된다.
 * 열리면 계속하기 버튼에 포커스를 둔다(키보드는 Enter로 누른다. Space는 게임 점프 키라 막혀 있다).
 */
export function PauseMenu({
  store,
  verbs,
  touch = false,
  onResume,
  onQuit,
}: {
  store: GameStore;
  verbs: Readonly<Record<string, VerbEntry>>;
  touch?: boolean;
  onResume: () => void;
  /** 이번 판을 그만두고 처음 화면(타이틀)으로. */
  onQuit: () => void;
}) {
  const paused = useGameStore(store, selectPaused);
  // 멈출 때마다 새로 그려 메뉴부터 시작한다
  return paused ? (
    <PausePanel verbs={verbs} touch={touch} onResume={onResume} onQuit={onQuit} />
  ) : null;
}

function PausePanel({
  verbs,
  touch,
  onResume,
  onQuit,
}: {
  verbs: Readonly<Record<string, VerbEntry>>;
  touch: boolean;
  onResume: () => void;
  onQuit: () => void;
}) {
  const [view, setView] = useState<'menu' | 'book' | 'sound' | 'quit'>('menu');
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
        <div className="mt-3 flex flex-wrap justify-center gap-2">
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
          <button
            type="button"
            aria-pressed={view === 'sound'}
            onClick={() => setView(view === 'sound' ? 'menu' : 'sound')}
            className="min-h-11 rounded border border-muted px-4 aria-pressed:bg-white/15"
          >
            소리
          </button>
          <button
            type="button"
            aria-pressed={view === 'quit'}
            onClick={() => setView(view === 'quit' ? 'menu' : 'quit')}
            className="min-h-11 rounded border border-muted px-4 aria-pressed:bg-white/15"
          >
            처음 화면으로
          </button>
        </div>
        {/* 진행이 사라지므로 한 번 더 묻는다 */}
        {view === 'quit' && (
          <div
            className="mt-3 rounded border border-late/60 px-3 py-2"
            role="group"
            aria-label="그만두기 확인"
          >
            <p>이번 판을 그만둘까요? 모은 코인과 철자는 사라져요.</p>
            <div className="mt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={onQuit}
                className="min-h-11 rounded bg-late px-4 font-bold text-bg"
              >
                그만두기
              </button>
              <button
                type="button"
                onClick={() => setView('menu')}
                className="min-h-11 rounded border border-muted px-4"
              >
                아니요
              </button>
            </div>
          </div>
        )}
        {view === 'sound' && (
          <div className="mt-3 flex justify-center">
            <VolumeControls />
          </div>
        )}
        {view === 'book' && (
          <div className="mt-3">
            <VerbBook verbs={verbs} />
          </div>
        )}
      </div>
    </section>
  );
}
