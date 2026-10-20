// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { KeyboardControls } from './input';

describe('키보드 입력과 입력란', () => {
  it('볼륨 슬라이더에 포커스가 있으면 방향키를 게임이 가로채지 않는다', () => {
    const c = new KeyboardControls(window);
    const slider = document.createElement('input');
    slider.type = 'range';
    document.body.append(slider);
    const e = new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true, cancelable: true });
    slider.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(c.sample().right).toBe(false);
    // 입력란 밖에서는 게임 키
    const g = new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true, cancelable: true });
    document.body.dispatchEvent(g);
    expect(g.defaultPrevented).toBe(true);
    expect(c.sample().right).toBe(true);
    c.dispose();
    slider.remove();
  });
});
