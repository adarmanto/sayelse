export const DEFAULT_BASE_URL = 'http://127.0.0.1:20128/v1';
export const MAX_SOURCE_CHARS = 20_000;
export const MAX_OUTPUT_CHARS = 50_000;
export const MODEL_DISCOVERY_TIMEOUT_MS = 10_000;
export const GENERATION_TIMEOUT_MS = 120_000;

/** Legacy key prefix from the removed history feature. Purged on first read. */
export const LEGACY_HISTORY_KEY_PREFIX = 'sayelse.history.v1:';

export const SETTINGS_STORAGE_KEY = 'sayelse.settings.v1';
export const HANDOFF_STORAGE_KEY = 'sayelse.selection.v1';

export const OPERATIONS = ['paraphrase', 'friendly', 'concise'] as const;
export type Operation = (typeof OPERATIONS)[number];

export type Theme = 'system' | 'light' | 'dark';

export const OPERATION_LABELS: Record<Operation, string> = {
  paraphrase: 'Paraphrase',
  friendly: 'Friendly',
  concise: 'Shorter',
};

export const DEFAULT_SETTINGS = {
  version: 4 as const,
  baseUrl: DEFAULT_BASE_URL,
  apiKey: '',
  selectedModel: null,
  defaults: {
    operation: 'paraphrase' as Operation,
  },
  theme: 'system' as Theme,
};
