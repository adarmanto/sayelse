import { selectionCaptureSchema, type SelectionCapture } from '../storage/schema';

type PageCapture = SelectionCapture;

/**
 * `Selection.toString()` and `Range.toString()` describe the same words but not
 * the same characters when a selection crosses block boundaries. Measured in
 * Chrome for a three-paragraph selection, the range rendered each boundary as
 * the CSS whitespace between the blocks ("\n    ") while the selection used a
 * line break ("\n\n"). The widths differ per element, so the boundary is
 * compared as "any whitespace run" rather than a fixed string — while a real
 * edit to the words must still fail, or a stale capture would overwrite
 * something the user has since rewritten.
 *
 * The global flag is load-bearing: without it `replace` strips only the first
 * boundary, so a selection of three or more paragraphs still fails the guard.
 */
const BLOCK_SEPARATOR = /\s+/g;

export function isSameText(a: string, b: string): boolean {
  if (a === b) return true;
  return a.replace(BLOCK_SEPARATOR, '') === b.replace(BLOCK_SEPARATOR, '');
}

function editableHostOf(node: Node): HTMLElement | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return element?.closest('[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]') ?? null;
}

export function captureSelectionInPage(maxSourceChars: number): PageCapture | null {
  const pathFromDocumentRoot = (node: Node): number[] => {
    const path: number[] = [];
    let current: Node | null = node;
    while (current && current !== document.documentElement) {
      const parent: Node | null = current.parentNode;
      if (!parent) return [];
      const index = Array.prototype.indexOf.call(parent.childNodes, current);
      if (index < 0) return [];
      path.unshift(index);
      current = parent;
    }
    return path;
  };

  const isTextInput = (element: Node | null): element is HTMLInputElement | HTMLTextAreaElement =>
    element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;

  const activeElement = document.activeElement;
  if (isTextInput(activeElement) && activeElement.type !== 'password') {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    if (start === null || end === null || start === end) return null;
    const source = activeElement.value.slice(start, end);
    if (!source || source.length > maxSourceChars) return null;
    return {
      version: 1,
      kind: activeElement instanceof HTMLTextAreaElement ? 'textarea' : 'input',
      source,
      start,
      end,
      elementPath: pathFromDocumentRoot(activeElement),
      replaceable: true,
    };
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const source = selection.toString();
  if (!source || source.length > maxSourceChars) return null;

  const range = selection.getRangeAt(0);
  const startElement: Element | null = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? (range.startContainer as Element)
    : range.startContainer.parentElement;
  const editable = Boolean(startElement?.closest('[contenteditable="true"]'));
  return {
    version: 1,
    kind: editable ? 'contenteditable' : 'text',
    source,
    start: range.startOffset,
    end: range.endOffset,
    elementPath: pathFromDocumentRoot(startElement ?? document.body),
    startNodePath: pathFromDocumentRoot(range.startContainer),
    endNodePath: pathFromDocumentRoot(range.endContainer),
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    replaceable: editable,
  };
}

export function replaceSelectionInPage(capture: PageCapture | null, replacement: string): boolean {
  if (!capture || !capture.replaceable || !replacement) return false;

  const resolvePath = (path: number[]): Node | null => {
    let current: Node | null = document.documentElement;
    for (const index of path) {
      if (!current || index < 0 || index >= current.childNodes.length) return null;
      const child: ChildNode | undefined = current.childNodes[index] as ChildNode | undefined;
      if (!child) return null;
      current = child;
    }
    return current;
  };

  if (capture.kind === 'input' || capture.kind === 'textarea') {
    const element = resolvePath(capture.elementPath);
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
    if (element.type === 'password') return false;
    if (element.selectionStart !== capture.start || element.selectionEnd !== capture.end) return false;
    if (element.value.slice(capture.start, capture.end) !== capture.source) return false;
    element.focus();
    element.setSelectionRange(capture.start, capture.end);
    if (typeof document.execCommand === 'function' && document.execCommand('insertText', false, replacement)) return true;
    element.setRangeText(replacement, capture.start, capture.end, 'end');
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: replacement }));
    return true;
  }

  if (capture.kind === 'contenteditable' && capture.startNodePath && capture.endNodePath) {
    const startNode = resolvePath(capture.startNodePath);
    const endNode = resolvePath(capture.endNodePath);
    if (!startNode || !endNode) return false;
    const range = document.createRange();
    try {
      range.setStart(startNode, capture.startOffset ?? 0);
      range.setEnd(endNode, capture.endOffset ?? 0);
    } catch {
      return false;
    }
    // The common ancestor, not the start node, so a selection that starts in one
    // paragraph still resolves the editable host wrapping the whole range.
    const editableHost = editableHostOf(range.commonAncestorContainer);
    if (!editableHost) return false;
    // The host alone does not bound the range: a capture whose nodes were since
    // re-parented out of it would resolve a host the range no longer sits in.
    if (!editableHost.contains(range.startContainer) || !editableHost.contains(range.endContainer)) return false;
    // `capture.source` is `selection.toString()`, which marks a block boundary
    // with a line break while the range renders it as the whitespace between the
    // blocks. The words must still match, or a capture the user has since edited
    // would overwrite their text.
    if (range.toString() !== capture.source && !isSameText(range.toString(), capture.source)) return false;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    if (typeof document.execCommand === 'function' && document.execCommand('insertText', false, replacement)) return true;
    range.deleteContents();
    const textNode = document.createTextNode(replacement);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    editableHost.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: replacement }));
    return true;
  }

  return false;
}

export function parseCaptureResult(value: unknown): SelectionCapture | null {
  const parsed = selectionCaptureSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
