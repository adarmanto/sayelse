import { OPERATION_LABELS, OPERATIONS, type Operation } from '../../../lib/constants';

export interface RewriteControlsValue {
  operation: Operation;
}

interface ControlsProps {
  value: RewriteControlsValue;
  onChange: (value: RewriteControlsValue) => void;
  disabled?: boolean;
}

export function Controls({ value, onChange, disabled = false }: ControlsProps) {
  return (
    <section className="controls" aria-labelledby="controls-heading">
      <div className="section-heading compact">
        <h2 id="controls-heading">Rewrite</h2>
      </div>
      <div className="preset-row" role="radiogroup" aria-label="Rewrite style">
        {OPERATIONS.map((operation) => (
          <button
            key={operation}
            type="button"
            role="radio"
            aria-checked={value.operation === operation}
            className={value.operation === operation ? 'preset-button active' : 'preset-button'}
            onClick={() => onChange({ operation })}
            disabled={disabled}
          >
            {OPERATION_LABELS[operation]}
          </button>
        ))}
      </div>
    </section>
  );
}
