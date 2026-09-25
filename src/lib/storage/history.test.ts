import { MAX_HISTORY_ENTRIES } from '../constants';
import { clearHistory, listHistory, pruneHistory, saveHistoryEntry } from './history';
import type { HistoryEntry } from './schema';
import type { StorageAreaLike } from './settings';

class MemoryStorage implements StorageAreaLike {
  data = new Map<string, unknown>();

  async get(keys?: string | string[] | null): Promise<Record<string, unknown>> {
    if (keys == null) return Object.fromEntries(this.data);
    const selected = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(selected.filter((key) => this.data.has(key)).map((key) => [key, this.data.get(key)]));
  }

  async set(items: Record<string, unknown>): Promise<void> {
    Object.entries(items).forEach(([key, value]) => this.data.set(key, value));
  }

  async remove(keys: string | string[]): Promise<void> {
    (Array.isArray(keys) ? keys : [keys]).forEach((key) => this.data.delete(key));
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}

function entry(index: number): HistoryEntry {
  return {
    version: 1,
    id: `entry-${index}`,
    source: `source ${index}`,
    result: `result ${index}`,
    model: 'test-model',
    operation: 'paraphrase',
    tone: 'neutral',
    strength: 'balanced',
    length: 'similar',
    createdAt: index,
  };
}

describe('history storage', () => {
  it('sorts entries newest first', async () => {
    const storage = new MemoryStorage();
    await saveHistoryEntry(entry(1), storage);
    await saveHistoryEntry(entry(2), storage);

    expect((await listHistory(storage)).map((item) => item.id)).toEqual(['entry-2', 'entry-1']);
  });

  it('prunes oldest entries beyond the entry limit', async () => {
    const storage = new MemoryStorage();
    for (let index = 0; index <= MAX_HISTORY_ENTRIES; index += 1) {
      storage.data.set(`sayelse.history.v1:entry-${index}`, entry(index));
    }

    await pruneHistory(storage);

    const remaining = await listHistory(storage);
    expect(remaining).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(remaining.at(-1)?.id).toBe('entry-1');
  });

  it('clears only validated history records', async () => {
    const storage = new MemoryStorage();
    storage.data.set('sayelse.settings.v1', { version: 1, token: 'keep-me' });
    storage.data.set('sayelse.history.v1:entry-1', entry(1));

    await clearHistory(storage);

    expect(await storage.get(null)).toEqual({ 'sayelse.settings.v1': { version: 1, token: 'keep-me' } });
  });
});
