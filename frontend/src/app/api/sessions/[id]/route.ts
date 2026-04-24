import { type NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('fe.api.sessions');
const BACKEND_URL = process.env.BACKEND_URL;

// PATCH /api/sessions/:id — rename a session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!BACKEND_URL) {
    return new Response(JSON.stringify({ id, name: 'Renamed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const traceparent = request.headers.get('traceparent');
  const upstream = await fetch(`${BACKEND_URL}/api/sessions/${id}`, {
    method: 'PATCH',
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
      'Content-Type': 'application/json',
      ...(traceparent ? { traceparent } : {}),
    },
    body: await request.text(),
  });

  log.info('session_rename', { session_id: id, status: upstream.status });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// DELETE /api/sessions/:id — delete session and clear cookie
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!BACKEND_URL) {
    const res = new Response(null, { status: 204 });
    res.headers.set('set-cookie', 'kqa_session_id=; Path=/; Max-Age=0; SameSite=Lax');
    return res;
  }

  const traceparentDel = request.headers.get('traceparent');
  const upstream = await fetch(`${BACKEND_URL}/api/sessions/${id}`, {
    method: 'DELETE',
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
      ...(traceparentDel ? { traceparent: traceparentDel } : {}),
    },
  });

  log.info('session_delete', { session_id: id, status: upstream.status });
  const res = new Response(null, { status: upstream.status });

  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) res.headers.set('set-cookie', setCookie);

  return res;
}
