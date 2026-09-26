import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../../../lib/constants';
import type { Settings } from '../../../lib/storage/schema';
import { CUSTOM_MODEL_VALUE, resolveModelDraft, toModelChoice } from '../../../lib/modelDraft';
import { Icon } from './Icon';

interface SettingsViewProps {
  settings: Settings;
  models: string[];
  modelsLoading: boolean;
  onSettingsChange: (settings: Settings) => void;
  onRefreshModels: () => void;
  onSaveConnection: (draft: { baseUrl: string; apiKey: string }) => Promise<string | null>;
  onSaveModel: (model: string) => Promise<string | null>;
  onCheckModel: (model: string, endpoint: { baseUrl: string; apiKey: string }) => Promise<{ ok: boolean; message?: string }>;
}

export function SettingsView({ settings, models, modelsLoading, onSettingsChange, onRefreshModels, onSaveConnection, onSaveModel, onCheckModel }: SettingsViewProps) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [modelChoice, setModelChoice] = useState(settings.selectedModel ?? '');
  const [customModel, setCustomModel] = useState(settings.selectedModel ?? '');
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelSaved, setModelSaved] = useState(false);
  const [modelSaving, setModelSaving] = useState(false);

  useEffect(() => {
    setBaseUrl(settings.baseUrl);
    setApiKey(settings.apiKey);
  }, [settings.baseUrl, settings.apiKey]);

  // Adopts a model persisted elsewhere (a handoff, or the first list load)
  // whenever it differs from what this view last saw. Without the comparison
  // the save this view performs would be immediately undone by its own echo.
  const knownModelRef = useRef(settings.selectedModel ?? '');
  // This view's own save echoes back through settings. Reapplying it would
  // rewrite the draft it just filled and clear the confirmation the user is
  // meant to read, so the echo is recorded and skipped.
  const ownSaveRef = useRef<string | null>(null);
  useEffect(() => {
    const next = settings.selectedModel ?? '';
    if (next === knownModelRef.current) {
      // The stored model is unchanged, but the list may have been. The same
      // id can belong in the list, which moves it out of the custom option,
      // so the choice is re-derived without touching the confirmation.
      setModelChoice((current) => {
        const derived = toModelChoice(next, models);
        return current === derived ? current : derived;
      });
      if (next) {
        setCustomModel((current) => (current === next ? current : next));
      }
      return;
    }
    knownModelRef.current = next;
    if (ownSaveRef.current === next) {
      ownSaveRef.current = null;
      return;
    }
    setModelChoice(toModelChoice(next, models));
    setCustomModel(next);
    setModelSaved(false);
    setModelError(null);
  }, [settings.selectedModel, models]);

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

  const refresh = () => {
    setRefreshNote(null);
    onRefreshModels();
  };

  const saveModel = async () => {
    setModelSaving(true);
    setModelSaved(false);
    const resolution = resolveModelDraft({ selected: modelChoice, custom: customModel });
    if (!resolution.ok) {
      setModelSaving(false);
      setModelError(resolution.message);
      return;
    }
    setModelError(null);
    // The advertised list is not authoritative, so a list check would reject a
    // model that actually works. Calling it is what decides. The check runs
    // against what is on screen, so a freshly typed key works without saving.
    const check = await onCheckModel(resolution.model, { baseUrl, apiKey });
    if (!check.ok) {
      setModelSaving(false);
      setModelError(check.message ?? `${resolution.model} could not be reached.`);
      return;
    }
    // Marked before the call, because the save updates settings synchronously
    // and the adoption effect can run before this await resolves.
    ownSaveRef.current = resolution.model;
    const message = await onSaveModel(resolution.model);
    if (message !== null) {
      ownSaveRef.current = null;
    }
    setModelSaving(false);
    setModelError(message);
    setModelSaved(message === null);
    if (message === null) {
      window.setTimeout(() => setModelSaved(false), 1800);
    }
  };

  // The select itself shows the models, so the note only reports what the
  // fetch returned — a count the previous list did not have.
  const wasLoadingRef = useRef(modelsLoading);
  useEffect(() => {
    if (wasLoadingRef.current && !modelsLoading) {
      setRefreshNote(models.length > 0 ? `${models.length} models` : 'No models found');
    }
    wasLoadingRef.current = modelsLoading;
  }, [modelsLoading, models]);

  const placeholder = modelsLoading
    ? 'Loading…'
    : models.length === 0
      ? 'No models found'
      : 'Choose a model';

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
            {dirty && !saving && !saved && <span className="settings-note">Unsaved</span>}
            <button className="primary-button" type="button" onClick={() => void save()} disabled={saving || !dirty}>
              {saved && <Icon name="check" size={14} />}{saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        <div className="settings-group">
          <div className="group-title">
            <div className="group-heading"><span className="group-icon"><Icon name="spark" size={15} /></span><h3>Default model</h3></div>
            <button className="text-button" type="button" onClick={refresh} disabled={modelsLoading} aria-busy={modelsLoading}>
              <Icon name="refresh" size={13} className={modelsLoading ? 'icon-spin' : undefined} /> Refresh
            </button>
          </div>
          <select
            id="sayelse-model"
            value={modelChoice}
            onChange={(event) => { setModelChoice(event.target.value); setModelSaved(false); setModelError(null); }}
            disabled={modelsLoading}
            aria-label="Model"
          >
            <option value="">{placeholder}</option>
            {models.map((item) => <option value={item} key={item}>{item}</option>)}
            <option value={CUSTOM_MODEL_VALUE}>Custom model ID…</option>
          </select>
          {modelChoice === CUSTOM_MODEL_VALUE && (
            <input
              id="sayelse-custom-model"
              type="text"
              value={customModel}
              onChange={(event) => { setCustomModel(event.target.value); setModelSaved(false); setModelError(null); }}
              placeholder="vendor/model-id"
              aria-label="Custom model ID"
              autoComplete="off"
              spellCheck={false}
            />
          )}
          <div className="settings-actions">
            <button className="primary-button" type="button" onClick={() => void saveModel()} disabled={modelSaving} aria-busy={modelSaving}>
              {modelSaved && <Icon name="check" size={14} />}{modelSaving ? 'Checking…' : modelSaved ? 'Saved' : 'Save'}
            </button>
          </div>
          {modelError && <p className="field-error" role="alert">{modelError}</p>}
          {modelSaved && <p className="settings-note success" role="status">{settings.selectedModel} saved</p>}
          {refreshNote && <p className="settings-note" role="status">{refreshNote}</p>}
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
