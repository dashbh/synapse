'use client';

import { useState, useEffect } from 'react';
import { type SurfaceModel, type ComponentApi } from '@a2ui/web_core/v0_9';
import { useMessageProcessor } from '@/a2ui/processor/MessageProcessorProvider';
import { SurfaceView } from './SurfaceView';

interface A2UISurfaceProps {
  /** Show a skeleton while waiting for the first surface to arrive. */
  loading?: boolean;
}

/** Pulse skeleton whose shape mirrors the expected KnowledgeQA output. */
function SurfaceSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" aria-hidden="true">
      {/* Answer heading */}
      <div className="h-7 w-24 rounded bg-gray-200" />
      {/* Answer body lines */}
      <div className="flex flex-col gap-2">
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
        <div className="h-4 w-4/6 rounded bg-gray-200" />
      </div>
      {/* Sources heading */}
      <div className="mt-1 h-5 w-20 rounded bg-gray-200" />
      {/* Source cards */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[4.5rem] rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

/**
 * Subscribes to the MessageProcessor's surface lifecycle and renders a
 * SurfaceView for each active surface. Accepts an optional `loading` flag
 * to show a skeleton while the first surface is in flight.
 */
export function A2UISurface({ loading = false }: A2UISurfaceProps) {
  const processor = useMessageProcessor();
  const [surfaces, setSurfaces] = useState<SurfaceModel<ComponentApi>[]>(() =>
    [...processor.model.surfacesMap.values()]
  );

  useEffect(() => {
    const created = processor.model.onSurfaceCreated.subscribe((surface) => {
      setSurfaces((prev) => [...prev, surface]);
    });

    const deleted = processor.model.onSurfaceDeleted.subscribe((id) => {
      setSurfaces((prev) => prev.filter((s) => s.id !== id));
    });

    return () => {
      created.unsubscribe();
      deleted.unsubscribe();
    };
  }, [processor]);

  if (surfaces.length === 0) {
    return loading ? <SurfaceSkeleton /> : null;
  }

  return (
    <div className="flex flex-col gap-4">
      {surfaces.map((surface) => (
        <SurfaceView key={surface.id} surface={surface} />
      ))}
    </div>
  );
}
