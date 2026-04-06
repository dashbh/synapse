'use client';

import { useState, useEffect } from 'react';
import { type SurfaceModel, type ComponentModel, type ComponentApi } from '@a2ui/web_core/v0_9';
import { ComponentHost } from './ComponentHost';

interface SurfaceViewProps {
  surface: SurfaceModel<ComponentApi>;
}

/**
 * Renders all components on a single A2UI surface. Subscribes to component
 * creation/deletion events so the UI updates reactively as messages arrive.
 */
export function SurfaceView({ surface }: SurfaceViewProps) {
  const [components, setComponents] = useState<ComponentModel[]>(() =>
    [...surface.componentsModel.entries].map(([, model]) => model)
  );

  useEffect(() => {
    const created = surface.componentsModel.onCreated.subscribe((model) => {
      setComponents((prev) => [...prev, model]);
    });

    const deleted = surface.componentsModel.onDeleted.subscribe((id) => {
      setComponents((prev) => prev.filter((c) => c.id !== id));
    });

    return () => {
      created.unsubscribe();
      deleted.unsubscribe();
    };
  }, [surface]);

  return (
    <div className="flex flex-col gap-3" data-surface-id={surface.id}>
      {components.map((model) => (
        <ComponentHost key={model.id} componentModel={model} surface={surface} />
      ))}
    </div>
  );
}
