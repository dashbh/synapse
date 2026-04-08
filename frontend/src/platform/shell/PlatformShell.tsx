import { type ReactNode } from 'react';
import { AppSwitcher } from './AppSwitcher';
import { ConnectedDot } from './ConnectedDot';

interface PlatformShellProps {
  children: ReactNode;
}

function SystemStatus() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--color-primary-300)]">
      <ConnectedDot />
      <span className="hidden sm:inline">Connected</span>
    </div>
  );
}

function ProfileAvatar() {
  return (
    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[var(--color-primary-500)] ring-1 ring-[var(--color-primary-400)]/50 text-[11px] font-semibold text-white select-none">
      AI
    </div>
  );
}

export function PlatformShell({ children }: PlatformShellProps) {
  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 bg-[var(--color-header-bg)] border-b border-[var(--color-primary-900)]/60">
        <div className="flex items-center justify-between px-5 h-12">
          <div className="flex items-center gap-0 min-w-0">
            <span className="text-sm font-bold text-white tracking-tight shrink-0">
              Synapse
            </span>
            <AppSwitcher />
          </div>
          <div className="flex items-center gap-4">
            <SystemStatus />
            <ProfileAvatar />
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden bg-[var(--color-surface-page)]">{children}</main>
    </div>
  );
}
