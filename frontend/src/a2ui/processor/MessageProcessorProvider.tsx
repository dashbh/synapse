'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Catalog, MessageProcessor, type ComponentApi } from '@a2ui/web_core/v0_9';

// Minimal ComponentApi for the stub catalog
type StubComponentApi = ComponentApi;

interface MessageProcessorContextValue {
  processor: MessageProcessor<StubComponentApi>;
}

const MessageProcessorContext = createContext<MessageProcessorContextValue | null>(null);

interface MessageProcessorProviderProps {
  children: ReactNode;
}

export function MessageProcessorProvider({ children }: MessageProcessorProviderProps) {
  const processor = useMemo(() => {
    const stubCatalog = new Catalog<StubComponentApi>('stub', []);
    return new MessageProcessor<StubComponentApi>([stubCatalog]);
  }, []);

  return (
    <MessageProcessorContext.Provider value={{ processor }}>
      {children}
    </MessageProcessorContext.Provider>
  );
}

export function useMessageProcessor(): MessageProcessor<StubComponentApi> {
  const ctx = useContext(MessageProcessorContext);
  if (!ctx) {
    throw new Error('useMessageProcessor must be used inside MessageProcessorProvider');
  }
  return ctx.processor;
}
