'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('fe.ingest');

export type IngestionStep = 'upload' | 'parsing' | 'chunking' | 'embedding' | 'storing';
export type StepStatus = 'idle' | 'in_progress' | 'done' | 'error';

export interface StepState {
  status: StepStatus;
  message: string;
}

export type IngestionSteps = Record<IngestionStep, StepState>;

export const STEP_ORDER: IngestionStep[] = ['upload', 'parsing', 'chunking', 'embedding', 'storing'];

/** Contribution to total progress (must sum to 100) */
const STEP_WEIGHTS: Record<IngestionStep, number> = {
  upload: 10,
  parsing: 20,
  chunking: 20,
  embedding: 35,
  storing: 15,
};

const INITIAL_STEPS: IngestionSteps = {
  upload: { status: 'idle', message: '' },
  parsing: { status: 'idle', message: '' },
  chunking: { status: 'idle', message: '' },
  embedding: { status: 'idle', message: '' },
  storing: { status: 'idle', message: '' },
};

interface IngestionProgressMessage {
  step: IngestionStep;
  status: StepStatus;
  message: string;
}

interface UseIngestionStreamReturn {
  steps: IngestionSteps;
  progress: number;             // 0–100
  currentMessage: string;       // message from the active in_progress step
  isStreaming: boolean;
  isDone: boolean;
  isError: boolean;
  isUnauthorized: boolean;
  start: (file: File) => void;
  reset: () => void;
}

export function useIngestionStream(endpoint: string): UseIngestionStreamReturn {
  const [steps, setSteps] = useState<IngestionSteps>(INITIAL_STEPS);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const progress = useMemo(() => {
    return STEP_ORDER.reduce((total, step) => {
      const s = steps[step];
      if (s.status === 'done') return total + STEP_WEIGHTS[step];
      if (s.status === 'in_progress') return total + Math.round(STEP_WEIGHTS[step] * 0.5);
      return total;
    }, 0);
  }, [steps]);

  const currentMessage = useMemo(() => {
    const active = STEP_ORDER.find((s) => steps[s].status === 'in_progress');
    return active ? steps[active].message : '';
  }, [steps]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSteps(INITIAL_STEPS);
    setIsStreaming(false);
    setIsDone(false);
    setIsError(false);
    setIsUnauthorized(false);
  }, []);

  const start = useCallback(
    (file: File) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSteps(INITIAL_STEPS);
      setIsStreaming(true);
      setIsDone(false);
      setIsError(false);
      setIsUnauthorized(false);

      const formData = new FormData();
      formData.append('file', file);
      log.info('ingest_start', { file_name: file.name, file_size: file.size });

      (async () => {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });

          if (response.status === 401 || response.status === 403) {
            log.warn('ingest_unauthorized', { file_name: file.name });
            setIsStreaming(false);
            setIsUnauthorized(true);
            return;
          }

          if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
          if (!response.body) throw new Error('Response has no body');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              try {
                const msg = JSON.parse(trimmed) as IngestionProgressMessage;
                log.info('ingest_step', { step: msg.step, status: msg.status });
                setSteps((prev) => ({
                  ...prev,
                  [msg.step]: { status: msg.status, message: msg.message },
                }));
              } catch {
                log.error('ingest_parse_error', { line: trimmed.slice(0, 200) });
              }
            }
          }

          log.info('ingest_complete', { file_name: file.name });
          setIsStreaming(false);
          setIsDone(true);
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          log.error('ingest_stream_error', { error: (err as Error).message });
          setIsStreaming(false);
          setIsError(true);
        } finally {
          abortRef.current = null;
        }
      })();
    },
    [endpoint]
  );

  return { steps, progress, currentMessage, isStreaming, isDone, isError, isUnauthorized, start, reset };
}
