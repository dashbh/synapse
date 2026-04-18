import { type NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('fe.api.sessions');
const BACKEND_URL = process.env.BACKEND_URL;

// GET /api/sessions — list all sessions with message counts
export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const upstream = await fetch(`${BACKEND_URL}/api/sessions`, {
    headers: { Cookie: request.headers.get('cookie') ?? '' },
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/sessions — create a new session
// Forwards Cookie header in and Set-Cookie header out so the browser gets the session cookie.
export async function POST(request: NextRequest) {
  if (!BACKEND_URL) {
    const id = crypto.randomUUID();
    log.info('session_create_mock', { session_id: id });
    const res = new Response(JSON.stringify({ id, name: 'New Session' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
    res.headers.set(
      'set-cookie',
      `kqa_session_id=${id}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`
    );
    return res;
  }

  const upstream = await fetch(`${BACKEND_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
    },
  });

  const body = await upstream.text();
  log.info('session_create', { status: upstream.status });
  const res = new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });

  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) res.headers.set('set-cookie', setCookie);

  return res;
}
