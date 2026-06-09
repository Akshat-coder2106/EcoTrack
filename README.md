# EcoTrack: Carbon Footprint Awareness Platform

**PromptWars Hackathon — Challenge 3 Submission**

EcoTrack is a serverless Carbon Footprint Awareness Platform built with a **3-Layer Architecture**: React 19 UI, Claude AI (NLP parsing via OpenRouter), and Rust/WASM (deterministic calculation), with client-side data persistence.

## Architecture

```
User Input → Claude AI (NLP) → Rust WASM (Math) → React UI (Visualization)
```

### Layer 1: UI (React 19 + Vite + D3.js + Recharts)
- Live `requestAnimationFrame` CO₂ clock with NOAA baseline
- D3.js force-directed graph visualizing Scope 3 supply chain emissions with keyboard navigation
- Recharts bar charts with category breakdowns and SVG pattern fills for accessibility
- Dark-mode glassmorphism design system

### Layer 2: AI (Claude via OpenRouter)
- Natural language activity parsing → strict JSON schema extraction
- Counterfactual "Attribution Narratives" for behavioral guidance
- Input validation ensures only valid categories/quantities pass through
- Markdown fence stripping for robust LLM response parsing

### Layer 3: Engine (Rust → WebAssembly)
- Deterministic emission factor multiplication compiled to `.wasm` via `wasm-pack`
- Categories: transport (0.19 kg/km), food (2.5 kg/meal), energy (0.4 kg/kWh), goods (15.0 kg/item)
- Returns `-1.0` as error sentinel for graceful fallback

### Data Persistence (Client-Side)
- LocalStorage for activity history persistence
- SessionStorage for API key (cleared on tab close) and NOAA cache
- Service Worker with Workbox precaching for offline asset delivery

## Security

- API keys are collected via an accessible in-app modal (not `window.prompt()`)
- Keys are stored in `sessionStorage` only — never `localStorage` or disk
- No API keys are committed; `.env.example` provided as template
- Content Security Policy restricts `connect-src` to `openrouter.ai` and `gml.noaa.gov`
- LLM output is validated against a strict schema before use

## Getting Started

```bash
git clone <repo-url>
cd ecotrack
npm install
npm run dev                   # Opens at http://localhost:5173
```

**Note:** The WASM engine is pre-compiled in `pkg/`. No Rust toolchain required for the demo.  
On first use, enter your OpenRouter API key when prompted.

## Testing

```bash
npm test
```

Tests cover:
- Full activity submission pipeline (type → AI parse → WASM calc → UI render)
- DataStrip today-only filtering (verifies last week's entries are excluded)
- `useCarbonIntelligence` hook: successful parse + 401 error handling
- API key modal flow: display, input, save, sessionStorage verification
- `evaluateProgress` scoring: empty history, bounds clamping, improvement detection

## Known Limitations

- WASM engine handles 4 categories; real-world usage would need 50+
- Service Worker caches static assets only; API responses are excluded
- No user authentication — all data is local to the browser
- NOAA `.txt` endpoint is parsed manually; if the format changes, the parser falls back to a baseline value
- CSP uses `'unsafe-inline'` and `'unsafe-eval'` due to Vite's runtime requirements

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------| 
| UI | React 19, D3.js, Recharts, Lucide | Rendering & visualization |
| AI | Claude 3 Haiku via OpenRouter | NLP parsing & narratives |
| Engine | Rust, wasm-bindgen, serde | Deterministic math |
| Data | LocalStorage, SessionStorage, Service Worker | Persistence & offline |

## License

MIT
