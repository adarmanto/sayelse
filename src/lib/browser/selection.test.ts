import { MAX_SOURCE_CHARS } from '../constants';
import { captureSelection, replaceCapturedSelection } from './selection';

describe('captureSelection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('captures a textarea selection as replaceable', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'hello world';
    textarea.setSelectionRange(0, 5);
    document.body.append(textarea);
    textarea.focus();

    const capture = captureSelection();

    expect(capture).toMatchObject({ kind: 'textarea', source: 'hello', start: 0, end: 5, replaceable: true });
  });

  it('does not capture password input selections', () => {
    const input = document.createElement('input');
    input.type = 'password';
    input.value = 'secret';
    document.body.append(input);
    input.focus();
    input.setSelectionRange(0, 6);

    expect(captureSelection()).toBeNull();
  });

  it('replaces only when the captured textarea selection still matches', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'hello world';
    document.body.append(textarea);
    textarea.focus();
    textarea.setSelectionRange(0, 5);
    const capture = captureSelection();
    expect(capture).not.toBeNull();
    if (!capture) return;

    expect(replaceCapturedSelection(capture, 'goodbye')).toBe(true);
    expect(textarea.value).toBe('goodbye world');

    textarea.setSelectionRange(0, 5);
    expect(replaceCapturedSelection(capture, 'again')).toBe(false);
    expect(textarea.value).toBe('goodbye world');
  });

  it('replaces only the selected substring and preserves surrounding text', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'Before selected words after.';
    document.body.append(textarea);
    textarea.focus();
    textarea.setSelectionRange(7, 15);
    const capture = captureSelection();

    expect(capture?.source).toBe('selected');
    expect(replaceCapturedSelection(capture, 'rewritten')).toBe(true);
    expect(textarea.value).toBe('Before rewritten words after.');
  });

  it('rejects source text above the boundary', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'a'.repeat(MAX_SOURCE_CHARS + 1);
    document.body.append(textarea);
    textarea.focus();
    textarea.setSelectionRange(0, MAX_SOURCE_CHARS + 1);

    expect(captureSelection()).toBeNull();
  });
});
