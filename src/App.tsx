import { useEffect, useState, useRef, lazy, Suspense, FormEvent } from 'react';
import { Layout } from './components/Layout';
import { CommandBar } from './components/CommandBar';
import { DataStrip } from './components/DataStrip';
import { ActivityFeed } from './components/ActivityFeed';
import { useCarbonIntelligence } from './layers/ai/useCarbonIntelligence';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ApiKeyModal } from './components/ApiKeyModal';
import { parseNoaaText, FALLBACK_PPM } from './utils/parseNoaa';
import { getDemoData } from './constants/demoData';
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
    setHistory(getDemoData());
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

      <ApiKeyModal
        show={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onSave={handleSaveKey}
        onDemoData={loadDemoData}
      />
    </>
  );
}

export default App;
