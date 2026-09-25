import { HANDOFF_STORAGE_KEY } from '../constants';
import { handoffSchema, type SelectionHandoff } from './schema';
import type { StorageAreaLike } from './settings';

export async function saveSelectionHandoff(handoff: SelectionHandoff, area: StorageAreaLike): Promise<void> {
  const parsed = handoffSchema.safeParse(handoff);
  if (!parsed.success) {
    throw new Error('Selection handoff is invalid');
  }
  await area.set({ [HANDOFF_STORAGE_KEY]: parsed.data });
}

export async function consumeSelectionHandoff(area: StorageAreaLike): Promise<SelectionHandoff | null> {
  const values = await area.get(HANDOFF_STORAGE_KEY);
  const parsed = handoffSchema.safeParse(values[HANDOFF_STORAGE_KEY]);
  await area.remove(HANDOFF_STORAGE_KEY);
  return parsed.success ? parsed.data : null;
}

export async function clearSelectionHandoff(area: StorageAreaLike): Promise<void> {
  await area.remove(HANDOFF_STORAGE_KEY);
}
