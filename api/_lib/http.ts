/**
 * 서버리스 함수 공통(F02): delay·fail 쿼리로 지연과 실패를 재현하고, 오류는 같은 형태로 보낸다.
 * Web 표준 Request/Response만 써서 Vercel 함수와 로컬 Vite 미들웨어가 같은 코드를 실행한다.
 */
import type { ApiErrorBody } from '../../src/shared/stages/types.js';

export const MAX_DELAY_MS = 3000;
export const FAIL_RATES = [0, 0.5, 1] as const;

export interface Chaos {
  delayMs: number;
  failRate: number;
}

/** delay(0~3000ms)와 fail(0·0.5·1)을 읽는다. 범위를 벗어나거나 잘못된 값은 안전한 쪽(지연 상한, 실패 없음)으로. */
export function readChaos(url: URL): Chaos {
  const d = Number(url.searchParams.get('delay') ?? 0);
  const f = Number(url.searchParams.get('fail') ?? 0);
  return {
    delayMs: Number.isFinite(d) ? Math.min(MAX_DELAY_MS, Math.max(0, Math.round(d))) : 0,
    failRate: (FAIL_RATES as readonly number[]).includes(f) ? f : 0,
  };
}

export interface Deps {
  sleep: (ms: number) => Promise<void>;
  random: () => number;
}

export const realDeps: Deps = {
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  random: Math.random,
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function error(status: number, code: string, message: string): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return json(body, status);
}

/** 지연을 기다린 뒤, 실패 확률에 걸리면 true. */
export async function applyChaos(chaos: Chaos, deps: Deps): Promise<boolean> {
  if (chaos.delayMs > 0) await deps.sleep(chaos.delayMs);
  return chaos.failRate > 0 && deps.random() < chaos.failRate;
}
