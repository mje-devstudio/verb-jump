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
    /** 갱신·그리기 중 오류. React 에러 바운더리는 rAF 안의 오류를 잡지 못하므로 여기서 넘긴다. */
    private readonly onError?: (error: unknown) => void,
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
    try {
      const alpha = this.paused ? 0 : this.loop.advance(elapsed);
      this.render(alpha);
    } catch (e) {
      // 같은 오류가 매 프레임 반복되지 않게 멈추고 알린다
      this.rafId = null;
      if (this.onError) this.onError(e);
      else throw e;
      return;
    }
    this.rafId = this.clock.request(this.frame);
  };
}

/**
 * 일시정지 사유를 따로 센다(사용자 · 탭 이탈 · 세로 화면). 하나라도 있으면 멈추고, 모두 풀려야 다시 돈다.
 * 예: 사용자가 Esc로 멈춘 뒤 탭을 다녀와도 저절로 다시 시작하지 않는다.
 */
export type PauseReason = 'user' | 'hidden' | 'portrait';

export class PauseGate {
  private readonly reasons = new Set<PauseReason>();

  constructor(private readonly driver: Pick<LoopDriver, 'setPaused'>) {}

  set(reason: PauseReason, on: boolean): void {
    if (on) this.reasons.add(reason);
    else this.reasons.delete(reason);
    this.driver.setPaused(this.reasons.size > 0);
  }

  has(reason: PauseReason): boolean {
    return this.reasons.has(reason);
  }
}

/**
 * 탭을 벗어나면 즉시 멈추고, 돌아오면 resumeDelayMs 뒤 'hidden' 사유를 푼다(S2: 3초 뒤 재개).
 * @returns 해제 함수
 */
export function pauseOnHidden(
  gate: Pick<PauseGate, 'set'>,
  opts: {
    resumeDelayMs?: number;
    onChange?: (state: 'hidden' | 'resuming' | 'running') => void;
    doc?: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>;
  } = {},
): () => void {
  const delay = opts.resumeDelayMs ?? 3000;
  const doc = opts.doc ?? document;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const onVisibility = () => {
    clear();
    if (doc.hidden) {
      gate.set('hidden', true);
      opts.onChange?.('hidden');
    } else {
      opts.onChange?.('resuming');
      timer = setTimeout(() => {
        gate.set('hidden', false);
        opts.onChange?.('running');
      }, delay);
    }
  };
  doc.addEventListener('visibilitychange', onVisibility);
  return () => {
    clear();
    doc.removeEventListener('visibilitychange', onVisibility);
  };
}
