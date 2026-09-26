import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  DEFAULT_SETTINGS,
  type Theme,
} from '../../lib/constants';
import { listModels, type EndpointConfig } from '../../lib/api/openaiCompatible';
import { normaliseBaseUrl } from '../../lib/api/endpoint';
import { grantEndpointAccess, type PermissionsLike } from '../../lib/browser/permissions';
import { resolveTheme } from '../../lib/browser/inlineTheme';
import { generateRewrite, describeGenerationError, type GenerationError, type GenerationStatus } from '../../lib/generation';
import { createHistoryEntryId, clearHistory, deleteHistoryEntry, listHistory, saveHistoryEntry } from '../../lib/storage/history';
import { consumeSelectionHandoff } from '../../lib/storage/handoff';
import { getLocalArea, getSessionArea, getSettings, saveSettings } from '../../lib/storage/settings';
import { getDefaultSettings, type HistoryEntry, type Settings } from '../../lib/storage/schema';
import { Composer } from './components/Composer';
import { ConnectionState } from './components/ConnectionState';
import { Controls, type RewriteControlsValue } from './components/Controls';
import { HistoryView } from './components/HistoryView';
import { Icon } from './components/Icon';
import { OutputPanel } from './components/OutputPanel';
import { SettingsView } from './components/SettingsView';
import { replaceResultMessageSchema, replaceSelectionMessageSchema } from '../../lib/browser/messages';

type PanelView = 'write' | 'history' | 'settings';
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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [handoff, setHandoff] = useState<Awaited<ReturnType<typeof consumeSelectionHandoff>>>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const loadedRef = useRef(false);
  const settingsRef = useRef<Settings>(getDefaultSettings());

  const refreshHistory = useCallback(async () => {
    setHistory(await listHistory(getLocalArea()));
  }, []);

  const refreshModels = useCallback(async (endpoint: EndpointConfig) => {
    setConnectionStatus('checking');
    try {
      const nextModels = await listModels(endpoint);
      setModels(nextModels);
      setConnectionStatus('online');
      if (nextModels.length > 0) {
        setSettings((current) => {
          if (current.selectedModel && nextModels.includes(current.selectedModel)) return current;
          const firstModel = nextModels[0];
          if (!firstModel) return current;
          const next: Settings = { ...current, selectedModel: firstModel };
          void saveSettings(next);
          return next;
        });
      }
    } catch {
      setModels([]);
      setConnectionStatus('offline');
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [nextSettings, nextHistory, nextHandoff] = await Promise.all([
        getSettings(getLocalArea()),
        listHistory(getLocalArea()),
        consumeSelectionHandoff(getSessionArea()),
      ]);
      if (!active) return;
      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      setControls(nextSettings.defaults);
      setHistory(nextHistory);
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
      void refreshModels({ baseUrl: nextSettings.baseUrl, apiKey: nextSettings.apiKey });
    })();
    return () => { active = false; abortRef.current?.abort(); };
  }, [refreshModels]);

  // The initial load already fetches models; this only reacts to a later change
  // of endpoint made in Settings, where the cached list no longer applies.
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    setModels([]);
    setSettings((current) => (current.selectedModel ? { ...current, selectedModel: null } : current));
    void refreshModels({ baseUrl: settings.baseUrl, apiKey: settings.apiKey });
  }, [settings.baseUrl, refreshModels]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'session' || !changes['sayelse.selection.v1']?.newValue) return;
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
    settingsRef.current = next;
    setSettings(next);
    void saveSettings(next);
  }, []);

  const saveBaseUrl = useCallback(async (draft: string): Promise<string | null> => {
    const normalised = normaliseBaseUrl(draft);
    if (!normalised.ok) {
      return normalised.message;
    }
    const grant = await grantEndpointAccess(normalised.value, browser.permissions as unknown as PermissionsLike);
    if (!grant.ok) {
      return grant.message;
    }
    const next: Settings = { ...settingsRef.current, baseUrl: normalised.value };
    settingsRef.current = next;
    setSettings(next);
    await saveSettings(next);
    void refreshModels({ baseUrl: normalised.value, apiKey: next.apiKey });
    return null;
  }, [refreshModels]);

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
        tone: controls.tone,
        strength: controls.strength,
        length: controls.length,
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
      await saveHistoryEntry({
        version: 1,
        id: createHistoryEntryId(),
        source,
        result: generated,
        model,
        operation: controls.operation,
        tone: controls.tone,
        strength: controls.strength,
        length: controls.length,
        createdAt: Date.now(),
      }, getLocalArea());
      await refreshHistory();
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      const described = describeGenerationError(caught);
      setError(described);
      setStatus(described.code === 'cancelled' ? 'stopped' : 'error');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [controls, refreshHistory, settings.baseUrl, settings.apiKey, settings.selectedModel, source]);

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

  const loadHistoryEntry = useCallback((entry: HistoryEntry) => {
    abortRef.current?.abort();
    setSource(entry.source);
    setSourceKind('manual');
    setControls({ operation: entry.operation, tone: entry.tone, strength: entry.strength, length: entry.length });
    setResult(entry.result);
    setStatus('success');
    setError(null);
    setHandoff(null);
    setView('write');
  }, []);

  const deleteEntry = useCallback(async (entry: HistoryEntry) => {
    await deleteHistoryEntry(entry.id, getLocalArea());
    await refreshHistory();
  }, [refreshHistory]);

  const clearSavedHistory = useCallback(async () => {
    await clearHistory(getLocalArea());
    await refreshHistory();
  }, [refreshHistory]);

  const clearAllData = useCallback(async () => {
    await getLocalArea().clear();
    await getSessionArea().clear();
    const next = getDefaultSettings();
    setSettings(next);
    setControls(next.defaults);
    setHistory([]);
    setSource('');
    setResult('');
    setHandoff(null);
    setStatus('idle');
    setError(null);
  }, []);

  const model = settings.selectedModel;
  const canReplace = Boolean(handoff?.capture?.replaceable);
  const statusLabel = useMemo(() => {
    if (status === 'loading') return 'Working now';
    if (status === 'error') return 'Needs attention';
    if (result) return 'Ready to use';
    return 'Ready when you are';
  }, [result, status]);

  return (
    <div className="sayelse-app">
      <header className="app-header">
        <div className="brand-lockup"><div className="brand-mark" aria-hidden="true"><Icon name="spark" size={19} /></div><div><p className="brand-name">SayElse</p><p className="brand-tagline">Make the same point, say it better.</p></div></div>
        <div className="header-actions"><ConnectionState status={connectionStatus} model={model} onOpenSettings={() => setView('settings')} /><button className="icon-button" type="button" onClick={() => setView('settings')} aria-label="Open settings"><Icon name="settings" size={18} /></button></div>
      </header>

      <nav className="view-tabs" aria-label="SayElse sections">
        <button className={view === 'write' ? 'view-tab active' : 'view-tab'} type="button" onClick={() => setView('write')}><Icon name="write" size={16} /> Write</button>
        <button className={view === 'history' ? 'view-tab active' : 'view-tab'} type="button" onClick={() => setView('history')}><Icon name="history" size={16} /> History</button>
        <button className={view === 'settings' ? 'view-tab active' : 'view-tab'} type="button" onClick={() => setView('settings')}><Icon name="settings" size={16} /> Settings</button>
      </nav>

      <main className="app-main">
        {view === 'write' && <>
          <div className="intro-row"><div><p className="eyebrow">A second pass, not a blank page</p><h1>Give your words a better shape.</h1></div><span className="status-caption">{statusLabel}</span></div>
          <div className="workspace-grid">
            <div className="workspace-input"><Composer value={source} onChange={(value) => { setSource(value); setStatus('idle'); setError(null); }} disabled={status === 'loading'} sourceKind={sourceKind} onClear={() => { setSource(''); setResult(''); setStatus('idle'); setError(null); }} /><Controls value={controls} onChange={setControls} disabled={status === 'loading'} /></div>
            <div className="rewrite-rail" aria-hidden="true"><span className="rail-line" /><span className="rail-icon"><Icon name="spark" size={16} /></span><span className="rail-line" /></div>
            <OutputPanel result={result} status={status} error={error} canReplace={canReplace} copied={copied} onGenerate={() => void generate()} onStop={stop} onRetry={() => void generate()} onCopy={() => void copyText(result)} onReplace={() => void replace()} hasSource={Boolean(source.trim())} />
          </div>
        </>}
        {view === 'history' && <HistoryView entries={history} onLoad={loadHistoryEntry} onCopy={(entry) => void copyText(entry.result)} onDelete={(entry) => void deleteEntry(entry)} onClear={() => void clearSavedHistory()} />}
        {view === 'settings' && <SettingsView settings={settings} models={models} connectionStatus={connectionStatus} onSettingsChange={updateSettings} onRefreshModels={() => void refreshModels({ baseUrl: settings.baseUrl, apiKey: settings.apiKey })} onSaveBaseUrl={saveBaseUrl} onClearHistory={() => void clearSavedHistory()} onClearAll={() => void clearAllData()} />}
      </main>

      <footer className="app-footer"><span><span className="footer-dot" /> No SayElse account</span><span>Text stays in your Chrome profile until you delete it</span></footer>
    </div>
  );
}
