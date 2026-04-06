import { type ReactNode } from 'react';
import { AppSwitcher } from './AppSwitcher';

interface PlatformShellProps {
  children: ReactNode;
}

export function PlatformShell({ children }: PlatformShellProps) {
  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center gap-6 px-6 h-14">
          <span className="text-sm font-semibold text-gray-900 shrink-0">A2UI Platform</span>
          <AppSwitcher />
        </div>
      </header>
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
