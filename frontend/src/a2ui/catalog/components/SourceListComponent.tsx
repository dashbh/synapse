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
// Side panel — fixed overlay rendered via portal so it escapes any overflow
// ---------------------------------------------------------------------------

interface CitationSidePanelProps {
  source: Source;
  onClose: () => void;
}

function CitationSidePanel({ source, onClose }: CitationSidePanelProps) {
  const title = resolveStaticString(source.title) || 'Source';
  const excerpt = resolveStaticString(source.excerpt);
  const url = resolveStaticString(source.url);
  const score =
    typeof source.score === 'number' ? Math.round(source.score * 100) : undefined;

  const panel = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Citation preview"
        className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-snug">{title}</p>
            {score !== undefined && (
              <span className="text-xs font-medium text-blue-600">
                {score}% match
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* Metadata */}
          <MetadataCard
            document={source.document}
            section={source.section}
            date={source.date}
            category={source.category}
          />

          {/* Full excerpt */}
          {excerpt && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Excerpt</p>
              <p className="text-sm text-gray-700 leading-relaxed">{excerpt}</p>
            </div>
          )}

          {/* Source URL */}
          {url && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Source</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline break-all"
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
// Source card (list item)
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
  const score =
    typeof source.score === 'number' ? Math.round(source.score * 100) : undefined;
  const category = resolveStaticString(source.category);

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug">{title}</p>
          {category && (
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
              {category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {score !== undefined && (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {score}%
            </span>
          )}
          <button
            type="button"
            onClick={() => onPreview(source)}
            className="text-xs text-gray-400 hover:text-blue-600 underline underline-offset-2 transition-colors"
          >
            Preview
          </button>
        </div>
      </div>
      {excerpt && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{excerpt}</p>
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
