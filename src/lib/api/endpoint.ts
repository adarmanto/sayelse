const ENDPOINT_SUFFIXES = ['/chat/completions', '/models'];
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

export type NormalisedBaseUrl =
  | { ok: true; value: string }
  | { ok: false; message: string };

function parseBaseUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function stripEndpointSuffix(pathname: string): string {
  let result = pathname;
  for (const suffix of ENDPOINT_SUFFIXES) {
    if (result.toLowerCase().endsWith(suffix)) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }
  return result.replace(/\/+$/, '');
}

/**
 * Turns whatever the user typed into a usable base URL, or explains why it
 * cannot be used. Never guesses a `/v1` segment: some servers expose `/api/v1`
 * or no version at all, and rewriting the path would be worse than a clear error.
 */
export function normaliseBaseUrl(input: string): NormalisedBaseUrl {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, message: 'Enter the endpoint URL for your OpenAI-compatible server.' };
  }
  const url = parseBaseUrl(trimmed);
  if (!url) {
    return { ok: false, message: 'That does not look like a valid URL. Use something like https://api.example.com/v1' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, message: 'The endpoint must use http or https.' };
  }
  if (!url.hostname) {
    return { ok: false, message: 'That does not look like a valid URL. Use something like https://api.example.com/v1' };
  }

  const path = stripEndpointSuffix(url.pathname);
  return { ok: true, value: `${url.origin}${path}` };
}

export function providerLabel(baseUrl: string): string {
  const url = parseBaseUrl(baseUrl);
  return url?.host || 'the endpoint';
}

export function originPatternFromBaseUrl(baseUrl: string): string | null {
  const url = parseBaseUrl(baseUrl);
  return url ? `${url.origin}/*` : null;
}

export function isLoopbackBaseUrl(baseUrl: string): boolean {
  const url = parseBaseUrl(baseUrl);
  return url ? LOOPBACK_HOSTS.has(url.hostname) : false;
}
