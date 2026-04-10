import { type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

// POST /api/sessions — create a new session
// Forwards Cookie header in and Set-Cookie header out so the browser gets the session cookie.
export async function POST(request: NextRequest) {
  if (!BACKEND_URL) {
    // Mock: return a fake session when backend is not configured
    const id = crypto.randomUUID();
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
  const res = new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });

  // Forward Set-Cookie so the browser receives the session cookie
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) res.headers.set('set-cookie', setCookie);

  return res;
}
