import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { GameSnapshot, GameStore } from '../../game/store';
import { PAD_DEADZONE_PX, PAD_RADIUS_PX, type TouchInput } from '../../game/touchInput';
import { useGameStore } from '../hud/useGameStore';

const selectVerb = (s: GameSnapshot) => s.verb;

/**
 * 모바일 가상 조작(F10). 가로 화면 두 엄지:
 * 왼쪽 절반 = 엄지를 대면 그 자리에 생기는 좌우 이동 패드, 오른쪽 = 큰 점프 버튼과 지금 동사가 적힌 동사 버튼.
 * 입력은 React 상태가 아니라 TouchInput에 바로 쓴다(게임 루프가 스텝마다 읽는다).
 */
export function TouchControls({ input, store }: { input: TouchInput; store: GameStore }) {
  const verb = useGameStore(store, selectVerb);
  const padRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [jumpDown, setJumpDown] = useState(false);
  const [verbDown, setVerbDown] = useState(false);

  const drawPad = () => {
    const view = input.padView();
    const pad = padRef.current;
    const knob = knobRef.current;
    if (!pad || !knob) return;
    pad.style.display = view ? 'block' : 'none';
    if (!view) return;
    const zone = pad.parentElement?.getBoundingClientRect();
    pad.style.left = `${view.originX - (zone?.left ?? 0)}px`;
    const dx = Math.max(-PAD_RADIUS_PX, Math.min(PAD_RADIUS_PX, view.x - view.originX));
    knob.style.transform = `translate(calc(-50% + ${dx}px), -50%)`;
    knob.dataset.active = String(Math.abs(dx) > PAD_DEADZONE_PX);
  };

  // 눌림 표시는 입력 상태를 그대로 따른다. 탭 이탈·세로 화면으로 reset()되면 버튼·패드도 함께 풀린다(리뷰 8)
  useEffect(() => {
    const sync = () => {
      setJumpDown(input.jumpHeld);
      setVerbDown(input.verbHeld);
      drawPad();
    };
    sync();
    return input.subscribe(sync);
    // drawPad는 ref만 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // 능력을 잃어 동사 버튼이 사라지면 누르던 것을 놓는다
  useEffect(() => {
    if (!verb) input.releaseVerb();
  }, [verb, input]);

  // iOS Safari 핀치 확대 막기(touch-action만으로는 막히지 않는다)
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', stop);
    return () => document.removeEventListener('gesturestart', stop);
  }, []);

  const capture = (e: PointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 select-none [-webkit-touch-callout:none] [touch-action:none]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 왼쪽 절반: 이동 패드 */}
      <div
        data-testid="move-zone"
        aria-label="이동 패드: 엄지를 대고 좌우로 밀기"
        className="pointer-events-auto absolute inset-y-0 left-0 w-1/2"
        onPointerDown={(e) => {
          capture(e);
          input.padDown(e.pointerId, e.clientX);
        }}
        onPointerMove={(e) => {
          input.move(e.pointerId, e.clientX);
        }}
        onPointerUp={(e) => {
          input.up(e.pointerId);
        }}
        onPointerCancel={(e) => {
          input.up(e.pointerId);
        }}
      >
        <div
          ref={padRef}
          className="absolute bottom-[max(56px,calc(env(safe-area-inset-bottom)+40px))] hidden size-28 -translate-x-1/2 rounded-full border-2 border-white/40 bg-white/10"
        >
          <div
            ref={knobRef}
            className="absolute left-1/2 top-1/2 size-12 rounded-full bg-white/50 data-[active=true]:bg-accent"
          />
        </div>
      </div>

      {/* 오른쪽: 동사 버튼과 점프 버튼 (44pt 이상) */}
      <div className="pointer-events-auto absolute bottom-[max(16px,env(safe-area-inset-bottom))] right-[max(16px,env(safe-area-inset-right))] flex items-end gap-3">
        {verb && (
          <button
            type="button"
            aria-label={`동사 능력: ${verb}`}
            aria-pressed={verbDown}
            className="min-h-16 min-w-20 rounded-2xl border-2 border-accent bg-panel/80 px-3 text-lg font-bold text-accent aria-pressed:bg-accent aria-pressed:text-bg"
            onPointerDown={(e) => {
              capture(e);
              input.verbDown(e.pointerId);
            }}
            onPointerUp={(e) => {
              input.up(e.pointerId);
            }}
            onPointerCancel={(e) => {
              input.up(e.pointerId);
            }}
          >
            {verb}
          </button>
        )}
        <button
          type="button"
          aria-label="점프"
          aria-pressed={jumpDown}
          className="size-24 rounded-full border-2 border-white/60 bg-white/15 text-lg font-bold aria-pressed:bg-white/50 aria-pressed:text-bg"
          onPointerDown={(e) => {
            capture(e);
            input.jumpDown(e.pointerId);
          }}
          onPointerUp={(e) => {
            input.up(e.pointerId);
          }}
          onPointerCancel={(e) => {
            input.up(e.pointerId);
          }}
        >
          점프
        </button>
      </div>
    </div>
  );
}
