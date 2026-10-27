import type { SaveStore } from '../core/progression';

const KEY = 'nullrequiem.save.v1';

/** Browser localStorage save slot. Fails soft: if storage is unavailable, the game still runs. */
export class LocalSaveStore implements SaveStore {
  load(): string | null {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  save(data: string): void {
    try {
      window.localStorage.setItem(KEY, data);
    } catch {
      // Storage full or blocked (private mode): progress simply isn't persisted.
    }
  }

  clear(): void {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}
