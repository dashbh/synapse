/**
 * Module-level singleton that lets SourceListComponent publish sources
 * to the app-level DocumentDrawer without importing from the app layer.
 */
export interface RawSource {
  id: string;
  title: string;
  excerpt: string;
  score: number;
  document: string;
  section: string;
  date: string;
  category: string;
  url: string;
}

type SourcesHandler = (sources: RawSource[]) => void;

let _handler: SourcesHandler | null = null;

export const sourceRegistry = {
  register: (fn: SourcesHandler): void => { _handler = fn; },
  unregister: (): void => { _handler = null; },
  update: (sources: RawSource[]): void => _handler?.(sources),
};
