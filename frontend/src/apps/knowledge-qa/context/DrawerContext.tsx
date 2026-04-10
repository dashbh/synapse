'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { RawSource } from '@/a2ui/catalog/sourceRegistry';

type DrawerTab = 'documents' | 'sources';

interface DrawerContextValue {
  isOpen: boolean;
  activeTab: DrawerTab;
  sources: RawSource[];
  activeCitationIndex: number | null;
  documentCount: number;
  pendingFile: File | null;
  openDocuments: () => void;
  openSources: (citationIndex?: number) => void;
  close: () => void;
  toggle: () => void;
  setSources: (sources: RawSource[]) => void;
  setPendingFile: (file: File) => void;
  clearPendingFile: () => void;
  onIngestionSuccess: () => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>('documents');
  const [sources, setSources] = useState<RawSource[]>([]);
  const [activeCitationIndex, setActiveCitationIndex] = useState<number | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [pendingFile, setPendingFileState] = useState<File | null>(null);

  const openDocuments = useCallback(() => {
    setActiveTab('documents');
    setIsOpen(true);
  }, []);

  const openSources = useCallback((citationIndex?: number) => {
    setActiveTab('sources');
    setActiveCitationIndex(citationIndex ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const setPendingFile = useCallback((file: File) => {
    setPendingFileState(file);
    setActiveTab('documents');
    setIsOpen(true);
  }, []);

  const clearPendingFile = useCallback(() => setPendingFileState(null), []);

  const onIngestionSuccess = useCallback(() => {
    setDocumentCount((c) => c + 1);
  }, []);

  return (
    <DrawerContext.Provider
      value={{
        isOpen,
        activeTab,
        sources,
        activeCitationIndex,
        documentCount,
        pendingFile,
        openDocuments,
        openSources,
        close,
        toggle,
        setSources,
        setPendingFile,
        clearPendingFile,
        onIngestionSuccess,
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useDrawer must be used within DrawerProvider');
  return ctx;
}
