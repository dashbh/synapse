'use client';

import { useState, useCallback } from 'react';
import { A2UISurface } from '@/a2ui/renderer';
import { useAgentStream } from '@/a2ui/transport/useAgentStream';
import { StreamStatus } from '@/a2ui/transport/types';
import { QueryInput } from './components/QueryInput';
import { StreamStatusBar } from './components/StreamStatusBar';
import { IngestionPanel } from './components/IngestionPanel';
import { SearchFilters, type SearchFilterValues } from './components/SearchFilters';
import { KNOWLEDGE_QA_CONFIG } from './config';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      <p className="text-sm font-medium text-gray-500">Ask anything</p>
      <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
        Type a question above and press{' '}
        <kbd className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 text-[10px] font-mono">
          ⌘↵
        </kbd>{' '}
        to search your knowledge base.
      </p>
    </div>
  );
}

const EMPTY_FILTERS: SearchFilterValues = { category: '', dateFrom: '', dateTo: '' };

export function KnowledgeQAApp() {
  const { status, start, stop } = useAgentStream(KNOWLEDGE_QA_CONFIG.endpoint);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilterValues>(EMPTY_FILTERS);

  const isStreaming = status === StreamStatus.STREAMING;
  const isError = status === StreamStatus.ERROR;
  const hasQueried = lastQuery !== null;

  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '')
  );

  const handleSubmit = useCallback(
    (query: string) => {
      setLastQuery(query);
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
    <div className="flex flex-col gap-5 p-6 max-w-3xl mx-auto w-full">
      {/* App header */}
      <div className="flex flex-col gap-0.5 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-semibold text-gray-900">Knowledge Q&A</h1>
        <p className="text-sm text-gray-500">Search your knowledge base using AI</p>
      </div>

      <QueryInput onSubmit={handleSubmit} disabled={isStreaming} />

      {/* Search filters */}
      <SearchFilters filters={filters} onChange={setFilters} disabled={isStreaming} />

      {/* Status row — fixed height prevents layout jump */}
      <div className="flex min-h-8 items-center justify-between gap-3">
        <StreamStatusBar status={status} />
        <div className="flex items-center gap-3">
          {isStreaming && (
            <button
              type="button"
              onClick={stop}
              className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
            >
              Cancel
            </button>
          )}
          {isError && lastQuery && (
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      {!hasQueried ? (
        <EmptyState />
      ) : (
        <A2UISurface loading={isStreaming} />
      )}

      {/* Ingestion panel — collapsible, below query results */}
      <div className="mt-4 border-t border-gray-100 pt-4">
        <IngestionPanel />
      </div>
    </div>
  );
}
