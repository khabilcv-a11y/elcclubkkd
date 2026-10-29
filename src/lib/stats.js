import { todayStr } from './util.js';

// Score = registered x10 + addressed x2 + volunteer-days attended x5 + villages acknowledged x50
export const SCORE_FORMULA = { registered: 10, addressed: 2, attended: 5, verifiedVillage: 50 };

export async function collegeStats(db) {
  const [colleges, asgR, dysR, volR] = await Promise.all([
    db.all('SELECT id,name,short_name,address FROM colleges WHERE active=1'),
    db.all(`SELECT college_id id, COUNT(*) villages, COALESCE(SUM((ack_status='acknowledged')),0) ack,
      COALESCE(SUM((ack_status='submitted')),0) submitted FROM assignments GROUP BY college_id`),
    db.all(`SELECT d.college_id id, COUNT(*) planned,
      COALESCE(SUM((EXISTS(SELECT 1 FROM volunteers v WHERE v.day_id=d.id AND v.attended=1))),0) done FROM days d GROUP BY d.college_id`),
    db.all(`SELECT d.college_id id,
      COALESCE(SUM((v.attended=1)),0) attended, COALESCE(SUM((v.attended=0)),0) absent,
      COALESCE(SUM(CASE WHEN v.attended=1 THEN v.addressed END),0) addressed,
      COALESCE(SUM(CASE WHEN v.attended=1 THEN v.registered END),0) registered,
      COALESCE(SUM(CASE WHEN v.attended=1 AND a.ack_status='acknowledged' THEN v.registered END),0) verified_registered,
      COUNT(DISTINCT CASE WHEN v.name<>'' THEN lower(trim(v.name))||'|'||v.contact END) volunteers
    FROM volunteers v JOIN days d ON d.id=v.day_id
    LEFT JOIN assignments a ON a.college_id=d.college_id AND a.village_id=d.village_id GROUP BY d.college_id`)]);
  const asg = new Map(asgR.map(r => [r.id, r])), dys = new Map(dysR.map(r => [r.id, r])), vol = new Map(volR.map(r => [r.id, r]));
  const rows = colleges.map(c => {
    const a = asg.get(c.id) || {}, d = dys.get(c.id) || {}, v = vol.get(c.id) || {};
    const attended = v.attended || 0, absent = v.absent || 0;
    const r = {
      id: c.id, name: c.name, short_name: c.short_name || c.name, address: c.address,
      villages: a.villages || 0, villages_ack: a.ack || 0, villages_submitted: a.submitted || 0,
      days_planned: d.planned || 0, days_done: d.done || 0,
      volunteers: v.volunteers || 0, vdays_attended: attended, vdays_absent: absent,
      attendance_pct: attended + absent ? Math.round(attended * 100 / (attended + absent)) : null,
      addressed: v.addressed || 0, registered: v.registered || 0, verified_registered: v.verified_registered || 0,
    };
    r.score = r.registered * SCORE_FORMULA.registered + r.addressed * SCORE_FORMULA.addressed +
      r.vdays_attended * SCORE_FORMULA.attended + r.villages_ack * SCORE_FORMULA.verifiedVillage;
    return r;
  });
  rows.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

const pct = (a, b) => (b ? Math.round(a * 1000 / b) / 10 : null);
const addDays = (iso, k) => new Date(Date.parse(iso + 'T00:00:00Z') + k * 864e5).toISOString().slice(0, 10);

// everything the public home page / display board shows (aggregates only: no student names or phone numbers)
export async function publicBoard(db) {
  const today = todayStr();
  const [colleges, villagesRaw, sums, trend, feedRaw, best, pool, officers] = await Promise.all([
    collegeStats(db),
    db.all(`SELECT v.id,v.name,v.taluk,v.lat,v.lng,v.lsgi,a.college_id,c.short_name college,a.ack_status FROM villages v
      LEFT JOIN assignments a ON a.village_id=v.id LEFT JOIN colleges c ON c.id=a.college_id AND c.active=1 ORDER BY v.taluk,v.name`),
    db.all(`SELECT d.village_id id,COUNT(DISTINCT d.id) days,
      COALESCE(SUM(CASE WHEN x.attended=1 THEN 1 END),0) present,COALESCE(SUM(CASE WHEN x.attended=1 THEN x.addressed END),0) addressed,
      COALESCE(SUM(CASE WHEN x.attended=1 THEN x.registered END),0) registered,COALESCE(SUM(CASE WHEN x.attended IS NOT NULL AND x.verified='yes' THEN 1 END),0) verified,
      COALESCE(SUM(CASE WHEN x.attended IS NOT NULL THEN 1 END),0) marked
      FROM days d LEFT JOIN volunteers x ON x.day_id=d.id GROUP BY d.village_id`),
    db.all(`SELECT d.date, SUM(v.addressed) addressed, SUM(v.registered) registered FROM days d JOIN volunteers v ON v.day_id=d.id WHERE v.attended=1 GROUP BY d.date ORDER BY d.date DESC LIMIT 30`),
    db.all(`SELECT d.date,c.short_name college,vl.name village,SUM(CASE WHEN x.attended=1 THEN 1 ELSE 0 END) present,
      SUM(CASE WHEN x.attended=1 THEN x.registered ELSE 0 END) registered,SUM(CASE WHEN x.attended=1 THEN x.addressed ELSE 0 END) addressed
      FROM days d JOIN colleges c ON c.id=d.college_id AND c.active=1 JOIN villages vl ON vl.id=d.village_id JOIN volunteers x ON x.day_id=d.id
      WHERE x.attended IS NOT NULL GROUP BY d.id ORDER BY d.date DESC,d.id DESC LIMIT 14`),
    db.get(`SELECT d.date,SUM(v.registered) registered FROM days d JOIN volunteers v ON v.day_id=d.id WHERE v.attended=1 GROUP BY d.date ORDER BY registered DESC LIMIT 1`),
    db.get('SELECT COUNT(*) n FROM pool WHERE active=1'),
    db.get('SELECT COUNT(*) n FROM officers WHERE active=1')]);
  trend.reverse();
  const sm = new Map(sums.map(r => [r.id, r]));
  const villages = villagesRaw.map(v => {
    const t = sm.get(v.id) || { days: 0, present: 0, addressed: 0, registered: 0, verified: 0, marked: 0 };
    const status = t.registered > 0 ? 'registered' : t.present > 0 ? 'present' : v.college_id ? 'allotted' : 'open';   // map pins follow the field work, not the certification
    return { id: v.id, name: v.name, taluk: v.taluk || 'Other', lsgi: v.lsgi, lat: v.lat, lng: v.lng, college: v.college || null, status,
      days: t.days, present: t.present, addressed: t.addressed, registered: t.registered };
  });
  const cs = await campusStats(db);
  const campus = { ...cs, colleges: cs.institutions.filter(c => c.kind !== 'school').length, schools: cs.institutions.filter(c => c.kind === 'school').length,
    desk: { registrations: cs.totals.desk_regs, volunteers: cs.totals.desk_vols, reporting: cs.totals.desk_reporting }, awards: campusAwards(cs.institutions) };
  const sum = k => colleges.reduce((n, c) => n + c[k], 0);
  const tal = new Map();
  for (const v of villages) {
    const t = tal.get(v.taluk) || { taluk: v.taluk, villages: 0, allotted: 0, active: 0, certified: 0, registered: 0, addressed: 0 };
    t.villages++; if (v.status !== 'open') t.allotted++; if (v.status === 'present' || v.status === 'registered') t.active++; if (v.status === 'registered') t.certified++;
    t.registered += v.registered; t.addressed += v.addressed; tal.set(v.taluk, t);
  }
  const top = (key, filter = () => true) => {
    const c = colleges.filter(filter).sort((a, b) => b[key] - a[key])[0];
    return c && c[key] > 0 ? { id: c.id, name: c.short_name, value: c[key] } : null;
  };
  const awards = { registrations: top('registered'), outreach: top('addressed'), volunteers: top('volunteers'), verified: top('villages_ack'), attendance: top('attendance_pct', c => c.vdays_attended + c.vdays_absent >= 4) };
  const active = villages.filter(v => v.status === 'present' || v.status === 'registered').length, allotted = villages.filter(v => v.status !== 'open').length, withRegs = villages.filter(v => v.status === 'registered').length;
  const regIn = (from, to) => trend.filter(t => t.date >= from && t.date <= to).reduce((n, t) => n + t.registered, 0);
  const thisWeek = regIn(addDays(today, -6), today), prevWeek = regIn(addDays(today, -13), addDays(today, -7));
  const attended = sum('vdays_attended'), absent = sum('vdays_absent'), verifiedRows = sums.reduce((n, r) => n + r.verified, 0), markedRows = sums.reduce((n, r) => n + r.marked, 0);
  const daysDone = sum('days_done'), daysPlanned = sum('days_planned');
  return {
    totals: {
      colleges: colleges.length, volunteers: sum('volunteers'), students_enrolled: pool.n, officers: officers.n, days_done: daysDone, days_planned: daysPlanned,
      vdays_attended: attended, addressed: sum('addressed'), registered: sum('registered'), verified_registered: sum('verified_registered'),
      villages_total: villages.length, villages_active: active, villages_registered: withRegs, villages_allotted: allotted,
      colleges_submitted: colleges.filter(c => c.villages_submitted + c.villages_ack > 0).length,
    },
    insights: {
      conversion_pct: pct(sum('registered'), sum('addressed')), attendance_pct: pct(attended, attended + absent), avg_per_field_day: daysDone ? Math.round(sum('registered') / daysDone * 10) / 10 : null,
      avg_per_volunteer_day: attended ? Math.round(sum('registered') / attended * 10) / 10 : null, coverage_pct: pct(active, villages.length), allotted_pct: pct(allotted, villages.length),
      progress_pct: pct(daysDone, daysPlanned),
      week: { this: thisWeek, prev: prevWeek, change_pct: prevWeek ? Math.round((thisWeek - prevWeek) * 100 / prevWeek) : null }, best_day: best && best.registered > 0 ? best : null,
    },
    taluks: [...tal.values()].sort((a, b) => b.registered - a.registered),
    feed: feedRaw.filter(f => f.present > 0).slice(0, 8),
    campus, colleges, villages, trend, awards, formula: SCORE_FORMULA, today,
  };
}

// ---------- Campus to booth: coverage, inputs and performance of every college and school ----------
const pctOf = (a, b) => (b ? Math.min(100, Math.round(a * 100 / b)) : null);
export async function campusStats(db) {
  const today = todayStr(), since = addDays(today, -6);
  const [insts, enrol, desk, acts, photos, trend] = await Promise.all([
    db.all("SELECT id,name,short_name,COALESCE(kind,'college') kind,coordinator,phone FROM colleges WHERE active=1 ORDER BY name"),
    db.all('SELECT college_id id,SUM(strength) strength,SUM(registered) registered,SUM(ineligible) ineligible,COUNT(DISTINCT dept) depts,COUNT(*) classes,MAX(updated_at) last FROM enrol_classes GROUP BY college_id'),
    db.all('SELECT college_id id,COUNT(*) days,SUM(registrations) regs,SUM(volunteers) vols,MAX(date) last FROM desk_days GROUP BY college_id'),
    db.all('SELECT college_id id,COUNT(*) n,MAX(date) last FROM activity_log GROUP BY college_id'),
    db.all('SELECT college_id id,COUNT(*) n,MAX(event_date) last FROM gallery GROUP BY college_id'),
    db.all('SELECT date,SUM(registrations) registered,SUM(volunteers) volunteers FROM desk_days GROUP BY date ORDER BY date DESC LIMIT 30')]);
  const by = rows => new Map(rows.map(r => [r.id, r]));
  const E = by(enrol), D = by(desk), A = by(acts), P = by(photos);
  const list = insts.map(c => {
    const e = E.get(c.id) || { strength: 0, registered: 0, ineligible: 0, depts: 0, classes: 0, last: '' }, d = D.get(c.id) || { days: 0, regs: 0, vols: 0, last: '' }, a = A.get(c.id) || { n: 0, last: '' }, p = P.get(c.id) || { n: 0, last: '' };
    const eligible = Math.max(0, e.strength - e.ineligible), last = [String(e.last || '').slice(0, 10), d.last || '', a.last || '', p.last || ''].sort().at(-1) || '';
    const started = e.strength > 0 || d.days > 0 || a.n > 0 || p.n > 0;
    return { id: c.id, name: c.name, short_name: c.short_name || c.name, kind: c.kind, coordinator: c.coordinator, phone: c.phone,
      strength: e.strength, registered: e.registered, ineligible: e.ineligible, eligible, balance: Math.max(0, eligible - e.registered), pct: pctOf(e.registered, eligible),
      depts: e.depts, classes: e.classes, desk_days: d.days, desk_regs: d.regs || 0, desk_vols: d.vols || 0, activity: a.n, photos: p.n,
      last_active: last, status: !started ? 'new' : last >= since ? 'active' : 'quiet' };
  });
  const sum = k => list.reduce((n, c) => n + c[k], 0);
  const totals = { strength: sum('strength'), registered: sum('registered'), ineligible: sum('ineligible'), depts: sum('depts'), classes: sum('classes'), desk_regs: sum('desk_regs'), desk_vols: sum('desk_vols'), activity: sum('activity'), photos: sum('photos'),
    desk_reporting: list.filter(c => c.desk_days > 0).length, reporting: list.filter(c => c.strength > 0).length, active: list.filter(c => c.status === 'active').length, institutions: list.length };
  totals.eligible = Math.max(0, totals.strength - totals.ineligible); totals.balance = Math.max(0, totals.eligible - totals.registered); totals.pct = pctOf(totals.registered, totals.eligible);
  return { institutions: list, totals, trend: trend.reverse(), today };
}
export function campusAwards(list) {
  const top = (key, ok = () => true) => { const c = list.filter(ok).sort((a, b) => b[key] - a[key])[0]; return c && c[key] > 0 ? { id: c.id, name: c.short_name || c.name, value: c[key] } : null; };
  return { coverage: top('pct', c => c.eligible >= 20), registered: top('registered'), desk_regs: top('desk_regs'), desk_vols: top('desk_vols'), activity: top('activity'), photos: top('photos') };
}
