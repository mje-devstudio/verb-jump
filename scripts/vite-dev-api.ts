import { writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';

/**
 * 로컬 개발 서버에서 /api/* 를 Vercel 서버리스 함수와 같은 핸들러로 처리한다.
 * 라우트는 Vercel 파일 규칙과 같게 둔다: /api/stages/:id → api/stages/[id].ts 의 GET.
 */
const ROUTES: { pattern: RegExp; file: string }[] = [
  { pattern: /^\/api\/stages\/[^/]+$/, file: '/api/stages/[id].ts' },
];

type Handler = (request: Request) => Promise<Response>;

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.set(k, v);
  }
  const method = req.method ?? 'GET';
  return new Request(`http://localhost${req.url ?? '/'}`, {
    method,
    headers,
    ...(method === 'GET' || method === 'HEAD' ? {} : { body: Buffer.concat(chunks) }),
  });
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export function devApi(): Plugin {
  return {
    name: 'verb-jump-dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0] ?? '';
        // 개발 전용: 대표 이미지 저장(src/dev/ogCapture.ts). 개발 서버에만 있고 배포에는 없다.
        if (path === '/__dev/save-og' && req.method === 'POST') {
          void (async () => {
            const chunks: Buffer[] = [];
            for await (const c of req) chunks.push(c as Buffer);
            await writeFile(new URL('../public/og.jpg', import.meta.url), Buffer.concat(chunks));
            res.statusCode = 204;
            res.end();
          })().catch(next);
          return;
        }
        const route = ROUTES.find((r) => r.pattern.test(path));
        if (!route) return next();
        void (async () => {
          try {
            const mod = (await server.ssrLoadModule(route.file)) as Record<string, unknown>;
            const handler = mod[req.method ?? 'GET'];
            if (typeof handler !== 'function') {
              res.statusCode = 405;
              res.end();
              return;
            }
            await send(res, await (handler as Handler)(await toRequest(req)));
          } catch (e) {
            // 브라우저가 요청을 취소하면(StrictMode 이중 마운트·페이지 이동) 본문 읽기가 'aborted'로 실패한다.
            // 오류가 아니므로 Vite 오류 화면에 올리지 않는다.
            if (req.destroyed || res.destroyed) return;
            next(e);
          }
        })();
      });
    },
  };
}
