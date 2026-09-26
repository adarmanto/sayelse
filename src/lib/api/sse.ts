export interface SseEvent {
  data: string;
  event?: string;
  id?: string;
}

function consumeEvent(block: string): SseEvent | null {
  const lines = block.split(/\r?\n/);
  const data: string[] = [];
  let event: string | undefined;
  let id: string | undefined;

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue;
    }
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '');
    if (field === 'data') {
      data.push(value);
    } else if (field === 'event') {
      event = value;
    } else if (field === 'id') {
      id = value;
    }
  }

  if (data.length === 0) {
    return null;
  }
  return { data: data.join('\n'), event, id };
}

function takeCompleteEvents(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];
  let rest = buffer;
  const boundary = /\r?\n\r?\n/;
  let match = boundary.exec(rest);

  while (match) {
    const block = rest.slice(0, match.index);
    rest = rest.slice(match.index + match[0].length);
    const event = consumeEvent(block);
    if (event) {
      events.push(event);
    }
    match = boundary.exec(rest);
  }

  return { events, rest };
}

export async function* readSseEvents(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        completed = true;
        break;
      }
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = takeCompleteEvents(buffer);
        buffer = rest;
        for (const event of events) {
          yield event;
        }
      }
    }

    if (completed) {
      buffer += decoder.decode();
      const trailingEvent = consumeEvent(buffer);
      if (trailingEvent) {
        yield trailingEvent;
      }
    }
  } finally {
    if (completed) {
      reader.releaseLock();
    } else {
      await reader.cancel().catch(() => undefined);
    }
  }
}
