import { HISTORY_KEY_PREFIX, MAX_HISTORY_BYTES, MAX_HISTORY_ENTRIES } from '../constants';
import { historyEntrySchema, type HistoryEntry } from './schema';
import { getLocalArea, type StorageAreaLike } from './settings';

export function createHistoryEntryId(now = Date.now(), random = Math.random()): string {
  return `${now.toString(36)}-${Math.floor(random * 0xffffff).toString(36)}`;
}

export function historyStorageKey(id: string): string {
  return `${HISTORY_KEY_PREFIX}${id}`;
}

export async function listHistory(area: StorageAreaLike = getLocalArea()): Promise<HistoryEntry[]> {
  const values = await area.get(null);
  return Object.entries(values)
    .flatMap(([key, value]) => {
      if (!key.startsWith(HISTORY_KEY_PREFIX)) return [];
      const parsed = historyEntrySchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveHistoryEntry(entry: HistoryEntry, area: StorageAreaLike = getLocalArea()): Promise<void> {
  const parsed = historyEntrySchema.safeParse(entry);
  if (!parsed.success) {
    throw new Error('History entry is invalid');
  }
  await area.set({ [historyStorageKey(entry.id)]: parsed.data });
  await pruneHistory(area);
}

export async function deleteHistoryEntry(id: string, area: StorageAreaLike = getLocalArea()): Promise<void> {
  await area.remove(historyStorageKey(id));
}

export async function clearHistory(area: StorageAreaLike = getLocalArea()): Promise<void> {
  const entries = await listHistory(area);
  await area.remove(entries.map((entry) => historyStorageKey(entry.id)));
}

export async function pruneHistory(area: StorageAreaLike = getLocalArea()): Promise<void> {
  const entries = await listHistory(area);
  const removeIds: string[] = [];
  let totalBytes = 0;

  for (const entry of entries) {
    totalBytes += JSON.stringify(entry).length;
    if (entries.length - removeIds.length > MAX_HISTORY_ENTRIES || totalBytes > MAX_HISTORY_BYTES) {
      removeIds.push(entry.id);
    }
  }

  if (removeIds.length > 0) {
    await area.remove(removeIds.map(historyStorageKey));
  }
}
