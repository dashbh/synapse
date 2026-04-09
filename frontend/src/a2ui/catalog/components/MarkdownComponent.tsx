import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { resolveStaticString } from '@/a2ui/types';

interface MarkdownComponentProps {
  markdown: unknown;
}

export function MarkdownComponent({ markdown }: MarkdownComponentProps) {
  const content = resolveStaticString(markdown);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-neutral-900)] mt-4 mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold text-[var(--color-neutral-900)] mt-4 mb-1.5">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-neutral-400)] mt-3 mb-1">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm font-normal leading-relaxed text-[var(--color-neutral-600)] mb-3 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside pl-5 mb-3 space-y-1 text-sm text-[var(--color-neutral-600)]">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside pl-5 mb-3 space-y-1 text-sm text-[var(--color-neutral-600)]">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        code: ({ inline, children, ...props }: { inline?: boolean; children?: React.ReactNode }) =>
          inline ? (
            <code className="px-1 py-0.5 rounded bg-[var(--color-neutral-100)] text-[var(--color-primary-700)] text-[0.8em] font-mono" {...props}>
              {children}
            </code>
          ) : (
            <code className="block w-full overflow-x-auto rounded-lg bg-[var(--color-neutral-900)] text-[var(--color-neutral-100)] text-xs font-mono p-4 mb-3" {...props}>
              {children}
            </code>
          ),
        pre: ({ children }) => <>{children}</>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[var(--color-primary-300)] pl-4 my-3 text-sm text-[var(--color-neutral-500)] italic">
            {children}
          </blockquote>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--color-neutral-800)]">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-[var(--color-neutral-600)]">{children}</em>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-[var(--color-primary-600)] underline underline-offset-2 hover:text-[var(--color-primary-800)]">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-500)] border-b border-[var(--color-neutral-200)] px-3 py-2 bg-[var(--color-neutral-50)]">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="text-sm text-[var(--color-neutral-600)] border-b border-[var(--color-neutral-100)] px-3 py-2">
            {children}
          </td>
        ),
        hr: () => <hr className="my-4 border-[var(--color-neutral-200)]" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
