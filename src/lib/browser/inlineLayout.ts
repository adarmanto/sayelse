export interface InlinePopupRect {
  top: number;
  bottom: number;
  left: number;
}

export interface InlinePopupLayout {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: 'above' | 'below';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function calculateInlinePopupLayout(
  rect: InlinePopupRect,
  viewportWidth: number,
  viewportHeight: number,
  preferredWidth = 284,
  margin = 8,
  maxPreferredHeight = Number.POSITIVE_INFINITY,
  contentHeight = 1,
): InlinePopupLayout {
  const width = Math.max(1, Math.min(preferredWidth, viewportWidth - margin * 2));
  const viewportMaxHeight = Math.max(1, viewportHeight - margin * 2);
  const spaceAbove = Math.max(0, rect.top - margin);
  const spaceBelow = Math.max(0, viewportHeight - rect.bottom - margin);
  const desiredHeight = Math.max(1, Math.min(maxPreferredHeight, viewportMaxHeight, contentHeight));
  const fitsBelow = desiredHeight <= spaceBelow;
  const fitsAbove = desiredHeight <= spaceAbove;
  const fitsViewport = desiredHeight <= viewportMaxHeight;
  const placement = fitsBelow ? 'below' : fitsAbove ? 'above' : spaceBelow >= spaceAbove ? 'below' : 'above';
  const availableHeight = placement === 'below' ? spaceBelow : spaceAbove;
  const boundedHeight = fitsViewport
    ? desiredHeight
    : Math.max(1, Math.min(desiredHeight, availableHeight, viewportMaxHeight));
  const left = clamp(
    rect.left,
    margin,
    Math.max(margin, viewportWidth - width - margin),
  );
  const top = fitsViewport && !fitsBelow && !fitsAbove
    ? margin
    : placement === 'below'
      ? clamp(rect.bottom + margin, margin, Math.max(margin, viewportHeight - boundedHeight - margin))
      : clamp(rect.top - boundedHeight - margin, margin, Math.max(margin, viewportHeight - boundedHeight - margin));

  return { left, top, width, maxHeight: boundedHeight, placement };
}
