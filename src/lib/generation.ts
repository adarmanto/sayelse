import { ApiError, rewriteText, type ApiErrorCode, type EndpointConfig } from './api/openaiCompatible';
import type { RewriteRequest } from './prompts';

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error' | 'stopped';

export interface GenerateInput extends RewriteRequest, EndpointConfig {
  model: string;
  signal: AbortSignal;
  onToken: (fullText: string) => void;
}

export interface GenerationError {
  code: ApiErrorCode | 'unknown';
  message: string;
}

export async function generateRewrite(input: GenerateInput): Promise<string> {
  return rewriteText({
    source: input.source,
    operation: input.operation,
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    model: input.model,
    signal: input.signal,
    onToken: input.onToken,
  });
}

export function describeGenerationError(error: unknown): GenerationError {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: 'unknown', message: error.message };
  }
  return { code: 'unknown', message: 'Something went wrong while rewriting your text.' };
}
