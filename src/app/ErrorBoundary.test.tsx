// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

afterEach(cleanup);

let shouldThrow = true;
function Boom() {
  if (shouldThrow) throw new Error('렌더 중 폭발');
  return <p>다시 그려짐</p>;
}

describe('F13 에러 바운더리', () => {
  it('렌더 오류가 나면 다시 시작 화면, 누르면 처음부터 다시 그린다', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = true;
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert').textContent).toContain('문제가 생겨 게임을 멈췄어요');
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: '처음부터 다시' }));
    expect(screen.getByText('다시 그려짐')).toBeTruthy();
    quiet.mockRestore();
  });
});
