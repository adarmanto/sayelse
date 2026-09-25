import { readSseEvents } from './sse';

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
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

async function collect(stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const values: string[] = [];
  for await (const event of readSseEvents(stream)) {
    values.push(event.data);
  }
  return values;
}

describe('readSseEvents', () => {
  it('parses complete events separated by CRLF', async () => {
    const values = await collect(
      streamFromChunks(['data: first\r\n\r\ndata: second\r\n\r\n']),
    );
    expect(values).toEqual(['first', 'second']);
  });

  it('joins multiline data fields', async () => {
    const values = await collect(
      streamFromChunks(['event: message\ndata: first\ndata: second\n\n']),
    );
    expect(values).toEqual(['first\nsecond']);
  });

  it('keeps an event split across stream chunks', async () => {
    const values = await collect(
      streamFromChunks(['data: hel', 'lo\n', '\ndata: [DONE]\n\n']),
    );
    expect(values).toEqual(['hello', '[DONE]']);
  });

  it('preserves a trailing event without a blank line', async () => {
    const values = await collect(streamFromChunks(['data: last']));
    expect(values).toEqual(['last']);
  });

  it('ignores comments and fields without data', async () => {
    const values = await collect(streamFromChunks([': keep-alive\nevent: ping\n\ndata: value\n\n']));
    expect(values).toEqual(['value']);
  });
});
