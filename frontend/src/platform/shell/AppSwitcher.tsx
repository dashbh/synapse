'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { appRegistry } from '@/platform/registry/AppRegistry';
import { usePlatformStore } from '@/platform/store/platformStore';

export function AppSwitcher() {
  const pathname = usePathname();
  const setActiveApp = usePlatformStore((s) => s.setActiveApp);

  useEffect(() => {
    const match = appRegistry.find((app) => pathname.startsWith(app.route));
    setActiveApp(match?.id ?? null);
  }, [pathname, setActiveApp]);

  const activeApp = appRegistry.find((app) => pathname.startsWith(app.route));

  return (
    <nav className="flex items-center min-w-0" aria-label="App navigation">
      {activeApp && (
        <span className="mx-2 text-[var(--color-primary-600)] text-sm select-none">/</span>
      )}
      {activeApp && (
        <span className="text-sm font-medium text-[var(--color-primary-200)] truncate">
          {activeApp.name}
        </span>
      )}
      {appRegistry.filter((app) => app !== activeApp).length > 0 && (
        <div className="ml-4 flex items-center gap-1">
          {appRegistry
            .filter((app) => app !== activeApp)
            .map((app) => (
              <Link
                key={app.id}
                href={app.route}
                className="px-2.5 py-1 rounded text-xs font-medium text-[var(--color-primary-400)] hover:text-[var(--color-primary-200)] hover:bg-[var(--color-primary-900)]/50 transition-colors"
              >
                {app.name}
              </Link>
            ))}
        </div>
      )}
    </nav>
  );
}
