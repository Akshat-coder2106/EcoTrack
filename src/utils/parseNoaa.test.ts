import { describe, it, expect } from 'vitest';
import { parseNoaaText, FALLBACK_PPM } from './parseNoaa';

describe('parseNoaaText', () => {
  it('parses valid NOAA text format correctly', () => {
    const rawText = `# comment line\n  2026     6     8   429.11   427.75\n`;
    expect(parseNoaaText(rawText)).toBe(429.11);
  });

  it('falls back to column 4 if column 3 is invalid/missing', () => {
    const rawText = `  2026     6     8   NaN   427.75`;
    expect(parseNoaaText(rawText)).toBe(427.75);
  });

  it('returns FALLBACK_PPM if values are out of bounds (too low)', () => {
    const rawText = `  2026     6     8   300.00   300.00`;
    expect(parseNoaaText(rawText)).toBe(FALLBACK_PPM);
  });

  it('returns FALLBACK_PPM if values are out of bounds (too high)', () => {
    const rawText = `  2026     6     8   500.00   500.00`;
    expect(parseNoaaText(rawText)).toBe(FALLBACK_PPM);
  });

  it('returns FALLBACK_PPM if text is empty', () => {
    expect(parseNoaaText('')).toBe(FALLBACK_PPM);
  });

  it('returns FALLBACK_PPM if text only contains comments', () => {
    const rawText = `# Just a comment\n# Another comment\n`;
    expect(parseNoaaText(rawText)).toBe(FALLBACK_PPM);
  });
});
