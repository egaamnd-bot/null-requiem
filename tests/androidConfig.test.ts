import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(new URL('../.github/workflows/android-debug-apk.yml', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('Android packaging configuration', () => {
  it('locks the launcher activity to landscape and verifies it on the built APK', () => {
    expect(workflow).toContain('android:screenOrientation="landscape"');
    expect(workflow).toMatch(/Verify landscape orientation in built APK/);
  });

  it('uploads the debug APK with a clear name and 14-day retention', () => {
    expect(workflow).toMatch(/name: null-requiem-android-debug-/);
    expect(workflow).toMatch(/retention-days: 14/);
    expect(workflow).toMatch(/if-no-files-found: error/);
  });

  it('runs typecheck, tests and the production build before packaging', () => {
    const order = ['npm run typecheck', 'npm test', 'npm run build', 'assembleDebug'].map((s) => workflow.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('disables browser-style touch gestures in the web shell', () => {
    expect(indexHtml).toMatch(/touch-action:\s*none/);
    expect(indexHtml).toMatch(/viewport-fit=cover/);
    expect(indexHtml).toMatch(/user-scalable=no/);
  });
});
