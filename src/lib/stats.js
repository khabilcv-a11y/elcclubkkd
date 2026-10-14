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
    const status = v.ack_status === 'acknowledged' ? 'verified' : t.present > 0 ? 'active' : v.college_id ? 'allotted' : 'open';
    return { id: v.id, name: v.name, taluk: v.taluk || 'Other', lsgi: v.lsgi, lat: v.lat, lng: v.lng, college: v.college || null, status,
      days: t.days, present: t.present, addressed: t.addressed, registered: t.registered };
  });
  const sum = k => colleges.reduce((n, c) => n + c[k], 0);
  const tal = new Map();
  for (const v of villages) {
    const t = tal.get(v.taluk) || { taluk: v.taluk, villages: 0, allotted: 0, active: 0, certified: 0, registered: 0, addressed: 0 };
    t.villages++; if (v.status !== 'open') t.allotted++; if (v.status === 'active' || v.status === 'verified') t.active++; if (v.status === 'verified') t.certified++;
    t.registered += v.registered; t.addressed += v.addressed; tal.set(v.taluk, t);
  }
  const top = (key, filter = () => true) => {
    const c = colleges.filter(filter).sort((a, b) => b[key] - a[key])[0];
    return c && c[key] > 0 ? { id: c.id, name: c.short_name, value: c[key] } : null;
  };
  const awards = { registrations: top('registered'), outreach: top('addressed'), volunteers: top('volunteers'), verified: top('villages_ack'), attendance: top('attendance_pct', c => c.vdays_attended + c.vdays_absent >= 4) };
  const active = villages.filter(v => v.status === 'active' || v.status === 'verified').length, allotted = villages.filter(v => v.status !== 'open').length, certified = villages.filter(v => v.status === 'verified').length;
  const regIn = (from, to) => trend.filter(t => t.date >= from && t.date <= to).reduce((n, t) => n + t.registered, 0);
  const thisWeek = regIn(addDays(today, -6), today), prevWeek = regIn(addDays(today, -13), addDays(today, -7));
  const attended = sum('vdays_attended'), absent = sum('vdays_absent'), verifiedRows = sums.reduce((n, r) => n + r.verified, 0), markedRows = sums.reduce((n, r) => n + r.marked, 0);
  const daysDone = sum('days_done'), daysPlanned = sum('days_planned');
  return {
    totals: {
      colleges: colleges.length, volunteers: sum('volunteers'), students_enrolled: pool.n, officers: officers.n, days_done: daysDone, days_planned: daysPlanned,
      vdays_attended: attended, addressed: sum('addressed'), registered: sum('registered'), verified_registered: sum('verified_registered'),
      villages_total: villages.length, villages_active: active, villages_verified: certified, villages_allotted: allotted,
    },
    insights: {
      conversion_pct: pct(sum('registered'), sum('addressed')), attendance_pct: pct(attended, attended + absent), avg_per_field_day: daysDone ? Math.round(sum('registered') / daysDone * 10) / 10 : null,
      avg_per_volunteer_day: attended ? Math.round(sum('registered') / attended * 10) / 10 : null, coverage_pct: pct(active, villages.length), allotted_pct: pct(allotted, villages.length),
      certified_pct: pct(certified, allotted), officer_verified_pct: pct(verifiedRows, markedRows), progress_pct: pct(daysDone, daysPlanned),
      week: { this: thisWeek, prev: prevWeek, change_pct: prevWeek ? Math.round((thisWeek - prevWeek) * 100 / prevWeek) : null }, best_day: best && best.registered > 0 ? best : null,
    },
    taluks: [...tal.values()].sort((a, b) => b.registered - a.registered),
    feed: feedRaw.filter(f => f.present > 0).slice(0, 8),
    colleges, villages, trend, awards, formula: SCORE_FORMULA, today,
  };
}
