import { z } from 'zod';
import {
  DEFAULT_SETTINGS,
  HANDOFF_STORAGE_KEY,
  HISTORY_KEY_PREFIX,
  LENGTHS,
  MAX_HISTORY_BYTES,
  MAX_HISTORY_ENTRIES,
  OPERATIONS,
  SETTINGS_STORAGE_KEY,
  STRENGTHS,
  TONES,
} from '../constants';

export const operationSchema = z.enum(OPERATIONS);
export const toneSchema = z.enum(TONES);
export const strengthSchema = z.enum(STRENGTHS);
export const lengthSchema = z.enum(LENGTHS);
export const themeSchema = z.enum(['system', 'light', 'dark']);

export const settingsSchema = z.object({
  version: z.literal(1),
  token: z.string().max(4096),
  selectedModel: z.string().max(256).nullable(),
  defaults: z.object({
    operation: operationSchema,
    tone: toneSchema,
    strength: strengthSchema,
    length: lengthSchema,
  }),
  theme: themeSchema,
});

export type Settings = z.infer<typeof settingsSchema>;
export type RewriteSettings = Settings['defaults'];

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
  source: z.string().min(1).max(20_000),
  tabId: z.number().int().nonnegative(),
  frameId: z.number().int().nonnegative(),
  capturedAt: z.number().int().positive(),
  capture: selectionCaptureSchema.nullable(),
  preset: z
    .object({
      operation: operationSchema,
      tone: toneSchema.optional(),
      length: lengthSchema.optional(),
    })
    .optional(),
});

export type SelectionHandoff = z.infer<typeof handoffSchema>;

export const historyEntrySchema = z.object({
  version: z.literal(1),
  id: z.string().min(1).max(128),
  source: z.string().min(1),
  result: z.string().min(1),
  model: z.string().min(1).max(256),
  operation: operationSchema,
  tone: toneSchema,
  strength: strengthSchema,
  length: lengthSchema,
  createdAt: z.number().int().positive(),
});

export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const handoffKey = HANDOFF_STORAGE_KEY;
export const settingsKey = SETTINGS_STORAGE_KEY;
export const historyKey = (id: string) => `${HISTORY_KEY_PREFIX}${id}`;

export const storageLimits = {
  maxHistoryEntries: MAX_HISTORY_ENTRIES,
  maxHistoryBytes: MAX_HISTORY_BYTES,
} as const;

export function getDefaultSettings(): Settings {
  return structuredClone(DEFAULT_SETTINGS);
}
