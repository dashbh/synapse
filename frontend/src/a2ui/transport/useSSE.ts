'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { StreamStatus } from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('fe.transport.sse');

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
      const startMs = Date.now();
      log.info('stream_start', { url });
      try {
        const traceId = crypto.randomUUID().replace(/-/g, '');
        const spanId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
        const traceparent = `00-${traceId}-${spanId}-01`;

        const response = await fetch(url, {
          method: 'POST',
          ...(body !== undefined ? { body } : {}),
          signal: controller.signal,
          headers: { traceparent },
        });

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

        const streamLog = log.child({ trace_id: backendTraceId ?? traceId });
        streamLog.info('stream_connected', { status: response.status });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) optionsRef.current.onMessage(trimmed);
          }
        }

        const remaining = buffer.trim();
        if (remaining) optionsRef.current.onMessage(remaining);

        streamLog.info('stream_complete', { duration_ms: Date.now() - startMs });
        optionsRef.current.onDone?.();
        setStatus(StreamStatus.DONE);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          log.info('stream_aborted', { url, duration_ms: Date.now() - startMs });
          return;
        }
        log.error('stream_error', { url, error: (err as Error).message, duration_ms: Date.now() - startMs });
        optionsRef.current.onError?.(err as Error);
        setStatus(StreamStatus.ERROR);
      } finally {
        abortRef.current = null;
      }
    })();
  }, []);

  return { status, start, stop };
}
