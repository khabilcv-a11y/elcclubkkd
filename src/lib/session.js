// Stateless sessions: a signed cookie, so signing in never has to wait on the sheet.
const enc = new TextEncoder();
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const key = env => crypto.subtle.importKey('raw', enc.encode('session:' + env.SCRIPT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

// v = fingerprint of the credential, so changing a password/passcode signs old sessions out
export async function signSession(env, { k, id, v, hours }) {
  const body = b64(enc.encode(JSON.stringify({ k, id, v, iat: Date.now(), hrs: hours, exp: Date.now() + hours * 36e5 })));
  return `${body}.${b64(await crypto.subtle.sign('HMAC', await key(env), enc.encode(body)))}`;
}
export async function readSession(env, token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  try {
    if (!(await crypto.subtle.verify('HMAC', await key(env), unb64(sig), enc.encode(body)))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64(body)));
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
export const fingerprint = s => String(s || '').slice(-12);
