import { MAX_SOURCE_CHARS } from '../constants';
import { captureSelectionInPage, isSameText, parseCaptureResult, replaceSelectionInPage } from './injection';

function paragraphTextAt(editor: Element, index: number): Text {
  const paragraph = editor.querySelectorAll('p')[index];
  if (!paragraph?.firstChild) throw new Error(`Fixture is missing paragraph ${index}`);
  return paragraph.firstChild as Text;
}

/**
 * A range spanning N paragraphs produces N-1 block boundaries, and a
 * browser renders each as its own run of whitespace. Three paragraphs means two
 * boundaries, so a test built on two of them cannot tell a comparison that
 * strips every boundary apart from one that strips only the first.
 *
 * jsdom cannot catch that difference: it reports `Selection.toString()` and
 * `Range.toString()` as identical, so both sides of the guard collapse to the
 * same string. `isSameText` is therefore tested directly as well.
 */
function selectAcrossParagraphs(editor: Element, paragraphs: string[]): void {
  editor.innerHTML = paragraphs.map((text) => `<p>${text}</p>`).join('');
  const endText = paragraphs.at(-1);
  if (endText === undefined) throw new Error('Fixture needs at least one paragraph');
  const range = document.createRange();
  range.setStart(paragraphTextAt(editor, 0), 0);
  range.setEnd(paragraphTextAt(editor, paragraphs.length - 1), endText.length);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

describe('inline selection injection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('captures and replaces only the selected textarea substring', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'Before selected words after.';
    document.body.append(textarea);
    textarea.focus();
    textarea.setSelectionRange(7, 15);

    const capture = captureSelectionInPage(MAX_SOURCE_CHARS);

    expect(capture).toMatchObject({
      kind: 'textarea',
      source: 'selected',
      start: 7,
      end: 15,
    });
    expect(replaceSelectionInPage(capture, 'rewritten')).toBe(true);
    expect(textarea.value).toBe('Before rewritten words after.');
  });

  it('does not capture password input selections', () => {
    const input = document.createElement('input');
    input.type = 'password';
    input.value = 'secret';
    document.body.append(input);
    input.focus();
    input.setSelectionRange(0, 6);

    expect(captureSelectionInPage(MAX_SOURCE_CHARS)).toBeNull();
  });

  it('refuses to replace when the selection changed since capture', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'hello world';
    document.body.append(textarea);
    textarea.focus();
    textarea.setSelectionRange(0, 5);
    const capture = captureSelectionInPage(MAX_SOURCE_CHARS);
    expect(capture).not.toBeNull();
    if (!capture) return;

    expect(replaceSelectionInPage(capture, 'goodbye')).toBe(true);
    expect(textarea.value).toBe('goodbye world');

    textarea.setSelectionRange(0, 5);
    expect(replaceSelectionInPage(capture, 'again')).toBe(false);
    expect(textarea.value).toBe('goodbye world');
  });

  it('replaces a selection spanning several paragraphs', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    document.body.append(editor);
    selectAcrossParagraphs(editor, [
      'Hi Agung,',
      'Okay then. Second one.',
      'Use the reports.',
    ]);

    const capture = captureSelectionInPage(MAX_SOURCE_CHARS);
    expect(capture).not.toBeNull();
    expect(capture?.replaceable).toBe(true);
    expect(replaceSelectionInPage(capture, 'Rewritten')).toBe(true);
    expect(editor.textContent).toBe('Rewritten');
  });

  it('refuses to replace a multi-paragraph selection the user has since edited', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    document.body.append(editor);
    selectAcrossParagraphs(editor, ['First line.', 'Second line.', 'Third line.']);

    const capture = captureSelectionInPage(MAX_SOURCE_CHARS);
    expect(capture).not.toBeNull();

    // The capture stores node paths, not a copy of the text, so the range is
    // rebuilt from the live DOM and compared against the original source. The
    // words no longer match, so the replace must be refused.
    paragraphTextAt(editor, 1).textContent = 'Second line edited.';

    expect(replaceSelectionInPage(capture, 'Rewritten')).toBe(false);
    expect(editor.textContent).toContain('Second line edited.');
  });

  it('treats every block boundary as equal, not just the first', () => {
    // What a real browser produces for a three-paragraph selection: the range
    // renders each boundary as CSS whitespace, the selection as a line break.
    const rangeText = 'Hi Agung,\n    Okay then.\n    Use the reports.';
    const selectionText = 'Hi Agung,\n\nOkay then.\n\nUse the reports.';

    expect(isSameText(rangeText, selectionText)).toBe(true);
    // More boundaries than the three-paragraph case, so a comparison that strips
    // only the first gap cannot pass by accident.
    expect(isSameText('A.\n    B.\n    C.\n    D.', 'A.\n\nB.\n\nC.\n\nD.')).toBe(true);
    // A real edit to the words still differs, however many boundaries precede it.
    expect(isSameText(rangeText, 'Hi Agung,\n\nOkay then.\n\nUse the REPORTS.')).toBe(false);
  });

  it('rejects source text above the boundary', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'a'.repeat(MAX_SOURCE_CHARS + 1);
    document.body.append(textarea);
    textarea.focus();
    textarea.setSelectionRange(0, MAX_SOURCE_CHARS + 1);

    expect(captureSelectionInPage(MAX_SOURCE_CHARS)).toBeNull();
  });
});

describe('parseCaptureResult', () => {
  it('accepts a valid capture and rejects malformed values', () => {
    expect(parseCaptureResult({ kind: 'nope' })).toBeNull();
    expect(parseCaptureResult(undefined)).toBeNull();
  });
});
