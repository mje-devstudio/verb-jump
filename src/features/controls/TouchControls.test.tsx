// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createGameStore } from '../../game/store';
import { TouchInput } from '../../game/touchInput';
import { TouchControls } from './TouchControls';

afterEach(cleanup);

function setup() {
  const store = createGameStore();
  const input = new TouchInput();
  render(<TouchControls input={input} store={store} />);
  return { store, input };
}

describe('F10 모바일 조작 화면', () => {
  it('왼쪽 패드로 달리면서 오른쪽 점프 버튼을 동시에 누른다(두 엄지)', () => {
    const { input } = setup();
    const zone = screen.getByTestId('move-zone');
    fireEvent.pointerDown(zone, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(zone, { pointerId: 1, clientX: 140 });
    const jump = screen.getByRole('button', { name: '점프' });
    fireEvent.pointerDown(jump, { pointerId: 2 });
    expect(input.sample()).toMatchObject({ right: true, jumpHeld: true, jumpPressed: true });
    expect(jump.getAttribute('aria-pressed')).toBe('true');
    fireEvent.pointerUp(jump, { pointerId: 2 });
    fireEvent.pointerUp(zone, { pointerId: 1 });
    expect(input.sample()).toMatchObject({ right: false, jumpHeld: false });
    expect(jump.getAttribute('aria-pressed')).toBe('false');
  });

  it('동사 버튼은 능력이 있을 때만 보이고 지금 동사 이름이 적힌다', () => {
    const { store, input } = setup();
    expect(screen.queryByRole('button', { name: /동사 능력/ })).toBeNull();
    act(() => store.update({ verb: 'climb' }));
    const verb = screen.getByRole('button', { name: '동사 능력: climb' });
    expect(verb.textContent).toBe('climb');
    fireEvent.pointerDown(verb, { pointerId: 3 });
    expect(input.sample()).toMatchObject({ verbHeld: true, verbPressed: true });
    act(() => store.update({ verb: 'float' }));
    expect(screen.getByRole('button', { name: '동사 능력: float' })).toBeTruthy();
    // 능력을 잃으면 버튼이 사라지고 누르던 것도 놓는다
    act(() => store.update({ verb: null }));
    expect(screen.queryByRole('button', { name: /동사 능력/ })).toBeNull();
    expect(input.sample()).toMatchObject({ verbHeld: false });
  });

  it('길게 누르기 메뉴를 막는다', () => {
    setup();
    const zone = screen.getByTestId('move-zone');
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    zone.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});
