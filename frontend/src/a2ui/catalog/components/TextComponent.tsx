import { resolveStaticString } from '@/a2ui/types';

type UsageHint = 'h1' | 'h2' | 'h3' | 'body' | 'caption';

interface TextComponentProps {
  text: unknown;
  usageHint?: unknown;
}

const hintClasses: Record<UsageHint, string> = {
  h1: 'text-4xl font-bold leading-tight text-gray-900',
  h2: 'text-3xl font-bold leading-snug text-gray-900',
  h3: 'text-2xl font-semibold leading-snug text-gray-900',
  body: 'text-base font-normal leading-relaxed text-gray-700',
  caption: 'text-sm font-normal leading-snug text-gray-500',
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
