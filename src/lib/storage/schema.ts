import { z } from 'zod';
import {
  DEFAULT_SETTINGS,
  MAX_SOURCE_CHARS,
  OPERATIONS,
  type Operation,
} from '../constants';
export const operationSchema = z.enum(OPERATIONS);
export const themeSchema = z.enum(['system', 'light', 'dark']);

export const settingsSchema = z.object({
  version: z.literal(4),
  baseUrl: z.string().min(1).max(2048),
  apiKey: z.string().max(4096),
  selectedModel: z.string().max(256).nullable(),
  defaults: z.object({
    operation: operationSchema,
  }),
  theme: themeSchema,
});

// v3 carried the same shape, but its second preset was the professional-voice
// rewrite now called friendly, so its operation enum is spelled out separately.
const v3OperationSchema = z.enum(['paraphrase', 'formal', 'concise']);

const v3SettingsSchema = z.object({
  version: z.literal(3),
  baseUrl: z.string().min(1).max(2048),
  apiKey: z.string().max(4096),
  selectedModel: z.string().max(256).nullable(),
  defaults: z.object({
    operation: v3OperationSchema,
  }),
  theme: themeSchema,
});

// Legacy payloads may carry any operation the old option set allowed, so this
// deliberately does not narrow to the current three.
const v2DefaultsSchema = z
  .object({
    operation: z.string(),
    tone: z.string(),
    strength: z.string(),
    length: z.string(),
  })
  .partial();

const v2SettingsSchema = z.object({
  version: z.literal(2),
  baseUrl: z.string().min(1).max(2048),
  apiKey: z.string().max(4096),
  selectedModel: z.string().max(256).nullable(),
  defaults: v2DefaultsSchema.default({}),
  theme: themeSchema,
});

const legacySettingsSchema = z.object({
  version: z.literal(1),
  token: z.string().max(4096).default(''),
  selectedModel: z.string().max(256).nullable().default(null),
  defaults: v2DefaultsSchema.default({}),
  theme: themeSchema.default('system'),
});

export type Settings = z.infer<typeof settingsSchema>;
export type RewriteSettings = Settings['defaults'];

function toV4Defaults(operation: unknown): { operation: Operation } {
  // The professional-voice preset was renamed to friendly, so a legacy id
  // that still names it maps across instead of falling back to the default.
  const current = operation === 'formal' ? 'friendly' : operation;
  return {
    operation: OPERATIONS.includes(current as Operation) ? (current as Operation) : DEFAULT_SETTINGS.defaults.operation,
  };
}

/**
 * Upgrades a persisted v1, v2, or v3 payload to the current shape. v1 gains an
 * endpoint and an API key; v2 keeps its endpoint and key but drops the tone,
 * intensity, and length recipe fields, which the three preset actions replace.
 * v3 keeps everything and only renames the professional-voice preset to
 * friendly. An operation the current option set no longer offers falls back to
 * the default rather than failing the whole load.
 */
export function migrateSettings(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) {
    return raw;
  }
  const v3 = v3SettingsSchema.safeParse(raw);
  if (v3.success) {
    return {
      version: 4,
      baseUrl: v3.data.baseUrl,
      apiKey: v3.data.apiKey,
      selectedModel: v3.data.selectedModel,
      defaults: toV4Defaults(v3.data.defaults.operation),
      theme: v3.data.theme,
    };
  }
  const v2 = v2SettingsSchema.safeParse(raw);
  if (v2.success) {
    return {
      version: 4,
      baseUrl: v2.data.baseUrl,
      apiKey: v2.data.apiKey,
      selectedModel: v2.data.selectedModel,
      defaults: toV4Defaults(v2.data.defaults.operation),
      theme: v2.data.theme,
    };
  }
  const legacy = legacySettingsSchema.safeParse(raw);
  if (!legacy.success) {
    return raw;
  }
  return {
    version: 4,
    baseUrl: DEFAULT_SETTINGS.baseUrl,
    apiKey: legacy.data.token,
    selectedModel: legacy.data.selectedModel,
    defaults: toV4Defaults(legacy.data.defaults.operation),
    theme: legacy.data.theme,
  };
}

export const selectionCaptureSchema = z.object({
  version: z.literal(1),
  kind: z.enum(['input', 'textarea', 'contenteditable', 'text']),
  source: z.string().min(1),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  elementPath: z.array(z.number().int().nonnegative()).min(1),
  startNodePath: z.array(z.number().int().nonnegative()).optional(),
  endNodePath: z.array(z.number().int().nonnegative()).optional(),
  startOffset: z.number().int().nonnegative().optional(),
  endOffset: z.number().int().nonnegative().optional(),
  replaceable: z.boolean(),
});

export type SelectionCapture = z.infer<typeof selectionCaptureSchema>;

export const handoffSchema = z.object({
  version: z.literal(1),
  source: z.string().min(1).max(MAX_SOURCE_CHARS),
  tabId: z.number().int().nonnegative(),
  frameId: z.number().int().nonnegative(),
  capturedAt: z.number().int().positive(),
  capture: selectionCaptureSchema.nullable(),
});

export type SelectionHandoff = z.infer<typeof handoffSchema>;

export function getDefaultSettings(): Settings {
  return structuredClone(DEFAULT_SETTINGS);
}
