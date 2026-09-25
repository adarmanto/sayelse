import { Icon } from './Icon';

interface ConnectionStateProps {
  status: 'checking' | 'online' | 'offline';
  model: string | null;
  onOpenSettings: () => void;
}

export function ConnectionState({ status, model, onOpenSettings }: ConnectionStateProps) {
  const label = status === 'checking' ? 'Checking router' : status === 'online' ? 'Local 9Router' : 'Router offline';
  return (
    <button className={`connection connection-${status}`} type="button" onClick={onOpenSettings} aria-label="Open connection settings">
      <span className="connection-dot" aria-hidden="true" />
      <span>{label}</span>
      {model && status === 'online' && <span className="connection-model">{model}</span>}
      {status === 'offline' && <Icon name="settings" size={14} />}
    </button>
  );
}
