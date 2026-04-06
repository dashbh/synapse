export const designTokens = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    neutral: '#6B7280',
    background: '#FFFFFF',
    foreground: '#1F2937',
  },
  typography: {
    h1: { fontSize: '2.25rem', fontWeight: '700', lineHeight: '1.1' },
    h2: { fontSize: '1.875rem', fontWeight: '700', lineHeight: '1.2' },
    h3: { fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.25' },
    body: { fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' },
    caption: { fontSize: '0.875rem', fontWeight: '400', lineHeight: '1.25' },
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
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
  },
} as const;

export type DesignTokens = typeof designTokens;
