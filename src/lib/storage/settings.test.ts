import { getDefaultSettings, settingsSchema } from './schema';
import { getSettings, saveSettings } from './settings';
import type { StorageAreaLike } from './settings';

class MemoryStorage implements StorageAreaLike {
  data = new Map<string, unknown>();
  async get(keys?: string | string[] | null) {
    if (keys == null) return Object.fromEntries(this.data);
    const selected = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(selected.filter((key) => this.data.has(key)).map((key) => [key, this.data.get(key)]));
  }
  async set(items: Record<string, unknown>) {
    Object.entries(items).forEach(([key, value]) => this.data.set(key, value));
  }
  async remove(keys: string | string[]) {
    (Array.isArray(keys) ? keys : [keys]).forEach((key) => this.data.delete(key));
  }
  async clear() { this.data.clear(); }
}

describe('settings storage', () => {
  it('returns safe defaults for malformed persisted data', async () => {
    const storage = new MemoryStorage();
    storage.data.set('sayelse.settings.v1', { token: { unexpected: true } });

    expect(await getSettings(storage)).toEqual(getDefaultSettings());
  });

  it('rejects invalid settings instead of writing them', async () => {
    const storage = new MemoryStorage();
    await expect(saveSettings({ ...getDefaultSettings(), token: 'x'.repeat(5000) }, storage)).rejects.toThrow('Settings are invalid');
    expect(storage.data.size).toBe(0);
  });

  it('round-trips validated settings', async () => {
    const storage = new MemoryStorage();
    const settings = { ...getDefaultSettings(), selectedModel: 'test-model' };
    await saveSettings(settings, storage);

    expect(settingsSchema.safeParse((await getSettings(storage))).success).toBe(true);
  });
});
