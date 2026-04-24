'use client';

import dynamic from 'next/dynamic';

// Disable SSR for this app — it is session-driven and uses localStorage/cookies
// on every render, so server HTML and client first-render will always diverge.
// Client-only rendering avoids the hydration mismatch cleanly.
const KnowledgeQAApp = dynamic(
  () => import('@/apps/knowledge-qa').then((m) => ({ default: m.KnowledgeQAApp })),
  { ssr: false }
);

export default function KnowledgeQAPage() {
  return <KnowledgeQAApp />;
}
