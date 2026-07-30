// GET /api/config — exposes the Google client ID to the login page.
// The client ID is public by design; secrets never pass through here.
export const config = { runtime: 'edge' };
export default function handler() {
  return new Response(JSON.stringify({ clientId: process.env.GOOGLE_CLIENT_ID || '' }), {
    headers: { 'content-type': 'application/json' }
  });
}
