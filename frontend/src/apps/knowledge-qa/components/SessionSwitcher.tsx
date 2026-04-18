'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Trash2, Check, X } from 'lucide-react';
import { useDrawer } from '../context/DrawerContext';

interface SessionItem {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SessionRow({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  session: SessionItem;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(session.name);
    setEditing(true);
    // Focus input on next tick
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const confirmEdit = () => {
    const name = draft.trim();
    if (name && name !== session.name) onRename(name);
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(session.name);
    setEditing(false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={editing ? undefined : onSelect}
      onKeyDown={(e) => !editing && e.key === 'Enter' && onSelect()}
      className={[
        'group flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]',
        isActive
          ? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)] shadow-sm'
          : 'border-[var(--color-neutral-100)] bg-white hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)]/40',
      ].join(' ')}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <MessageSquare className={[
          'h-4 w-4',
          isActive ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-neutral-400)] group-hover:text-[var(--color-primary-400)]',
        ].join(' ')} />
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              autoFocus
              className="flex-1 min-w-0 rounded-md border border-[var(--color-primary-300)] bg-white px-2 py-0.5 text-xs text-[var(--color-neutral-800)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-400)]"
            />
            <button type="button" onClick={confirmEdit} className="shrink-0 p-1 rounded text-[var(--color-success-600)] hover:bg-[var(--color-neutral-100)] cursor-pointer">
              <Check className="h-3 w-3" />
            </button>
            <button type="button" onClick={cancelEdit} className="shrink-0 p-1 rounded text-[var(--color-neutral-400)] hover:bg-[var(--color-neutral-100)] cursor-pointer">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <p
            onDoubleClick={startEdit}
            title="Double-click to rename"
            className="text-xs font-medium text-[var(--color-neutral-800)] truncate leading-snug"
          >
            {session.name}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[10px] text-[var(--color-neutral-400)]">
            {formatRelativeDate(session.updated_at)}
          </span>
          {session.message_count > 0 && (
            <span className="text-[10px] text-[var(--color-neutral-400)]">
              · {Math.floor(session.message_count / 2)} turn{Math.floor(session.message_count / 2) !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Delete button — only visible on hover */}
      {!editing && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete session"
          className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-[var(--color-neutral-400)] hover:text-[var(--color-error-600)] hover:bg-[var(--color-error-50)] transition-all cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function SessionSwitcher({
  activeSessionId,
  refreshKey,
}: {
  activeSessionId: string | null;
  refreshKey?: number;
}) {
  const drawer = useDrawer();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(() => {
    fetch('/api/sessions', { credentials: 'include' })
      .then((res) => (res.ok ? (res.json() as Promise<SessionItem[]>) : Promise.resolve([])))
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  // Initial fetch + re-fetch whenever refreshKey increments
  useEffect(() => { fetchSessions(); }, [fetchSessions, refreshKey]);

  const handleSelect = useCallback((id: string) => {
    if (id === activeSessionId) return;
    drawer.triggerSwitchSession(id);
  }, [activeSessionId, drawer]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE', credentials: 'include' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      // If we deleted the active session, trigger a new chat
      if (id === activeSessionId) drawer.triggerNewChat();
    } catch { /* graceful */ }
  }, [activeSessionId, drawer]);

  const handleRename = useCallback(async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setSessions((prev) => prev.map((s) => s.id === id ? { ...s, name } : s));
      }
    } catch { /* graceful */ }
  }, []);

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--color-neutral-100)] bg-white p-3 animate-pulse space-y-2">
            <div className="h-3 w-2/3 rounded bg-[var(--color-neutral-200)]" />
            <div className="h-2.5 w-1/3 rounded bg-[var(--color-neutral-100)]" />
          </div>
        ))}
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
        <div className="rounded-2xl bg-[var(--color-neutral-50)] p-4">
          <MessageSquare className="h-8 w-8 text-[var(--color-neutral-300)]" />
        </div>
        <p className="text-sm font-medium text-[var(--color-neutral-500)]">No sessions yet</p>
        <p className="text-xs text-[var(--color-neutral-400)]">Your chat sessions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-2">
      <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-neutral-400)] mb-1">
        {sessions.length} session{sessions.length !== 1 ? 's' : ''}
      </p>
      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          isActive={session.id === activeSessionId}
          onSelect={() => handleSelect(session.id)}
          onDelete={() => handleDelete(session.id)}
          onRename={(name) => handleRename(session.id, name)}
        />
      ))}
    </div>
  );
}
