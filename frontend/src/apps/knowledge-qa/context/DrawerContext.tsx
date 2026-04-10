'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { RawSource } from '@/a2ui/catalog/sourceRegistry';

type DrawerTab = 'documents' | 'sources';
export type DrawerVariant = 'overlay' | 'sidebar';

interface DrawerContextValue {
  isOpen: boolean;
  activeTab: DrawerTab;
  sources: RawSource[];
  activeCitationIndex: number | null;
  documentCount: number;
  pendingFile: File | null;
  variant: DrawerVariant;
  /** Register the "New Chat" handler from the parent app. Uses a ref — no re-render. */
  registerNewChat: (fn: () => void) => void;
  /** Called by DocumentDrawer's New Chat button — delegates to registered handler. */
  triggerNewChat: () => void;
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

export function DrawerProvider({
  children,
  variant = 'overlay',
}: {
  children: ReactNode;
  variant?: DrawerVariant;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>('documents');
  const [sources, setSources] = useState<RawSource[]>([]);
  const [activeCitationIndex, setActiveCitationIndex] = useState<number | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [pendingFile, setPendingFileState] = useState<File | null>(null);
  const newChatRef = useRef<(() => void) | null>(null);
  const registerNewChat = useCallback((fn: () => void) => { newChatRef.current = fn; }, []);
  const triggerNewChat = useCallback(() => { newChatRef.current?.(); }, []);

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
        variant,
        registerNewChat,
        triggerNewChat,
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
