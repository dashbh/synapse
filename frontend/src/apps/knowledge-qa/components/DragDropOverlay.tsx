'use client';

import { useEffect, useRef, useState } from 'react';

interface DragDropOverlayProps {
  onFileDrop: (file: File) => void;
}

export function DragDropOverlay({ onFileDrop }: DragDropOverlayProps) {
  const [isActive, setIsActive] = useState(false);
  const counterRef = useRef(0); // track nested dragenter/dragleave events

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      counterRef.current++;
      setIsActive(true);
    };

    const onDragLeave = () => {
      counterRef.current--;
      if (counterRef.current <= 0) {
        counterRef.current = 0;
        setIsActive(false);
      }
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      counterRef.current = 0;
      setIsActive(false);
      const file = e.dataTransfer?.files[0];
      if (file) onFileDrop(file);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [onFileDrop]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--color-primary-600)]/10 backdrop-blur-sm" />

      {/* Dashed border frame */}
      <div className="absolute inset-4 rounded-3xl border-2 border-dashed border-[var(--color-primary-400)] bg-[var(--color-primary-50)]/60" />

      {/* Centre card */}
      <div className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-2xl bg-white shadow-2xl ring-1 ring-[var(--color-primary-200)]">
        {/* Animated upload icon */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-600)]">
          <span
            className="absolute inset-0 rounded-2xl bg-[var(--color-primary-400)] opacity-40"
            style={{ animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite' }}
          />
          <svg
            className="relative h-8 w-8 text-white"
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

        <div className="text-center">
          <p className="text-base font-semibold text-[var(--color-neutral-900)]">
            Drop to ingest
          </p>
          <p className="mt-1 text-sm text-[var(--color-neutral-400)]">
            PDF · DOCX · TXT · MD
          </p>
        </div>
      </div>
    </div>
  );
}
