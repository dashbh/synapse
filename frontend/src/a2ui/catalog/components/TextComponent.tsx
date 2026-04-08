import { resolveStaticString } from '@/a2ui/types';

type UsageHint = 'h1' | 'h2' | 'h3' | 'body' | 'caption';

interface TextComponentProps {
  text: unknown;
  usageHint?: unknown;
}

const hintClasses: Record<UsageHint, string> = {
  h1: 'text-2xl font-bold tracking-tight text-[var(--color-neutral-900)]',
  h2: 'text-lg font-semibold text-[var(--color-neutral-900)]',
  h3: 'text-xs font-semibold uppercase tracking-widest text-[var(--color-neutral-400)]',
  body: 'text-sm font-normal leading-relaxed text-[var(--color-neutral-600)]',
  caption: 'text-xs font-normal leading-relaxed text-[var(--color-neutral-500)]',
};

const validHints = new Set<UsageHint>(['h1', 'h2', 'h3', 'body', 'caption']);

function toHint(value: unknown): UsageHint {
  return validHints.has(value as UsageHint) ? (value as UsageHint) : 'body';
}

export function TextComponent({ text, usageHint }: TextComponentProps) {
  const hint = toHint(usageHint);
  const content = resolveStaticString(text);
  const className = hintClasses[hint];

  if (hint === 'h1') return <h1 className={className}>{content}</h1>;
  if (hint === 'h2') return <h2 className={className}>{content}</h2>;
  if (hint === 'h3') return <h3 className={className}>{content}</h3>;
  if (hint === 'caption') return <p className={className}>{content}</p>;
  return <p className={className}>{content}</p>;
}
