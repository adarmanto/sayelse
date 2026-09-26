import {
  LENGTH_LABELS,
  OPERATION_LABELS,
  OPERATIONS,
  STRENGTH_LABELS,
  STRENGTHS,
  TONE_LABELS,
  TONES,
  LENGTHS,
  type Length,
  type Operation,
  type Strength,
  type Tone,
} from '../../../lib/constants';

export interface RewriteControlsValue {
  operation: Operation;
  tone: Tone;
  strength: Strength;
  length: Length;
}

interface ControlsProps {
  value: RewriteControlsValue;
  onChange: (value: RewriteControlsValue) => void;
  disabled?: boolean;
}

function SelectField({ label, name, value, options, labels, onChange, disabled }: { label: string; name: string; value: string; options: readonly string[]; labels: Record<string, string>; onChange: (value: string) => void; disabled: boolean }) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select id={`sayelse-${name}`} name={name} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
      </select>
    </label>
  );
}

export function Controls({ value, onChange, disabled = false }: ControlsProps) {
  return (
    <section className="controls" aria-labelledby="controls-heading">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Rewrite recipe</p>
          <h2 id="controls-heading">Shape the result</h2>
        </div>
      </div>
      <div className="control-grid">
        <SelectField label="Goal" name="operation" value={value.operation} options={OPERATIONS} labels={OPERATION_LABELS} onChange={(next) => onChange({ ...value, operation: next as Operation })} disabled={disabled} />
        <SelectField label="Tone" name="tone" value={value.tone} options={TONES} labels={TONE_LABELS} onChange={(next) => onChange({ ...value, tone: next as Tone })} disabled={disabled} />
        <SelectField label="Intensity" name="strength" value={value.strength} options={STRENGTHS} labels={STRENGTH_LABELS} onChange={(next) => onChange({ ...value, strength: next as Strength })} disabled={disabled} />
        <SelectField label="Length" name="length" value={value.length} options={LENGTHS} labels={LENGTH_LABELS} onChange={(next) => onChange({ ...value, length: next as Length })} disabled={disabled} />
      </div>
    </section>
  );
}
