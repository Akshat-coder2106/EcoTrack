import React from 'react';
import type { HistoryEntry } from '../types';
import { CATEGORY_COLORS } from '../constants/categoryColors';
import { CategoryIcon } from './CategoryIcon';

export const ActivityFeed: React.FC<{ history: HistoryEntry[] }> = ({ history }) => {
  const recent = history.slice(0, 5);

  if (!recent.length) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Log your first activity above ↑
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} role="list">
      <h3 className="text-section-header" style={{ marginBottom: '8px' }}>Recent Activity</h3>
      {recent.map((entry, idx) => (
        <div 
          key={entry.id} 
          role="listitem"
          aria-label={`${entry.activity}, ${entry.co2_kg} kg CO2, ${entry.category}`}
          className={idx === 0 ? "animate-slide-in" : ""}
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '16px',
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="text-body" style={{ color: 'var(--text-primary)' }}>{entry.activity}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {entry.quantity && entry.quantity > 0 ? `${entry.quantity} ${entry.unit}` : <i style={{ color: 'var(--text-secondary)' }}>quantity unknown</i>}
            </span>
            <div 
              className="text-caption" 
              style={{ 
                color: CATEGORY_COLORS[entry.category] || 'var(--text-secondary)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <CategoryIcon category={entry.category} />
              <span>{entry.category}</span>
            </div>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--danger-color)' }}>
            +{entry.co2_kg} kg
          </div>
        </div>
      ))}
    </div>
  );
};
