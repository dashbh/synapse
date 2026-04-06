import { StreamStatus } from '@/a2ui/transport/types';

interface StreamStatusBarProps {
  status: StreamStatus;
}

interface StatusConfig {
  bg: string;
  border: string;
  dot: string;
  text: string;
  label: string;
}

const STATUS_CONFIG: Record<Exclude<StreamStatus, StreamStatus.IDLE>, StatusConfig> = {
  [StreamStatus.STREAMING]: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    dot: 'animate-pulse bg-blue-500',
    text: 'text-blue-700',
    label: 'Thinking…',
  },
  [StreamStatus.DONE]: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    label: 'Done',
  },
  [StreamStatus.ERROR]: {
    bg: 'bg-red-50',
    border: 'border-red-100',
    dot: 'bg-red-500',
    text: 'text-red-700',
    label: 'Something went wrong. Try again.',
  },
};

export function StreamStatusBar({ status }: StreamStatusBarProps) {
  if (status === StreamStatus.IDLE) return null;

  const config = STATUS_CONFIG[status];

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${config.bg} ${config.border} ${config.text}`}
      role="status"
      aria-live="polite"
    >
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
      {config.label}
    </div>
  );
}
