import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TUNING, STEP_S } from '../shared/rules/tuning';
import { grayboxLevel } from './level/grayboxLevel';
import { NO_CONTROLS } from './input';
import { FixedStepLoop, LoopDriver, PauseGate, pauseOnHidden, type FrameClock } from './loop';
import { createWorld, stepWorld } from './world';

/** 스텝 번호로 정해지는 입력: 오른쪽으로 달리며 0.2초마다 점프. */
const scripted = (i: number) => ({
  ...NO_CONTROLS,
  right: true,
  jumpPressed: i % 12 === 0,
  jumpHeld: i % 12 < 8,
});

function simulate(frameS: number, totalS: number) {
  const world = createWorld(grayboxLevel());
  const loop = new FixedStepLoop((i) => stepWorld(world, scripted(i), DEFAULT_TUNING, STEP_S));
  const frames = Math.round(totalS / frameS);
  for (let f = 0; f < frames; f++) loop.advance(frameS);
  return { steps: loop.steps, x: world.player.x, y: world.player.y };
}

describe('F04 게임 루프', () => {
  it('프레임 간격이 1/30초든 1/120초든 같은 입력이면 같은 위치다', () => {
    const at60 = simulate(1 / 60, 3);
    const at30 = simulate(1 / 30, 3);
    const at120 = simulate(1 / 120, 3);
    expect(at60.steps).toBe(180);
    expect(at30).toEqual(at60);
    expect(at120).toEqual(at60);
  });

  it('불규칙한 프레임 간격에서도 스텝 수가 시간에 맞는다', () => {
    const loop = new FixedStepLoop(() => {});
    const gaps = [0.016, 0.017, 0.033, 0.008, 0.009, 0.05, 0.001];
    let total = 0;
    for (let k = 0; k < 60; k++) {
      const g = gaps[k % gaps.length] ?? 0;
      total += g;
      loop.advance(g);
    }
    expect(Math.abs(loop.steps - total / STEP_S)).toBeLessThanOrEqual(1);
  });

  it('긴 공백 뒤에는 한 프레임에 최대 5스텝만 따라잡는다', () => {
    let n = 0;
    const loop = new FixedStepLoop(() => n++);
    loop.advance(2);
    expect(n).toBe(5);
  });

  it('보간 비율은 0~1 사이다', () => {
    const loop = new FixedStepLoop(() => {});
    const a = loop.advance(STEP_S * 1.5);
    expect(a).toBeGreaterThan(0.4);
    expect(a).toBeLessThan(0.6);
  });
});

describe('F04 일시정지(LoopDriver)', () => {
  /** 손으로 넘기는 가짜 rAF 시계. */
  function fakeClock() {
    let cb: ((t: number) => void) | null = null;
    const clock: FrameClock = {
      request: (f) => {
        cb = f;
        return 1;
      },
      cancel: () => {
        cb = null;
      },
    };
    return {
      clock,
      tick: (t: number) => {
        const f = cb;
        cb = null;
        f?.(t);
      },
    };
  }

  it('멈춘 동안 갱신하지 않고, 다시 시작해도 멈춘 시간을 따라잡지 않는다', () => {
    let steps = 0;
    let renders = 0;
    const loop = new FixedStepLoop(() => steps++);
    const { clock, tick } = fakeClock();
    const driver = new LoopDriver(loop, () => renders++, clock);
    driver.start();
    tick(0);
    tick(1000 / 60);
    expect(steps).toBe(1);

    driver.setPaused(true);
    tick(1000);
    tick(5000);
    expect(steps).toBe(1);
    expect(renders).toBe(4); // 멈춰도 그리기는 계속(일시정지 화면)

    driver.setPaused(false);
    tick(5000 + 1000 / 60);
    expect(steps).toBe(1); // 재개 첫 프레임은 기준 시각만 잡는다
    tick(5000 + 2000 / 60);
    expect(steps).toBe(2);
  });

  it('갱신 중 오류가 나면 루프를 멈추고 onError로 넘긴다(rAF 오류는 React가 잡지 못하므로)', () => {
    const errors: unknown[] = [];
    let steps = 0;
    const { clock, tick } = fakeClock();
    const driver = new LoopDriver(
      new FixedStepLoop(() => {
        steps++;
        throw new Error('스텝 오류');
      }),
      () => {},
      clock,
      (e) => errors.push(e),
    );
    driver.start();
    tick(0);
    tick(1000 / 60);
    tick(2000 / 60);
    expect(errors).toHaveLength(1);
    expect(steps).toBe(1);
  });

  it('stop 뒤에는 프레임을 요청하지 않는다', () => {
    let steps = 0;
    const { clock, tick } = fakeClock();
    const driver = new LoopDriver(new FixedStepLoop(() => steps++), () => {}, clock);
    driver.start();
    tick(0);
    driver.stop();
    tick(1000);
    expect(steps).toBe(0);
  });
});

describe('F04 일시정지 사유와 탭 이탈', () => {
  afterEach(() => vi.useRealTimers());

  /** visibilitychange를 손으로 보내는 가짜 문서. */
  function fakeDoc() {
    let listener: (() => void) | null = null;
    const doc = {
      hidden: false,
      addEventListener: (_: string, l: () => void) => {
        listener = l;
      },
      removeEventListener: () => {
        listener = null;
      },
    };
    const setHidden = (h: boolean) => {
      doc.hidden = h;
      listener?.();
    };
    return { doc: doc as unknown as Document, setHidden };
  }

  it('사유가 하나라도 있으면 멈추고 모두 풀려야 돈다', () => {
    const paused: boolean[] = [];
    const gate = new PauseGate({ setPaused: (p) => paused.push(p) });
    gate.set('user', true);
    gate.set('portrait', true);
    gate.set('user', false);
    expect(paused.at(-1)).toBe(true);
    gate.set('portrait', false);
    expect(paused.at(-1)).toBe(false);
  });

  it('모든 사유가 풀려 다시 돌 때만 onResume을 한 번 부른다', () => {
    let resumed = 0;
    const gate = new PauseGate({ setPaused: () => {} }, () => resumed++);
    gate.set('portrait', false); // 멈춘 적 없음
    gate.set('user', true);
    gate.set('portrait', true);
    gate.set('user', false); // 아직 세로 화면
    expect(resumed).toBe(0);
    gate.set('portrait', false);
    expect(resumed).toBe(1);
  });

  it('탭을 벗어나면 바로 멈추고, 돌아오면 3초 뒤 다시 돈다', () => {
    vi.useFakeTimers();
    const states: string[] = [];
    const paused: boolean[] = [];
    const gate = new PauseGate({ setPaused: (p) => paused.push(p) });
    const { doc, setHidden } = fakeDoc();
    pauseOnHidden(gate, { doc, onChange: (s) => states.push(s) });
    setHidden(true);
    expect(paused.at(-1)).toBe(true);
    setHidden(false);
    vi.advanceTimersByTime(2999);
    expect(paused.at(-1)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(paused.at(-1)).toBe(false);
    expect(states).toEqual(['hidden', 'resuming', 'running']);
  });

  it('사용자가 멈춘 상태였다면 탭에서 돌아와도 저절로 시작하지 않는다', () => {
    vi.useFakeTimers();
    const paused: boolean[] = [];
    const gate = new PauseGate({ setPaused: (p) => paused.push(p) });
    const { doc, setHidden } = fakeDoc();
    pauseOnHidden(gate, { doc });
    gate.set('user', true);
    setHidden(true);
    setHidden(false);
    vi.advanceTimersByTime(5000);
    expect(paused.at(-1)).toBe(true);
  });

  it('3초를 기다리는 중에 다시 떠나면 재개 예약을 취소한다', () => {
    vi.useFakeTimers();
    const paused: boolean[] = [];
    const gate = new PauseGate({ setPaused: (p) => paused.push(p) });
    const { doc, setHidden } = fakeDoc();
    pauseOnHidden(gate, { doc });
    setHidden(true);
    setHidden(false);
    vi.advanceTimersByTime(1000);
    setHidden(true);
    vi.advanceTimersByTime(5000);
    expect(paused.at(-1)).toBe(true);
  });
});
