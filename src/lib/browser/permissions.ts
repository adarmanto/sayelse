import { isLoopbackBaseUrl, normaliseBaseUrl, originPatternFromBaseUrl } from '../api/endpoint';

export interface PermissionsLike {
  contains: (request: { origins: string[] }) => Promise<boolean>;
  request: (request: { origins: string[] }) => Promise<boolean>;
}

export type GrantResult = { ok: true } | { ok: false; message: string };

const DENIED = 'SayElse needs access to that host to use it. Allow it from the extensions page.';

/**
 * Loopback is pre-granted in the manifest, so it resolves without a prompt and
 * the original local-only setup keeps working untouched.
 */
export async function grantEndpointAccess(
  baseUrl: string,
  permissions: PermissionsLike,
): Promise<GrantResult> {
  const normalised = normaliseBaseUrl(baseUrl);
  if (!normalised.ok) {
    return { ok: false, message: normalised.message };
  }
  if (isLoopbackBaseUrl(normalised.value)) {
    return { ok: true };
  }
  const pattern = originPatternFromBaseUrl(normalised.value);
  if (!pattern) {
    return { ok: false, message: 'That endpoint URL could not be understood.' };
  }
  try {
    if (await permissions.contains({ origins: [pattern] })) {
      return { ok: true };
    }
    return (await permissions.request({ origins: [pattern] }))
      ? { ok: true }
      : { ok: false, message: DENIED };
  } catch {
    return { ok: false, message: DENIED };
  }
}
