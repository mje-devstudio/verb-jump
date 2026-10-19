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
  private jumpId: number | null = null;
  private verbId: number | null = null;
  private jumpLatch = false;
  private verbLatch = false;

  /** 왼쪽 절반에 엄지를 대면 그 자리에 패드가 생긴다. */
  padDown(id: number, x: number): void {
    this.pad = { id, originX: x, x };
  }

  jumpDown(id: number): void {
    if (this.jumpId === null) this.jumpLatch = true;
    this.jumpId = id;
  }

  verbDown(id: number): void {
    if (this.verbId === null) this.verbLatch = true;
    this.verbId = id;
  }

  move(id: number, x: number): void {
    const p = this.pad;
    if (!p || p.id !== id) return;
    p.x = x;
    const dx = x - p.originX;
    if (dx > PAD_RADIUS_PX) p.originX = x - PAD_RADIUS_PX;
    else if (dx < -PAD_RADIUS_PX) p.originX = x + PAD_RADIUS_PX;
  }

  /** 손가락을 떼거나 취소되면(pointerup·pointercancel) 그 손가락이 누르던 것만 놓는다. */
  up(id: number): void {
    if (this.pad?.id === id) this.pad = null;
    if (this.jumpId === id) this.jumpId = null;
    if (this.verbId === id) this.verbId = null;
  }

  /** 동사 버튼이 사라지면(능력을 잃으면) 누르던 것을 놓는다. */
  releaseVerb(): void {
    this.verbId = null;
    this.verbLatch = false;
  }

  reset(): void {
    this.pad = null;
    this.jumpId = null;
    this.verbId = null;
    this.jumpLatch = false;
    this.verbLatch = false;
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
      jumpHeld: this.jumpId !== null,
      jumpPressed: this.jumpLatch,
      verbHeld: this.verbId !== null,
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
