import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { createTouchLayout } from '../src/input/touchLayout';

const VIEW_W = 480;
const VIEW_H = 270;
const layout = createTouchLayout(VIEW_W, VIEW_H);
const btn = (key: string) => layout.buttons.find((b) => b.key === key)!;

type Pt = { x: number; y: number };

interface Probe {
  nullRequiemGame?: { scene: { isActive(key: string): boolean } };
  nullRequiem?: {
    world: { flow: { state: string }; player: { body: { x: number; y: number } } };
    virtualButtons: Record<string, boolean>;
  };
}

/** Game-space (480x270) point -> page CSS pixels, through the letterboxed canvas. */
async function toPage(page: Page, g: Pt): Promise<Pt> {
  const r = await page.evaluate(() => {
    const c = document.querySelector('canvas')!;
    const b = c.getBoundingClientRect();
    return { l: b.left, t: b.top, w: b.width, h: b.height };
  });
  return { x: r.l + (g.x / VIEW_W) * r.w, y: r.t + (g.y / VIEW_H) * r.h };
}

class Fingers {
  private active = new Map<number, Pt>();
  constructor(
    private readonly page: Page,
    private readonly cdp: CDPSession,
  ) {}
  private points() {
    return [...this.active.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id }));
  }
  async down(id: number, g: Pt) {
    this.active.set(id, await toPage(this.page, g));
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: this.points() });
  }
  async move(id: number, g: Pt) {
    this.active.set(id, await toPage(this.page, g));
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: this.points() });
  }
  async up(id: number) {
    // CDP touchEnd lists the point(s) being RELEASED, not the ones that remain down.
    const p = this.active.get(id);
    if (!p) return;
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: p.x, y: p.y, id }] });
    this.active.delete(id);
  }
  async cancelAll() {
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    this.active.clear();
  }
}

async function tapGame(page: Page, g: Pt) {
  const p = await toPage(page, g);
  await page.touchscreen.tap(p.x, p.y);
}

const sceneActive = (page: Page, key: string) => page.evaluate((k) => (window as unknown as Probe).nullRequiemGame?.scene.isActive(k) ?? false, key);
const flowState = (page: Page) => page.evaluate(() => (window as unknown as Probe).nullRequiem?.world.flow.state ?? 'none');
const virt = (page: Page) => page.evaluate(() => ({ ...(window as unknown as Probe).nullRequiem!.virtualButtons }));
const playerX = (page: Page) => page.evaluate(() => (window as unknown as Probe).nullRequiem!.world.player.body.x);

async function startGame(page: Page) {
  await page.goto('/');
  await expect.poll(() => sceneActive(page, 'title'), { timeout: 15_000 }).toBe(true);
  await tapGame(page, { x: VIEW_W / 2, y: 176 }); // "Start"
  await expect.poll(() => sceneActive(page, 'game'), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => flowState(page), { timeout: 10_000 }).toBe('playing');
  // Touch controls overlay must be running.
  await expect.poll(() => sceneActive(page, 'mobile-controls')).toBe(true);
}

test('title: tapping Start enters the game', async ({ page }) => {
  await startGame(page);
});

test('title: tapping empty background does not start the game', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => sceneActive(page, 'title'), { timeout: 15_000 }).toBe(true);
  await tapGame(page, { x: 30, y: 30 });
  await tapGame(page, { x: 450, y: 90 });
  await page.waitForTimeout(1200);
  expect(await sceneActive(page, 'game')).toBe(false);
  expect(await sceneActive(page, 'title')).toBe(true);
});

test('title: rapid double tap on Start starts exactly one game', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => sceneActive(page, 'title'), { timeout: 15_000 }).toBe(true);
  const p = await toPage(page, { x: VIEW_W / 2, y: 176 });
  await page.touchscreen.tap(p.x, p.y);
  await page.touchscreen.tap(p.x, p.y);
  await expect.poll(() => sceneActive(page, 'game'), { timeout: 10_000 }).toBe(true);
  await page.waitForTimeout(800);
  expect(await flowState(page)).toBe('playing');
});

test('in game: multi-touch holds move + jump together and releases cleanly', async ({ page }) => {
  await startGame(page);
  const cdp = await page.context().newCDPSession(page);
  const f = new Fingers(page, cdp);
  // Floating joystick: touch down at a free point in the lower-left zone, then drag right.
  const origin = { x: 70, y: 185 };
  const right = { x: 122, y: 185 };

  const x0 = await playerX(page);
  await f.down(1, origin);
  await f.move(1, right);
  await f.down(2, { x: btn('jump').x, y: btn('jump').y });
  await expect.poll(async () => (await virt(page)).right && (await virt(page)).jump).toBe(true);
  await page.waitForTimeout(500);
  expect(await playerX(page)).toBeGreaterThan(x0);

  await f.up(2);
  await expect.poll(async () => (await virt(page)).jump).toBe(false);
  expect((await virt(page)).right).toBe(true);
  await f.up(1);
  await expect.poll(async () => Object.values(await virt(page)).some(Boolean)).toBe(false);
});

test('in game: attack, dash, backtrace and talk buttons are reachable and map to their actions', async ({ page }) => {
  await startGame(page);
  const cdp = await page.context().newCDPSession(page);
  const f = new Fingers(page, cdp);
  for (const [i, key] of (['attack', 'dash', 'backtrace', 'interact'] as const).entries()) {
    await f.down(10 + i, { x: btn(key).x, y: btn(key).y });
    await expect.poll(async () => (await virt(page))[key], { message: `${key} should become held` }).toBe(true);
    await f.up(10 + i);
    await expect.poll(async () => (await virt(page))[key]).toBe(false);
  }
});

test('in game: touchcancel releases every held button (no stuck input)', async ({ page }) => {
  await startGame(page);
  const cdp = await page.context().newCDPSession(page);
  const f = new Fingers(page, cdp);
  await f.down(1, { x: 80, y: 185 });
  await f.move(1, { x: 28, y: 185 });
  await f.down(2, { x: btn('attack').x, y: btn('attack').y });
  await expect.poll(async () => (await virt(page)).left && (await virt(page)).attack).toBe(true);
  await f.cancelAll();
  await expect.poll(async () => Object.values(await virt(page)).some(Boolean)).toBe(false);
});

test('in game: pause button opens the pause menu; Resume and Quit to title are tappable', async ({ page }) => {
  await startGame(page);
  await tapGame(page, { x: layout.pause.x, y: layout.pause.y });
  await expect.poll(() => flowState(page)).toBe('paused');

  // Touch controls must not stay live behind the menu.
  const cdp = await page.context().newCDPSession(page);
  const f = new Fingers(page, cdp);
  await f.down(1, { x: btn('jump').x, y: btn('jump').y });
  await page.waitForTimeout(150);
  expect((await virt(page)).jump).toBe(false);
  await f.up(1);

  await page.waitForTimeout(250); // overlay arms after a couple of frames
  await tapGame(page, { x: VIEW_W / 2, y: 112 }); // Resume
  await expect.poll(() => flowState(page)).toBe('playing');

  await tapGame(page, { x: layout.pause.x, y: layout.pause.y });
  await expect.poll(() => flowState(page)).toBe('paused');
  await page.waitForTimeout(250);
  await tapGame(page, { x: VIEW_W / 2, y: 176 }); // Quit to title
  await expect.poll(() => sceneActive(page, 'title'), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => sceneActive(page, 'mobile-controls')).toBe(false);
});

test('in game: controls survive quitting to the title and starting again', async ({ page }) => {
  await startGame(page);
  await tapGame(page, { x: layout.pause.x, y: layout.pause.y });
  await expect.poll(() => flowState(page)).toBe('paused');
  await page.waitForTimeout(250);
  await tapGame(page, { x: VIEW_W / 2, y: 176 }); // Quit to title
  await expect.poll(() => sceneActive(page, 'title'), { timeout: 10_000 }).toBe(true);

  // A run that reached a checkpoint shows Continue first; otherwise Start. Either way the first item starts a game.
  await page.waitForTimeout(500);
  await tapGame(page, { x: VIEW_W / 2, y: 176 });
  await expect.poll(() => sceneActive(page, 'game'), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => flowState(page)).toBe('playing');

  const cdp = await page.context().newCDPSession(page);
  const f = new Fingers(page, cdp);
  await f.down(1, { x: btn('jump').x, y: btn('jump').y });
  await expect.poll(async () => (await virt(page)).jump).toBe(true);
  await f.up(1);
});
