import type { PlayerInput } from './physics/player';

export interface ControlSnapshot extends PlayerInput {
  /** 동사 능력 버튼(X) — F07에서 쓴다. */
  verbHeld: boolean;
  verbPressed: boolean;
}

export const NO_CONTROLS: Readonly<ControlSnapshot> = Object.freeze({
  left: false,
  right: false,
  jumpPressed: false,
  jumpHeld: false,
  verbHeld: false,
  verbPressed: false,
});

const LEFT = new Set(['ArrowLeft']);
const RIGHT = new Set(['ArrowRight']);
const JUMP = new Set(['Space', 'KeyZ']);
const VERB = new Set(['KeyX']);
const GAME_KEYS = new Set([...LEFT, ...RIGHT, ...JUMP, ...VERB, 'ArrowUp', 'ArrowDown']);

/**
 * 키보드 상태를 모아 두었다가 게임 루프가 스텝마다 sample()로 가져간다.
 * 한 스텝 사이에 눌렀다 뗀 짧은 탭도 jumpPressed로 놓치지 않는다.
 */
const isFormField = (t: EventTarget | null) =>
  typeof HTMLElement !== 'undefined' &&
  t instanceof HTMLElement &&
  (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');

export class KeyboardControls {
  private readonly down = new Set<string>();
  private jumpLatch = false;
  private verbLatch = false;

  constructor(private readonly target: Window = window) {
    target.addEventListener('keydown', this.onDown);
    target.addEventListener('keyup', this.onUp);
    target.addEventListener('blur', this.onBlur);
  }

  sample(): ControlSnapshot {
    const has = (keys: Set<string>) => [...keys].some((k) => this.down.has(k));
    const snap: ControlSnapshot = {
      left: has(LEFT),
      right: has(RIGHT),
      jumpHeld: has(JUMP),
      jumpPressed: this.jumpLatch,
      verbHeld: has(VERB),
      verbPressed: this.verbLatch,
    };
    this.jumpLatch = false;
    this.verbLatch = false;
    return snap;
  }

  /** 일시정지 동안 누른 점프·동사 입력을 버린다(재개 순간 능력이 나가지 않게, 리뷰 6). 누르고 있는 키는 그대로. */
  clearLatches(): void {
    this.jumpLatch = false;
    this.verbLatch = false;
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onDown);
    this.target.removeEventListener('keyup', this.onUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.down.clear();
  }

  private readonly onDown = (e: KeyboardEvent): void => {
    // 볼륨 슬라이더 같은 입력란에 포커스가 있으면 그 입력란이 키를 쓴다(방향키로 볼륨 조절)
    if (isFormField(e.target)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault(); // 스페이스·방향키 스크롤 막기
    if (e.repeat) return;
    this.down.add(e.code);
    if (JUMP.has(e.code)) this.jumpLatch = true;
    if (VERB.has(e.code)) this.verbLatch = true;
  };

  private readonly onUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };

  /** 창이 포커스를 잃으면 keyup이 오지 않으므로 눌린 키를 모두 놓는다. */
  private readonly onBlur = (): void => {
    this.down.clear();
  };
}
