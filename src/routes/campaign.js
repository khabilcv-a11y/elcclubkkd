// Campus to booth drive: enrolment numbers collected through a department link, plus the super admin's section switches.
import { route, scopeOf } from '../lib/router.js';
import { log } from '../lib/db.js';
import { HttpError, bad, nowIso, int } from '../lib/util.js';
import { FEATURES, featureMap, isFeature } from '../lib/features.js';
import { campusStats } from '../lib/stats.js';

const slog = (ctx, action, detail) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, action, detail, ctx.ip);
const clog = (ctx, action, detail) => log(ctx.db, 'college', ctx.college.name, null, action, detail, ctx.ip);
const SUPER = ['super_admin'];
const kindOf = c => (c.kind === 'school' ? 'school' : 'college');
const base = ctx => ctx.env.BASE_URL || new URL(ctx.req.url).origin;

// ---------- numbers ----------
export function tally(rows) {
  const t = { strength: 0, registered: 0, ineligible: 0 };
  for (const r of rows) { t.strength += r.strength; t.registered += r.registered; t.ineligible += r.ineligible; }
  t.eligible = Math.max(0, t.strength - t.ineligible);
  t.balance = Math.max(0, t.eligible - t.registered);
  t.pct = t.eligible ? Math.min(100, Math.round(t.registered * 100 / t.eligible)) : null;
  return t;
}
function byDept(rows) {
  const m = new Map();
  for (const r of rows) {
    const d = m.get(r.dept) || { dept: r.dept, coordinator: r.coordinator, phone: r.phone, updated_at: r.updated_at, classes: [] };
    d.classes.push({ id: r.id, name: r.class_name, strength: r.strength, registered: r.registered, ineligible: r.ineligible });
    if ((r.updated_at || '') > (d.updated_at || '')) { d.updated_at = r.updated_at; d.coordinator = r.coordinator; d.phone = r.phone; }
    m.set(r.dept, d);
  }
  return [...m.values()].map(d => ({ ...d, classes: d.classes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    totals: tally(d.classes.map(c => ({ strength: c.strength, registered: c.registered, ineligible: c.ineligible }))) })).sort((a, b) => a.dept.localeCompare(b.dept));
}
const loadRows = (db, collegeId) => db.all('SELECT * FROM enrol_classes WHERE college_id=? ORDER BY dept,class_name', collegeId);

// ---------- the college's own numbers: totals only ----------
const TOTAL_DEPT = 'Total';
const totalRow = (db, id) => db.get('SELECT * FROM enrol_classes WHERE college_id=? AND dept=?', id, TOTAL_DEPT);
route('GET', '/api/college/enrol', 'college', async ctx => {
  const r = await totalRow(ctx.db, ctx.college.id);
  return { kind: kindOf(ctx.college), entry: r ? { strength: r.strength, registered: r.registered, ineligible: r.ineligible, updated_at: r.updated_at } : null, totals: tally(r ? [r] : []) };
});
route('PUT', '/api/college/enrol', 'college', async ctx => {
  const b = ctx.body, c = ctx.college;
  const strength = int(b.strength, 'Total students', { max: 200000 }), registered = int(b.registered, 'Registered students', { max: 200000 }), ineligible = int(b.ineligible, 'Students not eligible yet', { max: 200000 });
  if (registered + ineligible > strength) throw bad("Registered plus not eligible can't be more than the total number of students");
  const now = nowIso(), old = await totalRow(ctx.db, c.id);
  if (old) await ctx.db.run('UPDATE enrol_classes SET strength=?,registered=?,ineligible=?,updated_at=? WHERE id=?', strength, registered, ineligible, now, old.id);
  else await ctx.db.run('INSERT INTO enrol_classes(college_id,dept,coordinator,phone,class_name,strength,registered,ineligible,updated_at) VALUES (?,?,?,?,?,?,?,?,?)', c.id, TOTAL_DEPT, c.coordinator || '', c.phone || '', 'All students', strength, registered, ineligible, now);
  await ctx.db.run('DELETE FROM enrol_classes WHERE college_id=? AND dept<>?', c.id, TOTAL_DEPT);   // any older department-wise rows
  await clog(ctx, 'enrol_update', `${registered} registered of ${strength}`);
  return { ok: true, totals: tally([{ strength, registered, ineligible }]) };
});

// ---------- district view ----------
route('GET', '/api/staff/enrol', 'staff', async ctx => {
  const s = await scopeOf(ctx), kind = ctx.query.kind === 'school' ? 'school' : ctx.query.kind === 'college' ? 'college' : null;
  const [cs, rows] = await Promise.all([ctx.db.all('SELECT id,name,short_name,kind,coordinator,phone FROM colleges WHERE active=1 ORDER BY name'), ctx.db.all('SELECT * FROM enrol_classes')]);
  const by = new Map(rows.filter(r => r.dept === TOTAL_DEPT).map(r => [r.college_id, r]));
  const out = cs.filter(c => (!s || s.colleges.has(c.id)) && (!kind || kindOf(c) === kind)).map(c => { const r = by.get(c.id); return { id: c.id, name: c.name, kind: kindOf(c), coordinator: c.coordinator, phone: c.phone, updated_at: r ? r.updated_at : null, totals: tally(r ? [r] : []) }; });
  return { institutions: out, totals: tally(out.filter(i => by.has(i.id)).map(i => i.totals)), reporting: out.filter(i => by.has(i.id)).length };
});

// ---------- reports (plugged into the reports page) ----------
const N = (key, label) => ({ key, label, num: true });
const T = (key, label) => ({ key, label });
export const ENROL_DATASETS = [{ key: 'enrol_inst', title: 'Enrolment by college / school' }];
export async function enrolReport(ctx, type, q) {
  const s = await scopeOf(ctx), text = q.q ? String(q.q).toLowerCase() : null;
  const [cs, rows] = await Promise.all([ctx.db.all('SELECT id,name,kind FROM colleges WHERE active=1 ORDER BY name'), ctx.db.all('SELECT * FROM enrol_classes WHERE dept=?', TOTAL_DEPT)]);
  const by = new Map(rows.map(r => [r.college_id, r]));
  const list = cs.filter(c => (!s || s.colleges.has(c.id)) && (!q.college || String(c.id) === String(q.college)) && (!q.kind || kindOf(c) === q.kind) && (!text || c.name.toLowerCase().includes(text)));
  return { title: 'Enrolment by college / school', cols: [T('college', 'Institution'), T('type', 'Type'), N('strength', 'Total students'), N('registered', 'Registered'), N('ineligible', 'Not eligible yet'), N('eligible', 'Eligible'), N('balance', 'Balance to cover'), N('pct', 'Covered %'), T('updated', 'Updated')],
    rows: list.map(c => { const r = by.get(c.id), t = tally(r ? [r] : []); return { college: c.name, type: kindOf(c) === 'school' ? 'School' : 'College', strength: t.strength, registered: t.registered, ineligible: t.ineligible, eligible: t.eligible, balance: t.balance, pct: t.pct, updated: r ? (r.updated_at || '').slice(0, 10) : '' }; }) };
}

// coverage + inputs + performance of every institution (staff dashboard)
route('GET', '/api/staff/campus', 'staff', async ctx => {
  const s = await scopeOf(ctx), kind = ctx.query.kind === 'school' ? 'school' : ctx.query.kind === 'college' ? 'college' : null;
  const cs = await campusStats(ctx.db);
  const list = cs.institutions.filter(i => (!s || s.colleges.has(i.id)) && (!kind || i.kind === kind));
  const t = { strength: 0, registered: 0, ineligible: 0, desk_regs: 0, desk_vols: 0, activity: 0, photos: 0, depts: 0, reporting: 0, active: 0, desk_reporting: 0, institutions: list.length };
  for (const i of list) { for (const k of ['strength', 'registered', 'ineligible', 'desk_regs', 'desk_vols', 'activity', 'photos', 'depts']) t[k] += i[k]; if (i.strength > 0) t.reporting++; if (i.status === 'active') t.active++; if (i.desk_days > 0) t.desk_reporting++; }
  t.eligible = Math.max(0, t.strength - t.ineligible); t.balance = Math.max(0, t.eligible - t.registered); t.pct = t.eligible ? Math.min(100, Math.round(t.registered * 100 / t.eligible)) : null;
  return { institutions: list, totals: t, trend: s ? [] : cs.trend };
});

// ---------- performance report ----------
export const PERF_DATASETS = [{ key: 'performance', title: 'College and school performance' }];
const STATUS = { active: 'Active this week', quiet: 'Quiet (no activity this week)', new: 'Not started' };
export async function performanceReport(ctx, q) {
  const s = await scopeOf(ctx), text = q.q ? String(q.q).toLowerCase() : null;
  const cs = await campusStats(ctx.db);
  const rows = cs.institutions.filter(i => (!s || s.colleges.has(i.id)) && (!q.college || String(i.id) === String(q.college)) && (!q.kind || i.kind === q.kind) && (!text || i.name.toLowerCase().includes(text)))
    .map(i => ({ college: i.name, type: i.kind === 'school' ? 'School' : 'College', strength: i.strength, registered: i.registered, ineligible: i.ineligible, eligible: i.eligible, balance: i.balance, pct: i.pct, depts: i.depts, classes: i.classes,
      desk_days: i.desk_days, desk_regs: i.desk_regs, desk_vols: i.desk_vols, activity: i.activity, photos: i.photos, last: i.last_active, status: STATUS[i.status] }));
  return { title: 'College and school performance', cols: [T('college', 'Institution'), T('type', 'Type'), N('strength', 'Total students'), N('registered', 'Registered'), N('ineligible', 'Not eligible (under 17)'), N('eligible', 'Eligible'), N('balance', 'Balance to cover'), N('pct', 'Covered %'),
    N('depts', 'Departments reported'), N('classes', 'Classes'), N('desk_days', 'Help desk days reported'), N('desk_regs', 'Help desk registrations'), N('desk_vols', 'Help desk volunteer-days'), N('activity', 'Volunteer-days in other activities'), N('photos', 'Photos shared'), T('last', 'Last activity'), T('status', 'Status')], rows };
}

// ---------- section switches ----------
route('GET', '/api/features', null, async ctx => featureMap(ctx.db));
route('GET', '/api/staff/features', SUPER, async ctx => {
  const map = await featureMap(ctx.db);
  return Object.entries(FEATURES).map(([aud, g]) => ({ audience: aud, title: g.title, items: g.items.map(([id, label]) => ({ id, label, enabled: map[aud][id] })) }));
});
route('PUT', '/api/staff/features', SUPER, async ctx => {
  const key = String(ctx.body.key || ''), on = ctx.body.enabled ? 1 : 0;
  if (!isFeature(key)) throw bad('Unknown option');
  const r = await ctx.db.run('UPDATE features SET enabled=?,updated_by=?,updated_at=? WHERE key=?', on, ctx.user.username, nowIso(), key);
  if (!r.changes) await ctx.db.run('INSERT INTO features(key,enabled,updated_by,updated_at) VALUES (?,?,?,?)', key, on, ctx.user.username, nowIso());
  await slog(ctx, on ? 'feature_on' : 'feature_off', key);
  return { ok: true };
});
