import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { devApi } from './scripts/vite-dev-api.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
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
