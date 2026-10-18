// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { isBetter, loadBest, saveIfBest } from './bestRecord';

beforeEach(() => window.localStorage.clear());

describe('최고 기록(이 기기)', () => {
  it('점수가 높은 순, 같으면 출근 시각이 빠른 순(랭킹 규칙)', () => {
    const a = { score: 1000, arrival: '8:59:40', clearMs: 160_000 };
    expect(isBetter(a, null)).toBe(true);
    expect(isBetter({ ...a, score: 900 }, a)).toBe(false);
    expect(isBetter({ ...a, clearMs: 150_000 }, a)).toBe(true);
    expect(isBetter(a, a)).toBe(false);
  });

  it('더 좋을 때만 저장한다', () => {
    expect(saveIfBest('commute', { score: 500, arrival: '9:00:10', clearMs: 190_000 })).toBe(true);
    expect(saveIfBest('commute', { score: 400, arrival: '8:59:00', clearMs: 120_000 })).toBe(false);
    expect(loadBest('commute')?.score).toBe(500);
  });

  it('저장된 값이 깨져 있으면 없는 것으로 본다', () => {
    window.localStorage.setItem('verb-jump:best:commute', '{"score":"x"}');
    expect(loadBest('commute')).toBeNull();
  });
});
