// An institution's own profile: the details the district office keeps about it (coordinator, head of institution, contact).
import { route } from '../lib/router.js';
import { log } from '../lib/db.js';
import { reqStr, str, emailOk, nowIso } from '../lib/util.js';
import { EXTRA, INST_TYPES, extraBody, profileStatus } from '../lib/profile.js';

const FIELDS = ['name', 'short_name', 'kind', 'address', 'phone', 'email', 'coordinator', 'lsgi', ...EXTRA];
route('GET', '/api/college/profile', 'college', ctx => {
  const c = ctx.college, out = {};
  for (const k of FIELDS) out[k] = c[k] ?? '';
  out.kind = c.kind === 'school' ? 'school' : 'college'; out.profile_at = c.profile_at || null;
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
