import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import type { HistoryEntry } from '../types';
import { renderHook } from '@testing-library/react';
import { useCarbonIntelligence } from '../layers/ai/useCarbonIntelligence';
import { DataStrip } from '../components/DataStrip';

// Mock the components that rely on ResizeObserver or D3
vi.mock('../layers/ui/Scope3Graph', () => ({
  Scope3Graph: () => <div data-testid="mock-scope3-graph">Graph</div>
}));
vi.mock('../layers/ui/CO2Clock', () => ({
  CO2Clock: () => <div data-testid="mock-co2-clock">Clock</div>
}));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: () => <div data-testid="mock-barchart">BarChart</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Cell: () => null,
  LabelList: () => null
}));

// Mock the WASM module
vi.mock('../../pkg/carbon_engine', () => ({
  __esModule: true,
  default: () => Promise.resolve(true),
  carbon_calc: vi.fn().mockReturnValue(7.6)
}));

describe('Core Pipeline Tests', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((key) => key === 'ecotrack_api_key' ? 'test-key' : null),
        setItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });
    
    // Mock fetch globally to return a valid NLPParsedResult JSON
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('openrouter.ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: '{"category":"transport","quantity":40,"unit":"km","confidence":0.9,"activity":"drove"}' } }]
          })
        });
      }
      if (url.includes('supply-chain.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url.includes('gml.noaa.gov')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('# comment line\n  2026     6     8   429.11   427.75\n')
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }));
  });

  // TEST 1 - Activity submission pipeline
  it('submits an activity and asserts history updates', async () => {
    render(<App />);

    // type "I drove 40km" into the CommandBar input
    const input = screen.getByPlaceholderText(/I drove/i);
    await userEvent.type(input, 'I drove 40km');
    
    // wait a tick for WASM mock to resolve its init() promise
    await new Promise(resolve => setTimeout(resolve, 0));

    // submit the form
    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    await userEvent.click(submitBtn);

    // assert that the ActivityFeed renders an entry containing "drove" and "+7.6 kg"
    await waitFor(() => {
      expect(screen.queryByText(/WASM engine not ready yet/i)).toBeNull();
      expect(screen.getByText('drove')).toBeTruthy();
      expect(screen.getByText('+7.6 kg')).toBeTruthy();
    });
  });

  // TEST 2 - DataStrip today filter
  it('filters DataStrip to only sum todays entries', () => {
    // Import the weekDelta calculation logic and assert that entries 
    // from last week are NOT included in "Today's Footprint" total.
    // We can test this by rendering the DataStrip component directly
    
    
    const today = new Date().toISOString();
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
    
    const mockHistory: HistoryEntry[] = [
      { id: 1, date: today, activity: 'drove', category: 'transport' as const, quantity: 10, unit: 'km', co2_kg: 5.0 },
      { id: 2, date: lastWeek, activity: 'drove', category: 'transport' as const, quantity: 10, unit: 'km', co2_kg: 10.0 }
    ];

    render(<DataStrip history={mockHistory} noaaPpm={420.00} />);
    
    // Only today's entry (5.0) should be summed. If it summed both, it would be 15.0
    expect(screen.getByText('5.0')).toBeTruthy();
  });

  // TEST 3 - useCarbonIntelligence parseActivity
  it('parses activity correctly and throws on 401', async () => {
    // Call parseActivity("I ate a burger") with a mocked fetch that 
    // returns { category: "food", quantity: 1, unit: "meal", confidence: 0.9, activity: "ate a burger" }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{"category":"food","quantity":1,"unit":"meal","confidence":0.9,"activity":"ate a burger"}' } }]
      })
    }));

    const { result } = renderHook(() => useCarbonIntelligence('test-key'));
    const parsed = await result.current.parseActivity('I ate a burger');
    
    // Assert the returned object matches the expected schema exactly
    expect(parsed).toEqual({
      category: 'food',
      quantity: 1,
      unit: 'meal',
      confidence: 0.9,
      activity: 'ate a burger'
    });

    // Assert that if fetch returns a 401 status, the function throws an error
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized')
    }));

    await expect(result.current.parseActivity('I ate a burger')).rejects.toThrow();
  });

  // TEST 4 - API key modal
  it('displays API key modal when no key is present', async () => {
    // Render <App /> with no key in sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });
    
    render(<App />);

    // Try to submit without a key
    const commandInput = screen.getByPlaceholderText(/I drove 40km/i);
    await userEvent.type(commandInput, 'test activity');
    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    await userEvent.click(submitBtn);

    // Assert the API key modal is visible
    expect(await screen.findByText('OpenRouter API Key')).toBeTruthy();

    // Type a key into the input and click "Save Key"
    const input = screen.getByPlaceholderText('sk-or-v1-...');
    await userEvent.type(input, 'new-api-key');
    
    const saveBtn = screen.getByRole('button', { name: /Save Key/i });
    await userEvent.click(saveBtn);

    // Assert the modal disappears
    await waitFor(() => {
      expect(screen.queryByText('OpenRouter API Key')).toBeNull();
    });

    // Assert sessionStorage contains the key
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith('ecotrack_api_key', 'new-api-key');
  });
});
