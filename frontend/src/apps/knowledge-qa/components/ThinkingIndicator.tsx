'use client';

import { useEffect, useRef, useState } from 'react';
import { StreamStatus } from '@/a2ui/transport/types';

const PROCESS_STEPS = [
  'Embedding query…',
  'Searching vectors…',
  'Synthesizing context…',
  'Generating response…',
];

// Cumulative delay in ms before each step appears
const STEP_DELAYS = [0, 700, 1600, 2800];

interface ThinkingIndicatorProps {
  status: StreamStatus;
}

export function ThinkingIndicator({ status }: ThinkingIndicatorProps) {
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isStreaming = status === StreamStatus.STREAMING;

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (!isStreaming) {
      // Use a microtask to avoid synchronous setState inside effect
      const t = setTimeout(() => setVisibleSteps(0), 0);
      timersRef.current.push(t);
      return;
    }

    setVisibleSteps(1);
    STEP_DELAYS.slice(1).forEach((delay, i) => {
      const t = setTimeout(() => setVisibleSteps(i + 2), delay);
      timersRef.current.push(t);
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [isStreaming]);

  if (!isStreaming) return null;

  return (
    <div className="flex items-start gap-3 px-1 py-3">
      {/* Gemini-style conic spinner */}
      <div className="relative shrink-0 mt-0.5" style={{ width: 20, height: 20 }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, #4F46E5 0%, #06B6D4 30%, #10B981 55%, #F59E0B 75%, #EF4444 88%, #4F46E5 100%)',
            animation: 'spin 1.1s linear infinite',
          }}
        />
        <div className="absolute rounded-full bg-white" style={{ inset: 3 }} />
        <div
          className="absolute rounded-full"
          style={{
            inset: 6,
            background:
              'conic-gradient(from 90deg, #4F46E5, #8B5CF6, #06B6D4)',
            animation: 'spin 1.8s linear infinite reverse',
          }}
        />
      </div>

      {/* Process log — steps appear sequentially */}
      <div className="flex flex-col gap-0.5 min-w-0">
        {PROCESS_STEPS.slice(0, visibleSteps).map((step, i) => {
          const isActive = i === visibleSteps - 1;
          return (
            <p
              key={step}
              className={[
                'text-xs transition-all duration-300',
                isActive
                  ? 'text-[var(--color-neutral-600)] font-medium'
                  : 'text-[var(--color-neutral-300)]',
              ].join(' ')}
            >
              {isActive ? step : <s className="no-underline opacity-50">{step.replace('…', ' ✓')}</s>}
            </p>
          );
        })}
      </div>
    </div>
  );
}
