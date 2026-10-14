// Village officers: staff manage them; officers sign in with a passcode (like colleges).
import { route, scopeOf, issueSession, setCookie, sessionUser, COOKIE } from '../lib/router.js';
import { log } from '../lib/db.js';
import { sendMail } from '../lib/mailer.js';
import { HttpError, bad, hashSecret, verifySecret, newPasscode, normPasscode, nowIso, str, reqStr, emailOk } from '../lib/util.js';

const OPS = ['super_admin', 'admin'];
const slog = (ctx, action, detail) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, action, detail, ctx.ip);
const base = ctx => ctx.env.BASE_URL || new URL(ctx.req.url).origin;

// keep the village rows in step with the officer record (the village list shows the officer's name and phone)
async function syncVillages(db, officer, villageIds) {
  const want = new Set(villageIds.map(Number));
  const mine = await db.all('SELECT id FROM villages WHERE officer_id=?', officer.id);
  for (const v of mine) if (!want.has(v.id)) await db.run('UPDATE villages SET officer_id=NULL,officer_name=NULL,officer_phone=NULL,officer_email=NULL WHERE id=?', v.id);
  for (const id of want) await db.run('UPDATE villages SET officer_id=?,officer_name=?,officer_phone=?,officer_email=? WHERE id=?', officer.id, officer.name, officer.phone || null, officer.email || null, id);
}
function body(b) {
  return { name: reqStr(b.name, 'Officer name', 100), designation: str(b.designation, 100) || 'Village Officer', phone: str(b.phone, 30), email: b.email ? emailOk(b.email, 'Officer email') : '' };
}

route('GET', '/api/staff/officers', 'staff', async ctx => {
  const s = await scopeOf(ctx);
  const [os, vs] = await Promise.all([ctx.db.all('SELECT id,name,designation,phone,email,passcode_sent_at,last_login_at,active FROM officers ORDER BY name'),
    ctx.db.all('SELECT id,name,officer_id FROM villages WHERE officer_id IS NOT NULL ORDER BY name')]);
  return os.map(o => ({ ...o, villages: vs.filter(v => v.officer_id === o.id).map(v => ({ id: v.id, name: v.name })) }))
    .filter(o => !s || o.villages.some(v => s.villages.has(v.id)));
});
route('POST', '/api/staff/officers', OPS, async ctx => {
  const o = body(ctx.body);
  const id = await ctx.db.insert('INSERT INTO officers(name,designation,phone,email,active,created_at) VALUES (?,?,?,?,1,?)', o.name, o.designation, o.phone, o.email, nowIso());
  await syncVillages(ctx.db, { id, ...o }, ctx.body.villages || []);
  await slog(ctx, 'officer_add', o.name);
  return { ok: true, id };
});
route('PUT', '/api/staff/officers/:id', OPS, async ctx => {
  const id = Number(ctx.params.id), o = body(ctx.body);
  if (!(await ctx.db.get('SELECT 1 x FROM officers WHERE id=?', id))) throw new HttpError(404, 'Officer not found');
  await ctx.db.run('UPDATE officers SET name=?,designation=?,phone=?,email=? WHERE id=?', o.name, o.designation, o.phone, o.email, id);
  await syncVillages(ctx.db, { id, ...o }, ctx.body.villages || []);
  await slog(ctx, 'officer_edit', o.name);
  return { ok: true };
});
route('POST', '/api/staff/officers/:id/active', OPS, async ctx => {
  const r = await ctx.db.run('UPDATE officers SET active=? WHERE id=?', ctx.body.active ? 1 : 0, Number(ctx.params.id));
  if (!r.changes) throw new HttpError(404, 'Officer not found');
  await slog(ctx, ctx.body.active ? 'officer_activate' : 'officer_deactivate', '#' + ctx.params.id);
  return { ok: true };
});
route('DELETE', '/api/staff/officers/:id', ['super_admin'], async ctx => {
  const id = Number(ctx.params.id), o = await ctx.db.get('SELECT name FROM officers WHERE id=?', id);
  if (!o) throw new HttpError(404, 'Officer not found');
  await ctx.db.run('UPDATE villages SET officer_id=NULL,officer_name=NULL,officer_phone=NULL,officer_email=NULL WHERE officer_id=?', id);
  await ctx.db.run('DELETE FROM officers WHERE id=?', id);
  await slog(ctx, 'officer_delete', o.name);
  return { ok: true };
});
route('POST', '/api/staff/officers/:id/passcode', OPS, async ctx => {
  const id = Number(ctx.params.id), o = await ctx.db.get('SELECT * FROM officers WHERE id=?', id);
  if (!o) throw new HttpError(404, 'Officer not found');
  const code = newPasscode();
  await ctx.db.run('UPDATE officers SET passcode_hash=?,passcode_sent_at=? WHERE id=?', await hashSecret(code.replace('-', ''), 20000), nowIso(), id);
  const r = await sendMail(ctx.db, ctx.env, o.email, 'Your ELC Kozhikode village officer passcode',
    `Hello ${o.name},\n\nYou can now review and certify the Electoral Literacy Club work in your village(s).\n\n  Passcode: ${code}\n  Sign in: ${base(ctx)}/#/officer-login\n\n` +
    `Choose your name on the page and enter the passcode. A new passcode replaces this one.\n\nELC Kozhikode`);
  if (r.status === 'failed') await ctx.db.run('UPDATE officers SET passcode_sent_at=NULL WHERE id=?', id);
  await slog(ctx, 'officer_passcode', `${o.name} (${r.status})`);
  return { name: o.name, email: o.email, status: r.status, error: r.error };
});

// ---- officer sign-in (public) ----
route('GET', '/api/public/officers', null, async ctx => {
  const [os, vs] = await Promise.all([ctx.db.all('SELECT id,name FROM officers WHERE active=1 ORDER BY name'), ctx.db.all('SELECT name,officer_id FROM villages WHERE officer_id IS NOT NULL ORDER BY name')]);
  return os.map(o => ({ id: o.id, name: o.name, villages: vs.filter(v => v.officer_id === o.id).map(v => v.name).join(', ') }));
});
route('POST', '/api/auth/officer', null, async ctx => {
  const id = Number(ctx.body.officer_id), key = `o:${ctx.ip}:${id}`;
  await ctx.throttle(key);
  const o = await ctx.db.get('SELECT * FROM officers WHERE id=? AND active=1', id);
  if (!o || !o.passcode_hash || !(await verifySecret(normPasscode(ctx.body.passcode), o.passcode_hash))) {
    await log(ctx.db, 'officer', o ? o.name : `id:${id}`, null, 'login_failed', 'Wrong passcode or passcode not issued', ctx.ip);
    throw new HttpError(401, 'That passcode did not work. Check the email you received from the district office.');
  }
  await ctx.clearThrottle(key);
  await ctx.db.run('UPDATE officers SET last_login_at=? WHERE id=?', nowIso(), o.id);
  await log(ctx.db, 'officer', o.name, null, 'login', 'Officer signed in', ctx.ip);
  await issueSession(ctx, 'officer', o, 12);
  ctx.db.lazy = true;
  return { ok: true };
});
route('POST', '/api/auth/officer/logout', null, async ctx => {
  const o = await sessionUser(ctx, 'officer');
  if (o) await log(ctx.db, 'officer', o.name, null, 'logout', null, ctx.ip);
  setCookie(ctx, COOKIE.officer, '', 0);
  return { ok: true };
});
