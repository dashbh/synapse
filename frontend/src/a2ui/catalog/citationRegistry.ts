/**
 * Module-level singleton that lets MarkdownComponent trigger drawer actions
 * without importing from the app layer (avoids circular deps).
 */
type CitationHandler = (index: number) => void;

let _handler: CitationHandler | null = null;

export const citationRegistry = {
  register: (fn: CitationHandler): void => { _handler = fn; },
  unregister: (): void => { _handler = null; },
  trigger: (index: number): void => _handler?.(index),
};
