// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DevPanel } from './DevPanel';
import { devSettings } from './devSettings';
import { levelWarnings } from './levelWarnings';

afterEach(cleanup);

describe('개발자 토글 — F29 레벨 점검', () => {
  it('점검 결과(경고 수·시간·목록)를 보여 준다', () => {
    render(<DevPanel />);
    act(() =>
      levelWarnings.set({
        status: 'checked',
        ms: 12,
        warnings: [
          {
            kind: 'pit',
            message: 'col 52 · 땅에서 5칸 · 오른쪽으로 달려 뛰면 구멍',
            x: 520,
            y: 100,
          },
        ],
      }),
    );
    expect(screen.getByText('경고 1건 · 12ms')).toBeTruthy();
    expect(screen.getByText(/col 52/)).toBeTruthy();
  });

  it('경고 자리 표시를 끄고 켠다', () => {
    devSettings.set({ showLevelMarks: true });
    render(<DevPanel />);
    fireEvent.click(screen.getByLabelText('게임 화면에 경고 자리 표시'));
    expect(devSettings.get().showLevelMarks).toBe(false);
  });
});
