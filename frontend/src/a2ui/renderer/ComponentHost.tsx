'use client';

import { useState, useEffect, useCallback } from 'react';
import { type ComponentModel, type SurfaceModel, type ComponentApi } from '@a2ui/web_core/v0_9';
import { catalogComponentMap } from '@/a2ui/catalog';

interface ComponentHostProps {
  componentModel: ComponentModel;
  surface: SurfaceModel<ComponentApi>;
}

/**
 * Subscribes to a ComponentModel's updates and renders the matching catalog
 * component. Provides a `renderChild(id)` callback so container components
 * (e.g. Card) can render nested child components by ID.
 */
export function ComponentHost({ componentModel, surface }: ComponentHostProps) {
  const [props, setProps] = useState<Record<string, unknown>>(
    () => componentModel.properties
  );

  useEffect(() => {
    const sub = componentModel.onUpdated.subscribe((model) => {
      setProps({ ...model.properties });
    });
    return () => sub.unsubscribe();
  }, [componentModel]);

  // Allows catalog components (e.g. Card) to render nested children by component ID
  const renderChild = useCallback(
    (id: string): React.ReactElement | null => {
      const child = surface.componentsModel.get(id);
      if (!child) return null;
      return <ComponentHost key={id} componentModel={child} surface={surface} />;
    },
    [surface]
  );

  const renderer = catalogComponentMap[componentModel.type];

  if (!renderer) {
    return (
      <div className="text-xs text-gray-400 italic">
        Unknown component: {componentModel.type}
      </div>
    );
  }

  return renderer(props, renderChild);
}
