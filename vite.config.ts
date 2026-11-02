import { defineConfig } from 'vitest/config';

// `base` is relative so the production build works from any static host
// path (GitHub Pages project sites, a local file server, or an Actions artifact).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // The campaign has 19 rooms; fuzz and reachability tests simulate many fixed steps and run in parallel on small CI runners.
    testTimeout: 30_000,
  },
});
