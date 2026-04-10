'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileText, Scissors, Cpu, Database } from 'lucide-react';
import {
  useIngestionStream,
  STEP_ORDER,
  type IngestionStep,
  type StepState,
} from '../hooks/useIngestionStream';
import { useDrawer } from '../context/DrawerContext';

const INGEST_ENDPOINT = '/api/agents/ingest';

const STEP_LABELS: Record<IngestionStep, string> = {
  upload: 'Upload',
  parsing: 'Parsing',
  chunking: 'Chunking',
  embedding: 'Embedding',
  storing: 'Storing',
};

const STEP_ICONS: Record<IngestionStep, React.ElementType> = {
  upload: Upload,
  parsing: FileText,
  chunking: Scissors,
  embedding: Cpu,
  storing: Database,
};

// ---------------------------------------------------------------------------
// Vertical stepper row
// ---------------------------------------------------------------------------

function StepperRow({
  step,
  state,
  isLast,
}: {
  step: IngestionStep;
  state: StepState;
  isLast: boolean;
}) {
  const dot = {
    idle: (
      <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[var(--color-neutral-200)] bg-white" />
    ),
    in_progress: (
      <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-primary-600)] shadow-[var(--shadow-glow-primary-sm)]">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary-400)] opacity-60" />
        <span className="relative h-2 w-2 rounded-full bg-white" />
      </span>
    ),
    done: (
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-success-500)]">
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l2.5 2.5L10 3" />
        </svg>
      </span>
    ),
    error: (
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-error-500)]">
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l6 6M9 3l-6 6" />
        </svg>
      </span>
    ),
  }[state.status];

  const labelColor = {
    idle: 'text-[var(--color-neutral-400)]',
    in_progress: 'text-[var(--color-primary-700)] font-semibold',
    done: 'text-[var(--color-success-700)] font-medium',
    error: 'text-[var(--color-error-600)] font-medium',
  }[state.status];

  return (
    <div className="flex gap-3">
      {/* Dot + connector line */}
      <div className="flex flex-col items-center">
        {dot}
        {!isLast && <div className="w-px flex-1 bg-[var(--color-neutral-200)] mt-1 mb-1 min-h-[1rem]" />}
      </div>

      {/* Content */}
      <div className="pb-3 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {(() => { const Icon = STEP_ICONS[step]; return <Icon className={`w-3.5 h-3.5 shrink-0 ${labelColor}`} />; })()}
          <p className={`text-xs ${labelColor}`}>{STEP_LABELS[step]}</p>
        </div>
        {state.message && state.status !== 'idle' && (
          <p className="text-[11px] text-[var(--color-neutral-400)] mt-0.5 truncate">{state.message}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress card
// ---------------------------------------------------------------------------

function ProgressCard({
  fileName,
  progress,
  currentMessage,
}: {
  fileName: string;
  progress: number;
  currentMessage: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-primary-100)] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-[var(--color-neutral-800)] truncate">Ingesting {fileName}…</p>
      <div className="mt-3 h-1.5 rounded-full bg-[var(--color-neutral-100)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-[var(--color-neutral-400)] truncate">{currentMessage || 'Processing…'}</p>
        <p className="text-[11px] font-medium text-[var(--color-primary-600)] shrink-0 ml-2">{progress}%</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IngestionPanel
// ---------------------------------------------------------------------------

export function IngestionPanel() {
  const { steps, progress, currentMessage, isStreaming, isDone, isError, isUnauthorized, start, reset } =
    useIngestionStream(INGEST_ENDPOINT);
  const { pendingFile, clearPendingFile, onIngestionSuccess } = useDrawer();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const hasStarted = STEP_ORDER.some((s) => steps[s].status !== 'idle');

  // Respond to files dropped via the global DragDropOverlay
  useEffect(() => {
    if (pendingFile) {
      setFileName(pendingFile.name);
      reset();
      start(pendingFile);
      clearPendingFile();
    }
  }, [pendingFile, start, reset, clearPendingFile]);

  // Notify context when ingestion completes so badge count updates
  const prevDoneRef = useRef(false);
  useEffect(() => {
    if (isDone && !prevDoneRef.current) {
      onIngestionSuccess();
    }
    prevDoneRef.current = isDone;
  }, [isDone, onIngestionSuccess]);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      reset();
      start(file);
    },
    [start, reset]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleReset = useCallback(() => {
    reset();
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [reset]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Section label */}
      <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-neutral-400)]">
        Upload Document
      </p>

      {/* Drag & drop zone */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          className="hidden"
          id="ingest-file"
          onChange={handleFileInput}
          disabled={isStreaming}
        />
        <label
          htmlFor="ingest-file"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all cursor-pointer',
            isStreaming
              ? 'border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] opacity-60 cursor-not-allowed'
              : isDragging
              ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)] shadow-[var(--shadow-glow-primary-inset)]'
              : 'border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)]/50',
          ].join(' ')}
        >
          <div className={`rounded-lg p-2 ${isDragging ? 'bg-[var(--color-primary-100)]' : 'bg-[var(--color-neutral-100)]'}`}>
            <svg
              className={`w-5 h-5 ${isDragging ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-neutral-400)]'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-neutral-600)]">
              {isDragging ? 'Drop to upload' : 'Drop file or click to browse'}
            </p>
            <p className="text-[11px] text-[var(--color-neutral-400)] mt-0.5">PDF · TXT · MD · DOCX</p>
          </div>
        </label>
      </div>

      {/* Progress card — shown while streaming */}
      {isStreaming && fileName && (
        <ProgressCard
          fileName={fileName}
          progress={progress}
          currentMessage={currentMessage}
        />
      )}

      {/* Vertical stepper — shown once started */}
      {hasStarted && (
        <div className="pt-1">
          {STEP_ORDER.map((step, idx) => (
            <StepperRow
              key={step}
              step={step}
              state={steps[step]}
              isLast={idx === STEP_ORDER.length - 1}
            />
          ))}
        </div>
      )}

      {/* Result banners */}
      {isDone && (
        <div className="rounded-lg bg-[var(--color-success-50)] border border-[var(--color-success-200)] px-3 py-2.5">
          <p className="text-xs font-medium text-[var(--color-success-700)]">Ingested successfully</p>
          <p className="text-[11px] text-[var(--color-success-600)] mt-0.5">Ready to query above.</p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-2 text-[11px] text-[var(--color-success-600)] underline underline-offset-2 hover:text-[var(--color-success-800)]"
          >
            Upload another
          </button>
        </div>
      )}
      {isUnauthorized && (
        <div className="rounded-lg bg-[var(--color-warning-50)] border border-[var(--color-warning-200)] px-3 py-2.5">
          <p className="text-xs font-medium text-[var(--color-warning-700)]">Invalid admin token</p>
          <p className="text-[11px] text-[var(--color-warning-600)] mt-0.5">Check your token and try again.</p>
        </div>
      )}
      {isError && (
        <div className="rounded-lg bg-[var(--color-error-50)] border border-[var(--color-error-200)] px-3 py-2.5">
          <p className="text-xs font-medium text-[var(--color-error-700)]">Ingestion failed</p>
          <p className="text-[11px] text-[var(--color-error-600)] mt-0.5">Check console for details.</p>
        </div>
      )}
    </div>
  );
}
