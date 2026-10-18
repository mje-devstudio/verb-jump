// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResultData } from '../../game/result';
import { COMMUTE_VERBS } from '../../game/data/verbs';

import { ResultScreen } from './ResultScreen';

afterEach(cleanup);

const verb = (v: string) => {
  const entry = COMMUTE_VERBS[v];
  if (!entry) throw new Error(v);
  return { verb: v, entry };
};

const base: ResultData = {
  arrival: '8:59:40',
  clearMs: 160_000,
  score: { coin: 380, word: 500, time: 200, total: 1080, onTime: true },
  coins: 38,
  word: 'BREAK',
  wordComplete: true,
  spell: 'B R E A K',
  learned: [verb('climb'), verb('break')],
  wrong: [verb('brake')],
};

describe('F11 결과 화면', () => {
  it('점수 내역(코인·철자·시간)과 출근 시각, 정시 도장을 보여 준다', () => {
    render(<ResultScreen result={base} newBest={false} onRetry={vi.fn()} onTitle={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('8:59:40 출근');
    expect(screen.getByLabelText('정시 도장')).toBeTruthy();
    expect(screen.getByText('코인 38개 × 10')).toBeTruthy();
    expect(screen.getByText('BREAK 완성', { exact: false })).toBeTruthy();
    expect(screen.getByText('1,080점')).toBeTruthy();
  });

  it('지각이면 지각 도장, 시간 보너스 0', () => {
    render(
      <ResultScreen
        result={{
          ...base,
          arrival: '9:00:03',
          score: { ...base.score, time: 0, total: 880, onTime: false },
        }}
        newBest={false}
        onRetry={vi.fn()}
        onTitle={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('지각 도장')).toBeTruthy();
    expect(screen.getByText('시간 보너스(지각)')).toBeTruthy();
  });

  it('배운 동사와 잘못 쓴 동사 복습(발음·예문·헷갈리는 짝·break의 휴식 뜻)', () => {
    render(<ResultScreen result={base} newBest onRetry={vi.fn()} onTitle={vi.fn()} />);
    const learned = screen.getByRole('region', { name: '배운 동사' });
    expect(learned.textContent).toContain('climb');
    expect(learned.textContent).toContain('휴식 (take a break)');
    const wrong = screen.getByRole('region', { name: '잘못 쓴 동사 복습' });
    expect(wrong.textContent).toContain('brake');
    expect(wrong.textContent).toContain('/breɪk/');
    expect(wrong.textContent).toContain('Brake at the red light.');
    expect(wrong.textContent).toContain('break와(과) 발음이 같아요');
    expect(screen.getByText('이 기기 최고 기록!')).toBeTruthy();
  });

  it('잘못 쓴 동사가 없으면 복습 칸을 숨기고, 다시 하기를 누르면 같은 스테이지로', () => {
    const onRetry = vi.fn();
    render(
      <ResultScreen
        result={{ ...base, wrong: [] }}
        newBest={false}
        onRetry={onRetry}
        onTitle={vi.fn()}
      />,
    );
    expect(screen.queryByRole('region', { name: '잘못 쓴 동사 복습' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
