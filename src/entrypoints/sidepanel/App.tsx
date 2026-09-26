import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  DEFAULT_SETTINGS,
  HANDOFF_STORAGE_KEY,
  type Theme,
} from '../../lib/constants';
import { listModels, probeModel, type EndpointConfig } from '../../lib/api/openaiCompatible';
import { normaliseBaseUrl } from '../../lib/api/endpoint';
import { grantEndpointAccess, type PermissionsLike } from '../../lib/browser/permissions';
import { resolveTheme } from '../../lib/browser/inlineTheme';
import { generateRewrite, describeGenerationError, type GenerationError, type GenerationStatus } from '../../lib/generation';
import { consumeSelectionHandoff } from '../../lib/storage/handoff';
import { getLocalArea, getSessionArea, getSettings, saveSettings } from '../../lib/storage/settings';
import { getDefaultSettings, type Settings } from '../../lib/storage/schema';
import { Composer } from './components/Composer';
import { ConnectionState } from './components/ConnectionState';
import { Controls, type RewriteControlsValue } from './components/Controls';
import { Icon } from './components/Icon';
import { OutputPanel } from './components/OutputPanel';
import { SettingsView } from './components/SettingsView';
import { replaceResultMessageSchema, replaceSelectionMessageSchema } from '../../lib/browser/messages';

export type PanelView = 'write' | 'settings';
type ConnectionStatus = 'checking' | 'online' | 'offline';

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = resolveTheme(theme, window.matchMedia('(prefers-color-scheme: light)').matches);
}

export default function App() {
  const [view, setView] = useState<PanelView>('write');
  const [settings, setSettings] = useState<Settings>(getDefaultSettings);
  const [source, setSource] = useState('');
  const [sourceKind, setSourceKind] = useState<'selected' | 'manual' | 'replaced'>('manual');
  const [controls, setControls] = useState<RewriteControlsValue>(DEFAULT_SETTINGS.defaults);
  const [result, setResult] = useState('');
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<GenerationError | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [loaded, setLoaded] = useState(false);
  const [handoff, setHandoff] = useState<Awaited<ReturnType<typeof consumeSelectionHandoff>>>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const settingsRef = useRef<Settings>(getDefaultSettings());
  const modelsAbortRef = useRef<AbortController | null>(null);
  const inFlightModelsRef = useRef<string | null>(null);

  // Single writer for settings. The ref is the authority that the save paths
  // spread from, so it must move with state on every write or the next save
  // rolls the field back.
  const commitSettings = useCallback((next: Settings) => {
    settingsRef.current = next;
    setSettings(next);
  }, []);

  // The one path that fetches the model list. An in-flight request for the
  // same endpoint is reused, so saving a connection or changing the API key
  // does not issue a second identical /models call, and a superseded request
  // cannot overwrite a newer result.
  const refreshModels = useCallback(async (endpoint: EndpointConfig) => {
    const key = `${endpoint.baseUrl}\n${endpoint.apiKey}`;
    if (modelsAbortRef.current && inFlightModelsRef.current === key) {
      return;
    }
    modelsAbortRef.current?.abort();
    const controller = new AbortController();
    modelsAbortRef.current = controller;
    inFlightModelsRef.current = key;

    setConnectionStatus('checking');
    setModelsLoading(true);
    try {
      const nextModels = await listModels({ ...endpoint, signal: controller.signal });
      if (modelsAbortRef.current !== controller) return;
      setModels(nextModels);
      setConnectionStatus('online');
      // Seeds a first-run default only. An existing selection is never
      // overwritten here: the list is a convenience, not an authority on
      // which model the user actually runs.
      const firstModel = nextModels[0];
      if (firstModel && !settingsRef.current.selectedModel) {
        commitSettings({ ...settingsRef.current, selectedModel: firstModel });
        void saveSettings(settingsRef.current).catch(() => undefined);
      }
    } catch {
      if (modelsAbortRef.current !== controller) return;
      setModels([]);
      setConnectionStatus('offline');
    } finally {
      if (modelsAbortRef.current === controller) {
        modelsAbortRef.current = null;
        inFlightModelsRef.current = null;
        setModelsLoading(false);
      }
    }
  }, [commitSettings]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [nextSettings, nextHandoff] = await Promise.all([
        getSettings(getLocalArea()),
        consumeSelectionHandoff(getSessionArea()),
      ]);
      if (!active) return;
      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      setControls(nextSettings.defaults);
      setLoaded(true);
      setHandoff(nextHandoff);
      if (nextHandoff) {
        setSource(nextHandoff.source);
        setSourceKind('selected');
        if (nextHandoff.preset) {
          setControls({
            ...nextSettings.defaults,
            ...nextHandoff.preset,
          });
        }
      }
    })();
    return () => { active = false; abortRef.current?.abort(); };
  }, []);

  // Fetching the list is derived from the saved connection, so it runs whenever
  // the endpoint or key changes rather than being triggered by hand at each
  // call site. It waits for the stored settings, and the stored model is
  // deliberately left in place: whether it exists on the new endpoint is the
  // probe's answer, not a side effect of switching URLs.
  useEffect(() => {
    if (!loaded) return;
    setModels([]);
    void refreshModels({ baseUrl: settings.baseUrl, apiKey: settings.apiKey });
  }, [loaded, settings.baseUrl, settings.apiKey, refreshModels]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'session' || !changes[HANDOFF_STORAGE_KEY]?.newValue) return;
      void consumeSelectionHandoff(getSessionArea()).then((nextHandoff) => {
        if (nextHandoff) {
          setHandoff(nextHandoff);
          setSource(nextHandoff.source);
          setSourceKind('selected');
          if (nextHandoff.preset) {
            setControls((current) => ({ ...current, ...nextHandoff.preset }));
          }
          setResult('');
          setStatus('idle');
          setView('write');
        }
      });
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  const updateSettings = useCallback((next: Settings) => {
    commitSettings(next);
    // Fire-and-forget is fine for a preference, but not silently: a rejected
    // write would otherwise disappear with nothing on screen.
    void saveSettings(next).catch(() => undefined);
  }, [commitSettings]);

  const saveConnection = useCallback(async (draft: { baseUrl: string; apiKey: string }): Promise<string | null> => {
    const normalised = normaliseBaseUrl(draft.baseUrl);
    if (!normalised.ok) {
      return normalised.message;
    }
    const grant = await grantEndpointAccess(normalised.value, browser.permissions as unknown as PermissionsLike);
    if (!grant.ok) {
      return grant.message;
    }
    const next: Settings = { ...settingsRef.current, baseUrl: normalised.value, apiKey: draft.apiKey };
    try {
      await saveSettings(next);
    } catch {
      return 'The connection could not be saved.';
    }
    // Commit only after the write lands, so a failed save cannot leave the
    // screen showing a connection that is not on disk. The model list follows
    // from this change through the endpoint effect.
    commitSettings(next);
    return null;
  }, [commitSettings]);

  const saveModel = useCallback(async (model: string): Promise<string | null> => {
    const next: Settings = { ...settingsRef.current, selectedModel: model };
    try {
      await saveSettings(next);
    } catch {
      return 'The model could not be saved.';
    }
    commitSettings(next);
    return null;
  }, [commitSettings]);

  // The advertised model list is not authoritative, so existence is settled by
  // calling the model. The endpoint is passed in rather than read from storage
  // so the check runs against the connection currently on screen, without
  // making the user save it first.
  const checkModel = useCallback(async (
    model: string,
    endpoint: { baseUrl: string; apiKey: string },
  ): Promise<{ ok: boolean; message?: string }> => {
    const probe = await probeModel({ baseUrl: endpoint.baseUrl, apiKey: endpoint.apiKey, model });
    return probe.ok ? { ok: true } : { ok: false, message: probe.message };
  }, []);

  const generate = useCallback(async () => {
    if (!source.trim()) {
      setError({ code: 'configuration', message: 'Add or select some text before starting a rewrite.' });
      setStatus('error');
      return;
    }
    const model = settings.selectedModel;
    if (!model) {
      setError({ code: 'configuration', message: 'Choose a model in Settings first.' });
      setStatus('error');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    setResult('');
    setError(null);
    setStatus('loading');

    try {
      const generated = await generateRewrite({
        source,
        operation: controls.operation,
        model,
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        signal: controller.signal,
        onToken: (fullText) => {
          if (requestId === requestIdRef.current) setResult(fullText);
        },
      });
      if (requestId !== requestIdRef.current) return;
      if (!generated.trim()) throw new Error('The model returned empty text.');
      setResult(generated);
      setStatus('success');
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      const described = describeGenerationError(caught);
      setError(described);
      setStatus(described.code === 'cancelled' ? 'stopped' : 'error');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [controls, settings.baseUrl, settings.apiKey, settings.selectedModel, source]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const copyText = useCallback(async (value: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const helper = document.createElement('textarea');
      helper.value = value;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.append(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, []);

  const replace = useCallback(async () => {
    if (!handoff?.capture || !handoff.capture.replaceable || !result.trim()) return;
    const message = replaceSelectionMessageSchema.parse({
      type: 'replace-selection',
      tabId: handoff.tabId,
      frameId: handoff.frameId,
      capture: handoff.capture,
      replacement: result,
    });
    const response = await browser.runtime.sendMessage(message);
    const parsed = replaceResultMessageSchema.safeParse(response);
    if (parsed.success && parsed.data.replaced) {
      setSource(result);
      setSourceKind('replaced');
      setHandoff(null);
      setView('write');
    } else {
      setError({
        code: 'configuration',
        message: parsed.success && parsed.data.reason
          ? parsed.data.reason
          : 'The selection could not be replaced.',
      });
      setStatus('error');
    }
  }, [handoff, result]);

  const model = settings.selectedModel;
  const canReplace = Boolean(handoff?.capture?.replaceable);
  const statusLabel = useMemo(() => {
    if (status === 'loading') return 'Working…';
    if (status === 'error') return 'Failed';
    if (result) return 'Ready';
    return 'Idle';
  }, [result, status]);

  return (
    <div className="sayelse-app">
      <header className="app-header">
        <div className="brand-lockup"><div className="brand-mark" aria-hidden="true"><Icon name="spark" size={18} /></div><div><p className="brand-name">SayElse</p></div></div>
        <div className="header-actions"><ConnectionState status={connectionStatus} model={model} onOpenSettings={() => setView('settings')} /><button className="icon-button" type="button" onClick={() => setView('settings')} aria-label="Open settings"><Icon name="settings" size={18} /></button></div>
      </header>

      <nav className="view-tabs" aria-label="SayElse sections">
        <button className={view === 'write' ? 'view-tab active' : 'view-tab'} type="button" onClick={() => setView('write')}><Icon name="write" size={16} /> Write</button>
        <button className={view === 'settings' ? 'view-tab active' : 'view-tab'} type="button" onClick={() => setView('settings')}><Icon name="settings" size={16} /> Settings</button>
      </nav>

      <main className="app-main">
        {view === 'write' && <>
          <div className="intro-row"><h1>Give your words a better shape.</h1><span className="status-caption">{statusLabel}</span></div>
          <div className="workspace-grid">
            <div className="workspace-input"><Composer value={source} onChange={(value) => { setSource(value); setStatus('idle'); setError(null); }} disabled={status === 'loading'} sourceKind={sourceKind} onClear={() => { setSource(''); setResult(''); setStatus('idle'); setError(null); }} /><Controls value={controls} onChange={setControls} disabled={status === 'loading'} /></div>
            <div className="rewrite-rail" aria-hidden="true"><span className="rail-line" /><span className="rail-icon"><Icon name="spark" size={16} /></span><span className="rail-line" /></div>
            <OutputPanel result={result} status={status} error={error} canReplace={canReplace} copied={copied} onGenerate={() => void generate()} onStop={stop} onRetry={() => void generate()} onCopy={() => void copyText(result)} onReplace={() => void replace()} hasSource={Boolean(source.trim())} />
          </div>
        </>}
        {view === 'settings' && <SettingsView settings={settings} models={models} modelsLoading={modelsLoading} onSettingsChange={updateSettings} onRefreshModels={() => void refreshModels({ baseUrl: settings.baseUrl, apiKey: settings.apiKey })} onSaveConnection={saveConnection} onSaveModel={saveModel} onCheckModel={checkModel} />}
      </main>

      <footer className="app-footer"><span><span className="footer-dot" /> No account</span><span>Text goes to your endpoint</span></footer>
    </div>
  );
}
