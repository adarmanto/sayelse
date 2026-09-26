import { selectionCaptureSchema, type SelectionCapture } from '../storage/schema';

type PageCapture = SelectionCapture;

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
    const startParent: HTMLElement | null = startNode.nodeType === Node.ELEMENT_NODE
      ? (startNode as HTMLElement)
      : startNode.parentElement;
    if (range.toString() !== capture.source || !startParent?.isContentEditable) return false;
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
    startParent.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: replacement }));
    return true;
  }

  return false;
}

export function parseCaptureResult(value: unknown): SelectionCapture | null {
  const parsed = selectionCaptureSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
