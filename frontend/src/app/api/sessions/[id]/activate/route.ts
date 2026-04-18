import { type NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('fe.api.sessions');
const BACKEND_URL = process.env.BACKEND_URL;

// POST /api/sessions/[id]/activate — switch active session (updates cookie)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!BACKEND_URL) {
    const res = new Response(JSON.stringify({ id, name: 'Session' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    res.headers.set(
      'set-cookie',
      `kqa_session_id=${id}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`
    );
    return res;
  }

  const upstream = await fetch(`${BACKEND_URL}/api/sessions/${id}/activate`, {
    method: 'POST',
    headers: { Cookie: request.headers.get('cookie') ?? '' },
  });

  const body = await upstream.text();
  log.info('session_activate', { session_id: id, status: upstream.status });
  const res = new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });

  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) res.headers.set('set-cookie', setCookie);

  return res;
}
