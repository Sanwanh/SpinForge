import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// web/ root — used for the `@/*` path alias (mirrors tsconfig "paths").
const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': root },
  },
  test: {
    // Default to node; hook tests opt into jsdom via a `// @vitest-environment
    // jsdom` docblock so we don't pay DOM setup on the pure/route suites.
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
  },
});
