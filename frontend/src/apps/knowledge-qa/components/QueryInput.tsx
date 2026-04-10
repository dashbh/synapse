'use client';

import { useCallback } from 'react';

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  disabled?: boolean;
}

export function QueryInput({ value, onChange, onSubmit, disabled = false }: QueryInputProps) {
  const handleSubmit = useCallback(() => {
    const query = value.trim();
    if (!query || disabled) return;
    onSubmit(query);
  }, [value, disabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask anything about your knowledge base…"
        rows={2}
        autoFocus
        className={[
          'w-full resize-none rounded-2xl border-0 bg-white px-5 py-4 pr-24 text-sm text-[var(--color-neutral-900)]',
          'placeholder:text-[var(--color-neutral-400)] leading-relaxed',
          'drop-shadow-sm ring-1 ring-slate-200',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)]/70 focus:drop-shadow-none focus:shadow-[var(--shadow-glow-primary-lg)]',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'transition-all duration-200',
        ].join(' ')}
      />

      {/* Submit button — inset inside the textarea */}
      <div className="absolute right-3 bottom-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={[
            'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150',
            disabled || !value.trim()
              ? 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-400)] cursor-not-allowed'
              : 'bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-500)] text-white shadow-sm hover:shadow-[var(--shadow-glow-primary-md)] hover:from-[var(--color-primary-500)] active:scale-95',
          ].join(' ')}
        >
          {disabled ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Thinking</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6h8M6 2l4 4-4 4" />
              </svg>
              <span>Ask</span>
            </>
          )}
        </button>
      </div>

      <p className="absolute left-5 bottom-3.5 text-[10px] text-[var(--color-neutral-400)] pointer-events-none">
        ⌘↵
      </p>
    </div>
  );
}
