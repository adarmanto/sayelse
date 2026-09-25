import { streamChat } from './nineRouter';

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

function mockResponse(stream: ReadableStream<Uint8Array>, init: ResponseInit = {}): Response {
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
    ...init,
  });
}

describe('streamChat', () => {
  it('streams delta content and returns the complete text', async () => {
    const updates: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse(
          makeStream([
            'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
            'data: [DONE]\n\n',
          ]),
        ),
      ),
    );

    const result = await streamChat({
      model: 'test-model',
      messages: [{ role: 'user', content: 'test' }],
      onToken: (_, fullText) => updates.push(fullText),
    });

    expect(result).toBe('Hello world');
    expect(updates).toEqual(['Hello', 'Hello world']);
    vi.unstubAllGlobals();
  });

  it('rejects an invalid stream payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(makeStream(['data: {bad}\n\n']))));

    await expect(
      streamChat({ model: 'test-model', messages: [{ role: 'user', content: 'test' }] }),
    ).rejects.toMatchObject({ code: 'protocol' });
    vi.unstubAllGlobals();
  });

  it('maps authentication errors without exposing response content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not authorized', { status: 401 })));

    await expect(
      streamChat({ model: 'test-model', messages: [{ role: 'user', content: 'test' }] }),
    ).rejects.toMatchObject({ code: 'authentication' });
    vi.unstubAllGlobals();
  });
});
