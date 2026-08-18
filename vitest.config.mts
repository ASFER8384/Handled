import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Node by default; component tests opt into jsdom with a file-level
    // `// @vitest-environment jsdom` comment.
    environment: 'node',
    pool: 'threads',
    // Playwright owns e2e; vitest stays on units so `pnpm test` is fast.
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
});
