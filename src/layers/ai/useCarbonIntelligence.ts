import { useState } from 'react';
import type { HistoryEntry } from '../../types';

const VALID_CATEGORIES = ['transport', 'food', 'energy', 'goods'] as const;
type Category = typeof VALID_CATEGORIES[number];

export interface NLPParsedResult {
  activity: string;
  category: Category;
  quantity: number;
  unit: string;
  confidence: number;
  clarification_needed?: boolean;
}

function validateParsedResult(raw: unknown): NLPParsedResult {
  if (!raw || typeof raw !== 'object') throw new Error('AI returned non-object');
  const obj = raw as Record<string, unknown>;
  if (!VALID_CATEGORIES.includes(obj.category as Category)) throw new Error(`Invalid category: "${String(obj.category)}". Expected: ${VALID_CATEGORIES.join(', ')}`);
  if (typeof obj.quantity !== 'number' || obj.quantity < 0) throw new Error(`Invalid quantity: ${String(obj.quantity)}`);
  if (typeof obj.activity !== 'string' || !obj.activity.trim()) throw new Error('Missing activity name');
  if (typeof obj.unit !== 'string') throw new Error('Missing unit');
  return obj as unknown as NLPParsedResult;
}

/**
 * Evaluate user's carbon reduction progress. Returns 0-100 score.
 *
 * Scoring weights:
 * - 60% improvement delta: did the latest entry improve vs prior? (reward trending down)
 * - 30% consistency: more logged entries = more engaged user (capped at 100 by clamp)
 * - 10% goal proximity: baseline offset (50 = neutral starting point)
 *
 * Score is clamped to [0, 100] and starts at 50 (neutral).
 */
export const evaluateProgress = (history: HistoryEntry[]) => {
  if (!history || history.length === 0) {
    return { score: 0, verdict: '' };
  }

  const WEIGHT_DELTA = 0.6;
  const WEIGHT_CONSISTENCY = 0.3;
  const WEIGHT_GOAL = 0.1;
  const NEUTRAL_BASELINE = 50;

  const currentDelta = history.length > 1 ? ((history[0]?.co2_kg || 0) - (history[1]?.co2_kg || 0)) * -1 : 0;
  const consistency = history.length * 10;
  const goalProx = 50;
  const reward = (currentDelta * WEIGHT_DELTA) + (consistency * WEIGHT_CONSISTENCY) + (goalProx * WEIGHT_GOAL);
  const score = Math.max(0, Math.min(100, NEUTRAL_BASELINE + reward));
  
  let verdict = 'Excellent';
  if (score <= 40) verdict = 'Needs work';
  else if (score <= 70) verdict = 'Getting better';
  else if (score <= 90) verdict = 'On track';
  
  return { score, verdict };
};

/**
 * Custom React hook managing all AI-driven carbon tracking features.
 * Connects to OpenRouter to parse NLP activity inputs and generate
 * personalized reduction narratives.
 * 
 * @param apiKey - OpenRouter API key for authentication
 * @returns Object containing parsing/narrative functions and state flags
 */
export const useCarbonIntelligence = (apiKey: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Parses free-text activity strings into structured carbon data.
   * Uses Anthropic Claude 3 Haiku via OpenRouter.
   * 
   * @param text - The raw activity text (e.g. "I drove 20 miles")
   * @returns A promise resolving to the structured NLPParsedResult
   * @throws Error if the API call fails or parsing is invalid
   */
  const parseActivity = async (text: string): Promise<NLPParsedResult> => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            { 
              role: 'system', 
              content: `Strict NLP parser. Output raw JSON ONLY without markdown blocks. Schema: { "activity": "string", "category": "transport"|"food"|"energy"|"goods", "quantity": number, "unit": "string", "confidence": number }. If confidence < 0.7, add "clarification_needed": true. Example input: "I drove 40km". Output: { "activity": "drove", "category": "transport", "quantity": 40, "unit": "km", "confidence": 0.95 }`
            },
            { role: 'user', content: text }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API returned ${response.status}: ${errText}`);
      }

      const data = await response.json();
      let rawText = data.choices[0].message.content;
      
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```\s*$/, '');
      }

      const parsed = JSON.parse(rawText);
      return validateParsedResult(parsed);
    } catch (err) {
      setError("Failed to parse your activity. Please try rephrasing.");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Analyzes recent carbon history to generate a single actionable insight.
   * Recommends counterfactual scenarios (e.g., "If you had... you would have saved...")
   * 
   * @param history - Array of recent user activities
   * @param signal - Optional AbortSignal for request cancellation
   * @returns A promise resolving to the generated narrative string
   */
  const getAttributionNarrative = async (history: HistoryEntry[], signal?: AbortSignal) => {
    if (!history || history.length === 0) return "Not enough data yet.";
    
    try {
      const historyStr = JSON.stringify(history);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            { 
              role: 'system', 
              content: `You are an Attribution Engine. Identify the top emission source from the user's history and generate exactly ONE counterfactual insight in this format: "If you had [alternative], you would have saved [X] kg". Do not add any conversational text.`
            },
            { role: 'user', content: `Here is the user's history: ${historyStr}` }
          ]
        }),
        signal
      });

      if (!response.ok) {
        return "Track more activities to unlock personalized insights.";
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      return "If you track your habits consistently, you'll discover massive savings opportunities.";
    }
  };

  return { parseActivity, getAttributionNarrative, isProcessing, error };
};
