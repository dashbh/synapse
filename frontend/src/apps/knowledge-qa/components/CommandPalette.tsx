'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, BookOpen, SquarePen, Search, X } from 'lucide-react';
import { useDrawer } from '../context/DrawerContext';

interface Action {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  shortcut?: string;
  run: (ctx: ReturnType<typeof useDrawer>, close: () => void) => void;
}

const ACTIONS: Action[] = [
  {
    id: 'upload',
    icon: Upload,
    label: 'Upload document',
    description: 'Add a PDF, DOCX, TXT, or MD to the knowledge base',
    shortcut: '↑D',
    run: (ctx, close) => { ctx.openDocuments(); close(); },
  },
  {
    id: 'sources',
    icon: BookOpen,
    label: 'View sources',
    description: 'Open the sources panel for the last query',
    run: (ctx, close) => { ctx.openSources(); close(); },
  },
  {
    id: 'new-chat',
    icon: SquarePen,
    label: 'New chat',
    description: 'Start a fresh session — clears history and all Q&A turns',
    shortcut: '⌘K',
    run: (ctx, close) => { close(); ctx.triggerNewChat(); },
  },
  {
    id: 'focus-input',
    icon: Search,
    label: 'Focus input',
    description: 'Jump to the query input',
    shortcut: '/',
    run: (_ctx, close) => {
      close();
      setTimeout(() => {
        (document.querySelector('[data-query-input]') as HTMLTextAreaElement)?.focus();
      }, 50);
    },
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const drawer = useDrawer();
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = ACTIONS.filter(
    (a) =>
      !query ||
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setQuery('');
        setHighlightIndex(0);
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  const runAction = useCallback(
    (action: Action) => action.run(drawer, onClose),
    [drawer, onClose]
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[highlightIndex]) {
        runAction(filtered[highlightIndex]);
      }
    },
    [filtered, highlightIndex, onClose, runAction]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        className="fixed left-1/2 top-[20%] z-[91] w-full max-w-md -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-[var(--color-neutral-200)]"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search */}
        <div className="flex items-center gap-3 border-b border-[var(--color-neutral-100)] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--color-neutral-400)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search actions…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlightIndex(0); }}
            onKeyDown={handleKey}
            className="flex-1 bg-transparent text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-400)] outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Actions */}
        <ul className="py-1.5 max-h-72 overflow-y-auto">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-[var(--color-neutral-400)]">
              No actions found
            </li>
          )}
          {filtered.map((action, i) => {
            const Icon = action.icon;
            const isActive = i === highlightIndex;
            return (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => runAction(action)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    isActive
                      ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                      : 'text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      isActive
                        ? 'bg-[var(--color-primary-100)]'
                        : 'bg-[var(--color-neutral-100)]',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium leading-snug">{action.label}</span>
                    <span className="block text-xs text-[var(--color-neutral-400)] leading-snug truncate">
                      {action.description}
                    </span>
                  </span>
                  {action.shortcut && (
                    <kbd className="shrink-0 rounded bg-[var(--color-neutral-100)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-neutral-500)]">
                      {action.shortcut}
                    </kbd>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer hint */}
        <div className="border-t border-[var(--color-neutral-100)] px-4 py-2 flex gap-4">
          {[['↑↓', 'Navigate'], ['↵', 'Select'], ['Esc', 'Close']].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1 text-[10px] text-[var(--color-neutral-400)]">
              <kbd className="rounded bg-[var(--color-neutral-100)] px-1 py-0.5 font-mono">{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
