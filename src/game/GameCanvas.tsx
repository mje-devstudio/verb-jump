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
import { devSettings, devToolsEnabled } from '../features/devtools/devSettings';
import { levelWarnings } from '../features/devtools/levelWarnings';
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
  onVerbMet,
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
  /** 동사를 얻거나 철자 단어를 완성했을 때(F17 동사 도감 기록). 판이 도는 동안 바뀌지 않는 함수를 넘긴다. */
  onVerbMet?: (verb: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // 콜백이 렌더마다 바뀌어도 게임(루프·렌더러)을 다시 만들지 않도록 최신 값만 ref로 읽는다
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  const [runState, setRunState] = useState<RunState>('loading');
  // 게임 루프(rAF) 안의 오류를 렌더 중에 다시 던져 에러 바운더리(F13)가 잡게 한다
  const [crash, setCrash] = useState<{ error: unknown } | null>(null);
  if (crash) throw crash.error instanceof Error ? crash.error : new Error(String(crash.error));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    // 초기화 도중 만든 것을 거꾸로 정리한다. 중간에 예외가 나도 그때까지 만든 것만 정리한다(리뷰 5)
    const disposers: (() => void)[] = [];
    const cleanup = () => {
      for (const d of disposers.splice(0).reverse()) d();
    };

    GrayboxRenderer.create().then(
      (renderer) => {
        if (disposed) {
          renderer.destroy(); // StrictMode 이중 마운트·빠른 이탈: 초기화가 끝난 뒤 정리
          return;
        }
        disposers.push(() => renderer.destroy());
        try {
          start(renderer, host);
        } catch (error) {
          // then의 성공 콜백 안 예외는 실패 콜백으로 가지 않는다. 정리하고 에러 바운더리로 보낸다
          cleanup();
          setCrash({ error });
        }
      },
      (err: unknown) => {
        // 렌더러를 만들지 못했다(WebGL 미지원 등). 만들어진 것이 없으니 정리할 것도 없다
        console.error(err);
        if (!disposed) setRunState('error');
      },
    );

    function start(renderer: GrayboxRenderer, host: HTMLDivElement) {
      const world = createWorld(level);
      // 개발 모드에서만 콘솔·자동 점검용으로 world를 노출한다(배포 빌드에서는 제거됨).
      if (import.meta.env.DEV) {
        Object.assign(window, {
          __verbJumpWorld: world,
          // 대표 이미지 저장(개발 전용): 같은 작업 안에서 그리고 바로 복사해야 WebGL 버퍼가 비워지기 전에 읽힌다
          __verbJumpSaveOg: async () => {
            const { saveOgImage } = await import('../dev/ogCapture');
            renderer.render(world, 1, true);
            const snap = document.createElement('canvas');
            snap.width = renderer.canvas.width;
            snap.height = renderer.canvas.height;
            snap.getContext('2d')?.drawImage(renderer.canvas, 0, 0);
            return saveOgImage(snap);
          },
        });
      }
      const controls = new KeyboardControls();
      disposers.push(() => controls.dispose());
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let cardId = 0;
      const tuning = mobile ? mobileTuning() : DEFAULT_TUNING;
      const worldOpts = mobile ? { stompWidthMul: MOBILE_STOMP_WIDTH_MUL } : {};
      const sample = () =>
        touchInput ? mergeControls(controls.sample(), touchInput.sample()) : controls.sample();
      const loop = new FixedStepLoop(() => stepWorld(world, sample(), tuning, STEP_S, worldOpts));
      const driver = new LoopDriver(
        loop,
        (alpha) => {
          syncHud(world, store, {
            nextCardId: () => ++cardId,
            onVerbGained: (v) => {
              onVerbMet?.(v);
              // 발음을 읽는 동안 효과음을 줄여 동사 이름이 묻히지 않게 한다
              if (settings.get().speech) {
                speak(v, { onStart: () => sfx.duck(true), onEnd: () => sfx.duck(false) });
              }
            },
            onEvent: (e) => {
              const name = soundFor(e);
              if (name && settings.get().sfx) sfx.play(name);
            },
          });
          renderer.render(world, alpha, reducedMotion.matches);
        },
        undefined,
        (error) => setCrash({ error }),
      );
      // 일시정지 중 누른 점프·동사는 재개 순간 나가지 않게 버린다(리뷰 6: sleep이면 시계 벌칙)
      const gate = new PauseGate(driver, () => {
        controls.clearLatches();
        touchInput?.clearLatches();
        sfx.resume();
      });
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
      if (controllerRef) {
        controllerRef.current = { togglePause, setPortraitBlocked };
        disposers.push(() => (controllerRef.current = null));
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.code === 'Escape' && !e.repeat) togglePause();
      };
      window.addEventListener('keydown', onKey);
      disposers.push(() => window.removeEventListener('keydown', onKey));

      // F29 개발 모드: 레벨 점검 경고 자리를 맵 위에 표시(토글로 끄고 켬)
      if (devToolsEnabled()) {
        const drawMarks = () =>
          renderer.setLevelMarks(
            devSettings.get().showLevelMarks ? levelWarnings.get().warnings : [],
          );
        drawMarks();
        disposers.push(devSettings.subscribe(drawMarks), levelWarnings.subscribe(drawMarks));
      }

      host.appendChild(renderer.canvas);
      const fit = () => {
        const k = integerScale(host.clientWidth, host.clientHeight);
        renderer.canvas.style.width = `${VIEW_W * k}px`;
        renderer.canvas.style.height = `${VIEW_H * k}px`;
      };
      fit();
      const resizeObserver = new ResizeObserver(fit);
      resizeObserver.observe(host);
      disposers.push(() => resizeObserver.disconnect());
      const stopVisibility = pauseOnHidden(gate, {
        onChange: (s) => {
          if (s === 'hidden') touchInput?.reset(); // 떠나 있는 동안 뗀 손가락은 이벤트가 안 온다
          setRunState(s);
        },
      });
      disposers.push(stopVisibility);
      driver.start();
      disposers.push(() => driver.stop());
      setRunState('running');
      onReadyRef.current?.();
    }

    return () => {
      disposed = true;
      cleanup();
    };
  }, [level, store, controllerRef, touchInput, mobile, onVerbMet]);

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
