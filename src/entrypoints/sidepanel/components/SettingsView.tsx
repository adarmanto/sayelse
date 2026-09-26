import { useEffect, useState } from 'react';
import type { Theme } from '../../../lib/constants';
import type { Settings } from '../../../lib/storage/schema';
import { Icon } from './Icon';

interface SettingsViewProps {
  settings: Settings;
  models: string[];
  onSettingsChange: (settings: Settings) => void;
  onRefreshModels: () => void;
  onSaveConnection: (draft: { baseUrl: string; apiKey: string }) => Promise<string | null>;
}

export function SettingsView({ settings, models, onSettingsChange, onRefreshModels, onSaveConnection }: SettingsViewProps) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBaseUrl(settings.baseUrl);
    setApiKey(settings.apiKey);
  }, [settings.baseUrl, settings.apiKey]);

  const dirty = baseUrl !== settings.baseUrl || apiKey !== settings.apiKey;

  const save = async () => {
    setSaving(true);
    const message = await onSaveConnection({ baseUrl, apiKey });
    setSaving(false);
    setError(message);
    setSaved(message === null);
    if (message === null) {
      window.setTimeout(() => setSaved(false), 1800);
    }
  };

  return (
    <section className="settings-view" aria-labelledby="settings-heading">
      <div className="view-heading">
        <h2 id="settings-heading">Settings</h2>
      </div>

      <div className="settings-stack">
        <div className="settings-group">
          <div className="group-title"><div className="group-heading"><span className="group-icon"><Icon name="connection" size={15} /></span><h3>Connection</h3></div></div>
          <label className="field-label" htmlFor="sayelse-base-url">Endpoint URL</label>
          <input id="sayelse-base-url" type="url" inputMode="url" value={baseUrl} onChange={(event) => { setBaseUrl(event.target.value); setSaved(false); }} placeholder="https://api.example.com/v1" autoComplete="off" spellCheck={false} />
          <label className="field-label" htmlFor="sayelse-api-key">API key</label>
          <input id="sayelse-api-key" type="password" value={apiKey} onChange={(event) => { setApiKey(event.target.value); setSaved(false); }} placeholder="Paste your API key" autoComplete="off" />
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="settings-actions">
            <button className="secondary-button" type="button" onClick={() => void save()} disabled={saving || !dirty}>
              {saved && <Icon name="check" size={14} />}{saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
            {dirty && !saving && !saved && <span className="settings-note">Unsaved</span>}
          </div>
        </div>

        <div className="settings-group">
          <div className="group-title">
            <div className="group-heading"><span className="group-icon"><Icon name="spark" size={15} /></span><h3>Model</h3></div>
            <button className="text-button" type="button" onClick={onRefreshModels}><Icon name="refresh" size={13} /> Refresh</button>
          </div>
          <select id="sayelse-model" value={settings.selectedModel ?? ''} onChange={(event) => onSettingsChange({ ...settings, selectedModel: event.target.value || null })} disabled={models.length === 0} aria-label="Model">
            <option value="">{models.length === 0 ? 'No models found' : 'Choose a model'}</option>
            {models.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </div>

        <div className="settings-group">
          <div className="group-title"><div className="group-heading"><span className="group-icon"><Icon name="appearance" size={15} /></span><h3>Appearance</h3></div></div>
          <select id="sayelse-theme" value={settings.theme} onChange={(event) => onSettingsChange({ ...settings, theme: event.target.value as Theme })} aria-label="Theme">
            <option value="system">Match browser</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </section>
  );
}
