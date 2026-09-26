import { calculateInlinePopupLayout } from './inlineLayout';

describe('calculateInlinePopupLayout', () => {
  it('keeps a compact menu close to the selection near the bottom', () => {
    const layout = calculateInlinePopupLayout(
      { top: 760, bottom: 790, left: 300 },
      1440,
      800,
      356,
      8,
      420,
      42,
    );

    expect(layout.placement).toBe('above');
    expect(layout.top).toBe(710);
    expect(layout.top + 42).toBe(752);
    expect(layout.left + layout.width).toBeLessThanOrEqual(1432);
  });

  it('prefers below when the actual popup fits on that side', () => {
    const layout = calculateInlinePopupLayout(
      { top: 100, bottom: 130, left: 20 },
      1000,
      800,
      356,
      8,
      420,
      180,
    );

    expect(layout.placement).toBe('below');
    expect(layout.top).toBe(138);
  });

  it('moves the popup to the viewport edge when it fits neither side of the selection', () => {
    const layout = calculateInlinePopupLayout(
      { top: 100, bottom: 130, left: 20 },
      1000,
      320,
      356,
      8,
      420,
      360,
    );

    expect(layout.placement).toBe('below');
    expect(layout.top).toBe(8);
    expect(layout.maxHeight).toBe(304);
  });

  it('never exceeds the available viewport width', () => {
    const layout = calculateInlinePopupLayout({ top: 100, bottom: 130, left: 0 }, 320, 700);
    expect(layout.width).toBe(284);
    expect(layout.left).toBe(8);
  });

  it('shrinks below the default when the viewport cannot fit it', () => {
    const layout = calculateInlinePopupLayout({ top: 100, bottom: 130, left: 0 }, 200, 700);
    expect(layout.width).toBe(184);
    expect(layout.left).toBe(8);
  });

  it('defaults to a narrower popup on a wide viewport', () => {
    const layout = calculateInlinePopupLayout({ top: 100, bottom: 130, left: 200 }, 1440, 900);
    expect(layout.width).toBe(284);
  });
});
