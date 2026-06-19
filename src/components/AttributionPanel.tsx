import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { HistoryEntry } from '../types';
import { CATEGORY_COLORS } from '../constants/categoryColors';
import { evaluateProgress } from '../layers/ai/useCarbonIntelligence';
import { CategoryIcon } from './CategoryIcon';

interface AttributionPanelProps {
  history: HistoryEntry[];
  narrative: string;
}



export const AttributionPanel: React.FC<AttributionPanelProps> = ({ history, narrative }) => {
  const categoryBreakdown = useMemo(() => {
    const categoryTotals = history.reduce((acc: Record<string, number>, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.co2_kg;
      return acc;
    }, {});
    return Object.entries(categoryTotals).map(([category, total]) => ({ category, total }));
  }, [history]);

  const { score, verdict } = evaluateProgress(history);
  const arcStrokeDasharray = `${(score / 100) * 283} 283`;

  let scoreColor = 'var(--border-color)';
  if (history.length > 0) {
    if (score <= 40) { scoreColor = 'var(--danger-color)'; }
    else if (score <= 70) { scoreColor = '#f59e0b'; }
    else { scoreColor = 'var(--accent-color)'; }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts tick props lack a stable exported type
  const renderCustomYAxisTick = (props: Record<string, any>) => {
    const { x, y, payload } = props as { x: number; y: number; payload: { value: string } };
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={-20} y={4} dy={0} textAnchor="end" fill="var(--text-secondary)" fontSize={11} style={{ textTransform: 'capitalize' }}>
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
      <h3 className="text-section-header">Carbon Intelligence</h3>

      {/* Top Source Bar Chart */}
      {history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            Emissions by Category
          </div>
          <div style={{ minHeight: '140px', height: Math.max(140, categoryBreakdown.length * 40), width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={categoryBreakdown} 
                layout="vertical"
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
              >
                <defs>
                  <pattern id="pattern-transport" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="8" height="8" fill={CATEGORY_COLORS['transport']} />
                    <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
                  </pattern>
                  <pattern id="pattern-food" width="8" height="8" patternUnits="userSpaceOnUse">
                    <rect width="8" height="8" fill={CATEGORY_COLORS['food']} />
                    <circle cx="4" cy="4" r="2" fill="rgba(255,255,255,0.3)" />
                  </pattern>
                  <pattern id="pattern-energy" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="8" height="8" fill={CATEGORY_COLORS['energy']} />
                    <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
                    <line x1="4" y1="0" x2="4" y2="8" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  </pattern>
                  <pattern id="pattern-goods" width="8" height="8" patternUnits="userSpaceOnUse">
                    <rect width="8" height="8" fill={CATEGORY_COLORS['goods']} />
                    <path d="M0,0 L8,8 M8,0 L0,8" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  </pattern>
                </defs>
                <XAxis 
                  type="number" 
                  hide={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickFormatter={(v) => `${v.toFixed(1)}kg`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="category"
                  tick={renderCustomYAxisTick}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-primary)'
                  }}
                  itemStyle={{ color: 'var(--text-secondary)' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts Formatter generic is overly broad
                  formatter={(value: any) => [`${Number(value).toFixed(2)} kg CO₂`, 'Emissions']}
                />
                <Bar 
                  dataKey="total" 
                  radius={[0, 4, 4, 0]}
                  label={{ 
                    position: 'right', 
                    fill: 'var(--text-secondary)', 
                    fontSize: 11,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts LabelFormatter type mismatch
                    formatter: (v: any) => `${Number(v).toFixed(1)}kg`
                  }}
                >
                  <LabelList dataKey="category" position="insideLeft" 
                    style={{ fill: 'var(--text-primary)', fontSize: 11, textTransform: 'capitalize' }} 
                  />
                  {categoryBreakdown.map((entry, index) => {
                    const patternId = `url(#pattern-${entry.category})`;
                    return (
                      <Cell 
                        key={index} 
                        fill={['transport', 'food', 'energy', 'goods'].includes(entry.category) ? patternId : (CATEGORY_COLORS[entry.category] || '#14b8a6')} 
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
            {categoryBreakdown.map(entry => (
              <div key={entry.category} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: CATEGORY_COLORS[entry.category] || '#14b8a6', display: 'flex' }}>
                  <CategoryIcon category={entry.category} size={12} />
                </span>
                <span style={{ textTransform: 'capitalize' }}>{entry.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counterfactual Box */}
      {narrative && (
        <div style={{ 
          borderLeft: '4px solid var(--accent-color)', 
          background: 'rgba(16, 185, 129, 0.05)', 
          padding: '16px',
          fontStyle: 'italic',
          color: 'var(--text-primary)',
          lineHeight: 1.6
        }}>
          {narrative}
        </div>
      )}

      {/* Circular Progress Indicator */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', alignSelf: 'center', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', width: '64px', height: '64px' }} role="meter" aria-valuenow={history.length > 0 ? Math.round(score) : 0} aria-valuemin={0} aria-valuemax={100} aria-label="Weekly sustainability score">
            <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="45" fill="transparent" stroke="var(--border-color)" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="45" 
                fill="transparent" 
                stroke={scoreColor} 
                strokeWidth="8" 
                strokeDasharray={history.length > 0 ? arcStrokeDasharray : "0 283"}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
              />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
              {history.length > 0 ? Math.round(score) : "—"}
            </div>
          </div>
          <div className="text-caption">Weekly Score</div>
        </div>
        {history.length > 0 && (
          <div style={{ fontSize: '0.85rem', color: scoreColor, fontWeight: 500 }}>
            {verdict}
          </div>
        )}
      </div>
    </div>
  );
};
