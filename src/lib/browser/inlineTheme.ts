import type { Theme } from '../constants';

export type ResolvedTheme = 'light' | 'dark';

export type InlineThemeTokens = Record<string, string> & {
  '--sayelse-scheme': 'light' | 'dark';
};

export const INLINE_THEME_TOKENS: Record<ResolvedTheme, InlineThemeTokens> = {
  dark: {
    '--sayelse-scheme': 'dark',
    '--sayelse-surface': '#211f1d',
    '--sayelse-line': '#3b3632',
    '--sayelse-line-strong': '#554c45',
    '--sayelse-text': '#f5eee5',
    '--sayelse-text-soft': '#c9bdb2',
    '--sayelse-text-muted': '#93877d',
    '--sayelse-accent': '#e88b63',
    '--sayelse-accent-strong': '#f39a6f',
    '--sayelse-ink': '#26150e',
    '--sayelse-wash': 'rgba(232, 139, 99, 0.13)',
    '--sayelse-focus': '#f6ad84',
    '--sayelse-selected-ring': '#ffe0ce',
    '--sayelse-brand': '#e88b63',
    '--sayelse-danger': '#e58d82',
    '--sayelse-shadow': '0 10px 30px rgba(0, 0, 0, 0.32)',
  },
  light: {
    '--sayelse-scheme': 'light',
    '--sayelse-surface': '#fffdf9',
    '--sayelse-line': '#ddd1c5',
    '--sayelse-line-strong': '#c4b5a6',
    '--sayelse-text': '#302b27',
    '--sayelse-text-soft': '#675d55',
    '--sayelse-text-muted': '#897d72',
    '--sayelse-accent': '#c8613b',
    '--sayelse-accent-strong': '#b9512e',
    '--sayelse-ink': '#fff8f1',
    '--sayelse-wash': 'rgba(200, 97, 59, 0.12)',
    '--sayelse-focus': '#b9512e',
    '--sayelse-selected-ring': '#fff8f1',
    '--sayelse-brand': '#b9512e',
    '--sayelse-danger': '#b94c44',
    '--sayelse-shadow': '0 10px 28px rgba(84, 60, 39, 0.14)',
  },
};

export function resolveTheme(theme: Theme, prefersLight: boolean): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') return theme;
  return prefersLight ? 'light' : 'dark';
}

export function inlineThemeStylesheet(): string {
  return `
    :host { all: initial; color-scheme: var(--sayelse-scheme); }
    * { box-sizing: border-box; }
    .menu, .result { width: 100%; border: 1px solid var(--sayelse-line); border-radius: 10px; background: var(--sayelse-surface); box-shadow: var(--sayelse-shadow); color: var(--sayelse-text); font: 500 12px/1.2 system-ui, sans-serif; }
    .menu { display: block; width: max-content; max-width: 100%; }
    .inline-header { display: flex; align-items: stretch; gap: 2px; width: max-content; max-width: 100%; min-height: 34px; padding: 3px; }
    .brand { display: flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 6px 0 5px; border-right: 1px solid var(--sayelse-line); color: var(--sayelse-brand); font-weight: 700; white-space: nowrap; }
    .mark { font-size: 13px; }
    button { appearance: none; min-height: 28px; padding: 0 8px; border: 1px solid transparent; border-radius: 7px; color: var(--sayelse-text-soft); background: transparent; cursor: pointer; font: inherit; font-weight: 600; white-space: nowrap; transition: border-color 140ms ease, background 140ms ease, color 140ms ease; }
    button:hover { border-color: var(--sayelse-focus); color: var(--sayelse-text); background: var(--sayelse-wash); }
    button:focus-visible { border-color: var(--sayelse-focus); color: var(--sayelse-text); background: var(--sayelse-wash); outline: 1px solid var(--sayelse-focus); outline-offset: 2px; }
    .result { max-height: var(--sayelse-max-height); overflow: clip; padding: 0; }
    .result.requires-scroll { overflow-x: clip; overflow-y: auto; scrollbar-width: none; }
    .result.requires-scroll::-webkit-scrollbar, .action-tabs::-webkit-scrollbar { width: 0; height: 0; }
    .result-header { position: sticky; top: 0; z-index: 1; background: var(--sayelse-surface); }
    .result-header .brand { flex: 0 0 auto; }
    .result-header .action-tabs { position: static; flex: 1 1 auto; min-width: 0; width: auto; max-width: 100%; background: transparent; }
    .action-tabs { display: flex; width: max-content; max-width: 100%; gap: 2px; overflow-x: auto; scrollbar-width: none; }
    .action-button { min-height: 28px; padding: 0 8px; border: 1px solid transparent; border-radius: 7px; color: var(--sayelse-text-muted); background: transparent; }
    .action-button:hover, .action-button:focus-visible { border-color: var(--sayelse-focus); color: var(--sayelse-text); background: var(--sayelse-wash); }
    .action-button[aria-selected="true"] { color: var(--sayelse-ink); border-color: var(--sayelse-accent); background: var(--sayelse-accent); }
    .action-button[aria-selected="true"]:hover, .action-button[aria-selected="true"]:focus-visible { border-color: var(--sayelse-selected-ring); background: var(--sayelse-accent-strong); }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sayelse-accent); animation: pulse 1.1s ease-in-out infinite; }
    .text { margin: 0 8px 8px; color: var(--sayelse-text); font-size: 12.5px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
    .alternatives { display: grid; grid-template-columns: 1fr; gap: 5px; padding: 0 8px 8px; }
    .alternative { position: relative; border: 1px solid var(--sayelse-line); border-radius: 8px; }
    .alternative-use { display: grid; gap: 3px; width: 100%; min-width: 0; min-height: 48px; padding: 7px 30px 7px 7px; border: 0; border-radius: 8px; text-align: left; white-space: normal; }
    .alternative:hover, .alternative:focus-within { border-color: var(--sayelse-focus); background: var(--sayelse-wash); }
    .alternative-use:focus-visible { outline: 1px solid var(--sayelse-focus); outline-offset: 2px; }
    .alternative-copy { position: absolute; right: 4px; bottom: 4px; display: flex; align-items: center; justify-content: center; width: 24px; min-height: 24px; padding: 0; border: 1px solid transparent; border-radius: 6px; color: var(--sayelse-text-muted); background: transparent; }
    .alternative-copy:hover, .alternative-copy:focus-visible { border-color: var(--sayelse-focus); color: var(--sayelse-text); background: var(--sayelse-surface); outline: 1px solid var(--sayelse-focus); outline-offset: 2px; }
    .alternative-copy.copied { color: var(--sayelse-accent-strong); }
    .alternative-copy svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .alternative-copy.copied svg { opacity: 0.35; }
    .alternative-text { color: var(--sayelse-text); font-size: 11.5px; font-weight: 500; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
    .loading { display: grid; gap: 3px; padding: 7px; border: 1px solid var(--sayelse-line); border-radius: 8px; }
    .loading .alternative-text { color: var(--sayelse-text-muted); font-style: italic; }
    .pending { color: var(--sayelse-text-muted); font-style: italic; }
    .error { color: var(--sayelse-danger); }
    @keyframes pulse { 0%,100% { opacity:.45; transform:scale(.85) } 50% { opacity:1; transform:scale(1.15) } }
    @media (max-width: 680px) {
      .alternatives { grid-template-columns: 1fr; }
      .brand { padding-right: 4px; }
      .action-button { padding: 0 6px; font-size: 10.5px; }
      .result-header { overflow: hidden; }
      .action-tabs { gap: 2px; }
    }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  `;
}
