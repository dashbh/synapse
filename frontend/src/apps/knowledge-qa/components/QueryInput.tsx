'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
}

export function QueryInput({ onSubmit, disabled = false }: QueryInputProps) {
  const [value, setValue] = useState('');

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
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask a question about your knowledge base..."
        rows={3}
        autoFocus
        className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">⌘↵ to submit</p>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
        >
          {disabled ? 'Thinking…' : 'Ask'}
        </Button>
      </div>
    </div>
  );
}
