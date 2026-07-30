// POST /api/logout — clears the session and identity cookies.
export const config = { runtime: 'edge' };
export default function handler() {
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('Set-Cookie', 'apex_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  headers.append('Set-Cookie', 'apex_user=; Path=/; Max-Age=0; Secure; SameSite=Lax');
  return new Response(JSON.stringify({ ok: true }), { headers });
}
