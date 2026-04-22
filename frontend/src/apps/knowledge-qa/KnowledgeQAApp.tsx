'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('fe.app.knowledge-qa');
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { type SurfaceModel, type ComponentApi, type A2uiMessage } from '@a2ui/web_core/v0_9';
import { SurfaceView } from '@/a2ui/renderer';
import { useMessageProcessor } from '@/a2ui/processor/MessageProcessorProvider';
import { useAgentStream } from '@/a2ui/transport/useAgentStream';
import { StreamStatus } from '@/a2ui/transport/types';
import { CitationProvider } from '@/a2ui/catalog/CitationContext';
import { sourceRegistry } from '@/a2ui/catalog/sourceRegistry';
import { QueryInput } from './components/QueryInput';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { DocumentDrawer } from './components/DocumentDrawer';
import { CommandPalette } from './components/CommandPalette';
import { DragDropOverlay } from './components/DragDropOverlay';
import { DrawerProvider, useDrawer } from './context/DrawerContext';
import { useSession } from './hooks/useSession';
import { KNOWLEDGE_QA_CONFIG } from './config';

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS = [
  'Summarize the latest architecture decisions',
  'How does the A2UI protocol handle streaming?',
  'What documents have been ingested into the knowledge base?',
];

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center gap-8 py-16 px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] ring-1 ring-[var(--color-primary-100)]">
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--color-primary-100)] to-transparent animate-pulse opacity-60" />
          <svg className="relative h-7 w-7 text-[var(--color-primary-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[var(--color-neutral-800)]">Ask your knowledge base</p>
        <p className="mt-1 text-xs text-[var(--color-neutral-400)]">Try one of these to get started</p>
      </div>
      <motion.div
        className="flex flex-col gap-2 w-full max-w-lg"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        {SUGGESTED_QUESTIONS.map((q) => (
          <motion.button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
            }}
            className="group flex items-center gap-3 rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3 text-left shadow-sm hover:border-[var(--color-primary-200)] hover:shadow-md transition-all"
          >
            <span className="shrink-0 text-[var(--color-primary-400)] group-hover:text-[var(--color-primary-600)] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </span>
            <span className="text-sm text-[var(--color-neutral-600)] group-hover:text-[var(--color-neutral-900)] transition-colors">{q}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-turn types + components
// ---------------------------------------------------------------------------

interface Turn {
  query: string;
  surfaceId: string;
}

function TurnSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-4 w-full rounded bg-[var(--color-neutral-100)]" />
      <div className="h-4 w-5/6 rounded bg-[var(--color-neutral-100)]" />
      <div className="h-4 w-4/6 rounded bg-[var(--color-neutral-100)]" />
    </div>
  );
}


function TurnView({
  turn,
  isCurrentTurn,
  onOpenSource,
}: {
  turn: Turn;
  isCurrentTurn: boolean;
  onOpenSource: (i: number) => void;
}) {
  const processor = useMessageProcessor();
  const [surface, setSurface] = useState<SurfaceModel<ComponentApi> | null>(
    () => processor.model.surfacesMap.get(turn.surfaceId) ?? null
  );
  // True once the surface has at least one component (i.e. updateComponents has arrived)
  const [hasComponents, setHasComponents] = useState<boolean>(() => {
    const s = processor.model.surfacesMap.get(turn.surfaceId);
    return s ? [...s.componentsModel.entries].length > 0 : false;
  });

  useEffect(() => {
    const sub = processor.model.onSurfaceCreated.subscribe((s) => {
      if (s.id === turn.surfaceId) setSurface(s);
    });
    return () => sub.unsubscribe();
  }, [processor, turn.surfaceId]);

  // Subscribe to the surface's component model to detect when updateComponents arrives
  useEffect(() => {
    if (!surface) return;
    const sub = surface.componentsModel.onCreated.subscribe(() => {
      setHasComponents(true);
    });
    if ([...surface.componentsModel.entries].length > 0) {
      queueMicrotask(() => setHasComponents(true));
    }
    return () => sub.unsubscribe();
  }, [surface]);

  return (
    <div data-testid="turn-view" className="pb-6 border-b border-[var(--color-neutral-100)] last:border-b-0 last:pb-0">
      <p className="text-xs text-[var(--color-neutral-400)] mb-4 truncate">
        <span className="font-medium text-[var(--color-neutral-500)]">Q:</span>{' '}
        {turn.query}
      </p>
      <CitationProvider onOpenSource={onOpenSource}>
        {surface && hasComponents ? (
          <SurfaceView surface={surface} />
        ) : isCurrentTurn ? (
          <TurnSkeleton />
        ) : null}
      </CitationProvider>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner app (has access to DrawerContext)
// ---------------------------------------------------------------------------

/** Stored turn shape returned by GET /api/sessions/{id}/messages */
interface StoredTurn {
  query: string;
  a2ui_payload: {
    version: string;
    updateComponents: { surfaceId: string; components: unknown[] };
  };
}

function KnowledgeQAInner() {
  const { status, start, stop } = useAgentStream(KNOWLEDGE_QA_CONFIG.endpoint);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true); // true until first session check resolves
  const lastHydratedSessionRef = useRef<string | null>(null);
  const drawer = useDrawer();
  const { sessionId, isLoading: sessionLoading, newSession, switchSession } = useSession();
  const processor = useMessageProcessor();

  const isStreaming = status === StreamStatus.STREAMING;
  const isError = status === StreamStatus.ERROR;
  const hasQueried = turns.length > 0;
  const lastTurn = turns[turns.length - 1] ?? null;

  // Replay stored turns from backend whenever sessionId changes to a new (unhydrated) value
  useEffect(() => {
    if (!sessionId || sessionId === lastHydratedSessionRef.current) return;
    lastHydratedSessionRef.current = sessionId;
    queueMicrotask(() => setIsHydrating(true));

    log.info('session_hydrate_start', { session_id: sessionId });
    fetch(`/api/sessions/${sessionId}/messages`, { credentials: 'include' })
      .then((res) => (res.ok ? (res.json() as Promise<StoredTurn[]>) : Promise.resolve([])))
      .then((storedTurns) => {
        log.info('session_hydrate_complete', { session_id: sessionId, turns: storedTurns.length });
        if (!storedTurns.length) return;

        const hydratedTurns: Turn[] = storedTurns.map((stored) => {
          const surfaceId = `qa-turn-${crypto.randomUUID()}`;

          // Feed createSurface first so the processor registers the surface
          const createMsg = {
            version: 'v0.9',
            createSurface: { surfaceId, catalogId: 'stub' },
          } as unknown as A2uiMessage;

          // Patch the stored surfaceId with the new one before replaying
          const updateMsg = {
            version: stored.a2ui_payload.version,
            updateComponents: { ...stored.a2ui_payload.updateComponents, surfaceId },
          } as unknown as A2uiMessage;

          processor.processMessages([createMsg, updateMsg]);
          return { query: stored.query, surfaceId };
        });

        setTurns(hydratedTurns);
      })
      .catch((err) => log.error('session_hydrate_failed', { session_id: sessionId, error: (err as Error).message }))
      .finally(() => setIsHydrating(false));
  }, [sessionId, processor]);

  // Bump session list version when a stream completes so SessionSwitcher auto-refreshes
  const prevStatusRef = useRef<StreamStatus>(StreamStatus.IDLE);
  useEffect(() => {
    if (prevStatusRef.current === StreamStatus.STREAMING && status === StreamStatus.DONE) {
      drawer.bumpSessionVersion();
    }
    prevStatusRef.current = status;
  }, [status, drawer.bumpSessionVersion]);

  // Wire source registry → drawer sources state
  useEffect(() => {
    sourceRegistry.register((sources) => drawer.setSources(sources));
    return () => sourceRegistry.unregister();
  }, [drawer.setSources]);

  // Cmd+K / Ctrl+K → open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = useCallback(
    (query: string) => {
      const surfaceId = `qa-turn-${crypto.randomUUID()}`;

      // Auto-title the session from the first question (fire-and-forget)
      if (turns.length === 0 && sessionId) {
        const title = query.length > 60 ? query.slice(0, 60).trimEnd() + '…' : query;
        fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: title }),
        }).catch(() => {});
      }

      log.info('query_submit', { session_id: sessionId, query_length: query.length, turn: turns.length });
      setTurns((prev) => [...prev, { query, surfaceId }]);
      setInputValue('');
      start(query, {
        surface_id: surfaceId,
        ...(sessionId ? { session_id: sessionId } : {}),
      });
    },
    [start, sessionId, turns]
  );

  const handlePillSelect = useCallback(
    (q: string) => {
      setInputValue(q);
      handleSubmit(q);
    },
    [handleSubmit]
  );

  const handleRetry = useCallback(() => {
    if (lastTurn) {
      start(lastTurn.query, {
        surface_id: lastTurn.surfaceId,
        ...(sessionId ? { session_id: sessionId } : {}),
      });
    }
  }, [lastTurn, start, sessionId]);

  const handleSwitchSession = useCallback(async (id: string) => {
    log.info('session_switch_start', { to_session_id: id, from_session_id: sessionId });
    setIsHydrating(true);
    for (const sid of [...processor.model.surfacesMap.keys()]) {
      processor.model.deleteSurface(sid);
    }
    setTurns([]);
    setInputValue('');
    drawer.setSources([]);
    // Reset the hydration ref so the new session gets hydrated
    lastHydratedSessionRef.current = null;
    await switchSession(id);
    // The hydration useEffect will fire when sessionId changes
  }, [switchSession, processor, drawer, sessionId]);

  const handleNewChat = useCallback(async () => {
    log.info('session_new_chat', { prev_session_id: sessionId });
    const newId = await newSession();
    if (newId) lastHydratedSessionRef.current = newId; // new session is empty — skip hydration
    setTurns([]);
    setInputValue('');
    setIsHydrating(false); // new session has no history; reveal empty state immediately
    for (const id of [...processor.model.surfacesMap.keys()]) {
      processor.model.deleteSurface(id);
    }
    drawer.setSources([]);
  }, [newSession, processor, drawer, sessionId]);

  // Register handlers so drawer buttons can trigger app-level actions
  useEffect(() => {
    drawer.registerNewChat(handleNewChat);
  }, [drawer.registerNewChat, handleNewChat]);

  useEffect(() => {
    drawer.registerSwitchSession(handleSwitchSession);
  }, [drawer.registerSwitchSession, handleSwitchSession]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar/overlay drawer — rendered first so it appears on the left in sidebar mode */}
      <DocumentDrawer activeSessionId={sessionId} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white px-6 pt-4 pb-3">
          {/* Top bar: title + actions */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              {/* Show hamburger in main header only for overlay mode (sidebar mode uses its own strip) */}
              {drawer.variant === 'overlay' && (
                <button
                  type="button"
                  onClick={drawer.toggle}
                  aria-label={drawer.isOpen ? 'Close sidebar' : 'Open sidebar'}
                  className="p-1.5 rounded-lg text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)] transition-colors cursor-pointer"
                >
                  <Menu className="h-4 w-4" />
                </button>
              )}

              <h1 className="text-sm font-semibold text-[var(--color-neutral-800)]">
                Knowledge Q&amp;A
              </h1>

              {/* Session ID debug badge — click to copy full UUID */}
              {sessionId && (
                <button
                  data-testid="session-badge"
                  type="button"
                  title={`Session ID: ${sessionId}\nClick to copy`}
                  onClick={() => navigator.clipboard.writeText(sessionId)}
                  className="font-mono text-[10px] text-[var(--color-neutral-300)] hover:text-[var(--color-neutral-500)] transition-colors cursor-copy select-none"
                >
                  sid:{sessionId.slice(0, 8)}
                </button>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCmdOpen(true)}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-2.5 py-1 text-[11px] text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] hover:border-[var(--color-neutral-300)] transition-colors cursor-pointer"
              >
                <kbd className="font-mono">⌘K</kbd>
                <span>Actions</span>
              </button>
            </div>
          </div>

          {/* Query input */}
          <QueryInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            disabled={isStreaming}
          />

          {/* Thinking indicator — appears below input when streaming */}
          <ThinkingIndicator status={status} />

          {/* Error / retry */}
          {isError && lastTurn && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-[var(--color-error-600)]">Something went wrong.</p>
              <button
                type="button"
                onClick={handleRetry}
                className="text-xs text-[var(--color-primary-600)] underline underline-offset-2 hover:text-[var(--color-primary-700)]"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Scrollable results */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {sessionLoading || isHydrating ? <TurnSkeleton /> : !hasQueried ? (
            <EmptyState onSelect={handlePillSelect} />
          ) : (
            <div className="flex flex-col-reverse gap-6">
              {/* Cancel button — rendered first in DOM = appears at bottom visually in col-reverse */}
              {isStreaming && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={stop}
                    className="text-xs text-[var(--color-neutral-400)] underline underline-offset-2 hover:text-[var(--color-neutral-600)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {turns.map((turn, idx) => (
                <TurnView
                  key={turn.surfaceId}
                  turn={turn}
                  isCurrentTurn={idx === turns.length - 1}
                  onOpenSource={(i) => drawer.openSources(i >= 0 ? i : undefined)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Command palette */}
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Viewport drag-and-drop overlay */}
      <DragDropOverlay onFileDrop={drawer.setPendingFile} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported root — wraps with DrawerProvider
// ---------------------------------------------------------------------------

export function KnowledgeQAApp() {
  return (
    <DrawerProvider variant="sidebar">
      <KnowledgeQAInner />
    </DrawerProvider>
  );
}
