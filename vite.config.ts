import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relatieve paden, zodat de build ook onder een submap (GitHub Pages) werkt.
  base: './',
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
