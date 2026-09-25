import { z } from 'zod';
import {
  GENERATION_TIMEOUT_MS,
  MAX_OUTPUT_CHARS,
  MODEL_DISCOVERY_TIMEOUT_MS,
  ROUTER_BASE_URL,
} from '../constants';
import { readSseEvents } from './sse';
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

export class RouterError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'configuration'
      | 'connection'
      | 'authentication'
      | 'rate_limit'
      | 'model'
      | 'timeout'
      | 'cancelled'
      | 'protocol'
      | 'server',
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'RouterError';
  }
}

function authHeaders(token: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
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

function mapHttpError(status: number): RouterError {
  if (status === 401 || status === 403) {
    return new RouterError('9Router rejected the token. Check the token in Settings.', 'authentication', status);
  }
  if (status === 429) {
    return new RouterError('9Router is busy or the selected model is rate limited. Try again later.', 'rate_limit', status);
  }
  if (status === 404) {
    return new RouterError('9Router could not find that model. Refresh models in Settings.', 'model', status);
  }
  if (status >= 500) {
    return new RouterError('9Router returned a temporary server error. Try again.', 'server', status);
  }
  return new RouterError(`9Router returned an unexpected response (${status}).`, 'server', status);
}

export async function listModels(token = '', signal?: AbortSignal): Promise<string[]> {
  const timeout = withTimeout(signal, MODEL_DISCOVERY_TIMEOUT_MS);
  try {
    const response = await fetch(`${ROUTER_BASE_URL}/models`, {
      method: 'GET',
      headers: authHeaders(token),
      signal: timeout.signal,
    });
    if (!response.ok) {
      throw mapHttpError(response.status);
    }
    const parsed = modelsResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new RouterError('9Router returned an invalid model list.', 'protocol');
    }
    return [...new Set(parsed.data.data.map((model) => model.id))];
  } catch (error) {
    if (error instanceof RouterError) {
      throw error;
    }
    if (timeout.signal.aborted) {
      if (signal?.aborted) {
        throw new RouterError('Model discovery was cancelled.', 'cancelled');
      }
      throw new RouterError('Model discovery timed out. Check that 9Router is running locally.', 'timeout');
    }
    throw new RouterError('Could not connect to 9Router at 127.0.0.1:20128.', 'connection');
  } finally {
    timeout.cleanup();
  }
}

export interface StreamOptions {
  model: string;
  token?: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onToken?: (token: string, fullText: string) => void;
  maxOutputChars?: number;
  timeoutMs?: number;
  n?: number;
}

export async function streamChat(options: StreamOptions): Promise<string> {
  const timeout = withTimeout(options.signal, options.timeoutMs ?? GENERATION_TIMEOUT_MS);
  const maxOutputChars = options.maxOutputChars ?? MAX_OUTPUT_CHARS;
  let fullText = '';
  let done = false;

  try {
    const response = await fetch(`${ROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: authHeaders(options.token ?? ''),
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: true,
        n: options.n ?? 1,
      }),
      signal: timeout.signal,
    });
    if (!response.ok) {
      throw mapHttpError(response.status);
    }
    if (!response.body) {
      throw new RouterError('9Router returned an empty response stream.', 'protocol');
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
        throw new RouterError('9Router returned an unreadable stream chunk.', 'protocol');
      }
      const parsed = streamChunkSchema.safeParse(payload);
      if (!parsed.success) {
        throw new RouterError('9Router returned an invalid stream chunk.', 'protocol');
      }
      if (parsed.data.error?.message) {
        throw new RouterError('9Router reported an error while generating text.', 'server');
      }
      const token = parsed.data.choices?.[0]?.delta?.content ?? '';
      if (!token) {
        continue;
      }
      fullText += token;
      if (fullText.length > maxOutputChars) {
        throw new RouterError('The result exceeded the output limit. Try a shorter input.', 'protocol');
      }
      options.onToken?.(token, fullText);
    }

    if (!done && !fullText) {
      throw new RouterError('9Router closed the stream before returning text.', 'protocol');
    }
    return fullText;
  } catch (error) {
    if (error instanceof RouterError) {
      throw error;
    }
    if (timeout.signal.aborted) {
      if (options.signal?.aborted) {
        throw new RouterError('Generation was cancelled.', 'cancelled');
      }
      throw new RouterError('Generation timed out. Try again with a shorter input.', 'timeout');
    }
    throw new RouterError('Could not connect to 9Router at 127.0.0.1:20128.', 'connection');
  } finally {
    timeout.cleanup();
  }
}

export async function rewriteText(
  request: RewriteRequest & { model: string; token?: string; signal?: AbortSignal; onToken?: (fullText: string) => void },
): Promise<string> {
  const messages = buildRewriteMessages(request);
  return streamChat({
    model: request.model,
    token: request.token,
    messages,
    signal: request.signal,
    onToken: request.onToken ? (_token, fullText) => request.onToken?.(fullText) : undefined,
  });
}
