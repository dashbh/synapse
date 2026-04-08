'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { A2UISurface } from '@/a2ui/renderer';
import { useAgentStream } from '@/a2ui/transport/useAgentStream';
import { StreamStatus } from '@/a2ui/transport/types';
import { QueryInput } from './components/QueryInput';
import { StreamStatusBar } from './components/StreamStatusBar';
import { IngestionPanel } from './components/IngestionPanel';
import { SearchFilters, type SearchFilterValues } from './components/SearchFilters';
import { KNOWLEDGE_QA_CONFIG } from './config';

function KnowledgeStats() {
  return (
    <div className="px-4 py-4 border-t border-[var(--color-neutral-100)]">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-neutral-400)] mb-3">
        Knowledge Base
      </p>
      <div className="flex flex-col gap-2">
        {[
          { icon: '📄', label: '3 documents' },
          { icon: '⬡', label: '42 vectors' },
          { icon: '🕐', label: 'Updated 2m ago' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-sm leading-none w-5 text-center shrink-0">{icon}</span>
            <span className="text-xs text-[var(--color-neutral-500)]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SUGGESTED_QUESTIONS = [
  'Summarize the latest architecture decisions',
  'How does the A2UI protocol handle streaming?',
  'What LLM models does this platform support?',
];

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

function SidebarToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="md:hidden flex items-center gap-1.5 text-xs font-medium text-[var(--color-neutral-500)] hover:text-[var(--color-primary-600)] transition-colors"
      aria-label={open ? 'Close sidebar' : 'Open sidebar'}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {open ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
        )}
      </svg>
      {open ? 'Close' : 'Library'}
    </button>
  );
}

const EMPTY_FILTERS: SearchFilterValues = { category: '', dateFrom: '', dateTo: '' };

export function KnowledgeQAApp() {
  const { status, start, stop } = useAgentStream(KNOWLEDGE_QA_CONFIG.endpoint);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilterValues>(EMPTY_FILTERS);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isStreaming = status === StreamStatus.STREAMING;
  const isError = status === StreamStatus.ERROR;
  const hasQueried = lastQuery !== null;

  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '')
  );

  const handleSubmit = useCallback(
    (query: string) => {
      setLastQuery(query);
      setSidebarOpen(false);
      start(query, activeFilters);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [start, filters]
  );

  const handleRetry = useCallback(() => {
    if (lastQuery) start(lastQuery, activeFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastQuery, start, filters]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside
        className={[
          'shrink-0 w-72 bg-white border-r border-[var(--color-neutral-100)] overflow-y-auto flex flex-col',
          'fixed inset-y-0 left-0 z-30 transition-transform duration-200 md:static md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <IngestionPanel />
        <div className="flex-1" />
        <KnowledgeStats />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky glass search area */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[var(--color-neutral-100)] px-6 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <SidebarToggle open={sidebarOpen} onClick={() => setSidebarOpen((v) => !v)} />
          </div>
          <QueryInput onSubmit={handleSubmit} disabled={isStreaming} />
          <div className="mt-3">
            <SearchFilters filters={filters} onChange={setFilters} disabled={isStreaming} />
          </div>
        </div>

        {/* Scrollable results */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {status !== StreamStatus.IDLE && (
            <div className="flex items-center justify-between gap-3 mb-4">
              <StreamStatusBar status={status} />
              <div className="flex items-center gap-3">
                {isStreaming && (
                  <button
                    type="button"
                    onClick={stop}
                    className="text-xs text-[var(--color-neutral-400)] underline underline-offset-2 hover:text-[var(--color-neutral-600)]"
                  >
                    Cancel
                  </button>
                )}
                {isError && lastQuery && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="text-xs text-[var(--color-primary-600)] underline underline-offset-2 hover:text-[var(--color-primary-700)]"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
          {!hasQueried ? (
            <EmptyState onSelect={handleSubmit} />
          ) : (
            <A2UISurface loading={isStreaming} />
          )}
        </div>
      </div>
    </div>
  );
}
