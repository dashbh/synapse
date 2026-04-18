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
import { usePreferences } from '@/shared/hooks/usePreferences';

export type DrawerTab = 'sessions' | 'documents' | 'sources';
export type DrawerVariant = 'overlay' | 'sidebar';

interface DrawerPrefs {
  open: boolean;
  tab: DrawerTab;
}

const DRAWER_PREFS_KEY = 'kqa.drawer';
const DRAWER_PREFS_DEFAULTS: DrawerPrefs = { open: true, tab: 'sessions' };

interface DrawerContextValue {
  isOpen: boolean;
  activeTab: DrawerTab;
  sources: RawSource[];
  activeCitationIndex: number | null;
  documentCount: number;
  pendingFile: File | null;
  variant: DrawerVariant;
  /** Incremented after each completed stream — SessionSwitcher watches this to auto-refresh. */
  sessionListVersion: number;
  bumpSessionVersion: () => void;
  /** Register the "New Chat" handler from the parent app. Uses a ref — no re-render. */
  registerNewChat: (fn: () => void) => void;
  /** Called by DocumentDrawer's New Chat button — delegates to registered handler. */
  triggerNewChat: () => void;
  /** Register the "Switch Session" handler from the parent app. Uses a ref — no re-render. */
  registerSwitchSession: (fn: (id: string) => void) => void;
  /** Called by SessionSwitcher when a session is selected — delegates to registered handler. */
  triggerSwitchSession: (id: string) => void;
  openDocuments: () => void;
  openSources: (citationIndex?: number) => void;
  openSessions: () => void;
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
  const [prefs, updatePrefs] = usePreferences<DrawerPrefs>(DRAWER_PREFS_KEY, DRAWER_PREFS_DEFAULTS);

  // Initialize from persisted preferences
  const [isOpen, setIsOpenState] = useState<boolean>(prefs.open);
  const [activeTab, setActiveTabState] = useState<DrawerTab>(prefs.tab);

  const [sources, setSources] = useState<RawSource[]>([]);
  const [activeCitationIndex, setActiveCitationIndex] = useState<number | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [pendingFile, setPendingFileState] = useState<File | null>(null);
  const [sessionListVersion, setSessionListVersion] = useState(0);

  // Setters that also persist the new value
  const setIsOpen = useCallback((v: boolean) => {
    setIsOpenState(v);
    updatePrefs({ open: v });
  }, [updatePrefs]);

  const setActiveTab = useCallback((tab: DrawerTab) => {
    setActiveTabState(tab);
    updatePrefs({ tab });
  }, [updatePrefs]);

  const bumpSessionVersion = useCallback(() => setSessionListVersion((v) => v + 1), []);

  // Callback relays (ref-based — no re-render on registration)
  const newChatRef = useRef<(() => void) | null>(null);
  const registerNewChat = useCallback((fn: () => void) => { newChatRef.current = fn; }, []);
  const triggerNewChat = useCallback(() => { newChatRef.current?.(); }, []);

  const switchSessionRef = useRef<((id: string) => void) | null>(null);
  const registerSwitchSession = useCallback((fn: (id: string) => void) => { switchSessionRef.current = fn; }, []);
  const triggerSwitchSession = useCallback((id: string) => { switchSessionRef.current?.(id); }, []);

  const toggle = useCallback(() => {
    setIsOpenState((prev) => {
      const next = !prev;
      updatePrefs({ open: next });
      return next;
    });
  }, [updatePrefs]);

  const close = useCallback(() => setIsOpen(false), [setIsOpen]);

  const openDocuments = useCallback(() => {
    setActiveTab('documents');
    setIsOpen(true);
  }, [setActiveTab, setIsOpen]);

  const openSources = useCallback((citationIndex?: number) => {
    setActiveTab('sources');
    setActiveCitationIndex(citationIndex ?? null);
    setIsOpen(true);
  }, [setActiveTab, setIsOpen]);

  const openSessions = useCallback(() => {
    setActiveTab('sessions');
    setIsOpen(true);
  }, [setActiveTab, setIsOpen]);

  const setPendingFile = useCallback((file: File) => {
    setPendingFileState(file);
    setActiveTab('documents');
    setIsOpen(true);
  }, [setActiveTab, setIsOpen]);

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
        sessionListVersion,
        bumpSessionVersion,
        registerNewChat,
        triggerNewChat,
        registerSwitchSession,
        triggerSwitchSession,
        openDocuments,
        openSources,
        openSessions,
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
