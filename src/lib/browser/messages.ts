import { z } from 'zod';
import { MAX_OUTPUT_CHARS, MAX_SOURCE_CHARS } from '../constants';
import { lengthSchema, operationSchema, selectionCaptureSchema, toneSchema } from '../storage/schema';

export const runInlineRewriteMessageSchema = z.object({
  type: z.literal('run-inline-rewrite'),
  requestId: z.string().min(1).max(128),
  source: z.string().min(1).max(MAX_SOURCE_CHARS),
  capture: selectionCaptureSchema.nullable(),
  operation: operationSchema,
  tone: toneSchema,
  length: lengthSchema,
});

export type RunInlineRewriteMessage = z.infer<typeof runInlineRewriteMessageSchema>;

export const cancelInlineRewriteMessageSchema = z.object({
  type: z.literal('cancel-inline-rewrite'),
  requestId: z.string().min(1).max(128),
});

const inlineAlternativeSchema = z.object({
  id: z.enum(['closest', 'distinct']),
  text: z.string().min(1).max(MAX_OUTPUT_CHARS),
});

export const inlineRewriteProgressMessageSchema = z.discriminatedUnion('status', [
  z.object({
    type: z.literal('inline-rewrite-progress'),
    requestId: z.string().min(1).max(128),
    status: z.literal('started'),
  }),
  z.object({
    type: z.literal('inline-rewrite-progress'),
    requestId: z.string().min(1).max(128),
    status: z.literal('complete'),
    alternatives: z.tuple([
      inlineAlternativeSchema.extend({ id: z.literal('closest') }),
      inlineAlternativeSchema.extend({ id: z.literal('distinct') }),
    ]).refine(
      (alternatives) => new Set(alternatives.map((alternative) => alternative.text.trim())).size === 2,
      'Alternative texts must be distinct',
    ),
  }),
  z.object({
    type: z.literal('inline-rewrite-progress'),
    requestId: z.string().min(1).max(128),
    status: z.literal('error'),
    message: z.string().min(1).max(300),
  }),
  z.object({
    type: z.literal('inline-rewrite-progress'),
    requestId: z.string().min(1).max(128),
    status: z.literal('cancelled'),
    message: z.string().min(1).max(300),
  }),
]);

export type InlineRewriteProgressMessage = z.infer<typeof inlineRewriteProgressMessageSchema>;

export const replaceSelectionMessageSchema = z.object({
  type: z.literal('replace-selection'),
  tabId: z.number().int().nonnegative(),
  frameId: z.number().int().nonnegative().default(0),
  capture: selectionCaptureSchema.nullable(),
  replacement: z.string().min(1).max(MAX_OUTPUT_CHARS),
});

export type ReplaceSelectionMessage = z.infer<typeof replaceSelectionMessageSchema>;

export const replaceResultMessageSchema = z.object({
  type: z.literal('replace-selection-result'),
  replaced: z.boolean(),
  reason: z.string().max(200).optional(),
});

export type ReplaceResultMessage = z.infer<typeof replaceResultMessageSchema>;
