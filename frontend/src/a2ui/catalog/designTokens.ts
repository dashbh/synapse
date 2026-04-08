/**
 * Design Tokens — single source of truth for the Synapse platform visual language.
 * These values are wired into globals.css CSS custom properties and must not be
 * duplicated as scattered constants elsewhere.
 */
export const designTokens = {
  colors: {
    primary: '#4F46E5',   // Indigo-600 — actions, focus rings, active states
    secondary: '#8B5CF6', // Violet-500 — accents, secondary highlights
    success: '#10B981',   // Emerald-500 — success, done states
    warning: '#F59E0B',   // Amber-500 — warnings
    error: '#EF4444',     // Red-500 — errors, destructive
    neutral: '#6B7280',   // Gray-500 — secondary text
    background: '#FFFFFF', // Page surface
    foreground: '#1F2937', // Primary text
    headerBackground: '#1e1b4b', // Dark header / drawer surface (indigo-950)
  },
  typography: {
    h1: { fontSize: '2.25rem', fontWeight: '700', lineHeight: '1.1' },
    h2: { fontSize: '1.875rem', fontWeight: '700', lineHeight: '1.2' },
    h3: { fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.25' },
    body: { fontSize: '1rem', fontWeight: '400', lineHeight: '1.6' },
    caption: { fontSize: '0.875rem', fontWeight: '400', lineHeight: '1.4' },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    md: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
    lg: '0 20px 40px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
} as const;

export type DesignTokens = typeof designTokens;
