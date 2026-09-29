import { generateInlineAlternatives } from './inlineRewrite';
import type { ChatMessage } from '../prompts';

const request = {
  source: 'A short note about the launch.',
  operation: 'friendly' as const,
};

describe('generateInlineAlternatives', () => {
  it('returns two ordered alternatives from one structured response', async () => {
    const calls: ChatMessage[][] = [];
    const results = await generateInlineAlternatives({
      request,
      generate: async (messages) => {
        calls.push(messages);
        return 'ALT 1: Closest version.\nALT 2: Distinct version.';
      },
    });

    expect(calls).toHaveLength(1);
    expect(results.map((alternative) => alternative.id)).toEqual(['closest', 'distinct']);
  });

  it('rejects malformed or duplicate model outputs', async () => {
    await expect(generateInlineAlternatives({
      request,
      generate: async () => 'ALT 1: Only one alternative.',
    })).rejects.toThrow('two alternatives');
    await expect(generateInlineAlternatives({
      request,
      generate: async () => 'ALT 1: Same text\nALT 2: Same text',
    })).rejects.toThrow('duplicate alternatives');
  });
});
