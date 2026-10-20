import type { ControlSnapshot } from './input';

/** 이동 패드: 엄지가 처음 닿은 곳에서 이만큼(CSS px) 넘게 밀어야 움직인다. */
export const PAD_DEADZONE_PX = 12;
/** 이 거리보다 멀리 밀면 패드 중심이 엄지를 따라온다 — 반대로 바꿀 때 멀리 되돌아오지 않아도 된다. */
export const PAD_RADIUS_PX = 44;

interface PadTouch {
  id: number;
  originX: number;
  x: number;
}

/**
 * 터치 입력(F10). 포인터 이벤트를 받아 게임 루프가 스텝마다 sample()로 가져가는 상태로 바꾼다.
 * React·DOM과 무관한 순수 클래스라 두 엄지 동시 입력을 단위 테스트로 확인할 수 있다.
 */
export class TouchInput {
  private pad: PadTouch | null = null;
  // 같은 버튼을 손가락 둘로 누를 수 있으니 누른 손가락을 모두 센다(하나를 떼도 나머지가 누르고 있으면 계속 누른 것, 리뷰 9)
  private readonly jumpIds = new Set<number>();
  private readonly verbIds = new Set<number>();
  private jumpLatch = false;
  private verbLatch = false;
  private readonly listeners = new Set<() => void>();

  /** 눌림·패드 상태가 바뀌면 알린다(버튼 모양·패드 그리기용). reset()처럼 화면 밖에서 바뀔 때도 알린다(리뷰 8). */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed(): void {
    for (const l of this.listeners) l();
  }

  /** 왼쪽 절반에 엄지를 대면 그 자리에 패드가 생긴다. */
  padDown(id: number, x: number): void {
    this.pad = { id, originX: x, x };
    this.changed();
  }

  jumpDown(id: number): void {
    if (this.jumpIds.size === 0) this.jumpLatch = true;
    this.jumpIds.add(id);
    this.changed();
  }

  verbDown(id: number): void {
    if (this.verbIds.size === 0) this.verbLatch = true;
    this.verbIds.add(id);
    this.changed();
  }

  get jumpHeld(): boolean {
    return this.jumpIds.size > 0;
  }

  get verbHeld(): boolean {
    return this.verbIds.size > 0;
  }

  move(id: number, x: number): void {
    const p = this.pad;
    if (!p || p.id !== id) return;
    p.x = x;
    const dx = x - p.originX;
    if (dx > PAD_RADIUS_PX) p.originX = x - PAD_RADIUS_PX;
    else if (dx < -PAD_RADIUS_PX) p.originX = x + PAD_RADIUS_PX;
    this.changed();
  }

  /** 손가락을 떼거나 취소되면(pointerup·pointercancel) 그 손가락이 누르던 것만 놓는다. */
  up(id: number): void {
    if (this.pad?.id === id) this.pad = null;
    this.jumpIds.delete(id);
    this.verbIds.delete(id);
    this.changed();
  }

  /** 동사 버튼이 사라지면(능력을 잃으면) 누르던 것을 놓는다. */
  releaseVerb(): void {
    this.verbIds.clear();
    this.verbLatch = false;
    this.changed();
  }

  /** 일시정지 동안 누른 점프·동사 입력을 버린다(재개 순간 능력이 나가지 않게, 리뷰 6). */
  clearLatches(): void {
    this.jumpLatch = false;
    this.verbLatch = false;
  }

  reset(): void {
    this.pad = null;
    this.jumpIds.clear();
    this.verbIds.clear();
    this.jumpLatch = false;
    this.verbLatch = false;
    this.changed();
  }

  /** 지금 패드 방향(-1·0·1). 그리기(손잡이 위치)에도 쓴다. */
  direction(): -1 | 0 | 1 {
    if (!this.pad) return 0;
    const dx = this.pad.x - this.pad.originX;
    if (dx > PAD_DEADZONE_PX) return 1;
    if (dx < -PAD_DEADZONE_PX) return -1;
    return 0;
  }

  padView(): { originX: number; x: number } | null {
    return this.pad ? { originX: this.pad.originX, x: this.pad.x } : null;
  }

  sample(): ControlSnapshot {
    const dir = this.direction();
    const snap: ControlSnapshot = {
      left: dir < 0,
      right: dir > 0,
      jumpHeld: this.jumpHeld,
      jumpPressed: this.jumpLatch,
      verbHeld: this.verbHeld,
      verbPressed: this.verbLatch,
    };
    this.jumpLatch = false;
    this.verbLatch = false;
    return snap;
  }
}

/** 키보드와 터치를 함께 쓴다(태블릿+키보드, 개발 중 확인). 둘 중 하나라도 누르면 누른 것. */
export function mergeControls(a: ControlSnapshot, b: ControlSnapshot): ControlSnapshot {
  return {
    left: a.left || b.left,
    right: a.right || b.right,
    jumpHeld: a.jumpHeld || b.jumpHeld,
    jumpPressed: a.jumpPressed || b.jumpPressed,
    verbHeld: a.verbHeld || b.verbHeld,
    verbPressed: a.verbPressed || b.verbPressed,
  };
}
