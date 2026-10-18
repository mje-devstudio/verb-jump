import { useEffect, useRef, useState } from 'react';
import { DEFAULT_TUNING, STEP_S, VIEW_H, VIEW_W } from '../shared/rules/tuning';
import { speak } from '../shared/lib/tts';
import { KeyboardControls } from './input';
import { grayboxLevel } from './level/grayboxLevel';
import { FixedStepLoop, LoopDriver, pauseOnHidden } from './loop';
import { GrayboxRenderer } from './render/grayboxRenderer';
import type { GameStore } from './store';
import { createWorld, drainEvents, stepWorld, type World } from './world';

type RunState = 'loading' | 'running' | 'hidden' | 'resuming';

/** 창 크기에 맞는 가장 큰 정수 배율(nearest 확대 + 레터박스). */
function integerScale(w: number, h: number): number {
  return Math.max(1, Math.floor(Math.min(w / VIEW_W, h / VIEW_H)));
}

/** 게임 알림을 React 저장소·TTS로 옮긴다. 프레임마다가 아니라 알림이 있을 때만 저장소가 바뀐다. */
function forwardEvents(world: World, store: GameStore, nextCardId: () => number): void {
  for (const e of drainEvents(world)) {
    if (e.type === 'verb_gained') {
      const entry = world.level.verbs[e.verb];
      if (!entry) continue;
      store.update({
        verb: e.verb,
        meaning: entry.meaning,
        card: { id: nextCardId(), verb: e.verb, entry, correct: e.correct },
      });
      speak(e.verb);
    }
  }
}

/**
 * PixiJS 화면과 게임 루프를 붙이는 경계 컴포넌트.
 * 프레임마다 바뀌는 값은 React 상태에 두지 않는다. React는 화면 상태(로딩·일시정지)만 안다.
 */
export function GameCanvas({ store }: { store: GameStore }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [runState, setRunState] = useState<RunState>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    void GrayboxRenderer.create().then((renderer) => {
      if (disposed) {
        renderer.destroy(); // StrictMode 이중 마운트·빠른 이탈: 초기화가 끝난 뒤 정리
        return;
      }
      const world = createWorld(grayboxLevel());
      // 개발 모드에서만 콘솔·자동 점검용으로 world를 노출한다(배포 빌드에서는 제거됨).
      if (import.meta.env.DEV) Object.assign(window, { __verbJumpWorld: world });
      const controls = new KeyboardControls();
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let cardId = 0;
      const loop = new FixedStepLoop(() =>
        stepWorld(world, controls.sample(), DEFAULT_TUNING, STEP_S),
      );
      const driver = new LoopDriver(loop, (alpha) => {
        forwardEvents(world, store, () => ++cardId);
        renderer.render(world, alpha, reducedMotion.matches);
      });

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
        driver.stop();
        stopVisibility();
        resizeObserver.disconnect();
        controls.dispose();
        renderer.destroy();
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [store]);

  return (
    <div className="game-host" ref={hostRef}>
      {runState !== 'running' && (
        <p className="game-status" role="status">
          {runState === 'loading' && '불러오는 중…'}
          {runState === 'hidden' && '일시정지'}
          {runState === 'resuming' && '3초 뒤 다시 시작해요'}
        </p>
      )}
    </div>
  );
}
