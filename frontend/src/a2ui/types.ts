/**
 * Re-exports the A2UI v0.9 message types from the library as the canonical types
 * for this project. Do not redefine these manually.
 */
export type {
  A2uiMessage,
  CreateSurfaceMessage,
  UpdateComponentsMessage,
  UpdateDataModelMessage,
  DeleteSurfaceMessage,
} from '@a2ui/web_core/v0_9';

/**
 * A DynamicValue at the property level: either a plain primitive (static)
 * or an object with a `path` key (data binding, resolved in T4).
 */
export type DynamicValue =
  | string
  | number
  | boolean
  | { path: string }
  | { call: string; args: Record<string, unknown> };

/**
 * Resolves a DynamicValue to a primitive for static/T3 rendering.
 * Path-bound and function-call values return undefined (resolved in T4).
 */
export function resolveStaticValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  return undefined;
}

/**
 * Resolves a DynamicValue to a string for static/T3 rendering.
 */
export function resolveStaticString(value: unknown): string {
  const resolved = resolveStaticValue(value);
  return resolved !== undefined ? String(resolved) : '';
}
