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

export async function publicBoard(db) {
  const [colleges, totalVillages, villages, trend] = await Promise.all([
    collegeStats(db),
    db.get('SELECT COUNT(*) n FROM villages'),
    db.all(`SELECT v.id, v.name, v.taluk,
      CASE WHEN EXISTS(SELECT 1 FROM assignments a WHERE a.village_id=v.id AND a.ack_status='acknowledged') THEN 'verified'
           WHEN EXISTS(SELECT 1 FROM days d JOIN volunteers x ON x.day_id=d.id WHERE d.village_id=v.id AND x.attended=1) THEN 'active'
           WHEN EXISTS(SELECT 1 FROM assignments a WHERE a.village_id=v.id) THEN 'allotted' ELSE 'open' END status
    FROM villages v ORDER BY v.taluk, v.name`),
    db.all(`SELECT d.date, SUM(v.addressed) addressed, SUM(v.registered) registered
    FROM days d JOIN volunteers v ON v.day_id=d.id WHERE v.attended=1 GROUP BY d.date ORDER BY d.date DESC LIMIT 30`)]);
  trend.reverse();
  const sum = k => colleges.reduce((s, c) => s + c[k], 0);
  const top = (key, filter = () => true) => {
    const c = colleges.filter(filter).sort((a, b) => b[key] - a[key])[0];
    return c && c[key] > 0 ? { id: c.id, name: c.short_name, value: c[key] } : null;
  };
  const awards = {
    registrations: top('registered'), outreach: top('addressed'), volunteers: top('volunteers'),
    verified: top('villages_ack'), attendance: top('attendance_pct', c => c.vdays_attended + c.vdays_absent >= 4),
  };
  return {
    totals: {
      colleges: colleges.length, volunteers: sum('volunteers'), days_done: sum('days_done'),
      vdays_attended: sum('vdays_attended'), addressed: sum('addressed'), registered: sum('registered'),
      verified_registered: sum('verified_registered'),
      villages_total: totalVillages.n, villages_active: villages.filter(v => v.status === 'active' || v.status === 'verified').length,
      villages_verified: villages.filter(v => v.status === 'verified').length,
      villages_allotted: villages.filter(v => v.status !== 'open').length,
    },
    colleges, villages, trend, awards, formula: SCORE_FORMULA,
  };
}
