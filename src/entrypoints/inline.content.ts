import { MAX_SOURCE_CHARS, SETTINGS_STORAGE_KEY } from '../lib/constants';
import { captureSelectionInPage, replaceSelectionInPage } from '../lib/browser/injection';
import { calculateInlinePopupLayout } from '../lib/browser/inlineLayout';
import {
  INLINE_THEME_TOKENS,
  inlineThemeStylesheet,
  resolveTheme,
  type ResolvedTheme,
} from '../lib/browser/inlineTheme';
import { getSettings } from '../lib/storage/settings';
import { INLINE_ACTIONS, INLINE_ALTERNATIVES } from '../lib/browser/inlineActions';
import {
  inlineRewriteProgressMessageSchema,
  runInlineRewriteMessageSchema,
  type InlineRewriteProgressMessage,
  type RunInlineRewriteMessage,
} from '../lib/browser/messages';
import type { SelectionCapture } from '../lib/storage/schema';

type InlinePosition = { text: string; rect: DOMRect };

let host: HTMLDivElement | null = null;
let shadow: ShadowRoot | null = null;
let hideTimer = 0;
let lastFingerprint = '';
let activeRequestId: string | null = null;
let activeCapture: SelectionCapture | null = null;
let activePosition: InlinePosition | null = null;
let prefersLight = false;
let currentTheme: ResolvedTheme = 'dark';

function applyTheme(resolved: ResolvedTheme): void {
  currentTheme = resolved;
  if (!host) return;
  for (const [property, value] of Object.entries(INLINE_THEME_TOKENS[resolved])) {
    host.style.setProperty(property, value);
  }
}

async function syncTheme(): Promise<void> {
  const settings = await getSettings();
  applyTheme(resolveTheme(settings.theme, prefersLight));
}

function watchColorScheme(): void {
  const query = window.matchMedia('(prefers-color-scheme: light)');
  prefersLight = query.matches;
  query.addEventListener('change', (event) => {
    prefersLight = event.matches;
    void syncTheme();
  });
}

export function hideMenu(): void {
  if (activeRequestId) {
    void chrome.runtime.sendMessage({ type: 'cancel-inline-rewrite', requestId: activeRequestId });
  }
  activeRequestId = null;
  activeCapture = null;
  activePosition = null;
  host?.remove();
  host = null;
  shadow = null;
  lastFingerprint = '';
}

function isEditableElement(element: Element | null): element is HTMLElement {
  return Boolean(element?.closest('input, textarea, [contenteditable="true"]'));
}

function textareaLineIndex(value: string, offset: number, charactersPerLine: number): number {
  const beforeCaret = value.slice(0, offset);
  const lastLine = beforeCaret.lastIndexOf('\n');
  const lineText = beforeCaret.slice(lastLine + 1);
  return beforeCaret.split('\n').length - 1 + Math.floor(lineText.length / charactersPerLine);
}

function selectedTextareaRect(textarea: HTMLTextAreaElement): DOMRect {
  const rect = textarea.getBoundingClientRect();
  const style = getComputedStyle(textarea);
  const fontSize = Number.parseFloat(style.fontSize) || 16;
  const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.4;
  const paddingX = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
  const contentWidth = Math.max(fontSize, textarea.clientWidth - paddingX);
  const charactersPerLine = Math.max(1, Math.floor(contentWidth / (fontSize * 0.55)));
  const start = textarea.selectionStart ?? 0;
  const startLine = textareaLineIndex(textarea.value, start, charactersPerLine);
  const top = rect.top + (Number.parseFloat(style.borderTopWidth) || 0)
    + (Number.parseFloat(style.paddingTop) || 0) + startLine * lineHeight - textarea.scrollTop;
  return new DOMRect(rect.left, top, rect.width, lineHeight);
}

function selectedText(): InlinePosition | null {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    if (activeElement.type === 'password' || activeElement.selectionStart === activeElement.selectionEnd) return null;
    const text = activeElement.value.slice(activeElement.selectionStart ?? 0, activeElement.selectionEnd ?? 0);
    if (!text.trim() || text.length > MAX_SOURCE_CHARS) return null;
    const rect = activeElement.getBoundingClientRect();
    return { text, rect: activeElement instanceof HTMLTextAreaElement
      ? selectedTextareaRect(activeElement)
      : new DOMRect(rect.left, rect.top, rect.width, Math.min(28, rect.height)) };
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const container = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? (range.startContainer as Element)
    : range.startContainer.parentElement;
  if (!isEditableElement(container)) return null;
  const text = selection.toString();
  if (!text.trim() || text.length > MAX_SOURCE_CHARS) return null;
  const rangeRect = range.getBoundingClientRect();
  return { text, rect: rangeRect.width > 0 ? rangeRect : (container?.getBoundingClientRect() ?? null) };
}

function createBaseHost(): { root: ShadowRoot; popup: HTMLDivElement } {
  host?.remove();
  host = document.createElement('div');
  host.dataset.sayelseInline = 'true';
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;width:min(640px,calc(100vw - 16px));box-sizing:border-box;left:0;top:0;--sayelse-max-height:calc(100vh - 16px);';
  shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = inlineThemeStylesheet();
  const popup = document.createElement('div');
  popup.className = 'menu';
  shadow.append(style, popup);
  document.documentElement.append(host);
  applyTheme(currentTheme);
  return { root: shadow, popup };
}

function positionPopup(position: InlinePosition, popup: HTMLDivElement, fallbackHeight = 1): void {
  if (!host) return;
  const contentHeight = Math.max(fallbackHeight, popup.scrollHeight, 1);
  const layout = calculateInlinePopupLayout(
    { top: position.rect.top, bottom: position.rect.bottom, left: position.rect.left },
    window.innerWidth,
    window.innerHeight,
    640,
    8,
    Number.POSITIVE_INFINITY,
    contentHeight,
  );
  host.style.width = `${layout.width}px`;
  host.style.left = `${layout.left}px`;
  host.style.top = `${layout.top}px`;
  host.style.setProperty('--sayelse-max-height', `${layout.maxHeight}px`);
  popup.classList.toggle('requires-scroll', popup.scrollHeight > popup.clientHeight + 2);
}

function createBrand(): HTMLDivElement {
  const brand = document.createElement('div');
  brand.className = 'brand';
  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.textContent = '✦';
  mark.setAttribute('aria-hidden', 'true');
  const brandText = document.createElement('span');
  brandText.textContent = 'SayElse';
  brand.append(mark, brandText);
  return brand;
}

function renderMenu(position: InlinePosition, capture: SelectionCapture | null): void {
  const { popup } = createBaseHost();
  popup.setAttribute('role', 'menu');
  popup.setAttribute('aria-orientation', 'horizontal');
  popup.setAttribute('aria-label', 'SayElse writing actions');

  const header = document.createElement('div');
  header.className = 'inline-header';
  header.append(createBrand());

  for (const action of INLINE_ACTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-button';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      void runInlineRewrite(position, capture, {
        operation: action.operation,
        tone: action.tone,
        length: action.length,
      });
    });
    header.append(button);
  }
  popup.append(header);
  positionPopup(position, popup, 44);
}

async function runInlineRewrite(
  position: InlinePosition,
  capture: SelectionCapture | null,
  preset: Pick<RunInlineRewriteMessage, 'operation' | 'tone' | 'length'>,
): Promise<void> {
  const requestId = crypto.randomUUID();
  if (activeRequestId) {
    void chrome.runtime.sendMessage({ type: 'cancel-inline-rewrite', requestId: activeRequestId });
  }
  const { popup } = createBaseHost();
  popup.className = 'result';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-label', 'SayElse rewrite choices');
  popup.setAttribute('aria-live', 'polite');
  popup.replaceChildren();
  const resultHeader = document.createElement('div');
  resultHeader.className = 'inline-header result-header';
  resultHeader.append(createBrand());
  const actionTabs = document.createElement('div');
  actionTabs.className = 'action-tabs';
  actionTabs.setAttribute('role', 'tablist');
  actionTabs.setAttribute('aria-label', 'Rewrite actions');
  for (const action of INLINE_ACTIONS) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'action-button';
    tab.textContent = action.label;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(action.operation === preset.operation));
    tab.addEventListener('click', () => {
      if (action.operation === preset.operation || !activePosition) return;
      void runInlineRewrite(activePosition, activeCapture, {
        operation: action.operation,
        tone: action.tone,
        length: action.length,
      });
    });
    actionTabs.append(tab);
  }
  resultHeader.append(actionTabs);
  const alternatives = document.createElement('div');
  alternatives.className = 'alternatives';
  alternatives.setAttribute('aria-label', 'Loading two alternatives');
  for (const alternative of INLINE_ALTERNATIVES) {
    const card = document.createElement('div');
    card.className = 'loading';
    const text = document.createElement('div');
    text.className = 'alternative-text';
    text.textContent = 'Generating…';
    card.append(text);
    alternatives.append(card);
  }
  const notice = document.createElement('p');
  notice.className = 'text pending';
  notice.textContent = '';
  popup.append(resultHeader, alternatives, notice);
  positionPopup(position, popup, 150);
  activeRequestId = requestId;
  activeCapture = capture;
  activePosition = position;

  const source = capture?.source ?? position.text;
  try {
    const result = runInlineRewriteMessageSchema.parse({
      type: 'run-inline-rewrite',
      requestId,
      source,
      capture,
      ...preset,
    });
    await chrome.runtime.sendMessage(result);
  } catch (error) {
    notice.className = 'text error';
    notice.textContent = error instanceof Error ? error.message : 'Something went wrong. Try again.';
  }
}

function applyAlternative(alternative: { text: string }): void {
  if (activeCapture?.replaceable && replaceSelectionInPage(activeCapture, alternative.text)) {
    window.setTimeout(hideMenu, 450);
    return;
  }

  const popup = host?.shadowRoot?.querySelector('.result');
  const notice = popup?.querySelector('.text');
  const actions = popup?.querySelector('.actions');
  if (notice) {
    notice.textContent = 'The original selection changed. Copy the chosen version instead.';
    notice.className = 'text error';
  }
  if (actions instanceof HTMLDivElement) return;
  if (!(popup instanceof HTMLDivElement)) return;

  const fallback = document.createElement('div');
  fallback.className = 'actions';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'Copy selected version';
  copy.addEventListener('click', () => {
    void navigator.clipboard.writeText(alternative.text).then(() => {
      copy.textContent = 'Copied';
    });
  });
  fallback.append(copy);
  popup.append(fallback);
}

function showResult(progress: InlineRewriteProgressMessage): void {
  if (!host?.isConnected || progress.requestId !== activeRequestId) return;
  const popup = host.shadowRoot?.querySelector('.result');
  if (!(popup instanceof HTMLDivElement)) return;
  const alternatives = popup.querySelector('.alternatives');
  const notice = popup.querySelector('.text');

  if (progress.status === 'started') {
    return;
  }
  if (progress.status === 'error' || progress.status === 'cancelled') {
    if (notice) {
      notice.textContent = progress.message;
      notice.className = 'text error';
    }
    return;
  }

  if (!(alternatives instanceof HTMLDivElement)) return;
  alternatives.replaceChildren();
  alternatives.setAttribute('aria-label', 'Choose one of two alternatives');
  for (const alternative of progress.alternatives) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'alternative';
    card.setAttribute('aria-label', 'Use this version');
    const text = document.createElement('span');
    text.className = 'alternative-text';
    text.textContent = alternative.text;
    card.append(text);
    card.addEventListener('click', () => applyAlternative(alternative));
    alternatives.append(card);
  }
  if (notice) {
    notice.textContent = '';
    notice.className = 'text';
  }
  if (activePosition) positionPopup(activePosition, popup, 150);
}

export function showMenu(): void {
  if (activePosition && host?.isConnected) return;
  const selected = selectedText();
  if (!selected) {
    hideMenu();
    return;
  }
  const capture = captureSelectionInPage(MAX_SOURCE_CHARS);
  const fingerprint = `${Math.round(selected.rect.top)}:${Math.round(selected.rect.left)}:${selected.text.slice(0, 80)}`;
  if (fingerprint === lastFingerprint && host?.isConnected) return;
  lastFingerprint = fingerprint;
  renderMenu(selected, capture);
}

function scheduleMenu(): void {
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(showMenu, 90);
}

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main() {
    watchColorScheme();
    void syncTheme();
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[SETTINGS_STORAGE_KEY]) return;
      void syncTheme();
    });

    chrome.runtime.onMessage.addListener((message: unknown) => {
      const parsed = inlineRewriteProgressMessageSchema.safeParse(message);
      if (!parsed.success) return;
      showResult(parsed.data);
      if (
        parsed.data.requestId === activeRequestId
        && parsed.data.status !== 'started'
      ) {
        activeRequestId = null;
      }
    });

    document.addEventListener('pointerup', scheduleMenu, true);
    document.addEventListener('keyup', scheduleMenu, true);
    document.addEventListener('selectionchange', scheduleMenu);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideMenu();
    }, true);
    document.addEventListener('pointerdown', (event) => {
      const path = event.composedPath();
      if (!host || !path.includes(host)) hideMenu();
    }, true);
    window.addEventListener('resize', () => {
      const popup = host?.shadowRoot?.querySelector('.menu, .result');
      if (activePosition && popup instanceof HTMLDivElement) {
        positionPopup(activePosition, popup, popup.classList.contains('result') ? 150 : 42);
      }
    });
    window.addEventListener('scroll', hideMenu, true);
    window.addEventListener('blur', hideMenu);
  },
});
