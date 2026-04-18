'use client';

import { useCallback, useEffect } from 'react';
import { type A2uiMessage } from '@a2ui/web_core/v0_9';
import { useMessageProcessor } from '@/a2ui/processor/MessageProcessorProvider';
import { useSSE } from './useSSE';
import { StreamStatus } from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('fe.transport.agent');

interface UseAgentStreamReturn {
  status: StreamStatus;
  start: (query: string, filters?: Record<string, string>) => void;
  stop: () => void;
}

/**
 * Opens an SSE stream to the given agent endpoint, feeds each line into
 * the MessageProcessor as an A2UI v0.9 message. This is the only place
 * that touches SSE — no direct fetch/EventSource elsewhere.
 */
export function useAgentStream(endpoint: string): UseAgentStreamReturn {
  const processor = useMessageProcessor();

  const { status, start: startSSE, stop } = useSSE({
    onMessage: useCallback(
      (line: string) => {
        try {
          const message = JSON.parse(line) as A2uiMessage;
          processor.processMessages([message]);
        } catch {
          log.error('parse_error', { line: line.slice(0, 200) });
        }
      },
      [processor]
    ),
    onError: useCallback((err: Error) => {
      log.error('stream_error', { error: err.message });
    }, []),
  });

  const start = useCallback(
    (query: string, filters?: Record<string, string>) => {
      // Each turn uses a unique surface_id (passed in filters) so surfaces
      // accumulate in the processor for multi-turn display. No clearing here.
      const params = new URLSearchParams({ query, ...filters });
      log.info('stream_start', { endpoint, query: query.slice(0, 100) });
      startSSE(`${endpoint}?${params.toString()}`);
    },
    [endpoint, startSSE]
  );

  // Full volatile session reset: clear all surfaces when the app unmounts (route change)
  useEffect(() => {
    return () => {
      for (const id of [...processor.model.surfacesMap.keys()]) {
        processor.model.deleteSurface(id);
      }
    };
  }, [processor]);

  return { status, start, stop };
}
