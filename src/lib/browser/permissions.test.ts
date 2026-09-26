import { grantEndpointAccess, type PermissionsLike } from './permissions';

const REMOTE = 'https://api.example.com/v1';
const LOOPBACK = 'http://127.0.0.1:20128/v1';

function stubPermissions(overrides: Partial<PermissionsLike> = {}): PermissionsLike {
  return {
    contains: vi.fn().mockResolvedValue(false),
    request: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('grantEndpointAccess', () => {
  it('skips the request for a loopback endpoint that is already granted', async () => {
    const permissions = stubPermissions();

    expect(await grantEndpointAccess(LOOPBACK, permissions)).toEqual({ ok: true });
    expect(permissions.request).not.toHaveBeenCalled();
  });

  it('requests access for the origin of a remote endpoint', async () => {
    const permissions = stubPermissions();

    expect(await grantEndpointAccess(REMOTE, permissions)).toEqual({ ok: true });
    expect(permissions.request).toHaveBeenCalledWith({ origins: ['https://api.example.com/*'] });
  });

  it('does not prompt again once access is held', async () => {
    const permissions = stubPermissions({ contains: vi.fn().mockResolvedValue(true) });

    expect(await grantEndpointAccess(REMOTE, permissions)).toEqual({ ok: true });
    expect(permissions.request).not.toHaveBeenCalled();
  });

  it('reports a denial without throwing', async () => {
    const permissions = stubPermissions({ request: vi.fn().mockResolvedValue(false) });

    expect(await grantEndpointAccess(REMOTE, permissions)).toEqual({
      ok: false,
      message: 'SayElse needs access to that host to use it. Allow it from the extensions page.',
    });
  });

  it('reports an unparseable endpoint instead of requesting a bogus origin', async () => {
    const permissions = stubPermissions();

    expect(await grantEndpointAccess('https://', permissions)).toEqual({
      ok: false,
      message: 'That does not look like a valid URL. Use something like https://api.example.com/v1',
    });
    expect(permissions.request).not.toHaveBeenCalled();
  });

  it('reports a permission error thrown by the browser', async () => {
    const permissions = stubPermissions({ request: vi.fn().mockRejectedValue(new Error('gesture required')) });

    const result = await grantEndpointAccess(REMOTE, permissions);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/host/i);
    }
  });
});
