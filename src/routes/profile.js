// An institution's own profile: the details the district office keeps about it (coordinator, head of institution, contact).
import { route } from '../lib/router.js';
import { log } from '../lib/db.js';
import { reqStr, str, emailOk, nowIso, bad } from '../lib/util.js';
import { EXTRA, INST_TYPES, extraBody, profileStatus } from '../lib/profile.js';

const FIELDS = ['name', 'short_name', 'kind', 'address', 'phone', 'email', 'coordinator', 'lsgi', ...EXTRA];
route('GET', '/api/college/profile', 'college', ctx => {
  const c = ctx.college, out = {};
  for (const k of FIELDS) out[k] = c[k] ?? '';
  out.kind = c.kind === 'school' ? 'school' : 'college'; out.profile_at = c.profile_at || null; out.elc_status = c.elc_status || '';
  return { profile: out, types: INST_TYPES, status: profileStatus(c) };
});
route('PUT', '/api/college/profile', 'college', async ctx => {
  ctx.db.deferred = true;
  const b = ctx.body, x = extraBody(b);
  await ctx.db.run('UPDATE colleges SET short_name=?,address=?,phone=?,email=?,coordinator=?,lsgi=?,profile_at=?,' + EXTRA.map(k => k + '=?').join(',') + ' WHERE id=?',
    str(b.short_name, 40), reqStr(b.address, 'Address', 300), reqStr(b.phone, 'Contact number', 30), emailOk(b.email, 'Email'), str(b.coordinator, 100), str(b.lsgi, 120), nowIso(), ...EXTRA.map(k => x[k]), ctx.college.id);
  await log(ctx.db, 'college', ctx.college.name, null, 'profile_update', 'Institution details updated', ctx.ip);
  return { ok: true };
});
// Has the institution registered its Electoral Literacy Club on the ECINET app? 'yes' or 'no'; the portal keeps asking while it is not 'yes'.
route('PUT', '/api/college/elc-status', 'college', async ctx => {
  const v = ctx.body?.status;
  if (v !== 'yes' && v !== 'no') throw bad('Choose Yes or No');
  ctx.db.deferred = true;
  await ctx.db.run('UPDATE colleges SET elc_status=? WHERE id=?', v, ctx.college.id);
  await log(ctx.db, 'college', ctx.college.name, null, 'elc_status', 'ELC registered on ECINET: ' + v, ctx.ip);
  return { ok: true, status: v };
});
