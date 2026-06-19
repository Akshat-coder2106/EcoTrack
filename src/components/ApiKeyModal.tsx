import { FormEvent } from 'react';

interface ApiKeyModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  onDemoData: () => void;
}

export const ApiKeyModal = ({ show, onClose, onSave, onDemoData }: ApiKeyModalProps) => {
  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-modal-title"
      className="modal-overlay"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
        // Focus trap: keep Tab within modal
        if (e.key === 'Tab') {
          const modal = e.currentTarget;
          const focusable = modal.querySelectorAll<HTMLElement>(
            'input, button, [tabindex]:not([tabindex="-1"])'
          );
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className="modal-content">
        <h2 id="api-key-modal-title" className="text-section-header modal-heading">
          OpenRouter API Key
        </h2>
        <p className="text-body modal-description">
          Enter your OpenRouter API key to enable AI-powered activity parsing.
        </p>
        <form onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const input = (e.target as HTMLFormElement).elements.namedItem('key') as HTMLInputElement;
          if (input.value.trim()) onSave(input.value.trim());
        }}>
          <label htmlFor="api-key-input" className="sr-only">API Key</label>
          <input
            id="api-key-input"
            name="key"
            type="password"
            placeholder="sk-or-v1-..."
            autoFocus
            className="modal-input"
          />
          
          <p className="modal-key-hint">
            Don't have a key? Get a free one at{' '}
            <a 
              href="https://openrouter.ai/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="modal-key-link"
            >
              openrouter.ai
            </a>{' '}
            in under a minute — no credit card required.
          </p>

          <div className="modal-footer">
            <button type="button" onClick={onDemoData} className="btn-text modal-demo-btn">
              Skip — load sample data
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
