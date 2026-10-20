import { describe, expect, it } from 'vitest';
import { KeyboardControls } from './input';

/** keydown·keyup만 흉내 내는 창. */
function fakeWindow() {
  const target = new EventTarget();
  const key = (type: 'keydown' | 'keyup', code: string) => {
    const e = Object.assign(new Event(type), { code, repeat: false, preventDefault() {} });
    target.dispatchEvent(e);
  };
  return { target: target as unknown as Window, key };
}

describe('키보드 입력', () => {
  it('일시정지 중 누른 동사 키는 clearLatches로 버리고, 누르고 있는 상태는 남긴다(리뷰 6)', () => {
    const { target, key } = fakeWindow();
    const c = new KeyboardControls(target);
    key('keydown', 'KeyX');
    c.clearLatches();
    expect(c.sample()).toMatchObject({ verbHeld: true, verbPressed: false });
    key('keyup', 'KeyX');
    key('keydown', 'Space');
    expect(c.sample()).toMatchObject({ jumpHeld: true, jumpPressed: true });
    c.dispose();
  });
});
