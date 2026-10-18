import { MAX_STEPS_PER_FRAME, STEP_S } from '../shared/rules/tuning';

/**
 * 고정 간격 누산기(F04). 시간 API에 묶이지 않아 단위 테스트로 결정성을 확인할 수 있다.
 * 화면 주사율(30·60·120Hz)과 상관없이 상태는 항상 STEP_S 간격으로만 갱신된다.
 */
export class FixedStepLoop {
  private acc = 0;
  /** 지금까지 실행한 스텝 수. 입력 재생·테스트의 시간축. */
  steps = 0;

  constructor(
    private readonly update: (stepIndex: number) => void,
    private readonly stepS = STEP_S,
    private readonly maxSteps = MAX_STEPS_PER_FRAME,
  ) {}

  /**
   * 흐른 시간(초)을 받아 필요한 만큼 update를 부른다.
   * @returns 그리기 보간 비율(0~1): 이전 스텝과 지금 스텝 사이 어디쯤인지
   */
  advance(elapsedS: number): number {
    this.acc += Math.max(0, elapsedS);
    let n = 0;
    // 1e-9: 1/120초를 두 번 더해도 1/60초에 조금 못 미쳐 한 스텝을 놓치는 일을 막는다.
    while (this.acc >= this.stepS - 1e-9 && n < this.maxSteps) {
      this.update(this.steps);
      this.steps++;
      this.acc -= this.stepS;
      n++;
    }
    if (n === this.maxSteps) this.acc = Math.min(this.acc, this.stepS); // 밀린 시간은 버린다
    this.acc = Math.max(0, this.acc);
    return this.acc / this.stepS;
  }

  /** 일시정지 뒤 다시 시작할 때 쌓인 시간을 버린다. */
  resetAccumulator(): void {
    this.acc = 0;
  }
}

export interface FrameClock {
  request(cb: (timeMs: number) => void): number;
  cancel(id: number): void;
}

const browserClock: FrameClock = {
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

/**
 * requestAnimationFrame으로 FixedStepLoop를 돌리고 그리기를 분리한다.
 * paused 동안에는 update를 부르지 않고, 다시 시작할 때 멈춰 있던 시간을 따라잡지 않는다.
 */
export class LoopDriver {
  private rafId: number | null = null;
  private last: number | null = null;
  private paused = false;

  constructor(
    private readonly loop: FixedStepLoop,
    private readonly render: (alpha: number) => void,
    private readonly clock: FrameClock = browserClock,
  ) {}

  start(): void {
    if (this.rafId !== null) return;
    this.last = null;
    this.rafId = this.clock.request(this.frame);
  }

  stop(): void {
    if (this.rafId !== null) this.clock.cancel(this.rafId);
    this.rafId = null;
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.last = null;
    this.loop.resetAccumulator();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  private readonly frame = (now: number): void => {
    const elapsed = this.last === null ? 0 : (now - this.last) / 1000;
    this.last = now;
    const alpha = this.paused ? 0 : this.loop.advance(elapsed);
    this.render(alpha);
    this.rafId = this.clock.request(this.frame);
  };
}

/**
 * 탭을 벗어나면 즉시 멈추고, 돌아오면 resumeDelayMs 뒤 재개한다(S2: 3초 뒤 재개).
 * @returns 해제 함수
 */
export function pauseOnHidden(
  driver: LoopDriver,
  opts: {
    resumeDelayMs?: number;
    onChange?: (state: 'hidden' | 'resuming' | 'running') => void;
  } = {},
): () => void {
  const delay = opts.resumeDelayMs ?? 3000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  // 사용자가 직접 일시정지한 상태였다면 탭에 돌아와도 자동 재개하지 않는다.
  let pausedByUser = false;
  const onVisibility = () => {
    clear();
    if (document.hidden) {
      pausedByUser = driver.isPaused;
      driver.setPaused(true);
      opts.onChange?.('hidden');
    } else if (!pausedByUser) {
      opts.onChange?.('resuming');
      timer = setTimeout(() => {
        driver.setPaused(false);
        opts.onChange?.('running');
      }, delay);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    clear();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
