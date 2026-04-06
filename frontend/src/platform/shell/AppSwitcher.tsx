'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { appRegistry } from '@/platform/registry/AppRegistry';
import { usePlatformStore } from '@/platform/store/platformStore';

export function AppSwitcher() {
  const pathname = usePathname();
  const setActiveApp = usePlatformStore((s) => s.setActiveApp);

  // Keep store in sync with the current route
  useEffect(() => {
    const match = appRegistry.find((app) => pathname.startsWith(app.route));
    setActiveApp(match?.id ?? null);
  }, [pathname, setActiveApp]);

  return (
    <nav className="flex items-center gap-1" aria-label="App navigation">
      {appRegistry.map((app) => {
        const isActive = pathname.startsWith(app.route);
        return (
          <Link
            key={app.id}
            href={app.route}
            className={[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            ].join(' ')}
          >
            {app.name}
          </Link>
        );
      })}
    </nav>
  );
}
