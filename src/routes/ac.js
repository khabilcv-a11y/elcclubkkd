// Which Assembly Constituency (AC) each college and school belongs to. The AC and district rounds of the quiz and essay competitions are built on it,
// so the super admin's dashboard flags every active institution that has none. The district office's list is applied with one button; the rest are set by hand.
import { route } from '../lib/router.js';
import { log } from '../lib/db.js';
import { HttpError, bad } from '../lib/util.js';
import { ACS, AC_LIST, matchInstitution } from '../lib/ac.js';

const OPS = ['super_admin', 'admin'];
const slog = (ctx, a, d) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, a, d, ctx.ip);
const rows = db => db.all("SELECT id,name,COALESCE(kind,'college') kind,active,COALESCE(ac,'') ac,COALESCE(ac_all,'') ac_all FROM colleges ORDER BY name");

route('GET', '/api/staff/ac-status', OPS, async ctx => {
  const all = await rows(ctx.db), active = all.filter(c => c.active);
  return { acs: ACS, total: active.length, assigned: active.filter(c => c.ac).length, unassigned: active.filter(c => !c.ac).map(c => ({ id: c.id, name: c.name, kind: c.kind })),
    multi: active.filter(c => c.ac_all.includes(',')).length, institutions: active.map(c => ({ id: c.id, name: c.name, kind: c.kind, ac: c.ac, ac_all: c.ac_all })) };
});
// apply the district office's list: names are matched to the registered institutions; ones that already have an AC are left alone unless force is set
route('POST', '/api/staff/ac-import', OPS, async ctx => {
  ctx.db.deferred = true;
  const all = await rows(ctx.db), force = !!ctx.body.force, done = [], unmatched = []; let skipped = 0;
  const taken = new Set();
  for (const [name, acs] of AC_LIST) {
    const c = matchInstitution(name, all);
    if (!c || taken.has(c.id)) { unmatched.push(name); continue; }
    taken.add(c.id);
    if (c.ac && !force) { skipped++; continue; }
    await ctx.db.run('UPDATE colleges SET ac=?,ac_all=? WHERE id=?', acs[0], acs.join(', '), c.id);
    done.push({ listed: name, portal: c.name, acs });
  }
  await slog(ctx, 'ac_import', `${done.length} set, ${unmatched.length} not found`);
  return { ok: true, applied: done.length, skipped, unmatched, applied_list: done.filter(d => d.listed !== d.portal).slice(0, 80) };
});
route('POST', '/api/staff/colleges/:id/ac', OPS, async ctx => {
  const c = await ctx.db.get('SELECT id,name FROM colleges WHERE id=?', Number(ctx.params.id));
  if (!c) throw new HttpError(404, 'Institution not found');
  const ac = String(ctx.body.ac || '');
  if (ac && !ACS.includes(ac)) throw bad('Choose one of the constituencies of the district');
  const more = (Array.isArray(ctx.body.ac_all) ? ctx.body.ac_all : []).filter(x => ACS.includes(x));
  await ctx.db.run('UPDATE colleges SET ac=?,ac_all=? WHERE id=?', ac, ac ? [ac, ...more.filter(x => x !== ac)].join(', ') : '', c.id);
  await slog(ctx, 'ac_set', `${c.name}: ${ac || 'none'}`);
  return { ok: true };
});
