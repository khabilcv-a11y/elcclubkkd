// Campus to booth drive: enrolment numbers collected through a department link, plus the super admin's section switches.
import { route, scopeOf } from '../lib/router.js';
import { log } from '../lib/db.js';
import { HttpError, bad, token, nowIso, str, reqStr, int, csv } from '../lib/util.js';
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

// ---------- the college's own view + the shareable link ----------
route('POST', '/api/college/enrol/link', 'college', async ctx => {
  let t = ctx.college.drive_token;
  if (!t || ctx.body.regenerate) { t = token(16); await ctx.db.run('UPDATE colleges SET drive_token=? WHERE id=?', t, ctx.college.id); await clog(ctx, 'enrol_link', ctx.body.regenerate ? 'New department link created' : 'Department link created'); }
  return { token: t, link: `${base(ctx)}/#/dept/${t}` };
});
route('GET', '/api/college/enrol', 'college', async ctx => {
  const rows = await loadRows(ctx.db, ctx.college.id), depts = byDept(rows);
  const t = ctx.college.drive_token;
  return { kind: kindOf(ctx.college), link: t ? `${base(ctx)}/#/dept/${t}` : null, depts, totals: tally(rows) };
});
route('POST', '/api/college/enrol/delete', 'college', async ctx => {
  const dept = reqStr(ctx.body.dept, 'Department', 80);
  await ctx.db.run('DELETE FROM enrol_classes WHERE college_id=? AND dept=?', ctx.college.id, dept);
  await clog(ctx, 'enrol_dept_delete', dept);
  return { ok: true };
});

// ---------- the public department page (identified only by the college's link) ----------
async function institutionFor(ctx) {
  const t = String(ctx.params.token || '');
  const c = t.length >= 12 ? await ctx.db.get('SELECT id,name,kind,active FROM colleges WHERE drive_token=?', t) : null;
  if (!c || !c.active) throw new HttpError(404, 'This link is not valid any more. Please ask your college coordinator for the current link.');
  return c;
}
route('GET', '/api/dept/:token', null, async ctx => {
  const c = await institutionFor(ctx);
  const names = (await ctx.db.all('SELECT DISTINCT dept FROM enrol_classes WHERE college_id=? ORDER BY dept', c.id)).map(r => r.dept);
  return { institution: c.name, kind: kindOf(c), depts: names };
});
route('GET', '/api/dept/:token/classes', null, async ctx => {
  const c = await institutionFor(ctx);
  const dept = str(ctx.query.dept, 80).toLowerCase();
  const rows = (await loadRows(ctx.db, c.id)).filter(r => r.dept.toLowerCase() === dept);
  return rows.length ? byDept(rows)[0] : null;
});
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
route('PUT', '/api/dept/:token', null, async ctx => {
  const c = await institutionFor(ctx), b = ctx.body, kind = kindOf(c);
  const unit = kind === 'school' ? 'Section' : 'Department';
  const dept = clean(reqStr(b.dept, `${unit} name`, 80)), who = clean(str(b.coordinator, 80)), phone = clean(str(b.phone, 20));
  if (!who) throw bad('Please enter your name');
  const list = Array.isArray(b.classes) ? b.classes.slice(0, 80) : [];
  if (!list.length) throw bad('Add at least one class');
  const seen = new Set(), rows = [];
  for (const x of list) {
    const name = clean(reqStr(x.name, 'Class name', 60)), key = name.toLowerCase();
    if (seen.has(key)) throw bad(`"${name}" is listed twice`);
    seen.add(key);
    const strength = int(x.strength, `Total students in ${name}`), registered = int(x.registered, `Registered in ${name}`), ineligible = int(x.ineligible, `Under 17 in ${name}`);
    if (registered + ineligible > strength) throw bad(`${name}: registered plus under-17 can't be more than the total students`);
    rows.push({ name, strength, registered, ineligible });
  }
  const existing = (await loadRows(ctx.db, c.id)).filter(r => r.dept.toLowerCase() === dept.toLowerCase());
  const deptName = existing[0]?.dept || dept, now = nowIso();
  await ctx.db.tx(async tx => {
    for (const e of existing) if (!seen.has(e.class_name.toLowerCase())) await tx.run('DELETE FROM enrol_classes WHERE id=?', e.id);
    for (const r of rows) {
      const old = existing.find(e => e.class_name.toLowerCase() === r.name.toLowerCase());
      if (old) await tx.run('UPDATE enrol_classes SET class_name=?,coordinator=?,phone=?,strength=?,registered=?,ineligible=?,updated_at=? WHERE id=?', r.name, who, phone, r.strength, r.registered, r.ineligible, now, old.id);
      else await tx.run('INSERT INTO enrol_classes(college_id,dept,coordinator,phone,class_name,strength,registered,ineligible,updated_at) VALUES (?,?,?,?,?,?,?,?,?)', c.id, deptName, who, phone, r.name, r.strength, r.registered, r.ineligible, now);
    }
  });
  await log(ctx.db, 'public', who, null, 'enrol_submit', `${c.name} / ${deptName}: ${rows.length} classes`, ctx.ip);
  return { ok: true, institution: c.name, dept: deptName, totals: tally(rows.map(r => ({ strength: r.strength, registered: r.registered, ineligible: r.ineligible }))) };
});

// ---------- district view ----------
route('GET', '/api/staff/enrol', 'staff', async ctx => {
  const s = await scopeOf(ctx), kind = ctx.query.kind === 'school' ? 'school' : ctx.query.kind === 'college' ? 'college' : null;
  const [cs, rows] = await Promise.all([ctx.db.all('SELECT id,name,short_name,kind,coordinator,phone FROM colleges WHERE active=1 ORDER BY name'), ctx.db.all('SELECT * FROM enrol_classes ORDER BY dept,class_name')]);
  const by = new Map();
  for (const r of rows) (by.get(r.college_id) || by.set(r.college_id, []).get(r.college_id)).push(r);
  const out = cs.filter(c => (!s || s.colleges.has(c.id)) && (!kind || kindOf(c) === kind)).map(c => {
    const rs = by.get(c.id) || [];
    return { id: c.id, name: c.name, kind: kindOf(c), coordinator: c.coordinator, phone: c.phone, depts: byDept(rs), totals: tally(rs) };
  });
  return { institutions: out, totals: tally(out.flatMap(i => by.get(i.id) || [])), reporting: out.filter(i => i.depts.length).length };
});

// ---------- reports (plugged into the reports page) ----------
const N = (key, label) => ({ key, label, num: true });
const T = (key, label) => ({ key, label });
export const ENROL_DATASETS = [
  { key: 'enrol_inst', title: 'Enrolment by college / school' },
  { key: 'enrol_dept', title: 'Enrolment by department' },
  { key: 'enrol', title: 'Enrolment by class' },
];
export async function enrolReport(ctx, type, q) {
  const s = await scopeOf(ctx);
  const [cs, rows] = await Promise.all([ctx.db.all('SELECT id,name,kind FROM colleges WHERE active=1 ORDER BY name'), ctx.db.all('SELECT * FROM enrol_classes ORDER BY dept,class_name')]);
  const info = new Map(cs.map(c => [c.id, c]));
  const text = q.q ? String(q.q).toLowerCase() : null;
  const keep = rows.filter(r => info.has(r.college_id) && (!s || s.colleges.has(r.college_id)) && (!q.college || String(r.college_id) === String(q.college))
    && (!q.kind || kindOf(info.get(r.college_id)) === q.kind) && (!text || [info.get(r.college_id).name, r.dept, r.class_name, r.coordinator].some(x => String(x || '').toLowerCase().includes(text))));
  const num = r => { const t = tally([r]); return { strength: r.strength, registered: r.registered, ineligible: r.ineligible, eligible: t.eligible, balance: t.balance, pct: t.pct }; };
  const NUMCOLS = [N('strength', 'Total students'), N('registered', 'Registered'), N('ineligible', 'Not eligible (under 17)'), N('eligible', 'Eligible'), N('balance', 'Balance to cover'), N('pct', 'Covered %')];
  const label = id => (kindOf(info.get(id)) === 'school' ? 'School' : 'College');
  if (type === 'enrol') {
    return { title: 'Enrolment by class', cols: [T('college', 'Institution'), T('type', 'Type'), T('dept', 'Department'), T('class', 'Class'), T('coordinator', 'Department coordinator'), T('phone', 'Phone'), ...NUMCOLS, T('updated', 'Updated')],
      rows: keep.map(r => ({ college: info.get(r.college_id).name, type: label(r.college_id), dept: r.dept, class: r.class_name, coordinator: r.coordinator, phone: r.phone, ...num(r), updated: (r.updated_at || '').slice(0, 10) })) };
  }
  const group = keyOf => { const m = new Map(); for (const r of keep) { const k = keyOf(r); (m.get(k) || m.set(k, []).get(k)).push(r); } return [...m.entries()]; };
  if (type === 'enrol_dept') {
    return { title: 'Enrolment by department', cols: [T('college', 'Institution'), T('type', 'Type'), T('dept', 'Department'), T('coordinator', 'Department coordinator'), T('phone', 'Phone'), N('classes', 'Classes'), ...NUMCOLS],
      rows: group(r => `${r.college_id}|${r.dept}`).map(([, rs]) => ({ college: info.get(rs[0].college_id).name, type: label(rs[0].college_id), dept: rs[0].dept, coordinator: rs[0].coordinator, phone: rs[0].phone, classes: rs.length, ...tallyRow(rs) })) };
  }
  // by institution: include institutions that have not reported yet
  const have = new Map(group(r => r.college_id));
  const list = cs.filter(c => (!s || s.colleges.has(c.id)) && (!q.college || String(c.id) === String(q.college)) && (!q.kind || kindOf(c) === q.kind) && (!text || c.name.toLowerCase().includes(text)));
  return { title: 'Enrolment by college / school', cols: [T('college', 'Institution'), T('type', 'Type'), N('depts', 'Departments reported'), N('classes', 'Classes'), ...NUMCOLS],
    rows: list.map(c => { const rs = have.get(c.id) || []; return { college: c.name, type: label(c.id), depts: new Set(rs.map(r => r.dept)).size, classes: rs.length, ...tallyRow(rs) }; }) };
}
function tallyRow(rs) { const t = tally(rs); return { strength: t.strength, registered: t.registered, ineligible: t.ineligible, eligible: t.eligible, balance: t.balance, pct: t.pct }; }

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
