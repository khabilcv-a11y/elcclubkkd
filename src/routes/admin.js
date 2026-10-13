import { route, scopeOf, assertCollege, assertVillage } from '../lib/router.js';
import { log } from '../lib/db.js';
import { sendMail, mailConfigured } from '../lib/mailer.js';
import { collegeStats } from '../lib/stats.js';
import { driveConfigured } from '../lib/drive.js';
import { daysWithVolunteers, reportFrom, LOCKED, villageReport, photoResponse } from './college.js';
import { HttpError, bad, haversine, hashSecret, verifySecret, newPasscode, nowIso, str, reqStr, num, emailOk, csv, isDup } from '../lib/util.js';

const STAFF = 'staff';
const OPS = ['super_admin', 'admin'];
const SUPER = ['super_admin'];
const slog = (ctx, action, detail) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, action, detail, ctx.ip);
const base = ctx => ctx.env.BASE_URL || new URL(ctx.req.url).origin;
const inList = ids => ids.length ? ids.map(() => '?').join(',') : 'NULL';

route('GET', '/api/staff/me', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  return { user: ctx.user, scope: s && { colleges: [...s.colleges], villages: [...s.villages] }, smtp: mailConfigured(ctx.env), drive: driveConfigured(ctx.env) };
});

// ---------- dashboard ----------
route('GET', '/api/staff/dashboard', STAFF, async ctx => {
  const { db } = ctx, s = await scopeOf(ctx);
  const stats = (await collegeStats(db)).filter(c => !s || s.colleges.has(c.id));
  const sum = k => stats.reduce((t, c) => t + c[k], 0);
  const cids = stats.map(c => c.id), L = inList(cids);
  const [pending, awaiting, noPass] = await Promise.all([
    db.get(`SELECT COUNT(*) n FROM change_requests WHERE status='pending' AND college_id IN (${L})`, ...cids),
    db.get(`SELECT COUNT(*) n FROM assignments WHERE ack_status='submitted' AND college_id IN (${L})`, ...cids),
    db.get(`SELECT COUNT(*) n FROM colleges WHERE active=1 AND passcode_sent_at IS NULL AND id IN (${L})`, ...cids)]);
  return {
    totals: { colleges: stats.length, villages: sum('villages'), volunteers: sum('volunteers'), days_done: sum('days_done'), addressed: sum('addressed'),
      registered: sum('registered'), villages_ack: sum('villages_ack'), pending_requests: pending.n, awaiting_ack: awaiting.n, passcode_pending: noPass.n },
    colleges: stats,
  };
});

// ---------- colleges ----------
function collegeBody(b) {
  const o = {
    name: reqStr(b.name, 'College name', 160), short_name: str(b.short_name, 40), address: reqStr(b.address, 'Address', 300),
    phone: reqStr(b.phone, 'Contact number', 30), email: emailOk(b.email, 'College email'), coordinator: str(b.coordinator, 100),
    lat: num(b.lat), lng: num(b.lng),
  };
  if (o.lat != null && (o.lat < 8 || o.lat > 13 || o.lng == null)) throw bad('Latitude/longitude look wrong for Kerala');
  return o;
}
route('GET', '/api/staff/colleges', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  const [stats, rows] = await Promise.all([collegeStats(ctx.db), ctx.db.all('SELECT id,name,short_name,address,phone,email,coordinator,lat,lng,passcode_sent_at,last_login_at,active FROM colleges ORDER BY name')]);
  const m = new Map(stats.map(c => [c.id, c]));
  return rows.filter(c => !s || s.colleges.has(c.id)).map(c => ({ ...c, stats: m.get(c.id) || null }));
});
route('POST', '/api/staff/colleges', OPS, async ctx => {
  const o = collegeBody(ctx.body);
  const id = await ctx.db.insert('INSERT INTO colleges(name,short_name,address,phone,email,coordinator,lat,lng,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    o.name, o.short_name, o.address, o.phone, o.email, o.coordinator, o.lat, o.lng, nowIso());
  await slog(ctx, 'college_add', o.name);
  return { ok: true, id };
});
route('PUT', '/api/staff/colleges/:id', STAFF, async ctx => {
  await assertCollege(ctx, ctx.params.id);
  const o = collegeBody(ctx.body);
  await ctx.db.run('UPDATE colleges SET name=?,short_name=?,address=?,phone=?,email=?,coordinator=?,lat=?,lng=? WHERE id=?',
    o.name, o.short_name, o.address, o.phone, o.email, o.coordinator, o.lat, o.lng, Number(ctx.params.id));
  await slog(ctx, 'college_edit', o.name);
  return { ok: true };
});
route('POST', '/api/staff/colleges/:id/active', OPS, async ctx => {
  const id = Number(ctx.params.id), on = ctx.body.active ? 1 : 0;
  const c = await ctx.db.get('SELECT name FROM colleges WHERE id=?', id);
  if (!c) throw new HttpError(404, 'College not found');
  await ctx.db.run('UPDATE colleges SET active=? WHERE id=?', on, id);
  if (!on) await ctx.db.run("DELETE FROM sessions WHERE role='college' AND subject_id=?", id);
  await slog(ctx, on ? 'college_activate' : 'college_deactivate', c.name);
  return { ok: true };
});
route('DELETE', '/api/staff/colleges/:id', SUPER, async ctx => {
  const id = Number(ctx.params.id);
  const c = await ctx.db.get('SELECT name FROM colleges WHERE id=?', id);
  if (!c) throw new HttpError(404, 'College not found');
  await ctx.db.run('DELETE FROM colleges WHERE id=?', id);
  await slog(ctx, 'college_delete', c.name + ' (and all its schedule data)');
  return { ok: true };
});

async function pushPasscode(ctx, id) {
  const c = await ctx.db.get('SELECT * FROM colleges WHERE id=?', id);
  if (!c) throw new HttpError(404, 'College not found');
  const code = newPasscode();
  await ctx.db.run('UPDATE colleges SET passcode_hash=?,passcode_sent_at=? WHERE id=?', await hashSecret(code.replace('-', ''), 20000), nowIso(), id);
  const r = await sendMail(ctx.db, ctx.env, c.email, 'Your ELC Kozhikode portal passcode',
    `Hello ${c.coordinator || 'Coordinator'},\n\nYour Electoral Literacy Club portal access for ${c.name} is ready.\n\n` +
    `  Passcode: ${code}\n  Sign in: ${base(ctx)}/\n\nChoose your college on the home page, tap "College login" and enter the passcode. ` +
    `Keep it private - anyone with it can edit your college's schedule. A new passcode replaces this one.\n\nELC Kozhikode`);
  if (r.status === 'failed') await ctx.db.run('UPDATE colleges SET passcode_sent_at=NULL WHERE id=?', id);
  await slog(ctx, 'passcode_push', `${c.name} → ${c.email} (${r.status})`);
  return { college: c.name, email: c.email, status: r.status, error: r.error };
}
route('POST', '/api/staff/colleges/:id/passcode', STAFF, async ctx => {
  await assertCollege(ctx, ctx.params.id);
  return pushPasscode(ctx, Number(ctx.params.id));
});
route('POST', '/api/staff/passcodes/bulk', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  const ids = (await ctx.db.all('SELECT id FROM colleges WHERE active=1 AND passcode_sent_at IS NULL')).map(r => r.id).filter(id => !s || s.colleges.has(id));
  const results = [];
  for (const id of ids) results.push(await pushPasscode(ctx, id));
  return { results };
});

// ---------- villages ----------
route('GET', '/api/staff/villages', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  const [cnt, vs] = await Promise.all([ctx.db.all('SELECT village_id id,COUNT(*) n FROM assignments GROUP BY village_id'), ctx.db.all('SELECT * FROM villages ORDER BY taluk,name')]);
  const m = new Map(cnt.map(r => [r.id, r.n]));
  return vs.filter(v => !s || s.villages.has(v.id)).map(v => ({ ...v, colleges: m.get(v.id) || 0 }));
});
function villageBody(b) {
  const o = { name: reqStr(b.name, 'Village name', 80), taluk: str(b.taluk, 60), lat: num(b.lat), lng: num(b.lng),
    officer_name: str(b.officer_name, 100), officer_phone: str(b.officer_phone, 30), officer_email: str(b.officer_email, 120).toLowerCase() };
  if (o.officer_email) emailOk(o.officer_email, 'Officer email');
  return o;
}
route('POST', '/api/staff/villages', OPS, async ctx => {
  const o = villageBody(ctx.body);
  try {
    const id = await ctx.db.insert('INSERT INTO villages(name,taluk,lat,lng,officer_name,officer_phone,officer_email) VALUES (?,?,?,?,?,?,?)', o.name, o.taluk, o.lat, o.lng, o.officer_name, o.officer_phone, o.officer_email);
    await slog(ctx, 'village_add', o.name);
    return { ok: true, id };
  } catch (e) { if (isDup(e)) throw bad('A village with that name already exists'); throw e; }
});
route('PUT', '/api/staff/villages/:id', STAFF, async ctx => {
  await assertVillage(ctx, ctx.params.id);
  const o = villageBody(ctx.body);
  try {
    await ctx.db.run('UPDATE villages SET name=?,taluk=?,lat=?,lng=?,officer_name=?,officer_phone=?,officer_email=? WHERE id=?', o.name, o.taluk, o.lat, o.lng, o.officer_name, o.officer_phone, o.officer_email, Number(ctx.params.id));
  } catch (e) { if (isDup(e)) throw bad('A village with that name already exists'); throw e; }
  await slog(ctx, 'village_edit', o.name);
  return { ok: true };
});
route('DELETE', '/api/staff/villages/:id', SUPER, async ctx => {
  const id = Number(ctx.params.id);
  const v = await ctx.db.get('SELECT name FROM villages WHERE id=?', id);
  if (!v) throw new HttpError(404, 'Village not found');
  if (await ctx.db.get('SELECT 1 x FROM assignments WHERE village_id=?', id)) throw bad('This village is allotted to a college. Remove the allotment first.');
  await ctx.db.run('DELETE FROM villages WHERE id=?', id);
  await slog(ctx, 'village_delete', v.name);
  return { ok: true };
});

// ---------- assignments ----------
route('GET', '/api/staff/assignments', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all(`SELECT a.id,a.college_id,a.village_id,a.ack_status,a.created_at,
      c.name college,c.address college_address,c.phone college_phone,c.email college_email,c.coordinator,c.lat clat,c.lng clng,
      v.name village,v.taluk,v.lat vlat,v.lng vlng
      FROM assignments a JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id ORDER BY c.name,a.id`);
  return rows.filter(a => !s || (s.colleges.has(a.college_id) && s.villages.has(a.village_id)))
    .map(a => { const d = haversine(a.clat, a.clng, a.vlat, a.vlng); delete a.clat; delete a.clng; delete a.vlat; delete a.vlng; return { ...a, distance_km: d }; });
});
route('GET', '/api/staff/colleges/:id/villages', STAFF, async ctx => {
  const id = Number(ctx.params.id);
  await assertCollege(ctx, id);
  const s = await scopeOf(ctx);
  const c = await ctx.db.get('SELECT lat,lng FROM colleges WHERE id=?', id);
  if (!c) throw new HttpError(404, 'College not found');
  const [mine, cnt, vs] = await Promise.all([ctx.db.all('SELECT village_id id FROM assignments WHERE college_id=?', id),
    ctx.db.all('SELECT village_id id,COUNT(*) n FROM assignments GROUP BY village_id'), ctx.db.all('SELECT id,name,taluk,lat,lng FROM villages')]);
  const m = new Set(mine.map(r => r.id)), k = new Map(cnt.map(r => [r.id, r.n]));
  return vs.filter(v => !s || s.villages.has(v.id))
    .map(v => ({ id: v.id, name: v.name, taluk: v.taluk, distance_km: haversine(c.lat, c.lng, v.lat, v.lng), allotted: m.has(v.id), others: (k.get(v.id) || 0) - (m.has(v.id) ? 1 : 0) }))
    .sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
});
route('POST', '/api/staff/assignments', STAFF, async ctx => {
  const cid = Number(ctx.body.college_id), vid = Number(ctx.body.village_id);
  await assertCollege(ctx, cid); await assertVillage(ctx, vid);
  const [c, v] = await Promise.all([ctx.db.get('SELECT name FROM colleges WHERE id=?', cid), ctx.db.get('SELECT name FROM villages WHERE id=?', vid)]);
  if (!c || !v) throw bad('Pick a college and a village');
  try { await ctx.db.run('INSERT INTO assignments(college_id,village_id,created_at) VALUES (?,?,?)', cid, vid, nowIso()); }
  catch (e) { if (isDup(e)) throw bad('That village is already allotted to this college'); throw e; }
  await slog(ctx, 'assign', `${v.name} → ${c.name}`);
  return { ok: true };
});
route('DELETE', '/api/staff/assignments/:id', STAFF, async ctx => {
  const a = await ctx.db.get(`SELECT a.*,c.name college,v.name village FROM assignments a JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id WHERE a.id=?`, Number(ctx.params.id));
  if (!a) throw new HttpError(404, 'Allotment not found');
  await assertCollege(ctx, a.college_id); await assertVillage(ctx, a.village_id);
  if (a.ack_status === 'acknowledged' && ctx.user.role !== 'super_admin') throw new HttpError(403, 'Only a super admin can remove an acknowledged village');
  await ctx.db.tx(async tx => {
    await tx.run('DELETE FROM days WHERE college_id=? AND village_id=?', a.college_id, a.village_id);
    await tx.run('DELETE FROM assignments WHERE id=?', a.id);
  });
  await slog(ctx, 'unassign', `${a.village} ✕ ${a.college}`);
  return { ok: true };
});

// ---------- change requests ----------
route('GET', '/api/staff/requests', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all(`SELECT r.*,c.name college,c.phone college_phone,tv.name to_village,tv.taluk to_taluk,fv.name from_village,
      c.lat clat,c.lng clng,tv.lat tlat,tv.lng tlng, a.village_id from_vid
      FROM change_requests r JOIN colleges c ON c.id=r.college_id JOIN villages tv ON tv.id=r.to_village_id
      LEFT JOIN assignments a ON a.id=r.assignment_id LEFT JOIN villages fv ON fv.id=a.village_id
      ORDER BY (r.status='pending') DESC, r.id DESC`);
  return rows.filter(r => !s || s.colleges.has(r.college_id))
    .map(r => { const d = haversine(r.clat, r.clng, r.tlat, r.tlng); delete r.clat; delete r.clng; delete r.tlat; delete r.tlng; return { ...r, distance_km: d }; });
});
route('POST', '/api/staff/requests/:id/decide', STAFF, async ctx => {
  const r = await ctx.db.get('SELECT * FROM change_requests WHERE id=?', Number(ctx.params.id));
  if (!r) throw new HttpError(404, 'Request not found');
  await assertCollege(ctx, r.college_id);
  if (r.status !== 'pending') throw bad('This request was already decided');
  const approve = ctx.body.decision === 'approve', note = str(ctx.body.note, 300);
  if (approve) {
    await assertVillage(ctx, r.to_village_id);
    await ctx.db.tx(async tx => {
      const a = r.assignment_id ? await tx.get('SELECT * FROM assignments WHERE id=?', r.assignment_id) : null;
      if (await tx.get('SELECT 1 x FROM assignments WHERE college_id=? AND village_id=?', r.college_id, r.to_village_id)) throw bad('College already has that village');
      if (a) {
        if (LOCKED.has(a.ack_status)) throw bad('The current village is already with the officer for acknowledgement');
        await tx.run("UPDATE assignments SET village_id=?,ack_status='none',ack_token=NULL WHERE id=?", r.to_village_id, a.id);
        await tx.run('UPDATE days SET village_id=? WHERE college_id=? AND village_id=?', r.to_village_id, r.college_id, a.village_id);
      } else await tx.run('INSERT INTO assignments(college_id,village_id,created_at) VALUES (?,?,?)', r.college_id, r.to_village_id, nowIso());
    });
  }
  await ctx.db.run('UPDATE change_requests SET status=?,admin_note=?,decided_by=?,decided_at=? WHERE id=?', approve ? 'approved' : 'rejected', note, ctx.user.username, nowIso(), r.id);
  await slog(ctx, approve ? 'request_approve' : 'request_reject', `request #${r.id}${note ? ' - ' + note : ''}`);
  return { ok: true };
});

// ---------- acknowledgements ----------
route('GET', '/api/staff/acks', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  const rows = (await ctx.db.all(`SELECT a.id,a.college_id,a.village_id,a.ack_status,a.ack_token,a.submitted_at,a.ack_name,a.ack_designation,a.ack_remarks,a.ack_at,a.query_note,
      c.name college,v.name village,v.taluk,v.officer_name,v.officer_phone,v.officer_email FROM assignments a
      JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id
      WHERE a.ack_status<>'none' OR a.query_note IS NOT NULL ORDER BY a.submitted_at DESC NULLS LAST`))
    .filter(a => !s || (s.colleges.has(a.college_id) && s.villages.has(a.village_id)));
  const cache = new Map(), out = [];
  for (const a of rows) {
    if (!cache.has(a.college_id)) cache.set(a.college_id, await daysWithVolunteers(ctx.db, a.college_id));
    const days = cache.get(a.college_id);
    out.push({ ...a, link: a.ack_token ? `${base(ctx)}/#/ack/${a.ack_token}` : null, totals: reportFrom(days, a.village_id).totals,
      photos: days.filter(d => d.village_id === a.village_id).flatMap(d => d.media.map(m => ({ ...m, date: d.date }))) });
  }
  return out;
});
route('GET', '/api/staff/photos/:id', STAFF, async ctx => {
  const m = await ctx.db.get('SELECT m.*,d.village_id FROM media m JOIN days d ON d.id=m.day_id WHERE m.id=?', Number(ctx.params.id));
  if (!m) throw new HttpError(404, 'Photo not found');
  await assertCollege(ctx, m.college_id); await assertVillage(ctx, m.village_id);
  return photoResponse(ctx, m);
});
route('POST', '/api/staff/acks/:id/resend', STAFF, async ctx => {
  const a = await ctx.db.get('SELECT a.*,c.name college FROM assignments a JOIN colleges c ON c.id=a.college_id WHERE a.id=?', Number(ctx.params.id));
  if (!a || a.ack_status !== 'submitted') throw bad('Nothing awaiting acknowledgement here');
  await assertCollege(ctx, a.college_id); await assertVillage(ctx, a.village_id);
  const v = await ctx.db.get('SELECT * FROM villages WHERE id=?', a.village_id);
  const r = await sendMail(ctx.db, ctx.env, v.officer_email, `Reminder: please acknowledge ELC work in ${v.name}`,
    `Dear ${v.officer_name || 'Village Officer'},\n\nPlease review and acknowledge the Electoral Literacy Club report by ${a.college}:\n${base(ctx)}/#/ack/${a.ack_token}\n\nThank you,\nELC Kozhikode`);
  await slog(ctx, 'ack_resend', `${v.name} (${r.status})`);
  return r;
});
route('POST', '/api/staff/acks/:id/override', STAFF, async ctx => {
  const a = await ctx.db.get('SELECT a.*,v.name village,c.name college FROM assignments a JOIN villages v ON v.id=a.village_id JOIN colleges c ON c.id=a.college_id WHERE a.id=?', Number(ctx.params.id));
  if (!a) throw new HttpError(404, 'Not found');
  await assertCollege(ctx, a.college_id); await assertVillage(ctx, a.village_id);
  const mode = ctx.body.mode;
  if (mode === 'acknowledge') {
    if (a.ack_status === 'none') throw bad('The college has not submitted this village yet');
    const name = reqStr(ctx.body.officer_name, 'Officer name', 100);
    await ctx.db.run("UPDATE assignments SET ack_status='acknowledged',ack_name=?,ack_designation=?,ack_remarks=?,ack_at=? WHERE id=?",
      name, str(ctx.body.designation, 100), `Recorded by ${ctx.user.username} on behalf of officer. ${str(ctx.body.remarks, 300)}`, nowIso(), a.id);
    await slog(ctx, 'ack_on_behalf', `${a.village} / ${a.college} by ${name}`);
  } else if (mode === 'unlock') {
    await ctx.db.run("UPDATE assignments SET ack_status='none',ack_token=NULL,query_note=? WHERE id=?", str(ctx.body.note, 300) || 'Reopened by admin for corrections', a.id);
    await ctx.db.run('DELETE FROM certificates WHERE college_id=?', a.college_id);
    await slog(ctx, 'ack_unlock', `${a.village} / ${a.college}`);
  } else throw bad('Unknown action');
  return { ok: true };
});

// ---------- reports ----------
async function reportData(db, type, s) {
  const okC = id => !s || s.colleges.has(id);
  if (type === 'colleges') return {
    cols: [['rank', 'Rank'], ['name', 'College'], ['villages', 'Villages allotted'], ['villages_ack', 'Villages acknowledged'], ['days_planned', 'Days planned'], ['days_done', 'Days held'],
      ['volunteers', 'Volunteers'], ['vdays_attended', 'Volunteer-days attended'], ['vdays_absent', 'Volunteer-days absent'], ['attendance_pct', 'Attendance %'],
      ['addressed', 'People addressed'], ['registered', 'Registered'], ['verified_registered', 'Registered (acknowledged villages)'], ['score', 'Score']],
    rows: (await collegeStats(db)).filter(c => okC(c.id)) };
  if (type === 'volunteers') return {
    cols: [['college', 'College'], ['name', 'Volunteer'], ['contact', 'Contact'], ['days_assigned', 'Days assigned'], ['days_attended', 'Days attended'], ['days_absent', 'Days absent'],
      ['addressed', 'People addressed'], ['registered', 'Registered']],
    rows: (await db.all(`SELECT college_id,college,name,contact,days_assigned,days_attended,days_absent,addressed,registered FROM (
      SELECT d.college_id, MIN(c.name) college, MIN(v.name) name, v.contact, COUNT(*) days_assigned, COALESCE(SUM((v.attended=1)::int),0) days_attended, COALESCE(SUM((v.attended=0)::int),0) days_absent,
      COALESCE(SUM(CASE WHEN v.attended=1 THEN v.addressed END),0) addressed, COALESCE(SUM(CASE WHEN v.attended=1 THEN v.registered END),0) registered
      FROM volunteers v JOIN days d ON d.id=v.day_id JOIN colleges c ON c.id=d.college_id WHERE v.name<>''
      GROUP BY d.college_id, lower(trim(v.name)), v.contact) t ORDER BY college, name`)).filter(r => okC(r.college_id)) };
  if (type === 'villages') {
    const rows = (await db.all(`SELECT a.college_id,a.village_id,c.name college,v.name village,v.taluk,a.ack_status,a.ack_name,a.ack_designation,a.ack_at FROM assignments a
      JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id ORDER BY v.name`)).filter(r => okC(r.college_id) && (!s || s.villages.has(r.village_id)));
    const cache = new Map();
    for (const r of rows) {
      if (!cache.has(r.college_id)) cache.set(r.college_id, await daysWithVolunteers(db, r.college_id));
      const t = reportFrom(cache.get(r.college_id), r.village_id).totals;
      Object.assign(r, { days: t.days, attended: t.attended, addressed: t.addressed, registered: t.registered });
    }
    return { cols: [['village', 'Village'], ['taluk', 'Taluk'], ['college', 'College'], ['days', 'Days'], ['attended', 'Volunteer-days attended'], ['addressed', 'People addressed'], ['registered', 'Registered'],
      ['ack_status', 'Acknowledgement'], ['ack_name', 'Acknowledged by'], ['ack_designation', 'Designation'], ['ack_at', 'Acknowledged on']], rows };
  }
  if (type === 'days') return {
    cols: [['date', 'Date'], ['college', 'College'], ['village', 'Village'], ['volunteer', 'Volunteer'], ['contact', 'Contact'], ['attendance', 'Attendance'], ['addressed', 'People addressed'], ['registered', 'Registered']],
    rows: (await db.all(`SELECT d.college_id,d.village_id,d.date,c.name college,vg.name village,v.name volunteer,v.contact,
      CASE v.attended WHEN 1 THEN 'Present' WHEN 0 THEN 'Absent' ELSE 'Not marked' END attendance,v.addressed,v.registered
      FROM days d JOIN colleges c ON c.id=d.college_id JOIN villages vg ON vg.id=d.village_id LEFT JOIN volunteers v ON v.day_id=d.id
      ORDER BY d.date,c.name`)).filter(r => okC(r.college_id) && (!s || s.villages.has(r.village_id))) };
  throw new HttpError(404, 'Unknown report');
}
route('GET', '/api/staff/reports/:type', STAFF, async ctx => {
  const r = await reportData(ctx.db, ctx.params.type, await scopeOf(ctx));
  if (ctx.query.format === 'csv') {
    await slog(ctx, 'report_export', ctx.params.type);
    return { __raw: true, text: csv(r.rows, r.cols.map(([key, label]) => ({ key, label }))),
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="elc-${ctx.params.type}-${nowIso().slice(0, 10)}.csv"` } };
  }
  return { cols: r.cols, rows: r.rows };
});

// ---------- certificates (collector issues) ----------
const certReady = async db => (await collegeStats(db)).filter(c => c.villages > 0 && c.villages_ack === c.villages && c.vdays_attended > 0);
route('GET', '/api/staff/certificates', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  const issued = new Map((await ctx.db.all('SELECT * FROM certificates')).map(r => [r.college_id, r]));
  const readyAll = await certReady(ctx.db);
  const ready = readyAll.filter(c => !s || s.colleges.has(c.id)).map(c => ({ ...c, certificate: issued.get(c.id) || null }));
  const readyIds = new Set(readyAll.map(r => r.id));
  const waiting = (await collegeStats(ctx.db)).filter(c => !readyIds.has(c.id) && (!s || s.colleges.has(c.id)))
    .map(c => ({ id: c.id, name: c.name, villages: c.villages, villages_ack: c.villages_ack, villages_submitted: c.villages_submitted }));
  return { ready, waiting };
});
route('POST', '/api/staff/certificates/:id/issue', SUPER, async ctx => {
  const id = Number(ctx.params.id);
  if (!(await certReady(ctx.db)).some(c => c.id === id)) throw bad('Every village must be acknowledged before certificates can be issued');
  if (await ctx.db.get('SELECT 1 x FROM certificates WHERE college_id=?', id)) throw bad('Already issued');
  const n = (await ctx.db.get('SELECT COUNT(*) n FROM certificates')).n + 1;
  const number = `ELC/KKD/${new Date().getFullYear()}/${String(n).padStart(4, '0')}`;
  await ctx.db.run('INSERT INTO certificates(college_id,number,issued_at,issued_by) VALUES (?,?,?,?)', id, number, nowIso(), ctx.user.username);
  await slog(ctx, 'certificate_issue', `${number} → college #${id}`);
  return { ok: true, number };
});
route('GET', '/api/staff/certificates/:id', STAFF, async ctx => {
  const id = Number(ctx.params.id);
  await assertCollege(ctx, id);
  const [c, stats, cert, vols, villages] = await Promise.all([
    ctx.db.get('SELECT id,name,address FROM colleges WHERE id=?', id), collegeStats(ctx.db), ctx.db.get('SELECT * FROM certificates WHERE college_id=?', id),
    reportData(ctx.db, 'volunteers', null),
    ctx.db.all(`SELECT v.name,v.taluk,a.ack_name,a.ack_designation,a.ack_at FROM assignments a JOIN villages v ON v.id=a.village_id WHERE a.college_id=? ORDER BY v.name`, id)]);
  if (!c || !cert) throw new HttpError(404, 'No certificate has been issued for this college yet');
  return { college: c, stats: stats.find(x => x.id === id), certificate: cert, volunteers: vols.rows.filter(r => r.college_id === id && r.days_attended > 0), villages };
});

// ---------- logs, outbox, staff ----------
route('GET', '/api/staff/logs', SUPER, ctx => {
  const k = ctx.query.kind;
  const where = k === 'signin' ? "WHERE action IN ('login','login_failed','logout')" : k === 'manage' ? "WHERE action NOT IN ('login','login_failed','logout')" : '';
  return ctx.db.all(`SELECT * FROM logs ${where} ORDER BY id DESC LIMIT 500`);
});
route('GET', '/api/staff/outbox', OPS, async ctx => ({ smtp: mailConfigured(ctx.env), rows: await ctx.db.all('SELECT * FROM outbox ORDER BY id DESC LIMIT 200') }));

route('GET', '/api/staff/team', SUPER, async ctx => {
  const [rows, cs, vs] = await Promise.all([ctx.db.all('SELECT id,username,name,email,role,active,last_login_at,created_at FROM admins ORDER BY role,name'),
    ctx.db.all('SELECT admin_id,college_id id FROM intern_colleges'), ctx.db.all('SELECT admin_id,village_id id FROM intern_villages')]);
  return rows.map(r => ({ ...r, colleges: cs.filter(x => x.admin_id === r.id).map(x => x.id), villages: vs.filter(x => x.admin_id === r.id).map(x => x.id) }));
});
const checkPw = p => { if (String(p || '').length < 8) throw bad('Password must be at least 8 characters'); return p; };
route('POST', '/api/staff/team', SUPER, async ctx => {
  const b = ctx.body;
  const username = reqStr(b.username, 'Username', 40).toLowerCase();
  if (!/^[a-z0-9._-]{3,}$/.test(username)) throw bad('Username: letters, numbers, dot, dash, underscore (min 3)');
  if (!['super_admin', 'admin', 'intern'].includes(b.role)) throw bad('Choose a role');
  const name = reqStr(b.name, 'Name', 100), pass = await hashSecret(checkPw(b.password));
  try {
    const id = await ctx.db.insert('INSERT INTO admins(username,name,email,role,pass,created_at) VALUES (?,?,?,?,?,?)', username, name, str(b.email, 120), b.role, pass, nowIso());
    await slog(ctx, 'staff_add', `${username} as ${b.role}`);
    return { ok: true, id };
  } catch (e) { if (isDup(e)) throw bad('That username is already taken'); throw e; }
});
route('PUT', '/api/staff/team/:id', SUPER, async ctx => {
  const id = Number(ctx.params.id), b = ctx.body;
  const a = await ctx.db.get('SELECT * FROM admins WHERE id=?', id);
  if (!a) throw new HttpError(404, 'Not found');
  const role = ['super_admin', 'admin', 'intern'].includes(b.role) ? b.role : a.role;
  const active = b.active === false || b.active === 0 ? 0 : 1;
  if (a.id === ctx.user.id && (role !== a.role || !active)) throw bad("You can't change your own role or deactivate yourself");
  const newPass = b.password ? await hashSecret(checkPw(b.password)) : null;
  await ctx.db.tx(async tx => {
    await tx.run('UPDATE admins SET name=?,email=?,role=?,active=? WHERE id=?', str(b.name, 100) || a.name, str(b.email, 120), role, active, id);
    if (newPass) await tx.run('UPDATE admins SET pass=? WHERE id=?', newPass, id);
    if (!active || newPass) await tx.run("DELETE FROM sessions WHERE role='staff' AND subject_id=?", id);
    if (Array.isArray(b.colleges)) {
      await tx.run('DELETE FROM intern_colleges WHERE admin_id=?', id);
      for (const c of b.colleges) await tx.run('INSERT INTO intern_colleges VALUES (?,?) ON CONFLICT DO NOTHING', id, Number(c));
    }
    if (Array.isArray(b.villages)) {
      await tx.run('DELETE FROM intern_villages WHERE admin_id=?', id);
      for (const v of b.villages) await tx.run('INSERT INTO intern_villages VALUES (?,?) ON CONFLICT DO NOTHING', id, Number(v));
    }
  });
  await slog(ctx, 'staff_edit', `${a.username} (${role}${active ? '' : ', deactivated'}${newPass ? ', password reset' : ''})`);
  return { ok: true };
});
route('POST', '/api/staff/password', STAFF, async ctx => {
  const a = await ctx.db.get('SELECT pass FROM admins WHERE id=?', ctx.user.id);
  if (!(await verifySecret(String(ctx.body.current || ''), a.pass))) throw bad('Current password is incorrect');
  await ctx.db.run('UPDATE admins SET pass=? WHERE id=?', await hashSecret(checkPw(ctx.body.next)), ctx.user.id);
  await ctx.db.run("DELETE FROM sessions WHERE role='staff' AND subject_id=? AND token<>?", ctx.user.id, ctx.user._token);
  await slog(ctx, 'password_change', null);
  return { ok: true };
});

// ---------- village officer acknowledgement (token link, no login) ----------
async function ackLookup(db, tk) {
  const a = await db.get(`SELECT a.*,c.name college,v.name village,v.taluk FROM assignments a JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id WHERE a.ack_token=?`, tk);
  if (!a) throw new HttpError(404, 'This acknowledgement link is not valid or has been withdrawn');
  return a;
}
route('GET', '/api/ack/:token', null, async ctx => {
  const a = await ackLookup(ctx.db, ctx.params.token);
  const { days, totals } = await villageReport(ctx.db, a.college_id, a.village_id);
  return { college: a.college, village: a.village, taluk: a.taluk, status: a.ack_status, ack_name: a.ack_name, ack_designation: a.ack_designation, ack_at: a.ack_at,
    totals, days: days.map(d => ({ date: d.date, media: d.media, volunteers: d.volunteers.map(v => ({ name: v.name, attended: v.attended, addressed: v.addressed, registered: v.registered })) })) };
});
route('GET', '/api/ack/:token/photos/:id', null, async ctx => {
  const a = await ackLookup(ctx.db, ctx.params.token);
  const m = await ctx.db.get('SELECT m.*,d.village_id FROM media m JOIN days d ON d.id=m.day_id WHERE m.id=?', Number(ctx.params.id));
  if (!m || m.college_id !== a.college_id || m.village_id !== a.village_id) throw new HttpError(404, 'Photo not found');
  return photoResponse(ctx, m);
});
route('POST', '/api/ack/:token', null, async ctx => {
  const a = await ackLookup(ctx.db, ctx.params.token);
  if (a.ack_status !== 'submitted') throw bad('This report is not waiting for acknowledgement');
  const action = ctx.body.action, name = reqStr(ctx.body.name, 'Your name', 100);
  if (action === 'acknowledge') {
    await ctx.db.run("UPDATE assignments SET ack_status='acknowledged',ack_name=?,ack_designation=?,ack_remarks=?,ack_at=?,query_note=NULL WHERE id=?",
      name, reqStr(ctx.body.designation, 'Designation', 100), str(ctx.body.remarks, 500), nowIso(), a.id);
    await log(ctx.db, 'officer', name, null, 'acknowledge', `${a.village} / ${a.college}`, ctx.ip);
  } else if (action === 'query') {
    const note = reqStr(ctx.body.remarks, 'Please say what needs correcting', 500);
    await ctx.db.run("UPDATE assignments SET ack_status='none',query_note=? WHERE id=?", `${name}: ${note}`, a.id);
    await log(ctx.db, 'officer', name, null, 'ack_query', `${a.village} / ${a.college}: ${note}`, ctx.ip);
  } else throw bad('Unknown action');
  return { ok: true };
});
