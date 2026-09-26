import { useEffect, useState } from 'react';
import { LENGTHS, LENGTH_LABELS, OPERATIONS, OPERATION_LABELS, STRENGTHS, STRENGTH_LABELS, TONES, TONE_LABELS, type Length, type Operation, type Strength, type Theme, type Tone } from '../../../lib/constants';
import type { Settings } from '../../../lib/storage/schema';
import { Icon } from './Icon';

interface SettingsViewProps {
  settings: Settings;
  models: string[];
  connectionStatus: 'checking' | 'online' | 'offline';
  onSettingsChange: (settings: Settings) => void;
  onRefreshModels: () => void;
  onSaveBaseUrl: (baseUrl: string) => Promise<string | null>;
  onClearHistory: () => void;
  onClearAll: () => void;
}

export function SettingsView({ settings, models, connectionStatus, onSettingsChange, onRefreshModels, onSaveBaseUrl, onClearHistory, onClearAll }: SettingsViewProps) {
  const [baseUrlDraft, setBaseUrlDraft] = useState(settings.baseUrl);
  const [endpointError, setEndpointError] = useState<string | null>(null);
  const [savingEndpoint, setSavingEndpoint] = useState(false);

  useEffect(() => {
    setBaseUrlDraft(settings.baseUrl);
  }, [settings.baseUrl]);

  const saveBaseUrl = async () => {
    setSavingEndpoint(true);
    const error = await onSaveBaseUrl(baseUrlDraft);
    setEndpointError(error);
    setSavingEndpoint(false);
  };

  const updateDefaults = (key: keyof Settings['defaults'], value: string) => onSettingsChange({ ...settings, defaults: { ...settings.defaults, [key]: value } });
  const defaultField = (label: string, name: keyof Settings['defaults'], value: string, options: readonly string[], labels: Record<string, string>) => (
    <label className="select-field" key={name}>
      <span>{label}</span>
      <select id={`sayelse-default-${name}`} name={`default-${name}`} value={value} onChange={(event) => updateDefaults(name, event.target.value)}>
        {options.map((option) => <option value={option} key={option}>{labels[option]}</option>)}
      </select>
    </label>
  );
  return (
    <section className="settings-view" aria-labelledby="settings-heading">
      <div className="view-heading"><div><p className="eyebrow">Your server, your key</p><h2 id="settings-heading">Settings</h2></div><div className={`settings-status status-${connectionStatus}`}><span className="connection-dot" />{connectionStatus === 'online' ? 'Endpoint ready' : connectionStatus === 'checking' ? 'Checking endpoint' : 'Endpoint unreachable'}</div></div>
      <div className="settings-stack">
        <div className="settings-group"><div className="group-title"><div className="group-heading"><span className="group-icon"><Icon name="connection" size={16} /></span><h3>Connection</h3></div><span className="group-caption">Any OpenAI-compatible server</span></div><label className="field-label" htmlFor="sayelse-base-url">Endpoint URL <span>includes the API path</span></label><input id="sayelse-base-url" type="url" inputMode="url" value={baseUrlDraft} onChange={(event) => setBaseUrlDraft(event.target.value)} placeholder="https://api.example.com/v1" autoComplete="off" spellCheck={false} /><p className="field-hint">The base URL of an OpenAI-compatible server, for example <code>https://api.example.com/v1</code> or <code>http://127.0.0.1:11434/v1</code>. A pasted <code>/chat/completions</code> or <code>/models</code> link is trimmed for you.</p>{endpointError && <p className="field-error" role="alert">{endpointError}</p>}<div className="settings-actions"><button className="secondary-button" type="button" onClick={() => void saveBaseUrl()} disabled={savingEndpoint}><Icon name="refresh" size={15} /> {savingEndpoint ? 'Requesting access…' : 'Save endpoint'}</button></div><label className="field-label" htmlFor="sayelse-token">API key <span>optional if your server allows anonymous access</span></label><input id="sayelse-token" type="password" value={settings.apiKey} onChange={(event) => onSettingsChange({ ...settings, apiKey: event.target.value })} placeholder="Paste your API key" autoComplete="off" /><div className="settings-actions"><button className="secondary-button" type="button" onClick={onRefreshModels}><Icon name="refresh" size={15} /> Refresh models</button><span className="settings-note">{models.length} models available</span></div></div>
        <div className="settings-group"><div className="group-title"><div className="group-heading"><span className="group-icon"><Icon name="spark" size={16} /></span><h3>Default model</h3></div><span className="group-caption">Used for new rewrites</span></div><label className="field-label" htmlFor="sayelse-model">Model</label><select id="sayelse-model" value={settings.selectedModel ?? ''} onChange={(event) => onSettingsChange({ ...settings, selectedModel: event.target.value || null })} disabled={models.length === 0}><option value="">{models.length === 0 ? 'Refresh models to choose one' : 'Choose a model'}</option>{models.map((model) => <option value={model} key={model}>{model}</option>)}</select></div>
        <div className="settings-group"><div className="group-title"><div className="group-heading"><span className="group-icon"><Icon name="recipe" size={16} /></span><h3>Default recipe</h3></div><span className="group-caption">Your starting point</span></div><div className="settings-grid">{defaultField('Goal', 'operation', settings.defaults.operation, OPERATIONS, OPERATION_LABELS)}{defaultField('Tone', 'tone', settings.defaults.tone, TONES, TONE_LABELS)}{defaultField('Intensity', 'strength', settings.defaults.strength, STRENGTHS, STRENGTH_LABELS)}{defaultField('Length', 'length', settings.defaults.length, LENGTHS, LENGTH_LABELS)}</div></div>
        <div className="settings-group"><div className="group-title"><div className="group-heading"><span className="group-icon"><Icon name="appearance" size={16} /></span><h3>Appearance</h3></div><span className="group-caption">Comfortable in any light</span></div><label className="field-label" htmlFor="sayelse-theme">Theme</label><select id="sayelse-theme" value={settings.theme} onChange={(event) => onSettingsChange({ ...settings, theme: event.target.value as Theme })}><option value="system">Match browser</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
        <div className="privacy-card"><div className="privacy-icon"><Icon name="privacy" size={17} /></div><div><h3>Where your text goes</h3><p>SayElse stores settings and completed history in Chrome on this device, and it never contacts any server except the endpoint you set above. Text you rewrite is sent to that server, which may forward it to its own provider. Review the provider’s privacy policy before rewriting anything sensitive.</p></div></div>
        <div className="data-actions"><div className="group-heading"><span className="group-icon"><Icon name="data" size={16} /></span><div><h3>Manage data</h3><p>Remove saved rewrites or all SayElse settings from this Chrome profile.</p></div></div><div className="button-row"><button className="secondary-button" type="button" onClick={onClearHistory}>Clear history</button><button className="secondary-button danger-button" type="button" onClick={onClearAll}>Clear all data</button></div></div>
      </div>
    </section>
  );
}
