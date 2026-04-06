'use client';

import { useCallback } from 'react';
import { type A2uiMessage } from '@a2ui/web_core/v0_9';
import { useMessageProcessor } from '@/a2ui/processor/MessageProcessorProvider';
import { useSSE } from './useSSE';
import { StreamStatus } from './types';

interface UseAgentStreamReturn {
  status: StreamStatus;
  start: (query: string) => void;
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
          console.error('[A2UI] Failed to parse message:', line);
        }
      },
      [processor]
    ),
    onError: useCallback((err: Error) => {
      console.error('[A2UI] Stream error:', err.message);
    }, []),
  });

  const start = useCallback(
    (query: string) => {
      // Clear any existing surfaces so createSurface doesn't throw on re-query
      for (const id of [...processor.model.surfacesMap.keys()]) {
        processor.model.deleteSurface(id);
      }
      startSSE(`${endpoint}?query=${encodeURIComponent(query)}`);
    },
    [endpoint, startSSE, processor]
  );

  return { status, start, stop };
}
