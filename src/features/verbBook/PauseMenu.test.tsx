// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameStore } from '../../game/store';
import { COMMUTE_STAGE } from '../../shared/stages/commute';
import { metVerbs } from './metVerbs';
import { PauseMenu } from './PauseMenu';

const speak = vi.hoisted(() => vi.fn());
vi.mock('../../shared/lib/tts', () => ({ speak }));

const verbs = COMMUTE_STAGE.verbs;

beforeEach(() => {
  window.localStorage.clear();
  metVerbs.reload();
});
afterEach(() => {
  cleanup();
  speak.mockReset();
});

function setup() {
  const store = createGameStore();
  const onResume = vi.fn();
  render(<PauseMenu store={store} verbs={verbs} onResume={onResume} />);
  return { store, onResume };
}

describe('F17 일시정지 메뉴와 동사 도감', () => {
  it('멈추면 메뉴가 열리고 계속하기에 포커스, 누르면 계속한다', () => {
    const { store, onResume } = setup();
    expect(screen.queryByRole('region', { name: '일시정지 메뉴' })).toBeNull();
    act(() => store.update({ paused: true }));
    const resume = screen.getByRole('button', { name: '계속하기' });
    expect(document.activeElement).toBe(resume);
    fireEvent.click(resume);
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('만난 동사는 뜻·발음·예문·다른 뜻을 보여 주고, 아직 안 만난 동사는 가린다', () => {
    const { store } = setup();
    act(() => {
      metVerbs.add('break');
      metVerbs.add('sleep');
      store.update({ paused: true });
    });
    fireEvent.click(screen.getByRole('button', { name: '동사 도감' }));
    const book = screen.getByRole('region', { name: /동사 도감/ });
    expect(within(book).getByText('2 / 6')).toBeTruthy();
    const items = within(book).getAllByRole('listitem');
    expect(items).toHaveLength(6);
    const brk = items.find((li) => li.textContent?.startsWith('break'));
    expect(brk?.textContent).toContain(verbs.break?.phonetic);
    expect(brk?.textContent).toContain('다른 뜻');
    expect(brk?.textContent).toContain('brake와(과) 발음이 같아요');
    const sleep = items.find((li) => li.textContent?.startsWith('sleep'));
    expect(sleep?.textContent).toContain('오답 동사');
    expect(items.filter((li) => li.textContent?.includes('아직 만나지 않은 동사'))).toHaveLength(4);
  });

  it('듣기를 누르면 그 동사를 읽어 준다', () => {
    const { store } = setup();
    act(() => {
      metVerbs.add('climb');
      store.update({ paused: true });
    });
    fireEvent.click(screen.getByRole('button', { name: '동사 도감' }));
    fireEvent.click(screen.getByRole('button', { name: 'climb 발음 듣기' }));
    expect(speak).toHaveBeenCalledWith('climb');
  });

  it('다시 멈추면 도감이 닫힌 메뉴부터 보인다', () => {
    const { store } = setup();
    act(() => store.update({ paused: true }));
    fireEvent.click(screen.getByRole('button', { name: '동사 도감' }));
    act(() => store.update({ paused: false }));
    act(() => store.update({ paused: true }));
    expect(screen.queryByRole('region', { name: /동사 도감/ })).toBeNull();
  });
});

describe('만난 동사 저장', () => {
  it('처음 만난 순서로 한 번씩만 저장하고, 다시 읽어도 남는다', () => {
    metVerbs.add('climb');
    metVerbs.add('sleep');
    metVerbs.add('climb');
    expect(metVerbs.get()).toEqual(['climb', 'sleep']);
    metVerbs.reload();
    expect(metVerbs.get()).toEqual(['climb', 'sleep']);
  });

  it('저장된 값이 깨져 있으면 빈 도감으로 시작한다', () => {
    window.localStorage.setItem('verb-jump:met-verbs', '{"x":1}');
    metVerbs.reload();
    expect(metVerbs.get()).toEqual([]);
  });
});
