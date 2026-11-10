import { defineConfig } from 'vitest/config';

// JSX is compiled by the bundler with Preact's automatic runtime (see
// tsconfig.json), so no Preact preset dependency is needed.
export default defineConfig({
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
