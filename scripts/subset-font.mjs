// F19: 갈무리11(약 500KB)을 게임에서 쓰는 글자(ASCII + KS X 1001 한글 2,350자 + 기호)만 남긴 woff2로 만든다.
// 사용: npm run font:subset → src/assets/fonts/Galmuri11-subset.woff2 (커밋한다)
import { readFileSync, writeFileSync } from 'node:fs';
import subsetFont from 'subset-font';
import { createServer } from 'vite';

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const { fontCharset } = await vite.ssrLoadModule('/src/shared/lib/fontCharset.ts');
  const src = readFileSync('node_modules/galmuri/dist/Galmuri11.ttf');
  const out = await subsetFont(src, fontCharset(), { targetFormat: 'woff2' });
  writeFileSync('src/assets/fonts/Galmuri11-subset.woff2', out);
  console.log(
    `Galmuri11-subset.woff2 ${(out.length / 1024).toFixed(1)}KB (${fontCharset().length}자)`,
  );
} finally {
  await vite.close();
}
