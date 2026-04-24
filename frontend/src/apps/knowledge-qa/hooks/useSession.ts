'use client';

import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@/lib/logger';
import { tracedFetch } from '@/lib/tracedFetch';

const log = createLogger('fe.session');

export interface UseSessionReturn {
  /** Session UUID from backend. Null until the first response resolves. */
  sessionId: string | null;
  /** True while the initial session fetch is in-flight. */
  isLoading: boolean;
  /** Replace the current session with a brand-new one. Returns the new ID. */
  newSession: () => Promise<string | null>;
  /** Switch to an existing session by ID (updates cookie + local state). Returns the ID on success. */
  switchSession: (id: string) => Promise<string | null>;
}

async function fetchOrCreateSession(): Promise<string | null> {
  const currentRes = await tracedFetch('/api/sessions/current', { credentials: 'include' });
  if (currentRes.ok) {
    const data = await currentRes.json();
    const id = data?.id ?? null;
    if (id) log.info('session_restored', { session_id: id });
    return id;
  }

  const createRes = await tracedFetch('/api/sessions', {
    method: 'POST',
    credentials: 'include',
  });
  if (!createRes.ok) return null;
  const data = await createRes.json();
  const id = data?.id ?? null;
  if (id) log.info('session_created', { session_id: id });
  return id;
}

export function useSession(): UseSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrCreateSession()
      .then((id) => { if (id) setSessionId(id); })
      .catch((err) => {
        log.error('session_init_failed', { error: (err as Error).message });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const newSession = useCallback(async (): Promise<string | null> => {
    try {
      const res = await tracedFetch('/api/sessions', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      const id = data?.id ?? null;
      if (id) {
        log.info('session_new', { session_id: id });
        setSessionId(id);
      }
      return id;
    } catch (err) {
      log.error('session_new_failed', { error: (err as Error).message });
      return null;
    }
  }, []);

  const switchSession = useCallback(async (id: string): Promise<string | null> => {
    try {
      const res = await tracedFetch(`/api/sessions/${id}/activate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      log.info('session_switch', { session_id: id });
      setSessionId(id);
      return id;
    } catch (err) {
      log.error('session_switch_failed', { session_id: id, error: (err as Error).message });
      return null;
    }
  }, []);

  return { sessionId, isLoading, newSession, switchSession };
}
