'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Files } from 'lucide-react';
import { A2UISurface } from '@/a2ui/renderer';
import { useAgentStream } from '@/a2ui/transport/useAgentStream';
import { StreamStatus } from '@/a2ui/transport/types';
import { CitationProvider } from '@/a2ui/catalog/CitationContext';
import { sourceRegistry } from '@/a2ui/catalog/sourceRegistry';
import { QueryInput } from './components/QueryInput';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { DocumentDrawer } from './components/DocumentDrawer';
import { CommandPalette } from './components/CommandPalette';
import { DragDropOverlay } from './components/DragDropOverlay';
import { DrawerProvider, useDrawer } from './context/DrawerContext';
import { KNOWLEDGE_QA_CONFIG } from './config';

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS = [
  'Summarize the latest architecture decisions',
  'How does the A2UI protocol handle streaming?',
  'What documents have been ingested into the knowledge base?',
];

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-8 py-16 px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] ring-1 ring-[var(--color-primary-100)]">
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--color-primary-100)] to-transparent animate-pulse opacity-60" />
          <svg className="relative h-7 w-7 text-[var(--color-primary-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[var(--color-neutral-800)]">Ask your knowledge base</p>
        <p className="mt-1 text-xs text-[var(--color-neutral-400)]">Try one of these to get started</p>
      </div>
      <motion.div
        className="flex flex-col gap-2 w-full max-w-lg"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        {SUGGESTED_QUESTIONS.map((q) => (
          <motion.button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
            }}
            className="group flex items-center gap-3 rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3 text-left shadow-sm hover:border-[var(--color-primary-200)] hover:shadow-md transition-all"
          >
            <span className="shrink-0 text-[var(--color-primary-400)] group-hover:text-[var(--color-primary-600)] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </span>
            <span className="text-sm text-[var(--color-neutral-600)] group-hover:text-[var(--color-neutral-900)] transition-colors">{q}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner app (has access to DrawerContext)
// ---------------------------------------------------------------------------

function KnowledgeQAInner() {
  const { status, start, stop } = useAgentStream(KNOWLEDGE_QA_CONFIG.endpoint);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [queryKey, setQueryKey] = useState(0);
  const drawer = useDrawer();

  const isStreaming = status === StreamStatus.STREAMING;
  const isError = status === StreamStatus.ERROR;
  const hasQueried = lastQuery !== null;

  // Wire source registry → drawer sources state
  useEffect(() => {
    sourceRegistry.register((sources) => drawer.setSources(sources));
    return () => sourceRegistry.unregister();
  }, [drawer.setSources]);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = useCallback(
    (query: string) => {
      setLastQuery(query);
      setInputValue('');
      setQueryKey((k) => k + 1);
      start(query, {});
    },
    [start]
  );

  const handlePillSelect = useCallback(
    (q: string) => {
      setInputValue(q);
      handleSubmit(q);
    },
    [handleSubmit]
  );

  const handleRetry = useCallback(() => {
    if (lastQuery) start(lastQuery, {});
  }, [lastQuery, start]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-[var(--color-neutral-100)] px-6 pt-4 pb-3">
          {/* Top bar: title + actions */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-[var(--color-neutral-800)]">
                Knowledge Q&amp;A
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Cmd+K hint */}
              <button
                type="button"
                onClick={() => setCmdOpen(true)}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-2.5 py-1 text-[11px] text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] hover:border-[var(--color-neutral-300)] transition-colors cursor-pointer"
              >
                <kbd className="font-mono">⌘K</kbd>
                <span>Actions</span>
              </button>

              {/* Documents button with badge */}
              <button
                type="button"
                onClick={drawer.toggle}
                aria-label="Open document library"
                className={[
                  'relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                  drawer.isOpen
                    ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] ring-1 ring-[var(--color-primary-200)] cursor-pointer'
                    : 'border border-[var(--color-neutral-200)] text-[var(--color-neutral-600)] hover:border-[var(--color-primary-200)] hover:text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] cursor-pointer',
                ].join(' ')}
              >
                <Files className="h-3.5 w-3.5" />
                <span>Library</span>
                {drawer.documentCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-[9px] font-bold text-white">
                    {drawer.documentCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Query input */}
          <QueryInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            disabled={isStreaming}
          />

          {/* Thinking indicator — appears below input when streaming */}
          <ThinkingIndicator status={status} />

          {/* Error / retry */}
          {isError && lastQuery && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-[var(--color-error-600)]">Something went wrong.</p>
              <button
                type="button"
                onClick={handleRetry}
                className="text-xs text-[var(--color-primary-600)] underline underline-offset-2 hover:text-[var(--color-primary-700)]"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Scrollable results */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Cancel streaming */}
          {isStreaming && (
            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={stop}
                className="text-xs text-[var(--color-neutral-400)] underline underline-offset-2 hover:text-[var(--color-neutral-600)]"
              >
                Cancel
              </button>
            </div>
          )}

          {!hasQueried ? (
            <EmptyState onSelect={handlePillSelect} />
          ) : (
            <CitationProvider
              onOpenSource={(i) => drawer.openSources(i >= 0 ? i : undefined)}
            >
              {lastQuery && (
                <p className="text-xs text-[var(--color-neutral-400)] mb-4 truncate">
                  <span className="font-medium text-[var(--color-neutral-500)]">Q:</span>{' '}
                  {lastQuery}
                </p>
              )}
              <A2UISurface key={queryKey} loading={isStreaming} />
            </CitationProvider>
          )}
        </div>
      </div>

      {/* Right drawer */}
      <DocumentDrawer />

      {/* Command palette */}
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Viewport drag-and-drop overlay */}
      <DragDropOverlay onFileDrop={drawer.setPendingFile} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported root — wraps with DrawerProvider
// ---------------------------------------------------------------------------

export function KnowledgeQAApp() {
  return (
    <DrawerProvider>
      <KnowledgeQAInner />
    </DrawerProvider>
  );
}
