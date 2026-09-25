import { MAX_SOURCE_CHARS } from '../../../lib/constants';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  sourceKind: 'selected' | 'manual' | 'replaced';
  onClear: () => void;
}

export function Composer({ value, onChange, disabled = false, sourceKind, onClear }: ComposerProps) {
  const isSelection = sourceKind === 'selected';
  return (
    <section className="composer" aria-labelledby="source-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{isSelection ? 'From this page' : 'Your draft'}</p>
          <h2 id="source-heading">{isSelection ? 'Selected text' : 'Text to rewrite'}</h2>
        </div>
        <button className="text-button" type="button" onClick={onClear} disabled={!value || disabled}>
          Clear
        </button>
      </div>
      <label className="sr-only" htmlFor="sayelse-source">Text to rewrite</label>
      <textarea
        id="sayelse-source"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste a paragraph or start writing here"
        maxLength={MAX_SOURCE_CHARS}
        disabled={disabled}
        rows={8}
        spellCheck="true"
      />
      <div className="field-meta">
        <span>{value.trim() ? 'Ready to rewrite' : 'Nothing selected yet'}</span>
        <span className={value.length > MAX_SOURCE_CHARS * 0.9 ? 'count-warning' : ''}>{value.length.toLocaleString()} / {MAX_SOURCE_CHARS.toLocaleString()}</span>
      </div>
    </section>
  );
}
