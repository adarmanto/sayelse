import { isLoopbackBaseUrl, normaliseBaseUrl, originPatternFromBaseUrl, providerLabel } from './endpoint';

describe('normaliseBaseUrl', () => {
  it('keeps a well-formed endpoint as-is', () => {
    expect(normaliseBaseUrl('https://api.openai.com/v1')).toEqual({ ok: true, value: 'https://api.openai.com/v1' });
  });

  it('trims surrounding whitespace', () => {
    expect(normaliseBaseUrl('  https://api.openai.com/v1  ')).toEqual({ ok: true, value: 'https://api.openai.com/v1' });
  });

  it('strips a trailing slash', () => {
    expect(normaliseBaseUrl('https://api.openai.com/v1/')).toEqual({ ok: true, value: 'https://api.openai.com/v1' });
  });

  it('defaults to https when no scheme is given', () => {
    expect(normaliseBaseUrl('api.openai.com/v1')).toEqual({ ok: true, value: 'https://api.openai.com/v1' });
  });

  it('preserves an explicit http scheme for local servers', () => {
    expect(normaliseBaseUrl('http://127.0.0.1:11434/v1')).toEqual({ ok: true, value: 'http://127.0.0.1:11434/v1' });
  });

  it('reduces a pasted chat completions URL to its base', () => {
    expect(normaliseBaseUrl('https://api.openai.com/v1/chat/completions')).toEqual({ ok: true, value: 'https://api.openai.com/v1' });
  });

  it('reduces a pasted models URL to its base', () => {
    expect(normaliseBaseUrl('https://api.openai.com/v1/models')).toEqual({ ok: true, value: 'https://api.openai.com/v1' });
  });

  it('rejects an empty value with a reason a user can act on', () => {
    const result = normaliseBaseUrl('   ');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ message: expect.stringMatching(/endpoint/i) });
  });

  it('rejects a non-http scheme', () => {
    const result = normaliseBaseUrl('ftp://files.example.com/v1');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ message: expect.stringMatching(/http/i) });
  });

  it('accepts a bare hostname', () => {
    expect(normaliseBaseUrl('api.openai.com')).toEqual({ ok: true, value: 'https://api.openai.com' });
  });

  it('rejects a value containing spaces', () => {
    expect(normaliseBaseUrl('not a url').ok).toBe(false);
  });

  it('rejects a scheme with no host', () => {
    const result = normaliseBaseUrl('https://');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ message: expect.stringMatching(/URL/i) });
  });

  it('rejects a bare slash', () => {
    expect(normaliseBaseUrl('/').ok).toBe(false);
  });
});

describe('providerLabel', () => {
  it('returns the host for a hosted endpoint', () => {
    expect(providerLabel('https://api.openai.com/v1')).toBe('api.openai.com');
  });

  it('includes the port for a local endpoint', () => {
    expect(providerLabel('http://127.0.0.1:20128/v1')).toBe('127.0.0.1:20128');
  });

  it('falls back to neutral wording when the url will not parse', () => {
    expect(providerLabel('https://')).toBe('the endpoint');
  });

  it('treats a bare hostname as a host', () => {
    expect(providerLabel('api.openai.com')).toBe('api.openai.com');
  });
});

describe('originPatternFromBaseUrl', () => {
  it('builds a match pattern for the origin only', () => {
    expect(originPatternFromBaseUrl('https://api.openai.com/v1')).toBe('https://api.openai.com/*');
  });

  it('keeps the port in the pattern for local endpoints', () => {
    expect(originPatternFromBaseUrl('http://127.0.0.1:11434/v1')).toBe('http://127.0.0.1:11434/*');
  });

  it('returns null when the url will not parse', () => {
    expect(originPatternFromBaseUrl('https://')).toBeNull();
  });
});

describe('isLoopbackBaseUrl', () => {
  it('recognises the ipv4 loopback address', () => {
    expect(isLoopbackBaseUrl('http://127.0.0.1:20128/v1')).toBe(true);
  });

  it('recognises localhost', () => {
    expect(isLoopbackBaseUrl('http://localhost:11434/v1')).toBe(true);
  });

  it('does not treat a public host as loopback', () => {
    expect(isLoopbackBaseUrl('https://api.openai.com/v1')).toBe(false);
  });

  it('does not treat a host that merely mentions localhost as loopback', () => {
    expect(isLoopbackBaseUrl('https://localhost.example.com/v1')).toBe(false);
  });

  it('returns false for a url that will not parse', () => {
    expect(isLoopbackBaseUrl('https://')).toBe(false);
  });
});
