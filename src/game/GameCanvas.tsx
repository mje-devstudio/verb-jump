import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  DEFAULT_TUNING,
  MOBILE_STOMP_WIDTH_MUL,
  mobileTuning,
  STEP_S,
  VIEW_H,
  VIEW_W,
} from '../shared/rules/tuning';
import { speak } from '../shared/lib/tts';
import { settings } from '../features/settings/settings';
import { sfx } from './audio/sfx';
import { soundFor } from './audio/soundFor';
import { KeyboardControls } from './input';
import { FixedStepLoop, LoopDriver, PauseGate, pauseOnHidden } from './loop';
import { mergeControls, type TouchInput } from './touchInput';
import { integerScale } from './render/camera';
import { GrayboxRenderer } from './render/grayboxRenderer';
import type { GameStore } from './store';
import { syncHud } from './hudSync';
import { createWorld, stepWorld, type LevelDef } from './world';

type RunState = 'loading' | 'running' | 'hidden' | 'resuming' | 'error';

/** React → 게임 루프로 내려가는 명령. 시작·일시정지 같은 명령만 내려가고 값은 저장소로 올라온다. */
export interface GameController {
  togglePause(): void;
  /** 세로 화면처럼 플레이할 수 없는 동안 멈춘다(사용자 일시정지와 따로 센다). */
  setPortraitBlocked(on: boolean): void;
}

/**
 * PixiJS 화면과 게임 루프를 붙이는 경계 컴포넌트.
 * 프레임마다 바뀌는 값은 React 상태에 두지 않는다. React는 화면 상태(로딩·일시정지)만 안다.
 */
export function GameCanvas({
  level,
  store,
  controllerRef,
  touchInput,
  mobile = false,
  onReady,
}: {
  /** 스테이지 API(F01)로 받아 둔 레벨. 이 컴포넌트는 그리기·루프만 맡는다. */
  level: LevelDef;
  store: GameStore;
  controllerRef?: RefObject<GameController | null>;
  /** 모바일 가상 조작(F10). 있으면 키보드와 합쳐 쓴다. */
  touchInput?: TouchInput;
  /** 모바일 판정 완화: 밟기 판정 폭 +20%, 발판 끝 유예 0.15초. */
  mobile?: boolean;
  /** 게임 루프가 준비되어 controllerRef를 쓸 수 있게 된 뒤 한 번. */
  onReady?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // 콜백이 렌더마다 바뀌어도 게임(루프·렌더러)을 다시 만들지 않도록 최신 값만 ref로 읽는다
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  const [runState, setRunState] = useState<RunState>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const rendererReady = GrayboxRenderer.create();
    rendererReady.then(
      (renderer) => {
        if (disposed) {
          renderer.destroy(); // StrictMode 이중 마운트·빠른 이탈: 초기화가 끝난 뒤 정리
          return;
        }
        const world = createWorld(level);
        // 개발 모드에서만 콘솔·자동 점검용으로 world를 노출한다(배포 빌드에서는 제거됨).
        if (import.meta.env.DEV) Object.assign(window, { __verbJumpWorld: world });
        const controls = new KeyboardControls();
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let cardId = 0;
        const tuning = mobile ? mobileTuning() : DEFAULT_TUNING;
        const worldOpts = mobile ? { stompWidthMul: MOBILE_STOMP_WIDTH_MUL } : {};
        const sample = () =>
          touchInput ? mergeControls(controls.sample(), touchInput.sample()) : controls.sample();
        const loop = new FixedStepLoop(() => stepWorld(world, sample(), tuning, STEP_S, worldOpts));
        const driver = new LoopDriver(loop, (alpha) => {
          syncHud(world, store, {
            nextCardId: () => ++cardId,
            onVerbGained: (v) => {
              if (settings.get().speech) speak(v);
            },
            onEvent: (e) => {
              const name = soundFor(e);
              if (name && settings.get().sfx) sfx.play(name);
            },
          });
          renderer.render(world, alpha, reducedMotion.matches);
        });
        const gate = new PauseGate(driver);
        const togglePause = () => {
          if (world.cleared) return;
          const on = !gate.has('user');
          gate.set('user', on);
          store.update({ paused: on });
        };
        const setPortraitBlocked = (on: boolean) => {
          gate.set('portrait', on);
          touchInput?.reset();
        };
        if (controllerRef) controllerRef.current = { togglePause, setPortraitBlocked };
        const onKey = (e: KeyboardEvent) => {
          if (e.code === 'Escape' && !e.repeat) togglePause();
        };
        window.addEventListener('keydown', onKey);

        host.appendChild(renderer.canvas);
        const fit = () => {
          const k = integerScale(host.clientWidth, host.clientHeight);
          renderer.canvas.style.width = `${VIEW_W * k}px`;
          renderer.canvas.style.height = `${VIEW_H * k}px`;
        };
        fit();
        const resizeObserver = new ResizeObserver(fit);
        resizeObserver.observe(host);
        const stopVisibility = pauseOnHidden(gate, {
          onChange: (s) => {
            if (s === 'hidden') touchInput?.reset(); // 떠나 있는 동안 뗀 손가락은 이벤트가 안 온다
            setRunState(s);
          },
        });
        driver.start();
        setRunState('running');
        onReadyRef.current?.();

        cleanup = () => {
          window.removeEventListener('keydown', onKey);
          if (controllerRef) controllerRef.current = null;
          driver.stop();
          stopVisibility();
          resizeObserver.disconnect();
          controls.dispose();
          renderer.destroy();
        };
      },
      (err: unknown) => {
        console.error(err);
        // 렌더러는 만들어졌을 수 있으니 정리한다
        void rendererReady.then(
          (r) => r.destroy(),
          () => {},
        );
        if (!disposed) setRunState('error');
      },
    );

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [level, store, controllerRef, touchInput, mobile]);

  return (
    <div
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
      ref={hostRef}
    >
      {runState !== 'running' && (
        <p className="absolute rounded bg-black/70 px-3 py-1.5" role="status">
          {runState === 'loading' && '불러오는 중…'}
          {runState === 'hidden' && '일시정지'}
          {runState === 'resuming' && '3초 뒤 다시 시작해요'}
          {runState === 'error' && '게임 화면을 만들지 못했어요(WebGL). 새로고침해 주세요.'}
        </p>
      )}
    </div>
  );
}
