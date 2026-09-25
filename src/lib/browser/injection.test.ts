import { captureSelectionInPage, replaceSelectionInPage } from './injection';

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

    const capture = captureSelectionInPage(20_000);

    expect(capture).toMatchObject({
      kind: 'textarea',
      source: 'selected',
      start: 7,
      end: 15,
    });
    expect(replaceSelectionInPage(capture, 'rewritten')).toBe(true);
    expect(textarea.value).toBe('Before rewritten words after.');
  });
});
