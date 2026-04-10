'use client';

import { useEffect } from 'react';
import { resolveStaticString } from '@/a2ui/types';
import { sourceRegistry, type RawSource } from '../sourceRegistry';
import { useCitation } from '../CitationContext';
import { ConfidenceBadge } from './ConfidenceBadge';

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

function parseSource(s: Source, i: number): RawSource {
  return {
    id: resolveStaticString(s.id) || String(i),
    title: resolveStaticString(s.title) || `Source ${i + 1}`,
    excerpt: resolveStaticString(s.excerpt),
    score: typeof s.score === 'number' ? s.score : 0,
    document: resolveStaticString(s.document),
    section: resolveStaticString(s.section),
    date: resolveStaticString(s.date),
    category: resolveStaticString(s.category),
    url: resolveStaticString(s.url),
  };
}

export function SourceListComponent({ sources }: SourceListComponentProps) {
  const { openSource } = useCitation();
  const items = Array.isArray(sources) ? (sources as Source[]) : [];
  const parsed = items.map(parseSource);

  // Publish sources to the registry so the DocumentDrawer can display them
  useEffect(() => {
    if (parsed.length > 0) sourceRegistry.update(parsed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(parsed)]);

  if (parsed.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-neutral-400)]">
        Sources
      </span>
      {parsed.map((src, i) => (
        <button
          key={src.id}
          type="button"
          onClick={() => openSource(i)}
          title={src.title}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary-700)] hover:bg-[var(--color-primary-100)] hover:border-[var(--color-primary-300)] transition-colors cursor-pointer"
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-200)] text-[9px] font-bold text-[var(--color-primary-800)]">
            {i + 1}
          </span>
          <span className="max-w-[100px] truncate">{src.title}</span>
          {src.score > 0 && <ConfidenceBadge score={src.score} size="sm" />}
        </button>
      ))}
      <button
        type="button"
        onClick={() => openSource(-1)}
        className="text-[10px] text-[var(--color-primary-500)] underline underline-offset-2 hover:text-[var(--color-primary-700)] transition-colors ml-1 cursor-pointer"
      >
        View all →
      </button>
    </div>
  );
}
