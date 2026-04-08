'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { resolveStaticString } from '@/a2ui/types';
import { MetadataCard } from './MetadataCard';

interface Source {
  id?: unknown;
  title?: unknown;
  excerpt?: unknown;
  url?: unknown;
  score?: unknown;
  document?: unknown;
  section?: unknown;
  date?: unknown;
  category?: unknown;
}

interface SourceListComponentProps {
  sources: unknown;
}

// ---------------------------------------------------------------------------
// Side panel
// ---------------------------------------------------------------------------

function CitationSidePanel({ source, onClose }: { source: Source; onClose: () => void }) {
  const title = resolveStaticString(source.title) || 'Source';
  const excerpt = resolveStaticString(source.excerpt);
  const url = resolveStaticString(source.url);
  const score = typeof source.score === 'number' ? Math.round(source.score * 100) : undefined;

  const panel = (
    <>
      <div
        className="fixed inset-0 bg-black/25 z-40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Citation preview"
        className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 bg-[var(--color-header-bg)]">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-snug">{title}</p>
            {score !== undefined && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-primary-300)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success-400)]" />
                {score}% match
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="shrink-0 mt-0.5 p-1.5 rounded-lg text-[var(--color-primary-400)] hover:text-white hover:bg-[var(--color-primary-800)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          <MetadataCard
            document={source.document}
            section={source.section}
            date={source.date}
            category={source.category}
          />

          {excerpt && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-neutral-400)]">Excerpt</p>
              <p className="text-sm text-[var(--color-neutral-700)] leading-relaxed">{excerpt}</p>
            </div>
          )}

          {url && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-neutral-400)]">Source</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--color-primary-600)] hover:text-[var(--color-primary-800)] hover:underline break-all"
              >
                {url}
              </a>
            </div>
          )}
        </div>
      </aside>
    </>
  );

  return createPortal(panel, document.body);
}

// ---------------------------------------------------------------------------
// Source card
// ---------------------------------------------------------------------------

function SourceCard({
  source,
  index,
  onPreview,
}: {
  source: Source;
  index: number;
  onPreview: (source: Source) => void;
}) {
  const title = resolveStaticString(source.title) || `Source ${index + 1}`;
  const excerpt = resolveStaticString(source.excerpt);
  const score = typeof source.score === 'number' ? Math.round(source.score * 100) : undefined;
  const category = resolveStaticString(source.category);

  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-[var(--color-neutral-100)] bg-white p-4 shadow-sm hover:shadow-md hover:border-[var(--color-primary-100)] transition-all duration-150">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-neutral-900)] leading-snug">{title}</p>
          {category && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-primary-400)]">
              {category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {score !== undefined && (
            <span className="text-[11px] font-bold text-[var(--color-primary-600)] tabular-nums">
              {score}%
            </span>
          )}
          <button
            type="button"
            onClick={() => onPreview(source)}
            className="rounded-lg border border-[var(--color-neutral-200)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-neutral-400)] hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] transition-all opacity-0 group-hover:opacity-100"
          >
            Preview
          </button>
        </div>
      </div>
      {excerpt && (
        <p className="text-xs text-[var(--color-neutral-500)] leading-relaxed line-clamp-2">{excerpt}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SourceListComponent
// ---------------------------------------------------------------------------

export function SourceListComponent({ sources }: SourceListComponentProps) {
  const items = Array.isArray(sources) ? (sources as Source[]) : [];
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      <div className="flex flex-col gap-2">
        {items.map((source, i) => (
          <SourceCard
            key={resolveStaticString(source.id) || String(i)}
            source={source}
            index={i}
            onPreview={setSelectedSource}
          />
        ))}
      </div>

      {selectedSource && (
        <CitationSidePanel
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </>
  );
}
