import type { GenerationError, GenerationStatus } from '../../../lib/generation';
import { Icon } from './Icon';

interface OutputPanelProps {
  result: string;
  status: GenerationStatus;
  error: GenerationError | null;
  canReplace: boolean;
  copied: boolean;
  onGenerate: () => void;
  onStop: () => void;
  onRetry: () => void;
  onCopy: () => void;
  onReplace: () => void;
  hasSource: boolean;
}

export function OutputPanel({ result, status, error, canReplace, copied, onGenerate, onStop, onRetry, onCopy, onReplace, hasSource }: OutputPanelProps) {
  const loading = status === 'loading';
  const hasResult = Boolean(result.trim());
  return (
    <section className="output-panel" aria-labelledby="result-heading">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Second pass</p>
          <h2 id="result-heading">Your rewrite</h2>
        </div>
        {hasResult && <span className="result-status">Ready to use</span>}
      </div>

      {!hasSource && !loading && (
        <div className="result-empty">
          <div className="empty-mark"><Icon name="spark" size={22} /></div>
          <h3>Start with a sentence</h3>
          <p>Select text on a page or paste a draft above. SayElse will keep the meaning and change the expression.</p>
          <button className="primary-button" type="button" onClick={onGenerate} disabled>
            <Icon name="spark" size={16} /> Rewrite when you are ready
          </button>
        </div>
      )}

      {hasSource && !hasResult && !loading && !error && (
        <div className="result-empty">
          <div className="empty-mark"><Icon name="arrow" size={22} /></div>
          <h3>Your next version starts here</h3>
          <p>Choose a recipe, then let your model do the first pass.</p>
          <button className="primary-button" type="button" onClick={onGenerate}>
            <Icon name="spark" size={16} /> Rewrite text
          </button>
        </div>
      )}

      {loading && (
        <div className="result-stream" aria-live="polite" aria-busy="true">
          <div className="stream-label"><span className="pulse-dot" /> Rewriting your text</div>
          <p className={result ? 'stream-text' : 'stream-placeholder'}>{result || 'Your model is thinking…'}</p>
          <button className="secondary-button" type="button" onClick={onStop}><Icon name="stop" size={15} /> Stop</button>
        </div>
      )}

      {status === 'error' && error && (
        <div className="result-error" role="alert">
          <div className="feedback-icon"><Icon name="alert" size={18} /></div>
          <div><h3>We could not finish that rewrite</h3><p>{error.message}</p></div>
          <button className="secondary-button" type="button" onClick={onRetry}><Icon name="retry" size={15} /> Try again</button>
        </div>
      )}

      {status === 'stopped' && (
        <div className="result-error neutral" role="status">
          <div className="feedback-icon"><Icon name="stop" size={18} /></div>
          <div><h3>Rewrite stopped</h3><p>Your partial result is still here if you want to keep it.</p></div>
          <button className="secondary-button" type="button" onClick={onRetry}><Icon name="retry" size={15} /> Resume</button>
        </div>
      )}

      {hasResult && status !== 'loading' && (
        <div className="result-content">
          <p className="result-text">{result}</p>
          <div className="result-actions">
            <button className="secondary-button" type="button" onClick={onCopy}><Icon name={copied ? 'check' : 'copy'} size={15} /> {copied ? 'Copied' : 'Copy result'}</button>
            {canReplace && <button className="secondary-button" type="button" onClick={onReplace}><Icon name="replace" size={15} /> Replace selection</button>}
          </div>
        </div>
      )}
    </section>
  );
}
