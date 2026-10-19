// 게임 화면 FPS 측정(PRD 성능 기준: CPU 4배 감속에서 평균 55fps 이상, F19 개선 전후 기록).
// 로컬 Chrome을 띄워 시작 → CPU 감속 → 10초 동안 달리며 0.6초마다 점프, rAF 간격을 잰다.
// 실행: npm run measure:fps -- <주소> <감속 배율> [headed]
//   예: npm run measure:fps -- https://verb-jump.vercel.app/ 4
// 참고: CDP의 ScriptDuration·TaskDuration은 CPU 감속을 반영하지 않는 것으로 보인다(감속 없는 기준값으로만 쓴다).
import { chromium } from 'playwright-core';
const URL = process.argv[2] ?? 'https://verb-jump.vercel.app/';
const rate = Number(process.argv[3] ?? 1);
const headless = process.argv[4] !== 'headed';
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(URL);
await page.getByRole('button', { name: '시작' }).click();
await page.waitForSelector('canvas');
await page.waitForTimeout(1000);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate });
const renderer = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
// 10초 동안 rAF 간격 기록하면서 달리고 0.6초마다 점프
await page.evaluate(() => {
  window.__frames = [];
  let last = performance.now();
  const tick = (t) => {
    window.__frames.push(t - last);
    last = t;
    if (window.__frames.length < 100000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await cdp.send('Performance.enable');
const m0 = Object.fromEntries(
  (await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]),
);
await page.keyboard.down('ArrowRight');
const t0 = Date.now();
while (Date.now() - t0 < 10000) {
  await page.keyboard.down('Space');
  await page.waitForTimeout(250);
  await page.keyboard.up('Space');
  await page.waitForTimeout(350);
}
await page.keyboard.up('ArrowRight');
const m1 = Object.fromEntries(
  (await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]),
);
const f = await page.evaluate(() => window.__frames.slice(2));
const sum = f.reduce((a, b) => a + b, 0);
const sorted = [...f].sort((a, b) => a - b);
const p = (q) => sorted[Math.floor(q * (sorted.length - 1))];
console.log(
  JSON.stringify({
    rate,
    headless,
    renderer,
    frames: f.length,
    seconds: +(sum / 1000).toFixed(2),
    avgFps: +(f.length / (sum / 1000)).toFixed(1),
    p50ms: +p(0.5).toFixed(1),
    p95ms: +p(0.95).toFixed(1),
    maxms: +sorted.at(-1).toFixed(1),
    over20ms: f.filter((x) => x > 20).length,
    scriptMsPerFrame: +(((m1.ScriptDuration - m0.ScriptDuration) * 1000) / f.length).toFixed(2),
    taskMsPerFrame: +(((m1.TaskDuration - m0.TaskDuration) * 1000) / f.length).toFixed(2),
    heapMB: +(m1.JSHeapUsedSize / 1048576).toFixed(1),
  }),
);
await browser.close();
