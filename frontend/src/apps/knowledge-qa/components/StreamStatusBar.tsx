import { StreamStatus } from '@/a2ui/transport/types';

interface StreamStatusBarProps {
  status: StreamStatus;
}

const STATUS_CONFIG = {
  [StreamStatus.STREAMING]: {
    dot: 'animate-pulse bg-[var(--color-primary-500)]',
    text: 'text-[var(--color-primary-700)]',
    bg: 'bg-[var(--color-primary-50)] border-[var(--color-primary-100)]',
    label: 'Thinking…',
  },
  [StreamStatus.DONE]: {
    dot: 'bg-[var(--color-success-500)]',
    text: 'text-[var(--color-success-700)]',
    bg: 'bg-[var(--color-success-50)] border-[var(--color-success-100)]',
    label: 'Done',
  },
  [StreamStatus.ERROR]: {
    dot: 'bg-[var(--color-error-500)]',
    text: 'text-[var(--color-error-600)]',
    bg: 'bg-[var(--color-error-50)] border-[var(--color-error-100)]',
    label: 'Something went wrong',
  },
} as const;

export function StreamStatusBar({ status }: StreamStatusBarProps) {
  if (status === StreamStatus.IDLE) return null;
  const { dot, text, bg, label } = STATUS_CONFIG[status];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${bg} ${text}`}
      role="status"
      aria-live="polite"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {label}
    </div>
  );
}
