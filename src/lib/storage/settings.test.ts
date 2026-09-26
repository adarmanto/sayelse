import { DEFAULT_BASE_URL, DEFAULT_SETTINGS } from '../constants';
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
    await expect(saveSettings({ ...getDefaultSettings(), apiKey: 'x'.repeat(5000) }, storage)).rejects.toThrow('Settings are invalid');
    expect(storage.data.size).toBe(0);
  });

  it('round-trips validated settings', async () => {
    const storage = new MemoryStorage();
    const settings = { ...getDefaultSettings(), selectedModel: 'test-model' };
    await saveSettings(settings, storage);

    expect(settingsSchema.safeParse((await getSettings(storage))).success).toBe(true);
  });

  it('migrates a v1 payload without losing the API key, model, or operation', async () => {
    const storage = new MemoryStorage();
    storage.data.set('sayelse.settings.v1', {
      version: 1,
      token: 'legacy-key',
      selectedModel: 'legacy-model',
      defaults: {
        operation: 'formal',
        tone: 'confident',
        strength: 'strong',
        length: 'shorter',
      },
      theme: 'dark',
    });

    const migrated = await getSettings(storage);

    expect(migrated).toEqual({
      version: 3,
      baseUrl: DEFAULT_BASE_URL,
      apiKey: 'legacy-key',
      selectedModel: 'legacy-model',
      defaults: { operation: 'formal' },
      theme: 'dark',
    });
  });

  it('writes the migrated payload back so the upgrade happens once', async () => {
    const storage = new MemoryStorage();
    storage.data.set('sayelse.settings.v1', { version: 1, token: 'legacy-key' });

    await getSettings(storage);

    const persisted = storage.data.get('sayelse.settings.v1') as Record<string, unknown>;
    expect(persisted.version).toBe(3);
    expect(persisted.token).toBeUndefined();
    expect(persisted.apiKey).toBe('legacy-key');
  });

  it('migrates a v1 payload that omits optional fields', async () => {
    const storage = new MemoryStorage();
    storage.data.set('sayelse.settings.v1', { version: 1, token: '' });

    const migrated = await getSettings(storage);

    expect(migrated.version).toBe(3);
    expect(migrated.selectedModel).toBeNull();
    expect(migrated.theme).toBe('system');
    expect(migrated.defaults).toEqual(DEFAULT_SETTINGS.defaults);
    expect((storage.data.get('sayelse.settings.v1') as Record<string, unknown>).version).toBe(3);
  });

  it('falls back to the default preset for a v1 recipe that no longer exists', async () => {
    const storage = new MemoryStorage();
    storage.data.set('sayelse.settings.v1', {
      version: 1,
      token: 'legacy-key',
      defaults: { operation: 'casual', tone: 'confident', length: 'longer' },
    });

    expect((await getSettings(storage)).defaults).toEqual({ operation: 'paraphrase' });
  });

  it('migrates a v2 recipe to the v3 preset shape without failing', async () => {
    const storage = new MemoryStorage();
    storage.data.set('sayelse.settings.v1', {
      version: 2,
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'kept-key',
      selectedModel: 'kept-model',
      defaults: { operation: 'casual', tone: 'confident', strength: 'strong', length: 'longer' },
      theme: 'dark',
    });

    const migrated = await getSettings(storage);

    expect(migrated).toEqual({
      version: 3,
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'kept-key',
      selectedModel: 'kept-model',
      defaults: { operation: 'paraphrase' },
      theme: 'dark',
    });
  });

  it('keeps a v2 preset that still exists in the new option set', async () => {
    const storage = new MemoryStorage();
    storage.data.set('sayelse.settings.v1', {
      version: 2,
      baseUrl: 'https://api.example.com/v1',
      apiKey: '',
      selectedModel: null,
      defaults: { operation: 'formal', tone: 'professional', strength: 'balanced', length: 'similar' },
      theme: 'system',
    });

    expect((await getSettings(storage)).defaults).toEqual({ operation: 'formal' });
  });

  it('purges orphaned history keys left by the removed history feature', async () => {
    const storage = new MemoryStorage();
    storage.data.set('sayelse.settings.v1', { ...getDefaultSettings() });
    storage.data.set('sayelse.history.v1:abc', { version: 1, id: 'abc', result: 'old rewrite' });
    storage.data.set('sayelse.history.v1:def', { version: 1, id: 'def', result: 'another' });

    await getSettings(storage);

    expect([...storage.data.keys()]).toEqual(['sayelse.settings.v1']);
  });

  it('leaves unrelated storage keys alone while purging', async () => {
    const storage = new MemoryStorage();
    storage.data.set('sayelse.settings.v1', { ...getDefaultSettings() });
    storage.data.set('unrelated.key', { keep: true });

    await getSettings(storage);

    expect(storage.data.get('unrelated.key')).toEqual({ keep: true });
  });

  it('keeps a current payload untouched and does not rewrite it', async () => {
    const storage = new MemoryStorage();
    const current = { ...getDefaultSettings(), baseUrl: 'https://api.example.com/v1' };
    storage.data.set('sayelse.settings.v1', current);

    const loaded = await getSettings(storage);

    expect(loaded).toEqual(current);
    expect(storage.data.get('sayelse.settings.v1')).toEqual(current);
  });
});
