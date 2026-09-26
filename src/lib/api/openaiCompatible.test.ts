import { ApiError, listModels, probeModel, streamChat } from './openaiCompatible';

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function mockStreamResponse(chunks: string[], init: ResponseInit = {}): Response {
  return new Response(makeStream(chunks), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
    ...init,
  });
}

function mockJsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function lastRequest(fetchMock: ReturnType<typeof vi.fn>): { url: string; init: RequestInit } {
  const call = fetchMock.mock.calls.at(-1);
  return { url: call?.[0] as string, init: (call?.[1] ?? {}) as RequestInit };
}

function headerValue(init: RequestInit, name: string): string | null {
  return new Headers(init.headers).get(name);
}

const ENDPOINT = { baseUrl: 'https://api.example.com/v1', apiKey: 'sk-test-key' };

describe('listModels', () => {
  it('requests the models path of the configured endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ data: [{ id: 'model-a' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const models = await listModels(ENDPOINT);

    expect(models).toEqual(['model-a']);
    expect(lastRequest(fetchMock).url).toBe('https://api.example.com/v1/models');
    vi.unstubAllGlobals();
  });

  it('sends the api key as a bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ data: [{ id: 'model-a' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await listModels(ENDPOINT);

    expect(headerValue(lastRequest(fetchMock).init, 'Authorization')).toBe('Bearer sk-test-key');
    vi.unstubAllGlobals();
  });

  it('omits the authorization header when no key is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ data: [{ id: 'model-a' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await listModels({ baseUrl: ENDPOINT.baseUrl, apiKey: '' });

    expect(headerValue(lastRequest(fetchMock).init, 'Authorization')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('deduplicates repeated model ids', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({ data: [{ id: 'a' }, { id: 'a' }, { id: 'b' }] })));

    expect(await listModels(ENDPOINT)).toEqual(['a', 'b']);
    vi.unstubAllGlobals();
  });

  it('names the endpoint host in its connection error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed to fetch')));

    await expect(listModels(ENDPOINT)).rejects.toThrow(/api\.example\.com/);
    vi.unstubAllGlobals();
  });
});

describe('probeModel', () => {
  it('confirms a model the endpoint accepts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({ id: 'resp_1' })));

    expect(await probeModel({ ...ENDPOINT, model: 'oc/muse-spark-1.3-contributor-free' })).toEqual({ ok: true });
    vi.unstubAllGlobals();
  });

  it('calls chat completions rather than trusting the models list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ id: 'resp_1' }));
    vi.stubGlobal('fetch', fetchMock);

    await probeModel({ ...ENDPOINT, model: 'unlisted-model' });

    expect(lastRequest(fetchMock).url).toBe('https://api.example.com/v1/chat/completions');
    expect(JSON.parse(String(lastRequest(fetchMock).init.body)).model).toBe('unlisted-model');
    vi.unstubAllGlobals();
  });

  it('caps the completion so the check stays cheap', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ id: 'resp_1' }));
    vi.stubGlobal('fetch', fetchMock);

    await probeModel({ ...ENDPOINT, model: 'm' });

    expect(JSON.parse(String(lastRequest(fetchMock).init.body)).max_tokens).toBe(16);
    vi.unstubAllGlobals();
  });

  it('retries without the cap when a provider rejects the token floor', async () => {
    // A real gateway forwards max_tokens to a provider that demands >= 16 and
    // answers 400. Reporting that as a missing model would be wrong, so the
    // cap is dropped and the routing result is what decides.
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('max_output_tokens The number must be >= 16', { status: 400 }))
      .mockResolvedValueOnce(mockJsonResponse({ id: 'resp_1' }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await probeModel({ ...ENDPOINT, model: 'oc/muse-spark-1.3-contributor-free' })).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(lastRequest(fetchMock).init.body))).not.toHaveProperty('max_tokens');
    vi.unstubAllGlobals();
  });

  it('does not retry a rejection that is about the model', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('nope', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeModel({ ...ENDPOINT, model: 'opuss' });

    expect(result).toMatchObject({ code: 'model' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('reports an unknown model as a model error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 404 })));

    const result = await probeModel({ ...ENDPOINT, model: 'opuss' });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: 'model' });
    vi.unstubAllGlobals();
  });

  it('reports a rejected key instead of a missing model', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 401 })));

    const result = await probeModel({ ...ENDPOINT, model: 'oc/muse-spark-1.3-contributor-free' });

    expect(result).toMatchObject({ code: 'authentication' });
    vi.unstubAllGlobals();
  });

  it('reports an unreachable endpoint rather than throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed to fetch')));

    const result = await probeModel({ ...ENDPOINT, model: 'm' });

    expect(result).toMatchObject({ code: 'connection' });
    vi.unstubAllGlobals();
  });
});

describe('streamChat', () => {
  it('streams delta content and returns the complete text', async () => {
    const updates: string[] = [];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockStreamResponse([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ])));

    const result = await streamChat({
      ...ENDPOINT,
      model: 'test-model',
      messages: [{ role: 'user', content: 'test' }],
      onToken: (_, fullText) => updates.push(fullText),
    });

    expect(result).toBe('Hello world');
    expect(updates).toEqual(['Hello', 'Hello world']);
    vi.unstubAllGlobals();
  });

  it('posts to the chat completions path of the configured endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockStreamResponse([
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      'data: [DONE]\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);

    await streamChat({ ...ENDPOINT, model: 'm', messages: [{ role: 'user', content: 'hi' }] });

    expect(lastRequest(fetchMock).url).toBe('https://api.example.com/v1/chat/completions');
    vi.unstubAllGlobals();
  });

  it('sends the model and messages but no n parameter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockStreamResponse([
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      'data: [DONE]\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);

    await streamChat({ ...ENDPOINT, model: 'gpt-test', messages: [{ role: 'user', content: 'hi' }] });

    const body = JSON.parse(String(lastRequest(fetchMock).init.body));
    expect(body.model).toBe('gpt-test');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(body.stream).toBe(true);
    expect(body).not.toHaveProperty('n');
    vi.unstubAllGlobals();
  });

  it('accepts a stream that ends without a DONE sentinel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockStreamResponse([
      'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',
    ])));

    expect(await streamChat({ ...ENDPOINT, model: 'm', messages: [{ role: 'user', content: 'hi' }] })).toBe('partial');
    vi.unstubAllGlobals();
  });

  it('rejects an invalid stream payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockStreamResponse(['data: {"unexpected":true}\n\n'])));

    await expect(streamChat({ ...ENDPOINT, model: 'm', messages: [{ role: 'user', content: 'hi' }] }))
      .rejects.toMatchObject({ code: 'protocol' });
    vi.unstubAllGlobals();
  });

  it('maps authentication errors without exposing response content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not authorized', { status: 401 })));

    await expect(streamChat({ ...ENDPOINT, model: 'm', messages: [{ role: 'user', content: 'hi' }] }))
      .rejects.toMatchObject({ code: 'authentication' });
    vi.unstubAllGlobals();
  });

  it('names the endpoint host in a rejected-key message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 401 })));

    await expect(streamChat({ ...ENDPOINT, model: 'm', messages: [{ role: 'user', content: 'hi' }] }))
      .rejects.toThrow(/api\.example\.com/);
    vi.unstubAllGlobals();
  });

  it('raises ApiError with a provider-neutral code union', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('busy', { status: 429 })));

    const error = await streamChat({ ...ENDPOINT, model: 'm', messages: [{ role: 'user', content: 'hi' }] })
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('rate_limit');
    expect(error.status).toBe(429);
    vi.unstubAllGlobals();
  });
});
