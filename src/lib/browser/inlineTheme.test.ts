import { INLINE_THEME_TOKENS, inlineThemeStylesheet, resolveTheme } from './inlineTheme';

describe('resolveTheme', () => {
  it('follows the OS preference when the theme is system', () => {
    expect(resolveTheme('system', true)).toBe('light');
    expect(resolveTheme('system', false)).toBe('dark');
  });

  it('ignores the OS preference when the theme is explicit', () => {
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', true)).toBe('dark');
  });
});

describe('inline theme tokens', () => {
  it('gives both themes a light and a dark surface so the popup can never stay dark in light mode', () => {
    expect(INLINE_THEME_TOKENS.light['--sayelse-surface']).toBe('#fffdf9');
    expect(INLINE_THEME_TOKENS.dark['--sayelse-surface']).toBe('#211f1d');
    expect(INLINE_THEME_TOKENS.light['--sayelse-scheme']).toBe('light');
  });

  it('defines the same token set for both themes', () => {
    expect(Object.keys(INLINE_THEME_TOKENS.light).sort()).toEqual(Object.keys(INLINE_THEME_TOKENS.dark).sort());
  });
});

describe('inline theme stylesheet', () => {
  const stylesheet = inlineThemeStylesheet();

  it('paints every surface from theme tokens instead of hardcoded dark hex values', () => {
    expect(stylesheet).not.toMatch(/#211f1d|#f5eee5|#3b3632|#4a3e37/);
  });

  it('keeps hover and focus borders at 1px', () => {
    expect(stylesheet).toContain('border: 1px solid transparent');
    expect(stylesheet).toContain('border-color: var(--sayelse-focus)');
    expect(stylesheet).toContain('outline: 1px solid var(--sayelse-focus)');
    expect(stylesheet).not.toContain('inset 0 0 0 2px');
    expect(stylesheet).not.toContain('outline: 2px');
  });
});
