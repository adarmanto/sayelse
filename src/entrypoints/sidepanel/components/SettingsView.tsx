import { LENGTHS, LENGTH_LABELS, OPERATIONS, OPERATION_LABELS, STRENGTHS, STRENGTH_LABELS, TONES, TONE_LABELS, type Length, type Operation, type Strength, type Theme, type Tone } from '../../../lib/constants';
import type { Settings } from '../../../lib/storage/schema';
import { Icon } from './Icon';

interface SettingsViewProps {
  settings: Settings;
  models: string[];
  connectionStatus: 'checking' | 'online' | 'offline';
  onSettingsChange: (settings: Settings) => void;
  onRefreshModels: () => void;
  onClearHistory: () => void;
  onClearAll: () => void;
}

export function SettingsView({ settings, models, connectionStatus, onSettingsChange, onRefreshModels, onClearHistory, onClearAll }: SettingsViewProps) {
  const updateDefaults = (key: keyof Settings['defaults'], value: string) => onSettingsChange({ ...settings, defaults: { ...settings.defaults, [key]: value } });
  return (
    <section className="settings-view" aria-labelledby="settings-heading">
      <div className="view-heading"><div><p className="eyebrow">Private by design</p><h2 id="settings-heading">Settings</h2></div><div className={`settings-status status-${connectionStatus}`}><span className="connection-dot" />{connectionStatus === 'online' ? 'Router connected' : connectionStatus === 'checking' ? 'Checking router' : 'Router offline'}</div></div>
      <div className="settings-stack">
        <div className="settings-group"><div className="group-title"><h3>9Router connection</h3><span className="group-caption">Fixed local endpoint</span></div><label className="field-label" htmlFor="sayelse-token">API token <span>optional if your router is open</span></label><input id="sayelse-token" type="password" value={settings.token} onChange={(event) => onSettingsChange({ ...settings, token: event.target.value })} placeholder="Paste your 9Router token" autoComplete="off" /><div className="settings-actions"><button className="secondary-button" type="button" onClick={onRefreshModels}><Icon name="refresh" size={15} /> Refresh models</button><span className="settings-note">{models.length} models available</span></div></div>
        <div className="settings-group"><div className="group-title"><h3>Default model</h3><span className="group-caption">Used for new rewrites</span></div><label className="field-label" htmlFor="sayelse-model">9Router model</label><select id="sayelse-model" value={settings.selectedModel ?? ''} onChange={(event) => onSettingsChange({ ...settings, selectedModel: event.target.value || null })} disabled={models.length === 0}><option value="">{models.length === 0 ? 'Refresh models to choose one' : 'Choose a model'}</option>{models.map((model) => <option value={model} key={model}>{model}</option>)}</select></div>
        <div className="settings-group"><div className="group-title"><h3>Default recipe</h3><span className="group-caption">Your starting point</span></div><div className="settings-grid"><label className="select-field"><span>Goal</span><select value={settings.defaults.operation} onChange={(event) => updateDefaults('operation', event.target.value)}>{OPERATIONS.map((option) => <option value={option} key={option}>{OPERATION_LABELS[option]}</option>)}</select></label><label className="select-field"><span>Tone</span><select value={settings.defaults.tone} onChange={(event) => updateDefaults('tone', event.target.value)}>{TONES.map((option) => <option value={option} key={option}>{TONE_LABELS[option]}</option>)}</select></label><label className="select-field"><span>Intensity</span><select value={settings.defaults.strength} onChange={(event) => updateDefaults('strength', event.target.value)}>{STRENGTHS.map((option) => <option value={option} key={option}>{STRENGTH_LABELS[option]}</option>)}</select></label><label className="select-field"><span>Length</span><select value={settings.defaults.length} onChange={(event) => updateDefaults('length', event.target.value)}>{LENGTHS.map((option) => <option value={option} key={option}>{LENGTH_LABELS[option]}</option>)}</select></label></div></div>
        <div className="settings-group"><div className="group-title"><h3>Appearance</h3><span className="group-caption">Comfortable in any light</span></div><label className="field-label" htmlFor="sayelse-theme">Theme</label><select id="sayelse-theme" value={settings.theme} onChange={(event) => onSettingsChange({ ...settings, theme: event.target.value as Theme })}><option value="system">Match browser</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
        <div className="privacy-card"><div className="privacy-icon"><Icon name="check" size={16} /></div><div><h3>What stays local</h3><p>SayElse stores settings and completed history in Chrome on this device. It does not send a SayElse request anywhere except the 9Router endpoint you configured. 9Router may forward text to its own provider, so review that provider’s settings before sharing sensitive text.</p></div></div>
        <div className="data-actions"><div><h3>Manage data</h3><p>Remove saved rewrites or all SayElse settings from this Chrome profile.</p></div><div className="button-row"><button className="secondary-button" type="button" onClick={onClearHistory}>Clear history</button><button className="secondary-button danger-button" type="button" onClick={onClearAll}>Clear all data</button></div></div>
      </div>
    </section>
  );
}
