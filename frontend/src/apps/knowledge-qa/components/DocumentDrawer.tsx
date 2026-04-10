'use client';

import { useEffect, useRef } from 'react';
import { X, Files, BookOpen } from 'lucide-react';
import { useDrawer } from '../context/DrawerContext';
import { IngestionPanel } from './IngestionPanel';
import { ConfidenceBadge } from '@/a2ui/catalog/components/ConfidenceBadge';

// ---------------------------------------------------------------------------
// Source Quick-Look card inside the drawer
// ---------------------------------------------------------------------------

function SourcePreviewCard({
  source,
  index,
  isActive,
  onClick,
}: {
  source: {
    id: string; title: string; excerpt: string; score: number;
    document: string; section: string; date: string; category: string; url: string;
  };
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isActive]);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={[
        'group rounded-xl border p-4 cursor-pointer transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]',
        isActive
          ? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)] shadow-sm'
          : 'border-[var(--color-neutral-100)] bg-white hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)]/40 cursor-pointer',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-md bg-[var(--color-primary-100)] text-[10px] font-bold text-[var(--color-primary-700)]">
            {index + 1}
          </span>
          <p className="text-xs font-semibold text-[var(--color-neutral-800)] truncate leading-snug">
            {source.title || `Source ${index + 1}`}
          </p>
        </div>
        {source.score > 0 && (
          <div className="shrink-0 w-24">
            <ConfidenceBadge score={source.score} size="md" />
          </div>
        )}
      </div>

      {source.category && (
        <span className="inline-block mb-2 rounded-full bg-[var(--color-primary-100)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary-600)]">
          {source.category}
        </span>
      )}

      {source.excerpt && (
        <p className="text-xs text-[var(--color-neutral-500)] leading-relaxed line-clamp-3">
          {source.excerpt}
        </p>
      )}

      {/* Metadata row */}
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
        {source.document && (
          <span className="text-[10px] text-[var(--color-neutral-400)]">
            <span className="font-medium">Doc:</span> {source.document}
          </span>
        )}
        {source.section && (
          <span className="text-[10px] text-[var(--color-neutral-400)]">
            <span className="font-medium">§</span> {source.section}
          </span>
        )}
        {source.date && (
          <span className="text-[10px] text-[var(--color-neutral-400)]">{source.date}</span>
        )}
      </div>

      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 block text-[10px] text-[var(--color-primary-500)] underline underline-offset-2 hover:text-[var(--color-primary-700)] truncate cursor-pointer"
        >
          {source.url}
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function SourceSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-neutral-100)] bg-white p-4 animate-pulse space-y-2">
      <div className="flex gap-2">
        <div className="h-5 w-5 rounded-md bg-[var(--color-neutral-200)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--color-neutral-200)]" />
      </div>
      <div className="h-2.5 w-full rounded bg-[var(--color-neutral-100)]" />
      <div className="h-2.5 w-4/5 rounded bg-[var(--color-neutral-100)]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocumentDrawer
// ---------------------------------------------------------------------------

export function DocumentDrawer() {
  const {
    isOpen, activeTab, sources, activeCitationIndex,
    documentCount, close, openDocuments, openSources,
  } = useDrawer();

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <aside
        role="complementary"
        aria-label="Document drawer"
        className={[
          'fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-40 flex flex-col',
          'border-l border-[var(--color-neutral-100)]',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-neutral-100)] shrink-0">
          <div className="flex items-center gap-1 rounded-xl bg-[var(--color-neutral-50)] p-1">
            <button
              type="button"
              onClick={openDocuments}
              className={[
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                activeTab === 'documents'
                  ? 'bg-white text-[var(--color-primary-700)] shadow-sm cursor-pointer'
                  : 'text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-700)] cursor-pointer',
              ].join(' ')}
            >
              <Files className="h-3.5 w-3.5" />
              <span>Documents</span>
              {documentCount > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[9px] font-bold text-[var(--color-primary-700)]">
                  {documentCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => openSources()}
              className={[
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                activeTab === 'sources'
                  ? 'bg-white text-[var(--color-primary-700)] shadow-sm cursor-pointer'
                  : 'text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-700)] cursor-pointer',
              ].join(' ')}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Sources</span>
              {sources.length > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[9px] font-bold text-[var(--color-primary-700)]">
                  {sources.length}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close drawer"
            className="p-1.5 rounded-lg text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'documents' && (
            <div>
              <IngestionPanel />
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="p-4">
              {sources.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="rounded-2xl bg-[var(--color-neutral-50)] p-4">
                    <BookOpen className="h-8 w-8 text-[var(--color-neutral-300)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--color-neutral-500)]">No sources yet</p>
                  <p className="text-xs text-[var(--color-neutral-400)]">
                    Ask a question to see the knowledge base chunks that informed the answer.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-neutral-400)] mb-1">
                    {sources.length} source{sources.length !== 1 ? 's' : ''} used
                  </p>
                  {sources.map((source, i) => (
                    <SourcePreviewCard
                      key={source.id || i}
                      source={source}
                      index={i}
                      isActive={activeCitationIndex === i}
                      onClick={() => openSources(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
