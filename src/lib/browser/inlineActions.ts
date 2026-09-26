export const INLINE_ACTIONS = [
  { operation: 'paraphrase', label: 'Paraphrase' },
  { operation: 'formal', label: 'Formal' },
  { operation: 'concise', label: 'Shorter' },
] as const;

export const INLINE_ALTERNATIVES = [
  { id: 'closest', label: 'Closest' },
  { id: 'distinct', label: 'Distinct' },
] as const;
