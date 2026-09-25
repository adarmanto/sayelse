import { buildAlternativeMessages, type ChatMessage, type RewriteRequest } from '../prompts';

export type InlineAlternativesTuple = [
  { id: 'closest'; text: string },
  { id: 'distinct'; text: string },
];

function parseStructuredAlternatives(response: string): InlineAlternativesTuple {
  const match = response.match(/ALT\s*1\s*:\s*([\s\S]*?)\s*ALT\s*2\s*:\s*([\s\S]*)/i);
  const closest = match?.[1]?.trim();
  const distinct = match?.[2]?.trim();
  if (!closest || !distinct) {
    throw new Error('The selected model did not return two alternatives.');
  }
  if (closest === distinct) {
    throw new Error('The selected model returned duplicate alternatives.');
  }
  return [
    { id: 'closest', text: closest },
    { id: 'distinct', text: distinct },
  ];
}

export async function generateInlineAlternatives({
  request,
  generate,
}: {
  request: RewriteRequest;
  generate: (messages: ChatMessage[]) => Promise<string>;
}): Promise<InlineAlternativesTuple> {
  const response = await generate(buildAlternativeMessages(request));
  return parseStructuredAlternatives(response.trim());
}
