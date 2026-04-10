'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseSessionReturn {
  /** Session UUID from backend. Null until the first response resolves. */
  sessionId: string | null;
  /** Replace the current session with a brand-new one. Returns the new ID. */
  newSession: () => Promise<string | null>;
}

async function fetchOrCreateSession(): Promise<string | null> {
  // Try to resume the session stored in the kqa_session_id cookie
  const currentRes = await fetch('/api/sessions/current', { credentials: 'include' });
  if (currentRes.ok) {
    const data = await currentRes.json();
    return data?.id ?? null;
  }

  // No active session — create one (backend generates UUID + sets cookie)
  const createRes = await fetch('/api/sessions', {
    method: 'POST',
    credentials: 'include',
  });
  if (!createRes.ok) return null;
  const data = await createRes.json();
  return data?.id ?? null;
}

export function useSession(): UseSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrCreateSession()
      .then((id) => { if (id) setSessionId(id); })
      .catch(() => {}); // graceful degradation — app stays stateless if backend unavailable
  }, []);

  const newSession = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      const id = data?.id ?? null;
      if (id) setSessionId(id);
      return id;
    } catch {
      return null;
    }
  }, []);

  return { sessionId, newSession };
}
