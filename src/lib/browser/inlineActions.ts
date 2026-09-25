export const INLINE_ACTIONS = [
  { operation: 'paraphrase', label: 'Paraphrase', tone: 'neutral', length: 'similar' },
  { operation: 'formal', label: 'Formal', tone: 'professional', length: 'similar' },
  { operation: 'concise', label: 'Shorter', tone: 'neutral', length: 'shorter' },
] as const;

export const INLINE_ALTERNATIVES = [
  { id: 'closest', label: 'Closest' },
  { id: 'distinct', label: 'Distinct' },
] as const;
