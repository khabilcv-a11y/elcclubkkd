// Help desk daily reports: registrations made and volunteers present each day, plus the volunteers of other activities.
import { route, scopeOf } from '../lib/router.js';
import { log } from '../lib/db.js';
import { HttpError, bad, isDate, todayStr, nowIso, str, reqStr, int } from '../lib/util.js';

export const ACTIVITIES = ['Flash Mob', 'Class to Class Campaign', 'Game Zone', 'Other'];
const clog = (ctx, action, detail) => log(ctx.db, 'college', ctx.college.name, null, action, detail, ctx.ip);
const kindOf = c => (c.kind === 'school' ? 'school' : 'college');

function checkDate(d) {
  if (!isDate(d)) throw bad('Choose a valid date');
  if (d > todayStr()) throw bad('That date is in the future. You can report a day once it has happened.');
  return d;
}

// ---------- the college's own page ----------
route('GET', '/api/college/desk', 'college', async ctx => {
  const date = ctx.query.date && isDate(ctx.query.date) ? ctx.query.date : todayStr(), id = ctx.college.id;
  const [day, acts, names, hist] = await Promise.all([
    ctx.db.get('SELECT registrations,volunteers,notes,updated_at FROM desk_days WHERE college_id=? AND date=?', id, date),
    ctx.db.all('SELECT id,activity,activity_other,name,contact FROM activity_log WHERE college_id=? AND date=? ORDER BY id', id, date),
    ctx.db.all('SELECT name,MAX(date) last FROM activity_log WHERE college_id=? GROUP BY name ORDER BY last DESC LIMIT 300', id),
    ctx.db.all('SELECT date,registrations,volunteers FROM desk_days WHERE college_id=? ORDER BY date DESC LIMIT 60', id)]);
  const poolNames = await ctx.db.all('SELECT name FROM pool WHERE college_id=? AND active=1 ORDER BY name', id);
  const seen = new Set(), suggestions = [];
  for (const n of [...names.map(r => r.name), ...poolNames.map(r => r.name)]) { const k = n.toLowerCase(); if (!seen.has(k)) { seen.add(k); suggestions.push(n); } }
  const totals = await ctx.db.get('SELECT COALESCE(SUM(registrations),0) registrations,COUNT(*) days,COALESCE(SUM(volunteers),0) volunteer_days FROM desk_days WHERE college_id=?', id);
  return { date, today: todayStr(), day: day || null, activities: acts, suggestions, history: hist, totals, choices: ACTIVITIES };
});
route('GET', '/api/college/desk/summary', 'college', ctx => ctx.db.get('SELECT COALESCE(SUM(registrations),0) registrations,COUNT(*) days FROM desk_days WHERE college_id=?', ctx.college.id));

route('PUT', '/api/college/desk', 'college', async ctx => {
  const b = ctx.body, id = ctx.college.id, date = checkDate(b.date);
  const registrations = int(b.registrations, 'Registrations made', { max: 100000 }), volunteers = int(b.volunteers, 'Volunteers present at the help desk', { max: 5000 }), notes = str(b.notes, 400), now = nowIso();
  const r = await ctx.db.run('UPDATE desk_days SET registrations=?,volunteers=?,notes=?,updated_at=? WHERE college_id=? AND date=?', registrations, volunteers, notes, now, id, date);
  if (!r.changes) await ctx.db.run('INSERT INTO desk_days(college_id,date,registrations,volunteers,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', id, date, registrations, volunteers, notes, now, now);
  await clog(ctx, 'desk_report', `${date}: ${registrations} registrations, ${volunteers} volunteers`);
  return { ok: true };
});

route('POST', '/api/college/desk/activity', 'college', async ctx => {
  const b = ctx.body, id = ctx.college.id, date = checkDate(b.date);
  const activity = String(b.activity || '');
  if (!ACTIVITIES.includes(activity)) throw bad('Choose an activity');
  const other = activity === 'Other' ? reqStr(b.other, 'Please say which activity', 60) : '';
  const names = (Array.isArray(b.names) ? b.names : [b.name]).map(x => String(x || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40);
  if (!names.length) throw bad('Enter the volunteer name');
  let added = 0;
  for (const name of names) {
    if (name.length > 80) throw bad('A name is too long');
    const dup = await ctx.db.get('SELECT 1 x FROM activity_log WHERE college_id=? AND date=? AND activity=? AND lower(name)=lower(?) AND COALESCE(activity_other,\'\')=?', id, date, activity, name, other);
    if (dup) continue;
    await ctx.db.insert('INSERT INTO activity_log(college_id,date,activity,activity_other,name,contact,created_at) VALUES (?,?,?,?,?,?,?)', id, date, activity, other, name, str(b.contact, 20), nowIso());
    added++;
  }
  if (!added) throw bad('That volunteer is already listed for this activity today');
  await clog(ctx, 'desk_activity', `${date}: ${activity}${other ? ' (' + other + ')' : ''} +${added}`);
  return { ok: true, added };
});
route('DELETE', '/api/college/desk/activity/:id', 'college', async ctx => {
  const r = await ctx.db.run('DELETE FROM activity_log WHERE id=? AND college_id=?', Number(ctx.params.id), ctx.college.id);
  if (!r.changes) throw new HttpError(404, 'Not found');
  return { ok: true };
});

// ---------- reports for the district ----------
const N = (key, label) => ({ key, label, num: true });
const T = (key, label) => ({ key, label });
export const DESK_DATASETS = [
  { key: 'desk_inst', title: 'Help desk totals by college / school' },
  { key: 'desk', title: 'Help desk day by day' },
  { key: 'activities', title: 'Volunteers in other activities' },
  { key: 'activity_summary', title: 'Activities summary' },
];
export async function deskReport(ctx, type, q) {
  const s = await scopeOf(ctx);
  const cs = await ctx.db.all("SELECT id,name,COALESCE(kind,'college') kind FROM colleges WHERE active=1 ORDER BY name");
  const info = new Map(cs.map(c => [c.id, c])), text = q.q ? String(q.q).toLowerCase() : null;
  const inScope = id => info.has(id) && (!s || s.colleges.has(id)) && (!q.college || String(id) === String(q.college)) && (!q.kind || info.get(id).kind === q.kind);
  const inDates = d => (!q.from || d >= q.from) && (!q.to || d <= q.to);
  const typeOf = id => (info.get(id).kind === 'school' ? 'School' : 'College');
  const days = (await ctx.db.all('SELECT * FROM desk_days ORDER BY date DESC')).filter(r => inScope(r.college_id) && inDates(r.date) && (!text || info.get(r.college_id).name.toLowerCase().includes(text) || String(r.notes || '').toLowerCase().includes(text)));
  const acts = (await ctx.db.all('SELECT * FROM activity_log ORDER BY date DESC,id DESC')).filter(r => inScope(r.college_id) && inDates(r.date) && (!text || [info.get(r.college_id).name, r.name, r.activity, r.activity_other].some(x => String(x || '').toLowerCase().includes(text))));
  const actName = r => (r.activity === 'Other' && r.activity_other ? `Other: ${r.activity_other}` : r.activity);
  if (type === 'desk') return { title: 'Help desk day by day', cols: [T('date', 'Date'), T('college', 'Institution'), T('type', 'Type'), N('registrations', 'Registrations made'), N('volunteers', 'Volunteers at help desk'), T('notes', 'Notes')],
    rows: days.map(r => ({ date: r.date, college: info.get(r.college_id).name, type: typeOf(r.college_id), registrations: r.registrations, volunteers: r.volunteers, notes: r.notes })) };
  if (type === 'activities') return { title: 'Volunteers in other activities', cols: [T('date', 'Date'), T('college', 'Institution'), T('type', 'Type'), T('activity', 'Activity'), T('name', 'Volunteer'), T('contact', 'Contact')],
    rows: acts.map(r => ({ date: r.date, college: info.get(r.college_id).name, type: typeOf(r.college_id), activity: actName(r), name: r.name, contact: r.contact })) };
  if (type === 'activity_summary') {
    const m = new Map();
    for (const r of acts) { const k = actName(r), g = m.get(k) || { activity: k, entries: 0, people: new Set(), colleges: new Set(), dates: new Set() }; g.entries++; g.people.add(`${r.college_id}|${r.name.toLowerCase()}`); g.colleges.add(r.college_id); g.dates.add(r.date); m.set(k, g); }
    return { title: 'Activities summary', cols: [T('activity', 'Activity'), N('colleges', 'Institutions'), N('days', 'Days held'), N('people', 'Different volunteers'), N('entries', 'Volunteer-days')],
      rows: [...m.values()].map(g => ({ activity: g.activity, colleges: g.colleges.size, days: g.dates.size, people: g.people.size, entries: g.entries })).sort((a, b) => b.entries - a.entries) };
  }
  // totals by institution (institutions that have not reported are listed too)
  const by = new Map();
  for (const r of days) { const g = by.get(r.college_id) || { days: 0, regs: 0, vols: 0, last: '' }; g.days++; g.regs += r.registrations; g.vols += r.volunteers; if (r.date > g.last) g.last = r.date; by.set(r.college_id, g); }
  const actBy = new Map();
  for (const r of acts) actBy.set(r.college_id, (actBy.get(r.college_id) || 0) + 1);
  return { title: 'Help desk totals by college / school', cols: [T('college', 'Institution'), T('type', 'Type'), N('days', 'Days reported'), N('registrations', 'Registrations made'), N('avg', 'Registrations per day'), N('volunteers', 'Volunteer-days at help desk'), N('activity', 'Volunteer-days in other activities'), T('last', 'Last report')],
    rows: cs.filter(c => inScope(c.id) && (!text || c.name.toLowerCase().includes(text))).map(c => { const g = by.get(c.id) || { days: 0, regs: 0, vols: 0, last: '' };
      return { college: c.name, type: typeOf(c.id), days: g.days, registrations: g.regs, avg: g.days ? Math.round(g.regs / g.days * 10) / 10 : null, volunteers: g.vols, activity: actBy.get(c.id) || 0, last: g.last }; }) };
}
