export const ROUTER_BASE_URL = 'http://127.0.0.1:20128/v1';
export const MAX_SOURCE_CHARS = 20_000;
export const MAX_OUTPUT_CHARS = 50_000;
export const MODEL_DISCOVERY_TIMEOUT_MS = 10_000;
export const GENERATION_TIMEOUT_MS = 120_000;
export const MAX_HISTORY_ENTRIES = 25;
export const MAX_HISTORY_BYTES = 120_000;

export const SETTINGS_STORAGE_KEY = 'sayelse.settings.v1';
export const HANDOFF_STORAGE_KEY = 'sayelse.selection.v1';
export const HISTORY_KEY_PREFIX = 'sayelse.history.v1:';

export const OPERATIONS = [
  'paraphrase',
  'formal',
  'casual',
  'concise',
  'expand',
  'grammar',
  'originality',
] as const;
export type Operation = (typeof OPERATIONS)[number];

export const TONES = ['neutral', 'friendly', 'professional', 'confident', 'persuasive'] as const;
export type Tone = (typeof TONES)[number];

export const STRENGTHS = ['light', 'balanced', 'strong'] as const;
export type Strength = (typeof STRENGTHS)[number];

export const LENGTHS = ['shorter', 'similar', 'longer'] as const;
export type Length = (typeof LENGTHS)[number];

export type Theme = 'system' | 'light' | 'dark';

export const DEFAULT_SETTINGS = {
  version: 1 as const,
  token: '',
  selectedModel: null,
  defaults: {
    operation: 'paraphrase' as Operation,
    tone: 'neutral' as Tone,
    strength: 'balanced' as Strength,
    length: 'similar' as Length,
  },
  theme: 'system' as Theme,
};

export const OPERATION_LABELS: Record<Operation, string> = {
  paraphrase: 'Paraphrase',
  formal: 'More formal',
  casual: 'More casual',
  concise: 'Make concise',
  expand: 'Add detail',
  grammar: 'Fix grammar',
  originality: 'Originality check',
};

export const TONE_LABELS: Record<Tone, string> = {
  neutral: 'Neutral',
  friendly: 'Friendly',
  professional: 'Professional',
  confident: 'Confident',
  persuasive: 'Persuasive',
};

export const STRENGTH_LABELS: Record<Strength, string> = {
  light: 'Light',
  balanced: 'Balanced',
  strong: 'Strong',
};

export const LENGTH_LABELS: Record<Length, string> = {
  shorter: 'Shorter',
  similar: 'Similar length',
  longer: 'Longer',
};
