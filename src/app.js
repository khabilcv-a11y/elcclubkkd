// The portal's request handling: public + sign-in routes, then the college and staff routes. Runs inside the Portal object.
import { openDb, log } from './lib/db.js';
import { routes, route, guardCheck, COOKIE, setCookie, sessionUser, issueSession, whoIs } from './lib/router.js';
import { HttpError, verifySecret, normPasscode, hashSecret, reqStr, str, phone, emailOk, nowIso } from './lib/util.js';
import { featureMap, guardedFeature, isFeature } from './lib/features.js';
import { publicBoard } from './lib/stats.js';
import './routes/college.js';
import './routes/admin.js';
import './routes/officers.js';
import './routes/officer.js';
import './routes/content.js';
import './routes/reports.js';
import './routes/campaign.js';
import './routes/desk.js';
import './routes/gallery.js';
import './routes/logo.js';

// ---------- public + auth routes ----------
let boardCache = { at: 0, data: null };
route('GET', '/api/public/board', null, async ctx => {
  if (boardCache.data && Date.now() - boardCache.at < 20000) return boardCache.data;     // leaderboard may be up to 20s old
  boardCache = { at: Date.now(), data: await publicBoard(ctx.db) };
  return boardCache.data;
});
route('GET', '/api/whoami', null, async ctx => {
  // the public site cares about a college or officer session first; someone testing as staff in the same browser still sees their workspace
  const c = await sessionUser(ctx, 'college'); if (c) return { kind: 'college', name: c.name };
  const o = await sessionUser(ctx, 'officer'); if (o) return { kind: 'officer', name: o.name };
  const u = await sessionUser(ctx, 'staff');
  return u ? { kind: 'staff', name: u.name } : { kind: null, name: null };
});
route('GET', '/api/public/colleges', null, ctx => ctx.db.all("SELECT id,name FROM colleges WHERE active=1 AND COALESCE(kind,'college')<>'school' ORDER BY name"));
route('GET', '/api/public/schools', null, ctx => ctx.db.all("SELECT id,name FROM colleges WHERE active=1 AND kind='school' ORDER BY name"));

// a school that has not formed an ELC yet signs itself up and chooses its own password
route('POST', '/api/public/school-signup', null, async ctx => {
  if (!(await featureMap(ctx.db)).public.school_signup) throw new HttpError(403, 'School sign-up is closed right now.');
  await ctx.throttle(`su:${ctx.ip}`, 6, 3600000);
  const b = ctx.body, name = reqStr(b.name, 'School name', 160).replace(/\s+/g, ' ');
  const pw = String(b.password || '');
  if (pw.length < 8) throw new HttpError(400, 'Choose a password of at least 8 characters');
  if (await ctx.db.get('SELECT 1 x FROM colleges WHERE lower(name)=lower(?)', name)) throw new HttpError(409, 'A school or college with this name is already registered. Try signing in instead, or ask the district office.');
  const mail = emailOk(b.email, 'School email').toLowerCase();
  if (await ctx.db.get("SELECT 1 x FROM colleges WHERE kind='school' AND lower(email)=?", mail)) throw new HttpError(409, 'A school is already registered with this email. Try signing in instead.');
  const h = await hashSecret(pw, 20000);
  const id = await ctx.db.insert('INSERT INTO colleges(name,short_name,address,phone,email,coordinator,passcode_hash,passcode_sent_at,active,created_at,kind) VALUES (?,?,?,?,?,?,?,?,1,?,?)',
    name, name.slice(0, 40), reqStr(b.address, 'Address', 300), phone(b.phone), mail, reqStr(b.coordinator, 'Teacher in charge', 100), h, nowIso(), nowIso(), 'school');
  await log(ctx.db, 'school', name, null, 'school_signup', 'School signed up', ctx.ip);
  await issueSession(ctx, 'college', { id, passcode_hash: h }, 12);
  return { ok: true };
});

route('POST', '/api/auth/college', null, async ctx => {
  const id = Number(ctx.body.college_id), key = `c:${ctx.ip}:${id}`;
  await ctx.throttle(key);
  const c = await ctx.db.get('SELECT * FROM colleges WHERE id=? AND active=1', id);
  const typed = String(ctx.body.passcode || '');
  if (!c || !c.passcode_hash || !((await verifySecret(typed, c.passcode_hash)) || (await verifySecret(normPasscode(typed), c.passcode_hash)))) {
    await log(ctx.db, 'college', c ? c.name : `id:${id}`, null, 'login_failed', 'Wrong password or none set', ctx.ip);
    throw new HttpError(401, 'That password did not work. The starting password is shared by the district office; ask them to reset it if needed.');
  }
  await ctx.clearThrottle(key);
  await ctx.db.run('UPDATE colleges SET last_login_at=? WHERE id=?', new Date().toISOString(), c.id);
  await log(ctx.db, 'college', c.name, null, 'login', 'College signed in', ctx.ip);
  await issueSession(ctx, 'college', c, 12);
  ctx.db.lazy = true;                       // don't make the user wait for the "last login" write
  return { ok: true };
});
route('POST', '/api/college/password', 'college', async ctx => {
  const cur = String(ctx.body.current || ''), next = String(ctx.body.password || '');
  if (next.length < 8) throw new HttpError(400, 'Choose a password of at least 8 characters');
  if (!((await verifySecret(cur, ctx.college.passcode_hash)) || (await verifySecret(normPasscode(cur), ctx.college.passcode_hash)))) throw new HttpError(400, 'Your current password is not correct');
  const h = await hashSecret(next, 20000);
  await ctx.db.run('UPDATE colleges SET passcode_hash=?,passcode_plain=NULL,passcode_sent_at=? WHERE id=?', h, new Date().toISOString(), ctx.college.id);
  await log(ctx.db, 'college', ctx.college.name, null, 'password_change', 'College changed its own password', ctx.ip);
  await issueSession(ctx, 'college', { ...ctx.college, passcode_hash: h }, 12);
  return { ok: true };
});
// schools have no prior list to pick from: they sign in with the email they registered with
route('POST', '/api/auth/school', null, async ctx => {
  const email = String(ctx.body.email || '').trim().toLowerCase(), key = `sc:${ctx.ip}:${email}`;
  await ctx.throttle(key);
  const c = await ctx.db.get("SELECT * FROM colleges WHERE kind='school' AND active=1 AND lower(email)=?", email);
  const typed = String(ctx.body.password || '');
  if (!c || !c.passcode_hash || !((await verifySecret(typed, c.passcode_hash)) || (await verifySecret(normPasscode(typed), c.passcode_hash)))) {
    await log(ctx.db, 'school', c ? c.name : email, null, 'login_failed', 'Wrong email or password', ctx.ip);
    throw new HttpError(401, 'That email or password did not work. New school? Use "Register here".');
  }
  await ctx.clearThrottle(key);
  await ctx.db.run('UPDATE colleges SET last_login_at=? WHERE id=?', new Date().toISOString(), c.id);
  await log(ctx.db, 'school', c.name, null, 'login', 'School signed in', ctx.ip);
  await issueSession(ctx, 'college', c, 12);
  ctx.db.lazy = true;
  return { ok: true };
});
route('POST', '/api/auth/college/logout', null, async ctx => {
  const c = await sessionUser(ctx, 'college');
  if (c) await log(ctx.db, 'college', c.name, null, 'logout', null, ctx.ip);
  setCookie(ctx, COOKIE.college, '', 0);
  return { ok: true };
});

route('POST', '/api/auth/staff', null, async ctx => {
  const username = String(ctx.body.username || '').trim().toLowerCase(), key = `s:${ctx.ip}:${username}`;
  await ctx.throttle(key);
  const a = await ctx.db.get('SELECT * FROM admins WHERE username=?', username);
  if (!a || !a.active || !(await verifySecret(String(ctx.body.password || ''), a.pass))) {
    await log(ctx.db, 'staff', username, a && a.role, 'login_failed', a && !a.active ? 'Deactivated account' : 'Wrong username or password', ctx.ip);
    throw new HttpError(401, 'Incorrect username or password');
  }
  await ctx.clearThrottle(key);
  await ctx.db.run('UPDATE admins SET last_login_at=? WHERE id=?', new Date().toISOString(), a.id);
  await log(ctx.db, 'staff', a.username, a.role, 'login', 'Signed in', ctx.ip);
  await issueSession(ctx, 'staff', a, 8);
  ctx.db.lazy = true;
  return { ok: true };
});
route('POST', '/api/auth/staff/logout', null, async ctx => {
  const u = await sessionUser(ctx, 'staff');
  if (u) await log(ctx.db, 'staff', u.username, u.role, 'logout', null, ctx.ip);
  setCookie(ctx, COOKIE.staff, '', 0);
  return { ok: true };
});

// ---------- one request ----------
const SEC = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-store' };

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const text = await req.text();
  if (text.length > 7e6) throw new HttpError(413, 'Request too large');
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'Invalid JSON'); }
}
const json = (status, body) => Response.json(body, { status, headers: SEC });

export async function handle(req, env, execCtx, extra) {
  const url = new URL(req.url);
  let db, ok = false;
  try {
    const r = routes.find(r => r.method === req.method && r.re.test(url.pathname));
    if (!r) throw new HttpError(404, 'Not found');
    if (req.method !== 'GET' && !/application\/json/.test(req.headers.get('content-type') || '')) throw new HttpError(415, 'JSON required');
    const m = url.pathname.match(r.re);
    db = await openDb(env, execCtx);
    const ctx = { req, env, db, cookies: [], waitUntil: p => execCtx.waitUntil(p), secure: url.protocol === 'https:', ...extra,
      params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])), query: Object.fromEntries(url.searchParams),
      ip: req.headers.get('cf-connecting-ip') || 'local', body: await readBody(req) };
    await guardCheck(r.guard, ctx);
    const aud = ctx.college ? (ctx.college.kind === 'school' ? 'school' : 'college') : ctx.user ? 'staff' : ctx.officer ? 'officer' : null;
    const fk = aud && guardedFeature(url.pathname, aud);
    if (fk) {
      const [fa, fid] = fk.split('.');
      if (!isFeature(fk) || !(await featureMap(db))[fa][fid]) throw new HttpError(403, 'This section is switched off for now.');
    }
    const out = (await r.handler(ctx)) ?? { ok: true };
    ok = true;
    await db.finish(true);                    // save changed rows to the Google Sheet (waits only if real data changed)
    const headers = new Headers(SEC);
    for (const c of ctx.cookies) headers.append('Set-Cookie', c);
    if (out.__raw) {
      for (const [k, v] of Object.entries(out.headers || {})) headers.set(k, v);
      return new Response(out.bytes || out.text, { headers });
    }
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(out), { headers });
  } catch (e) {
    if (db && !ok) execCtx.waitUntil(db.finish(false).catch(() => {}));   // still record audit rows such as failed sign-ins
    if (e instanceof HttpError) return json(e.status, { error: e.message, ...e.extra });
    console.error(e);
    return json(500, { error: 'Something went wrong on our side' });
  } finally {
    if (db) db.close();
  }
}
