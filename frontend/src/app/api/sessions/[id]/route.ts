import { type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

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

  const upstream = await fetch(`${BACKEND_URL}/api/sessions/${id}`, {
    method: 'DELETE',
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
    },
  });

  const res = new Response(null, { status: upstream.status });

  // Forward cookie clearance from backend
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) res.headers.set('set-cookie', setCookie);

  return res;
}
