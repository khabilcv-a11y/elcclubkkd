import { HttpError } from './util.js';
import { signSession, readSession, fingerprint } from './session.js';

export const routes = [];
// guard: null (public) | 'college' | 'staff' | [roles...]
export function route(method, pattern, guard, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ method, re, keys, guard, handler });
}

export const COOKIE = { college: 'elc_c', staff: 'elc_s' };

export function parseCookies(req) {
  const out = {};
  for (const p of (req.headers.get('cookie') || '').split(';')) {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }
  return out;
}

export async function sessionUser(ctx, kind) {
  const p = await readSession(ctx.env, parseCookies(ctx.req)[COOKIE[kind]]);
  if (!p || p.k !== kind) return null;
  if (kind === 'college') {
    const c = await ctx.db.get('SELECT * FROM colleges WHERE id=? AND active=1', p.id);
    return c && c.passcode_hash && fingerprint(c.passcode_hash) === p.v ? c : null;
  }
  const a = await ctx.db.get('SELECT id,username,name,email,role,active,pass FROM admins WHERE id=?', p.id);
  if (!a || !a.active || fingerprint(a.pass) !== p.v) return null;
  delete a.pass; return a;
}
export async function issueSession(ctx, kind, subject, hours) {
  const v = fingerprint(kind === 'college' ? subject.passcode_hash : subject.pass);
  setCookie(ctx, COOKIE[kind], await signSession(ctx.env, { k: kind, id: subject.id, v, hours }), hours * 3600);
}

export async function guardCheck(guard, ctx) {
  if (!guard) return;
  if (guard === 'college') {
    ctx.college = await sessionUser(ctx, 'college');
    if (!ctx.college) throw new HttpError(401, 'Please sign in with your college passcode');
    return;
  }
  ctx.user = await sessionUser(ctx, 'staff');
  if (!ctx.user) throw new HttpError(401, 'Please sign in');
  if (Array.isArray(guard) && !guard.includes(ctx.user.role))
    throw new HttpError(403, 'Your role does not have access to this action');
}

export function setCookie(ctx, name, value, maxAge) {
  ctx.cookies.push(`${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${ctx.secure ? '; Secure' : ''}`);
}

// ---- intern scoping: interns see only colleges/villages assigned to them ----
export async function scopeOf(ctx) {
  if (ctx.user.role !== 'intern') return null;
  const [c, v] = await Promise.all([
    ctx.db.all('SELECT college_id id FROM intern_colleges WHERE admin_id=?', ctx.user.id),
    ctx.db.all('SELECT village_id id FROM intern_villages WHERE admin_id=?', ctx.user.id)]);
  return { colleges: new Set(c.map(r => r.id)), villages: new Set(v.map(r => r.id)) };
}
export async function assertCollege(ctx, id) {
  const s = await scopeOf(ctx);
  if (s && !s.colleges.has(Number(id))) throw new HttpError(403, 'This college is not assigned to you');
}
export async function assertVillage(ctx, id) {
  const s = await scopeOf(ctx);
  if (s && !s.villages.has(Number(id))) throw new HttpError(403, 'This village is not assigned to you');
}
