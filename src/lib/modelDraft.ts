/** Sentinel option value that swaps the model list for a free-text model ID. */
export const CUSTOM_MODEL_VALUE = '__custom__';

/** Mirrors the `selectedModel` bound in the settings schema. */
const MAX_MODEL_ID_CHARS = 256;

export type ModelDraftResolution =
  | { ok: true; model: string }
  | { ok: false; message: string };

/**
 * Picks the select value that represents a stored model. A model absent from
 * the list is shown through the custom option, because the select cannot
 * otherwise display it — not because the list disproves it. An empty list
 * carries no information about which models exist, so a stored model is shown
 * the same way rather than dropped from the panel while the endpoint is
 * unreachable.
 */
export function toModelChoice(stored: string, models: string[]): string {
  if (!stored || models.includes(stored)) {
    return stored;
  }
  return CUSTOM_MODEL_VALUE;
}

/**
 * Resolves the model field into the value to persist. Only the shape of the
 * input is checked here. Membership in the discovered list is deliberately not
 * required: that list is not authoritative — a gateway can route a model it
 * never advertises — so a real ID would be rejected as a typo. Existence is
 * settled by calling the model against the endpoint instead.
 */
export function resolveModelDraft(draft: {
  selected: string;
  custom: string;
}): ModelDraftResolution {
  if (draft.selected !== CUSTOM_MODEL_VALUE) {
    if (!draft.selected) {
      return { ok: false, message: 'Choose a model first.' };
    }
    return { ok: true, model: draft.selected };
  }
  const custom = draft.custom.trim();
  if (!custom) {
    return { ok: false, message: 'Enter a model ID.' };
  }
  if (custom.length > MAX_MODEL_ID_CHARS) {
    return { ok: false, message: 'That model ID is too long.' };
  }
  return { ok: true, model: custom };
}
