'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Generic localStorage-backed preference manager.
 *
 * Usage:
 *   const [prefs, updatePrefs] = usePreferences('my-app.drawer', { open: true, tab: 'home' });
 *   updatePrefs({ tab: 'settings' }); // merges patch, persists immediately
 *
 * - Type-safe: T inferred from defaults
 * - Patch-based updates: only the provided keys are overwritten
 * - SSR-safe: falls back to defaults when window is unavailable
 * - Resilient: parse errors fall back to defaults silently
 * - Stable: updatePrefs reference never changes for a given storageKey
 */
function readStorage<T>(key: string, defaults: T): T {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    // Merge with defaults so new keys added in code are always present
    return { ...defaults, ...JSON.parse(raw) } as T;
  } catch {
    return defaults;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private-browsing restriction — preferences are ephemeral this session
  }
}

export function usePreferences<T extends object>(
  storageKey: string,
  defaults: T
): [prefs: T, update: (patch: Partial<T>) => void] {
  // Start with defaults on both server and client so SSR HTML matches the first client render.
  // After mount, read localStorage and apply any persisted overrides.
  const [prefs, setPrefs] = useState<T>(defaults);

  useEffect(() => {
    const stored = readStorage(storageKey, defaults);
    // Only trigger a re-render if localStorage actually differs from defaults
    if (JSON.stringify(stored) !== JSON.stringify(defaults)) {
      setPrefs(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        writeStorage(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  return [prefs, update];
}
