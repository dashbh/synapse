import { resolveStaticString } from '@/a2ui/types';

interface ButtonComponentProps {
  label: unknown;
  variant?: unknown;
  onClick?: () => void;
}

export function ButtonComponent({ label, variant, onClick }: ButtonComponentProps) {
  const isSecondary = variant === 'secondary';

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150',
        isSecondary
          ? 'border border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-700)] hover:border-[var(--color-neutral-300)] hover:bg-[var(--color-neutral-50)]'
          : 'bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-500)] text-white shadow-sm hover:shadow-[var(--shadow-glow-primary-md)] active:scale-95',
      ].join(' ')}
    >
      {resolveStaticString(label)}
    </button>
  );
}
