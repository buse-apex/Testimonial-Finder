// POST /api/auth — verifies a Google ID token, checks the allowlist,
// and issues a signed session cookie valid for 7 days.
//
// Environment variables:
//   GOOGLE_CLIENT_ID — OAuth client ID from Google Cloud Console
//   SESSION_SECRET   — long random string for signing sessions
//   ALLOWED_EMAILS   — optional, comma-separated list of allowed emails
//   ALLOWED_DOMAIN   — optional, e.g. apexleadershipco.com
// At least one of ALLOWED_EMAILS / ALLOWED_DOMAIN must be set.

export const config = { runtime: 'edge' };

const WEEK = 7 * 24 * 60 * 60;

async function hmac(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function allowed(email) {
  const list = (process.env.ALLOWED_EMAILS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const domain = (process.env.ALLOWED_DOMAIN || '').trim().toLowerCase();
  const e = email.toLowerCase();
  if (list.includes(e)) return true;
  if (domain && e.endsWith('@' + domain)) return true;
  return false;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.SESSION_SECRET;
  if (!clientId || !secret || (!process.env.ALLOWED_EMAILS && !process.env.ALLOWED_DOMAIN)) {
    return json({ error: 'Server is missing configuration. Set GOOGLE_CLIENT_ID, SESSION_SECRET, and ALLOWED_EMAILS or ALLOWED_DOMAIN in Vercel.' }, 503);
  }

  let credential = '';
  try { credential = (await req.json()).credential || ''; } catch (e) {}
  if (!credential) return json({ error: 'Missing credential.' }, 400);

  // Verify the ID token with Google.
  const resp = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
  if (!resp.ok) return json({ error: 'Google could not verify the sign-in. Please try again.' }, 401);
  const info = await resp.json();

  if (info.aud !== clientId) return json({ error: 'This sign-in came from a different app.' }, 401);
  if (info.email_verified !== 'true' && info.email_verified !== true) {
    return json({ error: 'This Google account has no verified email.' }, 401);
  }
  const email = info.email;
  if (!allowed(email)) {
    return json({ error: 'This email is not on the Apex access list. Contact the marketing team to be added.' }, 403);
  }

  // Issue the session.
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  const emailB64 = btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const sig = await hmac(secret, emailB64 + '.' + exp);
  const session = `${emailB64}.${exp}.${sig}`;

  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('Set-Cookie',
    `apex_session=${session}; Path=/; Max-Age=${WEEK}; HttpOnly; Secure; SameSite=Lax`);
  headers.append('Set-Cookie',
    `apex_user=${encodeURIComponent(email)}; Path=/; Max-Age=${WEEK}; Secure; SameSite=Lax`);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json' }
  });
}
