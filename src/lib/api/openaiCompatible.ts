import { z } from 'zod';
import {
  GENERATION_TIMEOUT_MS,
  MAX_OUTPUT_CHARS,
  MODEL_DISCOVERY_TIMEOUT_MS,
} from '../constants';
import { readSseEvents } from './sse';
import { providerLabel } from './endpoint';
import { buildRewriteMessages, type ChatMessage, type RewriteRequest } from '../prompts';

const modelsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
    }),
  ),
});

const streamChunkSchema = z.object({
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            content: z.string().optional(),
          })
          .optional(),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .optional(),
  error: z
    .object({
      message: z.string().optional(),
    })
    .optional(),
});

export type ApiErrorCode =
  | 'configuration'
  | 'connection'
  | 'authentication'
  | 'rate_limit'
  | 'model'
  | 'timeout'
  | 'cancelled'
  | 'protocol'
  | 'server';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: ApiErrorCode,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface EndpointConfig {
  baseUrl: string;
  apiKey: string;
}

function authHeaders(apiKey: string): HeadersInit {
  return apiKey
    ? { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

function mapHttpError(status: number, label: string): ApiError {
  if (status === 401 || status === 403) {
    return new ApiError(`${label} rejected the API key. Check the key in Settings.`, 'authentication', status);
  }
  if (status === 429) {
    return new ApiError(`${label} is busy or the selected model is rate limited. Try again later.`, 'rate_limit', status);
  }
  if (status === 404) {
    return new ApiError(`${label} could not find that model. Refresh models in Settings.`, 'model', status);
  }
  if (status >= 500) {
    return new ApiError(`${label} returned a temporary server error. Try again.`, 'server', status);
  }
  return new ApiError(`${label} returned an unexpected response (${status}).`, 'server', status);
}

export interface ListModelsOptions extends EndpointConfig {
  signal?: AbortSignal;
}

export async function listModels(options: ListModelsOptions): Promise<string[]> {
  const label = providerLabel(options.baseUrl);
  const timeout = withTimeout(options.signal, MODEL_DISCOVERY_TIMEOUT_MS);
  try {
    const response = await fetch(`${options.baseUrl}/models`, {
      method: 'GET',
      headers: authHeaders(options.apiKey),
      signal: timeout.signal,
    });
    if (!response.ok) {
      throw mapHttpError(response.status, label);
    }
    const parsed = modelsResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new ApiError(`${label} returned an invalid model list.`, 'protocol');
    }
    return [...new Set(parsed.data.data.map((model) => model.id))];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (timeout.signal.aborted) {
      if (options.signal?.aborted) {
        throw new ApiError('Model discovery was cancelled.', 'cancelled');
      }
      throw new ApiError(`Model discovery timed out. Check that ${label} is reachable.`, 'timeout');
    }
    throw new ApiError(`Could not connect to ${label}.`, 'connection');
  } finally {
    timeout.cleanup();
  }
}

export interface StreamOptions extends EndpointConfig {
  model: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onToken?: (token: string, fullText: string) => void;
  maxOutputChars?: number;
  timeoutMs?: number;
}

export async function streamChat(options: StreamOptions): Promise<string> {
  const label = providerLabel(options.baseUrl);
  const timeout = withTimeout(options.signal, options.timeoutMs ?? GENERATION_TIMEOUT_MS);
  const maxOutputChars = options.maxOutputChars ?? MAX_OUTPUT_CHARS;
  let fullText = '';
  let done = false;

  try {
    const response = await fetch(`${options.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: authHeaders(options.apiKey),
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: true,
      }),
      signal: timeout.signal,
    });
    if (!response.ok) {
      throw mapHttpError(response.status, label);
    }
    if (!response.body) {
      throw new ApiError(`${label} returned an empty response stream.`, 'protocol');
    }

    for await (const event of readSseEvents(response.body)) {
      if (event.data === '[DONE]') {
        done = true;
        break;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch {
        throw new ApiError(`${label} returned an unreadable stream chunk.`, 'protocol');
      }
      const parsed = streamChunkSchema.safeParse(payload);
      if (!parsed.success) {
        throw new ApiError(`${label} returned an invalid stream chunk.`, 'protocol');
      }
      if (parsed.data.error?.message) {
        throw new ApiError(`${label} reported an error while generating text.`, 'server');
      }
      const token = parsed.data.choices?.[0]?.delta?.content ?? '';
      if (!token) {
        continue;
      }
      fullText += token;
      if (fullText.length > maxOutputChars) {
        throw new ApiError('The result exceeded the output limit. Try a shorter input.', 'protocol');
      }
      options.onToken?.(token, fullText);
    }

    if (!done && !fullText) {
      throw new ApiError(`${label} closed the stream before returning text.`, 'protocol');
    }
    return fullText;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (timeout.signal.aborted) {
      if (options.signal?.aborted) {
        throw new ApiError('Generation was cancelled.', 'cancelled');
      }
      throw new ApiError('Generation timed out. Try again with a shorter input.', 'timeout');
    }
    throw new ApiError(`Could not connect to ${label}.`, 'connection');
  } finally {
    timeout.cleanup();
  }
}

export async function rewriteText(
  request: RewriteRequest & EndpointConfig & { model: string; signal?: AbortSignal; onToken?: (fullText: string) => void },
): Promise<string> {
  const messages = buildRewriteMessages(request);
  return streamChat({
    baseUrl: request.baseUrl,
    apiKey: request.apiKey,
    model: request.model,
    messages,
    signal: request.signal,
    onToken: request.onToken ? (_token, fullText) => request.onToken?.(fullText) : undefined,
  });
}
