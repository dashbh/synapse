'use client';

export function ConnectedDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-success-400)] animate-ping opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success-500)]" />
    </span>
  );
}
