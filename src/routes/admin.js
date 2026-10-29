import { route, scopeOf, assertCollege, assertVillage, issueSession } from '../lib/router.js';
import { log } from '../lib/db.js';
import { collegeStats } from '../lib/stats.js';
import { driveConfigured } from '../lib/drive.js';
import { daysWithVolunteers, reportFrom, LOCKED, villageReport, photoResponse } from './college.js';
import { studentSummary } from './reports.js';
import { certData, nextCertNo } from './college.js';
import { HttpError, bad, haversine, hashSecret, verifySecret, DEFAULT_PASSWORD, nowIso, str, reqStr, num, emailOk, csv, isDup } from '../lib/util.js';

const STAFF = 'staff';
const OPS = ['super_admin', 'admin'];
const SUPER = ['super_admin'];
const slog = (ctx, action, detail) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, action, detail, ctx.ip);
const base = ctx => ctx.env.BASE_URL || new URL(ctx.req.url).origin;
const inList = ids => ids.length ? ids.map(() => '?').join(',') : 'NULL';

route('GET', '/api/staff/me', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  return { user: ctx.user, scope: s && { colleges: [...s.colleges], villages: [...s.villages] }, drive: driveConfigured(ctx.env), sheet_url: ctx.env.SHEET_URL || null };
});

// ---------- dashboard ----------
route('GET', '/api/staff/dashboard', STAFF, async ctx => {
  const { db } = ctx, s = await scopeOf(ctx);
  const stats = (await collegeStats(db)).filter(c => !s || s.colleges.has(c.id));
  const sum = k => stats.reduce((t, c) => t + c[k], 0);
  const cids = stats.map(c => c.id), L = inList(cids);
  const [pending, awaiting, noPass, openIssues] = await Promise.all([
    db.get(`SELECT COUNT(*) n FROM change_requests WHERE status='pending' AND college_id IN (${L})`, ...cids),
    db.get(`SELECT COUNT(*) n FROM assignments WHERE ack_status='submitted' AND college_id IN (${L})`, ...cids),
    db.get(`SELECT COUNT(*) n FROM colleges WHERE active=1 AND passcode_sent_at IS NULL AND id IN (${L})`, ...cids),
    db.get(`SELECT COUNT(*) n FROM issues WHERE status<>'resolved' AND college_id IN (${L})`, ...cids)]);
  return {
    totals: { colleges: stats.length, villages: sum('villages'), volunteers: sum('volunteers'), days_done: sum('days_done'), addressed: sum('addressed'),
      registered: sum('registered'), villages_ack: sum('villages_ack'), pending_requests: pending.n, awaiting_ack: awaiting.n, passcode_pending: noPass.n, open_issues: openIssues.n },
    colleges: stats,
  };
});

// ---------- colleges ----------
function collegeBody(b) {
  const o = {
    name: reqStr(b.name, 'College name', 160), short_name: str(b.short_name, 40), address: reqStr(b.address, 'Address', 300),
    phone: reqStr(b.phone, 'Contact number', 30), email: emailOk(b.email, 'College email'), coordinator: str(b.coordinator, 100),
    lat: num(b.lat), lng: num(b.lng), lsgi: str(b.lsgi, 120),
  };
  if (o.lat != null && (o.lat < 8 || o.lat > 13 || o.lng == null)) throw bad('Latitude/longitude look wrong for Kerala');
  return o;
}
route('GET', '/api/staff/colleges', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  const [stats, rows] = await Promise.all([collegeStats(ctx.db), ctx.db.all('SELECT id,name,short_name,address,phone,email,coordinator,lat,lng,lsgi,passcode_sent_at,passcode_plain AS passcode,last_login_at,active,kind FROM colleges ORDER BY name')]);
  const kind = ctx.query.kind === 'school' ? 'school' : ctx.query.kind === 'college' ? 'college' : null;
  const m = new Map(stats.map(c => [c.id, c]));
  return rows.filter(c => (!s || s.colleges.has(c.id)) && (!kind || (c.kind === 'school' ? 'school' : 'college') === kind)).map(c => ({ ...c, kind: c.kind === 'school' ? 'school' : 'college', stats: m.get(c.id) || null }));
});
route('POST', '/api/staff/colleges', OPS, async ctx => {
  const o = collegeBody(ctx.body);
  const id = await ctx.db.insert('INSERT INTO colleges(name,short_name,address,phone,email,coordinator,lat,lng,lsgi,created_at,kind) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    o.name, o.short_name, o.address, o.phone, o.email, o.coordinator, o.lat, o.lng, o.lsgi, nowIso(), ctx.body.kind === 'school' ? 'school' : 'college');
  await slog(ctx, 'college_add', o.name);
  const { code } = await pushPasscode(ctx, id);
  return { ok: true, id, code };
});
route('PUT', '/api/staff/colleges/:id', STAFF, async ctx => {
  await assertCollege(ctx, ctx.params.id);
  const o = collegeBody(ctx.body);
  await ctx.db.run('UPDATE colleges SET name=?,short_name=?,address=?,phone=?,email=?,coordinator=?,lat=?,lng=?,lsgi=? WHERE id=?',
    o.name, o.short_name, o.address, o.phone, o.email, o.coordinator, o.lat, o.lng, o.lsgi, Number(ctx.params.id));
  await slog(ctx, 'college_edit', o.name);
  return { ok: true };
});
route('POST', '/api/staff/colleges/:id/active', OPS, async ctx => {
  const id = Number(ctx.params.id), on = ctx.body.active ? 1 : 0;
  const c = await ctx.db.get('SELECT name FROM colleges WHERE id=?', id);
  if (!c) throw new HttpError(404, 'College not found');
  await ctx.db.run('UPDATE colleges SET active=? WHERE id=?', on, id);
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

// Passcodes are generated here and handed over by staff (WhatsApp / phone), never emailed.
async function pushPasscode(ctx, id) {
  const c = await ctx.db.get('SELECT name FROM colleges WHERE id=?', id);
  if (!c) throw new HttpError(404, 'College not found');
  await ctx.db.run('UPDATE colleges SET passcode_hash=?,passcode_plain=?,passcode_sent_at=? WHERE id=?', await hashSecret(DEFAULT_PASSWORD, 20000), DEFAULT_PASSWORD, nowIso(), id);
  await slog(ctx, 'password_reset', c.name);
  return { college: c.name, code: DEFAULT_PASSWORD };
}
route('POST', '/api/staff/colleges/:id/passcode', STAFF, async ctx => {
  await assertCollege(ctx, ctx.params.id);
  return pushPasscode(ctx, Number(ctx.params.id));
});
route('POST', '/api/staff/passcodes/bulk', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  const all = ctx.body.all === true;      // true = reset every active college to the default password
  const ids = (await ctx.db.all(all ? "SELECT id FROM colleges WHERE active=1 AND COALESCE(kind,'college')<>'school'" : "SELECT id FROM colleges WHERE active=1 AND COALESCE(kind,'college')<>'school' AND passcode_sent_at IS NULL")).map(r => r.id).filter(id => !s || s.colleges.has(id));
  const results = [];
  for (const id of ids) results.push(await pushPasscode(ctx, id));
  return { results };
});

// ---------- villages ----------
route('GET', '/api/staff/villages', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all(`SELECT v.*,a.college_id,a.ack_status,c.name holder FROM villages v LEFT JOIN assignments a ON a.village_id=v.id LEFT JOIN colleges c ON c.id=a.college_id ORDER BY v.taluk,v.name`);
  return rows.filter(v => !s || s.villages.has(v.id)).map(v => ({ ...v, colleges: v.college_id ? 1 : 0 }));
});
function villageBody(b) {
  const o = { name: reqStr(b.name, 'Village name', 80), taluk: str(b.taluk, 60), lat: num(b.lat), lng: num(b.lng),
    officer_name: str(b.officer_name, 100), officer_phone: str(b.officer_phone, 30), officer_email: str(b.officer_email, 120).toLowerCase(),
    lsgi: str(b.lsgi, 120), office_address: str(b.office_address, 300), office_phone: str(b.office_phone, 80) };
  if (o.officer_email) emailOk(o.officer_email, 'Officer email');
  return o;
}
route('POST', '/api/staff/villages', OPS, async ctx => {
  const o = villageBody(ctx.body);
  try {
    const id = await ctx.db.insert('INSERT INTO villages(name,taluk,lat,lng,officer_name,officer_phone,officer_email,lsgi,office_address,office_phone) VALUES (?,?,?,?,?,?,?,?,?,?)', o.name, o.taluk, o.lat, o.lng, o.officer_name, o.officer_phone, o.officer_email, o.lsgi, o.office_address, o.office_phone);
    await slog(ctx, 'village_add', o.name);
    return { ok: true, id };
  } catch (e) { if (isDup(e)) throw bad('A village with that name already exists'); throw e; }
});
route('PUT', '/api/staff/villages/:id', STAFF, async ctx => {
  await assertVillage(ctx, ctx.params.id);
  const o = villageBody(ctx.body);
  try {
    await ctx.db.run('UPDATE villages SET name=?,taluk=?,lat=?,lng=?,officer_name=?,officer_phone=?,officer_email=?,lsgi=?,office_address=?,office_phone=? WHERE id=?', o.name, o.taluk, o.lat, o.lng, o.officer_name, o.officer_phone, o.officer_email, o.lsgi, o.office_address, o.office_phone, Number(ctx.params.id));
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
  const rows = await ctx.db.all(`SELECT a.id,a.college_id,a.village_id,a.ack_status,a.created_at,a.distance_km road_km,a.distance_note,c.lsgi college_lsgi,v.lsgi village_lsgi,v.office_address,v.office_phone,
      c.name college,c.address college_address,c.phone college_phone,c.email college_email,c.coordinator,c.lat clat,c.lng clng,
      v.name village,v.taluk,v.lat vlat,v.lng vlng
      FROM assignments a JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id ORDER BY c.name,a.id`);
  return rows.filter(a => !s || (s.colleges.has(a.college_id) && s.villages.has(a.village_id)))
    .map(a => { const d = a.road_km ?? haversine(a.clat, a.clng, a.vlat, a.vlng); delete a.clat; delete a.clng; delete a.vlat; delete a.vlng; return { ...a, distance_km: d, distance_road: a.road_km != null }; });
});
route('GET', '/api/staff/colleges/:id/villages', STAFF, async ctx => {
  const id = Number(ctx.params.id);
  await assertCollege(ctx, id);
  const s = await scopeOf(ctx);
  const c = await ctx.db.get('SELECT lat,lng FROM colleges WHERE id=?', id);
  if (!c) throw new HttpError(404, 'College not found');
  const [held, vs] = await Promise.all([ctx.db.all('SELECT a.village_id id,a.college_id cid,c.name holder FROM assignments a JOIN colleges c ON c.id=a.college_id'),
    ctx.db.all('SELECT id,name,taluk,lat,lng FROM villages')]);
  const owner = new Map(held.map(r => [r.id, r]));
  return vs.filter(v => !s || s.villages.has(v.id))
    .map(v => { const o = owner.get(v.id); return { id: v.id, name: v.name, taluk: v.taluk, distance_km: haversine(c.lat, c.lng, v.lat, v.lng), allotted: !!o && o.cid === id, holder: o && o.cid !== id ? o.holder : null }; })
    .sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
});
route('POST', '/api/staff/assignments', STAFF, async ctx => {
  const cid = Number(ctx.body.college_id), vid = Number(ctx.body.village_id);
  await assertCollege(ctx, cid); await assertVillage(ctx, vid);
  const [c, v] = await Promise.all([ctx.db.get('SELECT name FROM colleges WHERE id=?', cid), ctx.db.get('SELECT name FROM villages WHERE id=?', vid)]);
  if (!c || !v) throw bad('Pick a college and a village');
  const held = await ctx.db.get('SELECT c.name FROM assignments a JOIN colleges c ON c.id=a.college_id WHERE a.village_id=?', vid);
  if (held) throw bad(`${v.name} is already allotted to ${held.name}. Remove that allotment first.`);
  try { await ctx.db.run('INSERT INTO assignments(college_id,village_id,created_at) VALUES (?,?,?)', cid, vid, nowIso()); }
  catch (e) { if (isDup(e)) throw bad('That village was just taken by another college. Refresh and pick another.'); throw e; }
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
      c.lat clat,c.lng clng,tv.lat tlat,tv.lng tlng, a.village_id from_vid, hc.name holder, ha.college_id holder_id
      FROM change_requests r JOIN colleges c ON c.id=r.college_id JOIN villages tv ON tv.id=r.to_village_id
      LEFT JOIN assignments ha ON ha.village_id=r.to_village_id LEFT JOIN colleges hc ON hc.id=ha.college_id
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
      const held = await tx.get('SELECT c.name FROM assignments a JOIN colleges c ON c.id=a.college_id WHERE a.village_id=?', r.to_village_id);
      if (held) throw bad(`That village is currently allotted to ${held.name}, so this request cannot be approved yet. Free the village under Allotments first, or reject the request.`);
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
route('POST', '/api/staff/acks/:id/override', STAFF, async ctx => {
  const a = await ctx.db.get('SELECT a.*,v.name village,c.name college FROM assignments a JOIN villages v ON v.id=a.village_id JOIN colleges c ON c.id=a.college_id WHERE a.id=?', Number(ctx.params.id));
  if (!a) throw new HttpError(404, 'Not found');
  await assertCollege(ctx, a.college_id); await assertVillage(ctx, a.village_id);
  const mode = ctx.body.mode;
  if (mode === 'acknowledge') {
    if (a.ack_status === 'none') throw bad('The college has not submitted this village yet');
    const name = reqStr(ctx.body.officer_name, 'Officer name', 100);
    await ctx.db.run("UPDATE assignments SET ack_status='acknowledged',cert_no=COALESCE(cert_no,?),ack_name=?,ack_designation=?,ack_remarks=?,ack_at=? WHERE id=?",
      await nextCertNo(ctx.db), name, str(ctx.body.designation, 100), `Recorded by ${ctx.user.username} on behalf of officer. ${str(ctx.body.remarks, 300)}`, nowIso(), a.id);
    await slog(ctx, 'ack_on_behalf', `${a.village} / ${a.college} by ${name}`);
  } else if (mode === 'unlock') {
    await ctx.db.run("UPDATE assignments SET ack_status='none',ack_token=NULL,query_note=? WHERE id=?", str(ctx.body.note, 300) || 'Reopened by admin for corrections', a.id);
    await ctx.db.run('UPDATE assignments SET cert_no=NULL WHERE id=?', a.id);
    await slog(ctx, 'ack_unlock', `${a.village} / ${a.college}`);
  } else throw bad('Unknown action');
  return { ok: true };
});

// ---------- certificates: a village's students are eligible as soon as its village officer has certified it ----------
route('GET', '/api/staff/certificates', STAFF, async ctx => {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all(`SELECT a.id,a.cert_no,a.ack_name,a.ack_designation,a.ack_at,a.college_id,a.village_id,c.name college,v.name village,v.taluk
    FROM assignments a JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id WHERE a.ack_status='acknowledged' ORDER BY a.ack_at DESC`);
  const out = [];
  for (const r of rows.filter(r => !s || (s.colleges.has(r.college_id) && s.villages.has(r.village_id)))) {
    const d = await certData(ctx.db, r.id);
    out.push({ id: r.id, cert_no: r.cert_no, college: r.college, village: r.village, taluk: r.taluk, officer: r.ack_name, designation: r.ack_designation, certified_at: r.ack_at, students: d ? d.students.length : 0 });
  }
  return { certified: out };
});
route('GET', '/api/staff/certificates/:id', STAFF, async ctx => {
  const a = await ctx.db.get('SELECT college_id,village_id FROM assignments WHERE id=?', Number(ctx.params.id));
  if (!a) throw new HttpError(404, 'Not found');
  await assertCollege(ctx, a.college_id); await assertVillage(ctx, a.village_id);
  const d = await certData(ctx.db, Number(ctx.params.id));
  if (!d) throw new HttpError(404, 'The village officer has not certified this village yet');
  return d;
});

// ---------- logs, outbox, staff ----------
route('GET', '/api/staff/logs', SUPER, ctx => {
  const k = ctx.query.kind;
  const where = k === 'signin' ? "WHERE action IN ('login','login_failed','logout')" : k === 'manage' ? "WHERE action NOT IN ('login','login_failed','logout')" : '';
  return ctx.db.all(`SELECT * FROM logs ${where} ORDER BY id DESC LIMIT 500`);
});

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
  const newHash = await hashSecret(checkPw(ctx.body.next));
  await ctx.db.run('UPDATE admins SET pass=? WHERE id=?', newHash, ctx.user.id);
  await issueSession(ctx, 'staff', { id: ctx.user.id, pass: newHash }, 8);   // keep this browser signed in; other sessions end
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
