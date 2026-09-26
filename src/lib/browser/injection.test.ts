import { MAX_SOURCE_CHARS } from '../constants';
import { captureSelectionInPage, parseCaptureResult, replaceSelectionInPage } from './injection';

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
