import { connect, ensureReady, log } from './lib/db.js';
import { routes, guardCheck, COOKIE, setCookie, sessionUser, parseCookies } from './lib/router.js';
import { route } from './lib/router.js';
import { HttpError, token, verifySecret, normPasscode } from './lib/util.js';
import { publicBoard } from './lib/stats.js';
import './routes/college.js';
import './routes/admin.js';

// ---------- public + auth routes ----------
async function throttle(db, key, max = 8, windowMs = 10 * 60e3) {
  const now = Date.now();
  await db.run('DELETE FROM login_attempts WHERE ts < ?', now - windowMs);
  if ((await db.get('SELECT COUNT(*) n FROM login_attempts WHERE key=? AND ts>?', key, now - windowMs)).n >= max)
    throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
  await db.run('INSERT INTO login_attempts(key,ts) VALUES (?,?)', key, now);
}
const clearThrottle = (db, key) => db.run('DELETE FROM login_attempts WHERE key=?', key);

async function startSession(ctx, kind, subjectId, hours) {
  const tok = token(32);
  await ctx.db.run('INSERT INTO sessions(token,role,subject_id,expires) VALUES (?,?,?,?)', tok, kind, subjectId, Date.now() + hours * 36e5);
  setCookie(ctx, COOKIE[kind], tok, hours * 3600);
}
async function endSession(ctx, kind) {
  const tok = parseCookies(ctx.req)[COOKIE[kind]];
  if (tok) await ctx.db.run('DELETE FROM sessions WHERE token=?', tok);
  setCookie(ctx, COOKIE[kind], '', 0);
}

route('GET', '/api/public/board', null, ctx => publicBoard(ctx.db));
route('GET', '/api/public/colleges', null, ctx => ctx.db.all('SELECT id,name FROM colleges WHERE active=1 ORDER BY name'));

route('POST', '/api/auth/college', null, async ctx => {
  const id = Number(ctx.body.college_id), key = `c:${ctx.ip}:${id}`;
  await throttle(ctx.db, key);
  const c = await ctx.db.get('SELECT * FROM colleges WHERE id=? AND active=1', id);
  if (!c || !c.passcode_hash || !(await verifySecret(normPasscode(ctx.body.passcode), c.passcode_hash))) {
    await log(ctx.db, 'college', c ? c.name : `id:${id}`, null, 'login_failed', 'Wrong passcode or passcode not issued', ctx.ip);
    throw new HttpError(401, 'That passcode did not work. Check the email your coordinator received.');
  }
  await clearThrottle(ctx.db, key);
  await ctx.db.run('UPDATE colleges SET last_login_at=? WHERE id=?', new Date().toISOString(), c.id);
  await log(ctx.db, 'college', c.name, null, 'login', 'College signed in', ctx.ip);
  await startSession(ctx, 'college', c.id, 12);
  return { ok: true };
});
route('POST', '/api/auth/college/logout', null, async ctx => {
  const c = await sessionUser(ctx, 'college');
  if (c) await log(ctx.db, 'college', c.name, null, 'logout', null, ctx.ip);
  await endSession(ctx, 'college');
  return { ok: true };
});

route('POST', '/api/auth/staff', null, async ctx => {
  const username = String(ctx.body.username || '').trim().toLowerCase(), key = `s:${ctx.ip}:${username}`;
  await throttle(ctx.db, key);
  const a = await ctx.db.get('SELECT * FROM admins WHERE username=?', username);
  if (!a || !a.active || !(await verifySecret(String(ctx.body.password || ''), a.pass))) {
    await log(ctx.db, 'staff', username, a && a.role, 'login_failed', a && !a.active ? 'Deactivated account' : 'Wrong username or password', ctx.ip);
    throw new HttpError(401, 'Incorrect username or password');
  }
  await clearThrottle(ctx.db, key);
  await ctx.db.run('UPDATE admins SET last_login_at=? WHERE id=?', new Date().toISOString(), a.id);
  await log(ctx.db, 'staff', a.username, a.role, 'login', 'Signed in', ctx.ip);
  await startSession(ctx, 'staff', a.id, 8);
  return { ok: true };
});
route('POST', '/api/auth/staff/logout', null, async ctx => {
  const u = await sessionUser(ctx, 'staff');
  if (u) await log(ctx.db, 'staff', u.username, u.role, 'logout', null, ctx.ip);
  await endSession(ctx, 'staff');
  return { ok: true };
});

// ---------- Worker entry ----------
const SEC = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'Cache-Control': 'no-store' };

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const text = await req.text();
  if (text.length > 7e6) throw new HttpError(413, 'Request too large');
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'Invalid JSON'); }
}
const json = (status, body, extra) => Response.json(body, { status, headers: { ...SEC, ...extra } });

export default {
  async fetch(req, env, execCtx) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    let db;
    try {
      const r = routes.find(r => r.method === req.method && r.re.test(url.pathname));
      if (!r) throw new HttpError(404, 'Not found');
      if (req.method !== 'GET' && !/application\/json/.test(req.headers.get('content-type') || '')) throw new HttpError(415, 'JSON required');
      const m = url.pathname.match(r.re);
      db = connect(env);
      await ensureReady(db, env);
      const ctx = { req, env, db, cookies: [], waitUntil: p => execCtx.waitUntil(p), secure: url.protocol === 'https:',
        params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])), query: Object.fromEntries(url.searchParams),
        ip: req.headers.get('cf-connecting-ip') || 'local', body: await readBody(req) };
      await guardCheck(r.guard, ctx);
      const out = (await r.handler(ctx)) ?? { ok: true };
      const headers = new Headers(SEC);
      for (const c of ctx.cookies) headers.append('Set-Cookie', c);
      if (out.__raw) {
        for (const [k, v] of Object.entries(out.headers || {})) headers.set(k, v);
        return new Response(out.bytes || out.text, { headers });
      }
      headers.set('Content-Type', 'application/json; charset=utf-8');
      return new Response(JSON.stringify(out), { headers });
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message, ...e.extra });
      console.error(e);
      return json(500, { error: 'Something went wrong on our side' });
    } finally {
      if (db) execCtx.waitUntil(db.close());
    }
  },
};
