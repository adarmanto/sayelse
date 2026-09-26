// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const listModels = vi.fn();
const probeModel = vi.fn();
const getSettings = vi.fn();
const saveSettings = vi.fn();
const consumeSelectionHandoff = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {},
      session: {},
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    permissions: { contains: vi.fn(), request: vi.fn() },
    runtime: { sendMessage: vi.fn(), id: 'sayelse' },
  },
}));

vi.mock('../../lib/api/openaiCompatible', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/openaiCompatible')>();
  return {
    ...actual,
    listModels: (...args: unknown[]) => listModels(...args),
    probeModel: (...args: unknown[]) => probeModel(...args),
  };
});

vi.mock('../../lib/storage/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/storage/settings')>();
  return {
    ...actual,
    getSettings: (...args: unknown[]) => getSettings(...args),
    saveSettings: (...args: unknown[]) => saveSettings(...args),
  };
});

vi.mock('../../lib/storage/handoff', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/storage/handoff')>();
  return { ...actual, consumeSelectionHandoff: (...args: unknown[]) => consumeSelectionHandoff(...args) };
});

vi.mock('../../lib/browser/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/browser/permissions')>();
  return { ...actual, grantEndpointAccess: vi.fn().mockResolvedValue({ ok: true }) };
});

const baseSettings = {
  version: 3 as const,
  baseUrl: 'http://127.0.0.1:20128/v1',
  apiKey: 'key',
  selectedModel: 'the-model-the-user-picked',
  defaults: { operation: 'paraphrase' as const },
  theme: 'system' as const,
};

function renderPanel() {
  return render(<App />);
}

async function openSettings() {
  renderPanel();
  await screen.findByRole('button', { name: 'Open settings' });
  await waitFor(() => expect(listModels).toHaveBeenCalled());
  click(screen.getByRole('button', { name: 'Open settings' }));
  return screen.findByRole('heading', { name: 'Settings' });
}

// The panel has a Save button per settings group, so the connection save is
// addressed through the group it belongs to rather than by name alone.
function saveConnectionButton(): HTMLElement {
  const group = screen.getByRole('heading', { name: 'Connection' }).closest('.settings-group');
  if (!(group instanceof HTMLElement)) throw new Error('Connection group not found');
  return within(group).getByRole('button', { name: 'Save' });
}

function typeInto(label: string, value: string) {
  const input = screen.getByLabelText(label);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return input as HTMLInputElement;
}

function click(element: HTMLElement) {
  act(() => {
    element.click();
  });
}

describe('side panel settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    getSettings.mockResolvedValue(baseSettings);
    consumeSelectionHandoff.mockResolvedValue(null);
    saveSettings.mockResolvedValue(undefined);
    listModels.mockResolvedValue(['alpha', 'beta']);
  });

  it('keeps showing the saved model when the endpoint changes and the new one is unreachable', async () => {
    // The bug: switching endpoints nulled selectedModel in state while the ref
    // kept it, so the model disappeared from the panel even though it was
    // still the saved one, and state and storage disagreed.
    listModels.mockResolvedValueOnce(['alpha', 'beta']).mockRejectedValue(new Error('offline'));

    await openSettings();
    await waitFor(() => expect(listModels).toHaveBeenCalledTimes(1));

    const input = typeInto('Endpoint URL', 'http://127.0.0.1:9999/v1');
    await waitFor(() => expect(input.value).toBe('http://127.0.0.1:9999/v1'));
    click(saveConnectionButton());

    // The new endpoint does not advertise the saved model, so the select
    // shows it through the custom option. The id itself must still be there:
    // the probe decides existence, not a URL change.
    await waitFor(() => expect(listModels).toHaveBeenCalledTimes(2));
    expect((screen.getByLabelText('Custom model ID') as HTMLInputElement).value).toBe('the-model-the-user-picked');
  });

  it('fetches the model list once per endpoint change, not twice', async () => {
    listModels.mockResolvedValue(['alpha', 'beta']);
    await openSettings();
    await waitFor(() => expect(listModels).toHaveBeenCalledTimes(1));

    const input = typeInto('Endpoint URL', 'http://127.0.0.1:9999/v1');
    await waitFor(() => expect(input.value).toBe('http://127.0.0.1:9999/v1'));
    click(saveConnectionButton());

    // The save used to fire a second /models request on top of the one the
    // baseUrl effect already made.
    await waitFor(() => expect(listModels).toHaveBeenCalledTimes(2));
    expect(listModels).toHaveBeenCalledTimes(2);
  });

  it('does not replace the saved model with the first one a new endpoint advertises', async () => {
    // A list is a convenience, not an authority. Auto-picking models[0] after
    // an endpoint change silently changed which model the user was running.
    listModels.mockResolvedValue(['alpha', 'beta']);
    await openSettings();
    await waitFor(() => expect(listModels).toHaveBeenCalledTimes(1));

    const input = typeInto('Endpoint URL', 'http://127.0.0.1:9999/v1');
    await waitFor(() => expect(input.value).toBe('http://127.0.0.1:9999/v1'));
    click(saveConnectionButton());

    await waitFor(() => expect(listModels).toHaveBeenCalledTimes(2));
    const persisted = saveSettings.mock.calls.map((call) => (call[0] as { selectedModel: string | null }).selectedModel);
    expect(persisted).not.toContain('alpha');
    expect((screen.getByLabelText('Custom model ID') as HTMLInputElement).value).toBe('the-model-the-user-picked');
  });
});
