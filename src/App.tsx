import { useEffect, useState, useRef, lazy, Suspense, FormEvent } from 'react';
import { Layout } from './components/Layout';
import { CommandBar } from './components/CommandBar';
import { DataStrip } from './components/DataStrip';
import { ActivityFeed } from './components/ActivityFeed';
import { useCarbonIntelligence } from './layers/ai/useCarbonIntelligence';
import { ErrorBoundary } from './components/ErrorBoundary';
import { parseNoaaText, FALLBACK_PPM } from './utils/parseNoaa';
import init, { carbon_calc } from '../pkg/carbon_engine';
import type { HistoryEntry, SupplyChainNode } from './types';
import './index.css';

const Scope3Graph = lazy(() => import('./layers/ui/Scope3Graph').then(m => ({ default: m.Scope3Graph })));
const AttributionPanel = lazy(() => import('./components/AttributionPanel').then(m => ({ default: m.AttributionPanel })));

function App() {
  const [supplyChainData, setSupplyChainData] = useState<SupplyChainNode[]>([]);
  const [apiKey, setApiKey] = useState(
    sessionStorage.getItem('ecotrack_api_key') || ''
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() => JSON.parse(localStorage.getItem('carbon_history') || '[]'));
  const [narrative, setNarrative] = useState('');
  const [noaaPpm, setNoaaPpm] = useState<number | undefined>(undefined);
  const [inputText, setInputText] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [wasmReady, setWasmReady] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const narrativeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { parseActivity, getAttributionNarrative, isProcessing } = useCarbonIntelligence(apiKey);
  const getAttributionNarrativeRef = useRef(getAttributionNarrative);
  useEffect(() => { getAttributionNarrativeRef.current = getAttributionNarrative; }, [getAttributionNarrative]);

  useEffect(() => {
    // Initialize WASM once on mount
    init().then(() => setWasmReady(true)).catch((err) => setSubmitError('WASM init failed: ' + err.message));

    // Load Supply Chain JSON
    fetch('/supply-chain.json')
      .then(res => res.json())
      .then((data: SupplyChainNode[]) => setSupplyChainData(data))
      .catch((err) => setSubmitError('Failed to load supply chain data: ' + err.message));

    // NOAA fetch with actual response parsing
    const fetchNoaa = async () => {
      try {
        const cached = sessionStorage.getItem('noaa_ppm');
        if (cached) {
          setNoaaPpm(parseFloat(cached));
          return;
        }
        const res = await fetch('https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_trend_gl.txt');
        if (res.ok) {
          const text = await res.text();
          const ppmValue = parseNoaaText(text);
          sessionStorage.setItem('noaa_ppm', ppmValue.toString());
          setNoaaPpm(ppmValue);
        }
      } catch {
        setNoaaPpm(FALLBACK_PPM);
      }
    };
    fetchNoaa();
  }, []);

  // Persist history and debounce narrative generation (2s)
  useEffect(() => {
    localStorage.setItem('carbon_history', JSON.stringify(history));
    
    if (narrativeTimer.current) clearTimeout(narrativeTimer.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    if (history.length > 0 && apiKey) {
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      narrativeTimer.current = setTimeout(() => {
        getAttributionNarrativeRef.current(history.slice(0, 10), signal)
          .then(setNarrative)
          .catch(err => {
            if (err.name !== 'AbortError') setSubmitError('Failed to fetch narrative: ' + err.message);
          });
      }, 2000);
    }
    return () => { 
      if (narrativeTimer.current) clearTimeout(narrativeTimer.current); 
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [history, apiKey]);

  const handleSubmitActivity = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!inputText.trim()) {
      return;
    }
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }
    if (!wasmReady) {
      setSubmitError('WASM engine not ready yet. Please wait a moment.');
      return;
    }
    
    try {
      const parsed = await parseActivity(inputText);
      const payload = JSON.stringify({ category: parsed.category, quantity: parsed.quantity });
      const co2_kg = carbon_calc(payload);
      
      if (co2_kg === -1) throw new Error("WASM calculation failed");

      const entry: HistoryEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        activity: parsed.activity,
        category: parsed.category,
        quantity: parsed.quantity,
        unit: parsed.unit,
        co2_kg: Number(co2_kg.toFixed(2))
      };
      setHistory(prev => [entry, ...prev]);
      setInputText('');
    } catch (err: unknown) {

      setSubmitError(err instanceof Error ? err.message : 'Failed to process activity. Check your API key.');
    }
  };

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    sessionStorage.setItem('ecotrack_api_key', key);
    setShowKeyModal(false);
  };

  const loadDemoData = () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    setHistory([
      { id: Date.now() + 1, date: today, activity: 'Drove 20 miles to work', category: 'transport', quantity: 32.18, unit: 'km', co2_kg: 8.4 },
      { id: Date.now() + 2, date: today, activity: 'Ate a beef burger for lunch', category: 'food', quantity: 1, unit: 'meal', co2_kg: 4.2 },
      { id: Date.now() + 3, date: yesterday, activity: 'Ran the AC all day', category: 'energy', quantity: 15, unit: 'kWh', co2_kg: 6.5 }
    ]);
    setShowKeyModal(false);
  };

  return (
    <>
      <Layout
        commandBar={
          <ErrorBoundary>
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <CommandBar 
                inputText={inputText}
                setInputText={setInputText}
                onSubmit={handleSubmitActivity}
                isProcessing={isProcessing}
                noaaPpm={noaaPpm}
              />
            {submitError && (
              <div style={{ 
                background: 'rgba(239,68,68,0.1)', 
                borderBottom: '1px solid var(--danger-color)',
                color: 'var(--danger-color)',
                padding: '8px 24px',
                fontSize: '0.85rem',
                textAlign: 'center'
              }}>
                {submitError}
              </div>
            )}
          </div>
          </ErrorBoundary>
        }
        dataStrip={<DataStrip history={history} noaaPpm={noaaPpm} />}
        intelligencePanelLeft={
          <ErrorBoundary>
            <Suspense fallback={
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading graph...
              </div>
            }>
              {supplyChainData.length > 0 ? (
                <Scope3Graph data={supplyChainData} />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading graph data...
                </div>
              )}
            </Suspense>
          </ErrorBoundary>
        }
        intelligencePanelRight={
          <>
            <ErrorBoundary>
              <ActivityFeed history={history} />
            </ErrorBoundary>
            <ErrorBoundary>
              <Suspense fallback={
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading insights...
                </div>
              }>
                <AttributionPanel history={history} narrative={narrative} />
              </Suspense>
            </ErrorBoundary>
          </>
        }
      />

      {/* In-app API key modal — replaces native prompt() */}
      {showKeyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="api-key-modal-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowKeyModal(false);
            // Focus trap: keep Tab within modal
            if (e.key === 'Tab') {
              const modal = e.currentTarget;
              const focusable = modal.querySelectorAll<HTMLElement>(
                'input, button, [tabindex]:not([tabindex="-1"])'
              );
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div style={{
            background: 'var(--surface-color)', 
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-lg, 12px)', 
            padding: '32px', 
            maxWidth: '420px', 
            width: '90%'
          }}>
            <h2 id="api-key-modal-title" className="text-section-header" style={{ margin: '0' }}>
              OpenRouter API Key
            </h2>
            <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '16px' }}>
              Enter your OpenRouter API key to enable AI-powered activity parsing.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).elements.namedItem('key') as HTMLInputElement;
              if (input.value.trim()) handleSaveKey(input.value.trim());
            }}>
              <label htmlFor="api-key-input" className="sr-only">API Key</label>
              <input
                id="api-key-input"
                name="key"
                type="password"
                placeholder="sk-or-v1-..."
                autoFocus
                style={{
                  width: '100%', 
                  padding: '12px', 
                  background: 'var(--bg-color)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.9rem'
                }}
              />
              
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
                Don't have a key? Get a free one at{' '}
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-color)', textDecoration: 'none' }}
                >
                  openrouter.ai
                </a>{' '}
                in under a minute — no credit card required.
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <button type="button" onClick={loadDemoData} style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', marginRight: 'auto', textDecoration: 'underline'
                }}>
                  Skip — load sample data
                </button>
                <button type="button" onClick={() => setShowKeyModal(false)} style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)',
                  borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer'
                }}>
                  Cancel
                </button>
                <button type="submit" style={{
                  padding: '8px 16px', background: 'var(--accent-color)', border: 'none',
                  borderRadius: '8px', color: '#000', cursor: 'pointer', fontWeight: 600
                }}>
                  Save Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
