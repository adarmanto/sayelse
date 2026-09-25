import { OPERATION_LABELS, TONE_LABELS } from '../../../lib/constants';
import type { HistoryEntry } from '../../../lib/storage/schema';
import { Icon } from './Icon';

interface HistoryViewProps {
  entries: HistoryEntry[];
  onLoad: (entry: HistoryEntry) => void;
  onCopy: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export function HistoryView({ entries, onLoad, onCopy, onDelete, onClear }: HistoryViewProps) {
  if (entries.length === 0) {
    return <div className="empty-view"><div className="empty-mark"><Icon name="history" size={22} /></div><h2>No saved rewrites</h2><p>Completed rewrites stay here on this device so you can reuse a useful version.</p></div>;
  }

  return (
    <section className="history-view" aria-labelledby="history-heading">
      <div className="view-heading"><div><p className="eyebrow">On this device</p><h2 id="history-heading">Recent rewrites</h2></div><button className="text-button danger-text" type="button" onClick={onClear}>Clear all</button></div>
      <div className="history-list">
        {entries.map((entry) => (
          <article className="history-item" key={entry.id}>
            <div className="history-meta"><span>{OPERATION_LABELS[entry.operation]}</span><span>{TONE_LABELS[entry.tone]}</span><time dateTime={new Date(entry.createdAt).toISOString()}>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(entry.createdAt)}</time></div>
            <p className="history-source">{entry.source}</p>
            <p className="history-result">{entry.result}</p>
            <div className="history-actions"><button className="text-button" type="button" onClick={() => onLoad(entry)}><Icon name="write" size={14} /> Use again</button><button className="icon-button" type="button" onClick={() => onCopy(entry)} aria-label="Copy saved result"><Icon name="copy" size={15} /></button><button className="icon-button" type="button" onClick={() => onDelete(entry)} aria-label="Delete saved rewrite"><Icon name="trash" size={15} /></button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
