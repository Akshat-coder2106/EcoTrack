import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CO2Clock } from '../layers/ui/CO2Clock';

interface CommandBarProps {
  inputText: string;
  setInputText: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  noaaPpm?: number;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  inputText,
  setInputText,
  onSubmit,
  isProcessing,
  noaaPpm,
}) => {
  // FIX: use React state for hint visibility — more reliable than CSS sibling selector
  const [showHint, setShowHint] = useState(false);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px',
        width: '100%',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 24px',
        gap: '24px',
      }}
    >
      {/* LEFT: Logo & Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          minWidth: '200px',
        }}
      >
        <h1 className="text-section-header" style={{ margin: 0 }}>
          EcoTrack
        </h1>
        <span
          style={{
            color: 'var(--accent-color)',
            fontSize: '0.75rem',
            border: '1px solid var(--accent-color)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          WASM ENGINE ACTIVE
        </span>
      </div>

      {/* CENTER: Hero NL Input */}
      <form
        onSubmit={onSubmit}
        style={{
          flex: 1,
          maxWidth: '480px',
          display: 'flex',
          position: 'relative',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSubmit(e as unknown as React.FormEvent);
              }
            }}
            onFocus={() => setShowHint(true)}
            onBlur={() => setShowHint(false)}
            placeholder={
              isProcessing
                ? 'Claude is thinking...'
                : 'I drove 40km to work today...'
            }
            disabled={isProcessing}
            className={`interactive-element ${
              isProcessing ? 'animate-sweep-border' : ''
            }`}
            style={{
              width: '100%',
              height: '48px',
              padding: '0 48px 0 16px',
              background: 'var(--bg-color)',
              border: isProcessing
                ? '2px solid transparent'
                : '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              opacity: isProcessing ? 0.6 : 1,
            }}
          />
          {isProcessing && (
            <div
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--accent-color)',
              }}
            >
              <Loader2 className="animate-spin" size={20} />
            </div>
          )}

          {/* Visually hidden submit button for accessibility */}
          <button type="submit" className="sr-only">
            Submit
          </button>

          {/* FIX: React-controlled hint — reliable across all browsers */}
          <div
            style={{
              position: 'absolute',
              bottom: '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              opacity: showHint ? 1 : 0,
              transition: 'opacity 0.2s ease',
              pointerEvents: 'none',
            }}
          >
            Tip: Be specific — 'I drove 40km' works better than 'gym'
          </div>
        </div>
      </form>

      {/* RIGHT: CO2 Clock */}
      <div
        style={{
          minWidth: '200px',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <CO2Clock initialPpm={noaaPpm} compact />
      </div>
    </header>
  );
};
