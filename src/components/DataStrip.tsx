import React, { useMemo } from 'react';
import type { HistoryEntry } from '../types';

export const DataStrip: React.FC<{ history: HistoryEntry[]; noaaPpm?: number }> = ({
  history,
  noaaPpm,
}) => {
  const totalEmissions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0] || '';
    return history
      .filter(item => item.date.startsWith(today))
      .reduce((sum, item) => sum + item.co2_kg, 0)
      .toFixed(1);
  }, [history]);

  const weekDelta = useMemo(() => {
    if (history.length === 0) return 0;

    const getWeekKey = (isoDate: string | Date) => {
      const d = new Date(isoDate);
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${date.getUTCFullYear()}-W${weekNo}`;
    };

    const now = new Date();
    const thisWeekKey = getWeekKey(now);
    
    // To get last week key reliably across year boundaries, subtract 7 days
    const lastWeekDate = new Date(now.getTime() - 7 * 86400000);
    const lastWeekKey = getWeekKey(lastWeekDate);

    const grouped = history.reduce((acc: Record<string, number>, entry) => {
      const key = getWeekKey(entry.date);
      acc[key] = (acc[key] || 0) + entry.co2_kg;
      return acc;
    }, {});

    const thisWeek = grouped[thisWeekKey] || 0;
    const lastWeek = grouped[lastWeekKey] || 0;

    if (lastWeek === 0 && history.length >= 2) {
      const avg =
        history.slice(1).reduce((s, e) => s + e.co2_kg, 0) /
        (history.length - 1);
      return Number(((history[0]?.co2_kg || 0) - avg).toFixed(1));
    }

    return Number((thisWeek - lastWeek).toFixed(1));
  }, [history]);

  const topSource = useMemo(() => {
    if (history.length === 0) return 'None';
    const totals = history.reduce((acc: Record<string, number>, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.co2_kg;
      return acc;
    }, {});
    return Object.entries(totals).sort(
      (a: [string, number], b: [string, number]) => b[1] - a[1]
    )[0]?.[0] || 'None';
  }, [history]);

  const deltaColor =
    weekDelta > 0
      ? 'var(--danger-color)'
      : weekDelta < 0
      ? 'var(--accent-color)'
      : 'var(--text-secondary)';

  const deltaPrefix = weekDelta > 0 ? '+' : '';
  const noaaText = noaaPpm ? noaaPpm.toFixed(2) : '421.08';

  return (
    <>
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
      >
        Today's footprint is {totalEmissions} kg CO2. Week delta is {deltaPrefix}{weekDelta} kg. Top emission source is {topSource}. Global CO2 is {noaaText} PPM.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          background: 'var(--border-color)',
        }}
        aria-hidden="true"
      >
        <div style={{ background: 'var(--surface-color)', padding: '24px' }}>
          <div className="text-caption" style={{ marginBottom: '16px' }}>
            Today's Footprint
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {totalEmissions}
            </span>
            <span className="text-body" style={{ color: 'var(--text-secondary)' }}>
              kg CO₂e
            </span>
          </div>
        </div>

        <div style={{ background: 'var(--surface-color)', padding: '24px' }}>
          <div className="text-caption" style={{ marginBottom: '16px' }}>
            Week Delta
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: deltaColor,
              }}
            >
              {weekDelta === 0 ? '0.0' : `${deltaPrefix}${weekDelta}`}
            </span>
            <span className="text-body" style={{ color: 'var(--text-secondary)' }}>
              kg
            </span>
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              opacity: 0.7,
            }}
          >
            vs last week
          </div>
        </div>

        <div style={{ background: 'var(--surface-color)', padding: '24px' }}>
          <div className="text-caption" style={{ marginBottom: '16px' }}>
            Top Emission Source
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              textTransform: 'capitalize',
            }}
          >
            {topSource}
          </div>
        </div>

        <div style={{ background: 'var(--surface-color)', padding: '24px' }}>
          <div className="text-caption" style={{ marginBottom: '16px' }}>
            Global CO₂ PPM
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--danger-color)',
            }}
          >
            {noaaText}
          </div>
        </div>
      </div>
    </>
  );
};
