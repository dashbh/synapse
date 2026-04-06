import { resolveStaticString } from '@/a2ui/types';

interface Source {
  id?: unknown;
  title?: unknown;
  excerpt?: unknown;
  url?: unknown;
  score?: unknown;
}

interface SourceListComponentProps {
  sources: unknown;
}

function SourceCard({ source, index }: { source: Source; index: number }) {
  const title = resolveStaticString(source.title) || `Source ${index + 1}`;
  const excerpt = resolveStaticString(source.excerpt);
  const url = resolveStaticString(source.url);
  const score =
    typeof source.score === 'number'
      ? Math.round(source.score * 100)
      : undefined;

  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 leading-snug">{title}</p>
        {score !== undefined && (
          <span className="shrink-0 text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            {score}%
          </span>
        )}
      </div>
      {excerpt && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{excerpt}</p>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline truncate"
        >
          {url}
        </a>
      )}
    </div>
  );
}

export function SourceListComponent({ sources }: SourceListComponentProps) {
  const items = Array.isArray(sources) ? (sources as Source[]) : [];

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {items.map((source, i) => (
        <SourceCard
          key={resolveStaticString(source.id) || String(i)}
          source={source}
          index={i}
        />
      ))}
    </div>
  );
}
