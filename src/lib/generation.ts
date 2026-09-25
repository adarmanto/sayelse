import { RouterError, rewriteText } from './api/nineRouter';
import type { RewriteRequest } from './prompts';
import type { Length, Operation, Strength, Tone } from './constants';

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error' | 'stopped';

export interface GenerateInput extends RewriteRequest {
  model: string;
  token?: string;
  signal: AbortSignal;
  onToken: (fullText: string) => void;
}

export interface GenerationError {
  code: RouterError['code'] | 'unknown';
  message: string;
}

export async function generateRewrite(input: GenerateInput): Promise<string> {
  return rewriteText({
    source: input.source,
    operation: input.operation,
    tone: input.tone,
    strength: input.strength,
    length: input.length,
    model: input.model,
    token: input.token,
    signal: input.signal,
    onToken: input.onToken,
  });
}

export function describeGenerationError(error: unknown): GenerationError {
  if (error instanceof RouterError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: 'unknown', message: error.message };
  }
  return { code: 'unknown', message: 'Something went wrong while rewriting your text.' };
}

export function isRewriteOption(value: string): value is Operation | Tone | Strength | Length {
  return [
    'paraphrase',
    'formal',
    'casual',
    'concise',
    'expand',
    'grammar',
    'originality',
    'neutral',
    'friendly',
    'professional',
    'confident',
    'persuasive',
    'light',
    'balanced',
    'strong',
    'shorter',
    'similar',
    'longer',
  ].includes(value);
}
