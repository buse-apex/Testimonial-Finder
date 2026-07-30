// Apex Proof Finder — session gate (Google sign-in)
// Verifies the signed session cookie before serving anything except the
// login page and the auth endpoints. Sessions are created by /api/auth
// after a successful Google sign-in and allowlist check.
//
// Required environment variable:
//   SESSION_SECRET — a long random string used to sign session cookies.

export const config = { matcher: '/:path*' };

const OPEN_PATHS = ['/login.html', '/api/auth', '/api/config', '/api/logout'];

async function hmac(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function validSession(cookieHeader, secret) {
  const m = /(?:^|;\s*)apex_session=([^;]+)/.exec(cookieHeader || '');
  if (!m) return false;
  const parts = m[1].split('.');
  if (parts.length !== 3) return false;
  const [emailB64, exp, sig] = parts;
  if (Date.now() / 1000 > Number(exp)) return false;
  const expect = await hmac(secret, emailB64 + '.' + exp);
  return sig === expect;
}

export default async function middleware(req) {
  const url = new URL(req.url);
  if (OPEN_PATHS.includes(url.pathname)) return;

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return new Response(
      'This site is not configured yet. In Vercel, open Settings, then Environment Variables, and add SESSION_SECRET, GOOGLE_CLIENT_ID, and ALLOWED_EMAILS or ALLOWED_DOMAIN, then redeploy.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  }

  if (await validSession(req.headers.get('cookie'), secret)) return;

  return Response.redirect(new URL('/login.html', req.url), 302);
}
