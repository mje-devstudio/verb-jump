// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameStore } from '../../game/store';
import { COMMUTE_STAGE } from '../../shared/stages/commute';
import { WORD_CARD_MS, WordCard } from './WordCard';

function verb(name: string) {
  const entry = COMMUTE_STAGE.verbs[name];
  if (!entry) throw new Error(`동사 데이터 없음: ${name}`);
  return entry;
}
const climb = verb('climb');

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('F06 단어 카드', () => {
  it('동사를 얻으면 단어·발음·뜻·예문을 띄우고 1~2초 뒤 사라진다', () => {
    expect(WORD_CARD_MS).toBeGreaterThanOrEqual(1000);
    expect(WORD_CARD_MS).toBeLessThanOrEqual(2000);
    const store = createGameStore();
    render(<WordCard store={store} />);
    expect(screen.queryByRole('status')).toBeNull();

    act(() => store.update({ card: { id: 1, verb: 'climb', entry: climb, correct: true } }));
    const card = screen.getByRole('status');
    expect(card.textContent).toContain('climb');
    expect(card.textContent).toContain(climb.phonetic);
    expect(card.textContent).toContain(climb.meaning);
    expect(card.textContent).toContain(climb.example);

    act(() => vi.advanceTimersByTime(WORD_CARD_MS - 1));
    expect(screen.queryByRole('status')).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('카드가 떠 있는 동안 새 동사를 얻으면 새 카드로 바뀌고 시간을 다시 센다', () => {
    const store = createGameStore();
    render(<WordCard store={store} />);
    act(() => store.update({ card: { id: 1, verb: 'climb', entry: climb, correct: true } }));
    act(() => vi.advanceTimersByTime(WORD_CARD_MS - 100));
    act(() =>
      store.update({ card: { id: 2, verb: 'brake', entry: verb('brake'), correct: false } }),
    );
    act(() => vi.advanceTimersByTime(200));
    // brake 카드는 break와 발음이 같다는 걸 짚는다
    expect(screen.getByRole('status').textContent).toContain('발음이 같아요');
    act(() => vi.advanceTimersByTime(WORD_CARD_MS));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
