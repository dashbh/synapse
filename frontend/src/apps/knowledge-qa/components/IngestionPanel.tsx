'use client';

import { useCallback, useRef, useState } from 'react';
import { useIngestionStream, type IngestionStep, type StepState } from '../hooks/useIngestionStream';

const INGEST_ENDPOINT = '/api/agents/ingest';

const STEP_ORDER: IngestionStep[] = ['upload', 'parsing', 'chunking', 'embedding', 'storing'];

const STEP_LABELS: Record<IngestionStep, string> = {
  upload: 'Upload',
  parsing: 'Parsing',
  chunking: 'Chunking',
  embedding: 'Embedding',
  storing: 'Storing',
};

function StepRow({ step, state }: { step: IngestionStep; state: StepState }) {
  const icon = {
    idle: <span className="w-4 h-4 rounded-full border border-gray-300 inline-block" />,
    in_progress: (
      <span className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent inline-block animate-spin" />
    ),
    done: (
      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
      </svg>
    ),
  }[state.status];

  const labelColor = {
    idle: 'text-gray-400',
    in_progress: 'text-blue-700 font-medium',
    done: 'text-green-700',
    error: 'text-red-600',
  }[state.status];

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center justify-center w-5">{icon}</span>
      <span className={`text-sm ${labelColor}`}>{STEP_LABELS[step]}</span>
      {state.message && (
        <span className="text-xs text-gray-400 truncate">{state.message}</span>
      )}
    </div>
  );
}

export function IngestionPanel() {
  const { steps, isStreaming, isDone, isError, isUnauthorized, start, reset } =
    useIngestionStream(INGEST_ENDPOINT);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [adminToken, setAdminToken] = useState('');

  const tokenProvided = adminToken.trim().length > 0;

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !tokenProvided) return;
      setFileName(file.name);
      reset();
      start(file, adminToken.trim());
    },
    [start, reset, adminToken, tokenProvided]
  );

  const handleReset = useCallback(() => {
    reset();
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [reset]);

  const hasStarted = STEP_ORDER.some((s) => steps[s].status !== 'idle');

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <span>Upload Documents</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 16 16"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-gray-100">
          {/* Admin token gate */}
          <div className="pt-3 flex flex-col gap-1.5">
            <label htmlFor="admin-token" className="text-xs font-medium text-gray-500">
              Admin token
            </label>
            <input
              id="admin-token"
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Enter admin token to enable upload"
              className="w-full rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
            {!tokenProvided && (
              <p className="text-[11px] text-gray-400">
                A valid admin token is required to ingest documents.
              </p>
            )}
          </div>

          {/* File picker — only active with a token */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.docx"
              className="hidden"
              id="ingest-file"
              onChange={handleFileChange}
              disabled={isStreaming || !tokenProvided}
            />
            <label
              htmlFor="ingest-file"
              className={[
                'cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                isStreaming || !tokenProvided
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                  : 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100',
              ].join(' ')}
            >
              Choose file
            </label>
            {fileName && (
              <span className="text-xs text-gray-500 truncate max-w-[200px]">{fileName}</span>
            )}
            {hasStarted && !isStreaming && (
              <button
                type="button"
                onClick={handleReset}
                className="ml-auto text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
              >
                Reset
              </button>
            )}
          </div>

          {/* Progress steps */}
          {hasStarted && (
            <div className="flex flex-col gap-2 pl-1">
              {STEP_ORDER.map((step) => (
                <StepRow key={step} step={step} state={steps[step]} />
              ))}
            </div>
          )}

          {/* Result banners */}
          {isDone && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              Document ingested successfully. You can now query it above.
            </p>
          )}
          {isUnauthorized && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Access denied — invalid admin token. Check your token and try again.
            </p>
          )}
          {isError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              Ingestion failed. Check the console for details and try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
