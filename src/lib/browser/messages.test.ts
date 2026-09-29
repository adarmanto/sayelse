import { INLINE_ACTIONS } from './inlineActions';
import { inlineRewriteProgressMessageSchema, runInlineRewriteMessageSchema } from './messages';

describe('inline rewrite flow', () => {
  it('uses an inline-run contract instead of opening the side panel', () => {
    const parsed = runInlineRewriteMessageSchema.safeParse({
      type: 'run-inline-rewrite',
      requestId: 'request-1',
      source: 'remaining migration work.',
      operation: 'friendly',
      capture: {
        version: 1,
        kind: 'textarea',
        source: 'remaining migration work.',
        start: 2,
        end: 28,
        elementPath: [2, 1],
        replaceable: true,
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('drops the removed recipe fields from an inline run request', () => {
    // The v3 rewrite deleted tone, intensity, and length. A message that
    // still carries them must parse without the preset reading a tone it no
    // longer honours.
    const parsed = runInlineRewriteMessageSchema.safeParse({
      type: 'run-inline-rewrite',
      requestId: 'request-1',
      source: 'remaining migration work.',
      operation: 'friendly',
      tone: 'professional',
      strength: 'balanced',
      length: 'similar',
      capture: null,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty('tone');
    expect(parsed.data).not.toHaveProperty('strength');
    expect(parsed.data).not.toHaveProperty('length');
  });

  it('exposes only Paraphrase, Friendly, and Shorter', () => {
    expect(INLINE_ACTIONS.map((action) => action.label)).toEqual(['Paraphrase', 'Friendly', 'Shorter']);
  });

  it('requires exactly two non-empty alternatives on completion', () => {
    const parsed = inlineRewriteProgressMessageSchema.safeParse({
      type: 'inline-rewrite-progress',
      requestId: 'request-1',
      status: 'complete',
      alternatives: [
        { id: 'closest', text: 'First alternative' },
        { id: 'distinct', text: 'Second alternative' },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects incomplete or duplicate alternative sets', () => {
    expect(inlineRewriteProgressMessageSchema.safeParse({
      type: 'inline-rewrite-progress',
      requestId: 'request-1',
      status: 'complete',
      alternatives: [{ id: 'closest', text: 'Only one' }],
    }).success).toBe(false);
    expect(inlineRewriteProgressMessageSchema.safeParse({
      type: 'inline-rewrite-progress',
      requestId: 'request-1',
      status: 'complete',
      alternatives: [
        { id: 'closest', text: 'One' },
        { id: 'closest', text: 'Two' },
      ],
    }).success).toBe(false);
  });

  it('rejects an unallowlisted inline operation', () => {
    expect(runInlineRewriteMessageSchema.safeParse({
      type: 'run-inline-rewrite',
      requestId: 'request-1',
      source: 'text',
      operation: 'remote-command',
      capture: null,
    }).success).toBe(false);
  });
});
