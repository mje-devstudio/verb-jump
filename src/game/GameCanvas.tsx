import { useEffect, useRef, useState, type RefObject } from 'react';
import { DEFAULT_TUNING, STEP_S, VIEW_H, VIEW_W } from '../shared/rules/tuning';
import { speak } from '../shared/lib/tts';
import { KeyboardControls } from './input';
import { COMMUTE_VERBS } from './data/verbs';
import { parseTiledMap } from './level/tiled';
import { FixedStepLoop, LoopDriver, pauseOnHidden } from './loop';
import { GrayboxRenderer } from './render/grayboxRenderer';
import type { GameStore } from './store';
import { syncHud } from './hudSync';
import { createWorld, stepWorld } from './world';

type RunState = 'loading' | 'running' | 'hidden' | 'resuming' | 'error';

/** 1스테이지 맵. 스테이지 API(F01)가 들어오면 응답의 map 주소로 바뀐다. */
async function loadCommuteLevel() {
  const res = await fetch('/maps/commute.tmj');
  if (!res.ok) throw new Error(`맵 요청 실패: ${res.status}`);
  return parseTiledMap((await res.json()) as unknown, COMMUTE_VERBS);
}

/** 창 크기에 맞는 가장 큰 정수 배율(nearest 확대 + 레터박스). */
function integerScale(w: number, h: number): number {
  return Math.max(1, Math.floor(Math.min(w / VIEW_W, h / VIEW_H)));
}

/** React → 게임 루프로 내려가는 명령. 시작·일시정지 같은 명령만 내려가고 값은 저장소로 올라온다. */
export interface GameController {
  togglePause(): void;
}

/**
 * PixiJS 화면과 게임 루프를 붙이는 경계 컴포넌트.
 * 프레임마다 바뀌는 값은 React 상태에 두지 않는다. React는 화면 상태(로딩·일시정지)만 안다.
 */
export function GameCanvas({
  store,
  controllerRef,
}: {
  store: GameStore;
  controllerRef?: RefObject<GameController | null>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [runState, setRunState] = useState<RunState>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const rendererReady = GrayboxRenderer.create();
    Promise.all([rendererReady, loadCommuteLevel()]).then(
      ([renderer, level]) => {
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
        const loop = new FixedStepLoop(() =>
          stepWorld(world, controls.sample(), DEFAULT_TUNING, STEP_S),
        );
        const driver = new LoopDriver(loop, (alpha) => {
          syncHud(world, store, { nextCardId: () => ++cardId, onVerbGained: speak });
          renderer.render(world, alpha, reducedMotion.matches);
        });
        const togglePause = () => {
          if (world.cleared) return;
          driver.setPaused(!driver.isPaused);
          store.update({ paused: driver.isPaused });
        };
        if (controllerRef) controllerRef.current = { togglePause };
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
        const stopVisibility = pauseOnHidden(driver, {
          onChange: (s) => setRunState(s),
        });
        driver.start();
        setRunState('running');

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
  }, [store, controllerRef]);

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
          {runState === 'error' && '맵을 불러오지 못했어요. 새로고침해 주세요.'}
        </p>
      )}
    </div>
  );
}
