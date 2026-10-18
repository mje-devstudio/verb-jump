import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING, STEP_S } from '../shared/rules/tuning';
import { grayboxLevel } from './level/grayboxLevel';
import { NO_CONTROLS } from './input';
import { FixedStepLoop, LoopDriver, type FrameClock } from './loop';
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
