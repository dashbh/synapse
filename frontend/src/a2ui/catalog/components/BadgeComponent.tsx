import { resolveStaticString } from '@/a2ui/types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
const validVariants = new Set<BadgeVariant>(['default', 'secondary', 'destructive', 'outline']);

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] ring-1 ring-[var(--color-primary-200)]/70',
  secondary: 'bg-[var(--color-secondary-50)] text-[var(--color-secondary-700)] ring-1 ring-[var(--color-secondary-200)]/70',
  destructive: 'bg-[var(--color-error-50)] text-[var(--color-error-700)] ring-1 ring-[var(--color-error-200)]/70',
  outline: 'bg-transparent text-[var(--color-neutral-600)] ring-1 ring-[var(--color-neutral-200)]',
};

interface BadgeComponentProps {
  label: unknown;
  variant?: unknown;
}

export function BadgeComponent({ label, variant }: BadgeComponentProps) {
  const v: BadgeVariant = validVariants.has(variant as BadgeVariant)
    ? (variant as BadgeVariant)
    : 'default';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${variantClasses[v]}`}>
      {resolveStaticString(label)}
    </span>
  );
}
