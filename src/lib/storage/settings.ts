import { browser } from 'wxt/browser';
import { SETTINGS_STORAGE_KEY } from '../constants';
import { getDefaultSettings, settingsSchema, type Settings } from './schema';

export interface StorageAreaLike {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

export function getLocalArea(): StorageAreaLike {
  return browser.storage.local as unknown as StorageAreaLike;
}

export function getSessionArea(): StorageAreaLike {
  return browser.storage.session as unknown as StorageAreaLike;
}

export async function getSettings(area: StorageAreaLike = getLocalArea()): Promise<Settings> {
  const values = await area.get(SETTINGS_STORAGE_KEY);
  const parsed = settingsSchema.safeParse(values[SETTINGS_STORAGE_KEY]);
  return parsed.success ? parsed.data : getDefaultSettings();
}

export async function saveSettings(settings: Settings, area: StorageAreaLike = getLocalArea()): Promise<void> {
  const parsed = settingsSchema.safeParse(settings);
  if (!parsed.success) {
    throw new Error('Settings are invalid');
  }
  await area.set({ [SETTINGS_STORAGE_KEY]: parsed.data });
}
