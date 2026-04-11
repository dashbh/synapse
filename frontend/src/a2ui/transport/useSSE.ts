'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { StreamStatus } from './types';

export interface UseSSEOptions {
  onMessage: (line: string) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
  /** Called once after the response headers arrive with the backend's confirmed trace ID. */
  onTraceId?: (traceId: string) => void;
}

interface UseSSEReturn {
  status: StreamStatus;
  start: (url: string, body?: BodyInit) => void;
  stop: () => void;
}

export function useSSE(options: UseSSEOptions): UseSSEReturn {
  const [status, setStatus] = useState<StreamStatus>(StreamStatus.IDLE);
  const abortRef = useRef<AbortController | null>(null);

  // Always hold the latest callbacks — avoids stale closures in the async streaming loop
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  // Abort the stream when the consuming component unmounts (e.g. route change)
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus(StreamStatus.IDLE);
  }, []);

  const start = useCallback((url: string, body?: BodyInit) => {
    // Abort any in-flight request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus(StreamStatus.STREAMING);

    (async () => {
      try {
        // Generate a W3C traceparent header for this stream request so the
        // backend can attach its spans as children of this frontend-originated
        // trace. Format: "00-{32hex traceId}-{16hex spanId}-01"
        // crypto.randomUUID() is available natively in all modern browsers and
        // Node.js 19+ (Next.js server-side) — no extra dependencies needed.
        const traceId = crypto.randomUUID().replace(/-/g, '');
        const spanId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
        const traceparent = `00-${traceId}-${spanId}-01`;

        const response = await fetch(url, {
          method: 'POST',
          ...(body !== undefined ? { body } : {}),
          signal: controller.signal,
          headers: { traceparent },
        });

        // Capture the backend's confirmed trace ID (may differ from the
        // frontend-generated one if the backend creates its own root span).
        const backendTraceId = response.headers.get('X-Trace-ID');
        if (backendTraceId) {
          optionsRef.current.onTraceId?.(backendTraceId);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        if (!response.body) {
          throw new Error('Response has no body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last partial line in the buffer
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) optionsRef.current.onMessage(trimmed);
          }
        }

        // Flush any remaining content after stream closes
        const remaining = buffer.trim();
        if (remaining) optionsRef.current.onMessage(remaining);

        optionsRef.current.onDone?.();
        setStatus(StreamStatus.DONE);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        optionsRef.current.onError?.(err as Error);
        setStatus(StreamStatus.ERROR);
      } finally {
        abortRef.current = null;
      }
    })();
  }, []);

  return { status, start, stop };
}
