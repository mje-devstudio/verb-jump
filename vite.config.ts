import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { devApi } from './scripts/vite-dev-api';

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts'],
  },
});
