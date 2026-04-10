'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

interface CitationContextValue {
  /** Open the source drawer at the given 0-based index. Pass -1 to open without highlighting. */
  openSource: (index: number) => void;
}

const CitationContext = createContext<CitationContextValue>({
  openSource: () => {},
});

export function CitationProvider({
  children,
  onOpenSource,
}: {
  children: ReactNode;
  onOpenSource: (index: number) => void;
}) {
  const value = useMemo(() => ({ openSource: onOpenSource }), [onOpenSource]);
  return (
    <CitationContext.Provider value={value}>
      {children}
    </CitationContext.Provider>
  );
}

export function useCitation() {
  return useContext(CitationContext);
}
