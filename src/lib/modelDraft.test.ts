import { CUSTOM_MODEL_VALUE, resolveModelDraft, toModelChoice } from './modelDraft';

describe('toModelChoice', () => {
  it('keeps a model that is present in the discovered list', () => {
    expect(toModelChoice('sonnet', ['opus', 'sonnet'])).toBe('sonnet');
  });

  it('switches to the custom option when the stored model is not in the list', () => {
    expect(toModelChoice('vendor/x', ['opus', 'sonnet'])).toBe(CUSTOM_MODEL_VALUE);
  });

  it('shows a stored model through the custom option when no list was discovered', () => {
    // An empty list says nothing about which models exist, so the stored model
    // is kept and routed through the custom option. Returning the raw id here
    // would leave the select pointing at a value it has no option for, and the
    // model would vanish from the panel while the endpoint is unreachable.
    expect(toModelChoice('sonnet', [])).toBe(CUSTOM_MODEL_VALUE);
  });

  it('leaves an unset model unset even when the list is empty', () => {
    expect(toModelChoice('', [])).toBe('');
  });
});

describe('resolveModelDraft', () => {
  it('accepts a model picked from the discovered list', () => {
    expect(resolveModelDraft({ selected: 'opus', custom: '' })).toEqual({
      ok: true,
      model: 'opus',
    });
  });

  it('rejects an empty selection with a message a user can act on', () => {
    const result = resolveModelDraft({ selected: '', custom: '' });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ message: expect.stringMatching(/choose a model/i) });
  });

  it('accepts a custom ID that matches a discovered model', () => {
    expect(
      resolveModelDraft({ selected: CUSTOM_MODEL_VALUE, custom: 'opus' }),
    ).toEqual({ ok: true, model: 'opus' });
  });

  it('trims whitespace from a custom ID', () => {
    expect(resolveModelDraft({ selected: CUSTOM_MODEL_VALUE, custom: '  opus  ' })).toEqual({
      ok: true,
      model: 'opus',
    });
  });

  it('accepts a custom ID the discovered list omits', () => {
    // The list is not authoritative: a gateway can route a model it never
    // advertises. Existence is settled by calling the model, not by this list,
    // so an unlisted ID must survive to the probe.
    expect(
      resolveModelDraft({ selected: CUSTOM_MODEL_VALUE, custom: 'oc/muse-spark-1.3-contributor-free' }),
    ).toEqual({ ok: true, model: 'oc/muse-spark-1.3-contributor-free' });
  });

  it('rejects a blank custom ID', () => {
    const result = resolveModelDraft({ selected: CUSTOM_MODEL_VALUE, custom: '   ' });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ message: expect.stringMatching(/model ID/i) });
  });

  it('rejects a custom ID longer than the settings schema allows', () => {
    const result = resolveModelDraft({
      selected: CUSTOM_MODEL_VALUE,
      custom: 'a'.repeat(257),
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ message: expect.stringMatching(/too long/i) });
  });
});
