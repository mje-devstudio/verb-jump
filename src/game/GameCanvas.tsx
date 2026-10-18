import { useEffect, useRef, useState } from 'react';
import { DEFAULT_TUNING, STEP_S, VIEW_H, VIEW_W } from '../shared/rules/tuning';
import { KeyboardControls } from './input';
import { GRAYBOX_LEVEL } from './level/grayboxLevel';
import { parseAsciiMap } from './level/tilemap';
import { FixedStepLoop, LoopDriver, pauseOnHidden } from './loop';
import { GrayboxRenderer } from './render/grayboxRenderer';
import { createWorld, stepWorld } from './world';

type RunState = 'loading' | 'running' | 'hidden' | 'resuming';

/** 창 크기에 맞는 가장 큰 정수 배율(nearest 확대 + 레터박스). */
function integerScale(w: number, h: number): number {
  return Math.max(1, Math.floor(Math.min(w / VIEW_W, h / VIEW_H)));
}

/**
 * PixiJS 화면과 게임 루프를 붙이는 경계 컴포넌트.
 * 프레임마다 바뀌는 값은 React 상태에 두지 않는다. React는 화면 상태(로딩·일시정지)만 안다.
 */
export function GameCanvas() {
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
      const { map, spawn } = parseAsciiMap(GRAYBOX_LEVEL);
      const world = createWorld(map, spawn);
      const controls = new KeyboardControls();
      const loop = new FixedStepLoop(() =>
        stepWorld(world, controls.sample(), DEFAULT_TUNING, STEP_S),
      );
      const driver = new LoopDriver(loop, (alpha) => renderer.render(world, alpha));

      renderer.setMap(map);
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
  }, []);

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
