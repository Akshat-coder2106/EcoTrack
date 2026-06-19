const FALLBACK_PPM = 421.08;

/**
 * Parse NOAA CO2 trend text data and extract the most recent PPM value.
 * 
 * The NOAA co2_trend_gl.txt format has comment lines starting with '#'
 * and data lines with columns: year month day cycle trend
 * Example: "  2026     6     8   429.11   427.75"
 * 
 * We extract column 4 (cycle) as the primary PPM reading.
 */
export function parseNoaaText(rawText: string): number {
  const lines = rawText.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  if (lines.length === 0) return FALLBACK_PPM;

  const lastLine = lines[lines.length - 1];
  if (!lastLine) return FALLBACK_PPM;
  const parts = lastLine.trim().split(/\s+/);

  // parts: [year, month, day, cycle, trend]
  const cycle = parts[3] || '';
  const trend = parts[4] || '';
  const ppmValue = parseFloat(cycle) || parseFloat(trend);
  
  if (!isNaN(ppmValue) && ppmValue >= 380 && ppmValue <= 450) {
    return ppmValue;
  }

  return FALLBACK_PPM;
}

export { FALLBACK_PPM };
