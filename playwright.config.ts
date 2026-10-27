import { defineConfig, devices } from '@playwright/test';

/**
 * Browser smoke tests for the touch UI. They run against the production build (`npm run build` first),
 * served by `vite preview`, with a phone-sized landscape viewport and touch emulation.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...devices['Pixel 7 landscape'],
    // Pixel 7 landscape is 915x412 (20:9), which exercises the letterboxed FIT scaling like a real phone.
    hasTouch: true,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
