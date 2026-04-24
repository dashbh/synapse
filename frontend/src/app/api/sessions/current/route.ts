import { type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

// GET /api/sessions/current — return session stored in cookie, or 404
export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    // Mock: read kqa_session_id from the incoming cookie
    const cookie = request.cookies.get('kqa_session_id');
    if (!cookie) {
      return new Response(JSON.stringify({ detail: 'No active session' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ id: cookie.value, name: 'New Session' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const traceparent = request.headers.get('traceparent');
  const upstream = await fetch(`${BACKEND_URL}/api/sessions/current`, {
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
      ...(traceparent ? { traceparent } : {}),
    },
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
