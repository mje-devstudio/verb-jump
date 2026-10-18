// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mapRaw from '../../../public/maps/commute.tmj?raw';
import { COMMUTE_STAGE } from '../../shared/stages/commute';
import { TitleScreen } from './TitleScreen';

const unavailable = () =>
  HttpResponse.json(
    { error: { code: 'STAGE_UNAVAILABLE', message: '스테이지를 불러오지 못했어요.' } },
    { status: 500 },
  );

let stageCalls = 0;
const server = setupServer(
  http.get('*/maps/commute.tmj', () => HttpResponse.json(JSON.parse(mapRaw) as object)),
);

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  stageCalls = 0;
});
afterAll(() => server.close());

/** 응답 순서를 정한 스테이지 API. 순서를 다 쓰면 마지막 응답을 반복한다. */
function stageApi(...responses: (() => Response | Promise<Response>)[]) {
  server.use(
    http.get('*/api/stages/commute', () => {
      const r = responses[Math.min(stageCalls, responses.length - 1)];
      stageCalls++;
      return r ? r() : unavailable();
    }),
  );
}
const ok = () => HttpResponse.json(COMMUTE_STAGE);

function renderTitle(onStart = vi.fn()) {
  // 재시도 간격만 0으로(재시도 횟수는 훅의 설정 = 1회 그대로)
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <TitleScreen stageId="commute" onStart={onStart} />
    </QueryClientProvider>,
  );
  return onStart;
}

describe('F01 스테이지 불러오기', () => {
  it('1번 실패하면 자동 재시도로 성공하고 시작할 수 있다', async () => {
    stageApi(unavailable, ok);
    const onStart = renderTitle();
    fireEvent.click(await screen.findByRole('button', { name: '시작' }));
    expect(stageCalls).toBe(2);
    expect(onStart).toHaveBeenCalledOnce();
    const [stage, level] = onStart.mock.calls[0] as [typeof COMMUTE_STAGE, { spellWord: string }];
    expect(stage.id).toBe('commute');
    expect(level.spellWord).toBe('BREAK');
  });

  it('2번 실패하면 안내와 다시 시도 버튼, 누르면 다시 받는다', async () => {
    stageApi(unavailable, unavailable, ok);
    renderTitle();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('스테이지를 불러오지 못했어요.');
    expect(stageCalls).toBe(2);
    expect(screen.queryByRole('button', { name: '시작' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('button', { name: '시작' })).toBeTruthy();
    expect(stageCalls).toBe(3);
  });

  it('3초 지연이면 기다리는 동안 로딩 바를 보여 준다', async () => {
    stageApi(async () => {
      await delay(3000);
      return ok();
    });
    renderTitle();
    expect(await screen.findByRole('progressbar', { name: '스테이지를 불러오는 중' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '시작' })).toBeNull();
  });

  it('서버 응답 형식이 틀리면 시작하지 않고 안내한다', async () => {
    stageApi(() => HttpResponse.json({ id: 'commute' }));
    renderTitle();
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
