// Vercel은 api/를 Node ESM으로 실행한다. Node ESM은 상대 import에 확장자가 꼭 있어야 해서,
// 확장자를 빠뜨리면 운영에서만 FUNCTION_INVOCATION_FAILED가 난다(이슈 005). Vite·Vitest는 이 차이를 숨긴다.
// tsc로 api/를 그대로 변환한 뒤 Node로 직접 불러 각 핸들러가 응답하는지 확인한다.
// 실행: npm run check:api (CI에서도 돈다)
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = new URL('../.api-check/', import.meta.url);
rmSync(OUT, { recursive: true, force: true });
execFileSync('npx', ['tsc', '-p', 'tsconfig.api.json'], { stdio: 'inherit' });
writeFileSync(new URL('package.json', OUT), '{"type":"module"}\n');

const CASES = [
  { file: 'api/stages/[id].js', method: 'GET', url: 'http://x/api/stages/commute', status: 200 },
  { file: 'api/stages/[id].js', method: 'GET', url: 'http://x/api/stages/moon', status: 404 },
];

let failed = 0;
for (const c of CASES) {
  try {
    const mod = await import(pathToFileURL(new URL(c.file, OUT).pathname).href);
    const res = await mod[c.method](new Request(c.url));
    const ok = res.status === c.status;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.method} ${new URL(c.url).pathname} → ${res.status}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${c.method} ${c.url}: ${e.code ?? ''} ${String(e.message).split('\n')[0]}`);
  }
}
rmSync(OUT, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
