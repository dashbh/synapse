import { type NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('fe.api.sessions');
const BACKEND_URL = process.env.BACKEND_URL;

// GET /api/sessions/[id]/messages — return pre-paired turns for session hydration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!BACKEND_URL) {
    // Mock: no stored history when backend is not configured
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const traceparent = request.headers.get('traceparent');
  const upstream = await fetch(`${BACKEND_URL}/api/sessions/${id}/messages`, {
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
      ...(traceparent ? { traceparent } : {}),
    },
  });

  const body = await upstream.text();
  log.info('session_messages_fetch', { session_id: id, status: upstream.status });
  return new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
