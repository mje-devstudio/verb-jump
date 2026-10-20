import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vitest/config';
import { devApi } from './scripts/vite-dev-api.ts';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devApi(),
    // F19 번들 구성 보기: ANALYZE=1 npm run build → dist/stats.json(raw-data)·stats.html
    ...(process.env.ANALYZE
      ? [
          visualizer({ filename: 'dist/stats.html', gzipSize: true }),
          visualizer({ filename: 'dist/stats.json', template: 'raw-data', gzipSize: true }),
        ]
      : []),
  ],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts'],
    // PRD: shared/rules 커버리지 90% 이상(npm run test:coverage, CI에서 미달이면 실패)
    coverage: {
      provider: 'v8',
      include: ['src/shared/rules/**'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});
