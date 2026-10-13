import { route } from '../lib/router.js';
import { log } from '../lib/db.js';
import { sendMail } from '../lib/mailer.js';
import { collegeStats } from '../lib/stats.js';
import { driveUpload, driveGet, driveDelete, driveConfigured } from '../lib/drive.js';
import { HttpError, bad, haversine, isDate, dateRange, todayStr, nowIso, str, reqStr, int, phone, token } from '../lib/util.js';

export const LOCKED = new Set(['submitted', 'acknowledged']);
const clog = (ctx, action, detail) => log(ctx.db, 'college', ctx.college.name, null, action, detail, ctx.ip);

export async function daysWithVolunteers(db, collegeId) {
  const [days, vols, media] = await Promise.all([
    db.all(`SELECT d.id,d.date,d.village_id,d.notes,v.name village_name FROM days d JOIN villages v ON v.id=d.village_id WHERE d.college_id=? ORDER BY d.date,d.id`, collegeId),
    db.all(`SELECT x.* FROM volunteers x JOIN days d ON d.id=x.day_id WHERE d.college_id=? ORDER BY x.slot,x.id`, collegeId),
    db.all(`SELECT id,day_id,name FROM media WHERE college_id=? ORDER BY id`, collegeId)]);
  const by = new Map(days.map(d => [d.id, d]));
  days.forEach(d => { d.volunteers = []; d.media = []; });
  vols.forEach(v => by.get(v.day_id)?.volunteers.push(v));
  media.forEach(m => by.get(m.day_id)?.media.push({ id: m.id, name: m.name }));
  return days;
}

export function reportFrom(days, villageId) {
  const ds = days.filter(d => d.village_id === villageId);
  const t = { days: ds.length, attended: 0, absent: 0, addressed: 0, registered: 0 };
  for (const d of ds) for (const v of d.volunteers) {
    if (v.attended === 1) { t.attended++; t.addressed += v.addressed; t.registered += v.registered; }
    else if (v.attended === 0) t.absent++;
  }
  return { days: ds, totals: t };
}
export async function villageReport(db, collegeId, villageId) { return reportFrom(await daysWithVolunteers(db, collegeId), villageId); }

route('GET', '/api/college/me', 'college', ctx => ({ id: ctx.college.id, name: ctx.college.name }));

route('GET', '/api/college/overview', 'college', async ctx => {
  const { db, college: c } = ctx;
  const [days, asg, stats, requests, cert] = await Promise.all([
    daysWithVolunteers(db, c.id),
    db.all(`SELECT a.id,a.village_id,a.ack_status,a.query_note,a.ack_name,a.ack_designation,a.ack_at,a.submitted_at,
      v.name village_name,v.taluk,v.lat,v.lng,v.officer_name,v.officer_phone,v.officer_email
      FROM assignments a JOIN villages v ON v.id=a.village_id WHERE a.college_id=? ORDER BY a.id`, c.id),
    collegeStats(db),
    db.all(`SELECT r.id,r.status,r.reason,r.admin_note,r.created_at,r.decided_at,r.assignment_id,
      tv.name to_village, fv.name from_village FROM change_requests r JOIN villages tv ON tv.id=r.to_village_id
      LEFT JOIN assignments a ON a.id=r.assignment_id LEFT JOIN villages fv ON fv.id=a.village_id
      WHERE r.college_id=? ORDER BY r.id DESC`, c.id),
    db.get('SELECT number,issued_at FROM certificates WHERE college_id=?', c.id)]);
  const assignments = asg.map(a => {
    const out = { ...a, distance_km: haversine(c.lat, c.lng, a.lat, a.lng), totals: reportFrom(days, a.village_id).totals, locked: LOCKED.has(a.ack_status) };
    delete out.lat; delete out.lng; return out;
  });
  return {
    college: { id: c.id, name: c.name, short_name: c.short_name, address: c.address, phone: c.phone, email: c.email, coordinator: c.coordinator },
    stats: stats.find(s => s.id === c.id), assignments, requests, days, today: todayStr(), certificate: cert || null,
    photos_enabled: driveConfigured(ctx.env),
  };
});

route('GET', '/api/college/villages', 'college', async ctx => {
  const c = ctx.college;
  const [mine, counts, vs] = await Promise.all([
    ctx.db.all('SELECT village_id id FROM assignments WHERE college_id=?', c.id),
    ctx.db.all('SELECT village_id id,COUNT(*) n FROM assignments GROUP BY village_id'),
    ctx.db.all('SELECT id,name,taluk,lat,lng FROM villages ORDER BY name')]);
  const m = new Set(mine.map(r => r.id)), cnt = new Map(counts.map(r => [r.id, r.n]));
  return vs.map(v => ({ id: v.id, name: v.name, taluk: v.taluk, distance_km: haversine(c.lat, c.lng, v.lat, v.lng), mine: m.has(v.id), colleges: cnt.get(v.id) || 0 }))
    .sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
});

route('POST', '/api/college/requests', 'college', async ctx => {
  const { db, college: c, body: b } = ctx;
  const to = Number(b.to_village_id);
  const village = await db.get('SELECT * FROM villages WHERE id=?', to);
  if (!village) throw bad('Choose a village from the list');
  if (await db.get('SELECT 1 x FROM assignments WHERE college_id=? AND village_id=?', c.id, to)) throw bad('That village is already allotted to you');
  let aid = null;
  if (b.assignment_id) {
    const a = await db.get('SELECT * FROM assignments WHERE id=? AND college_id=?', Number(b.assignment_id), c.id);
    if (!a) throw bad('Pick one of your allotted villages to swap');
    if (LOCKED.has(a.ack_status)) throw bad('That village is already with the village officer for acknowledgement');
    if (await db.get("SELECT 1 x FROM change_requests WHERE assignment_id=? AND status='pending'", a.id)) throw bad('A change request for that village is already pending');
    aid = a.id;
  }
  const reason = reqStr(b.reason, 'Please give a short reason', 500);
  await db.run('INSERT INTO change_requests(college_id,assignment_id,to_village_id,reason,created_at) VALUES (?,?,?,?,?)', c.id, aid, to, reason, nowIso());
  await clog(ctx, 'request_change', `Requested ${village.name}`);
  return { ok: true };
});

route('DELETE', '/api/college/requests/:id', 'college', async ctx => {
  const r = await ctx.db.run("DELETE FROM change_requests WHERE id=? AND college_id=? AND status='pending'", Number(ctx.params.id), ctx.college.id);
  if (!r.changes) throw bad('Only pending requests can be withdrawn');
  return { ok: true };
});

// ----- schedule -----
function cleanPair(list) {
  const out = [];
  for (const v of Array.isArray(list) ? list.slice(0, 4) : []) {
    const name = str(v.name, 80), contact = str(v.contact, 20);
    if (!name && !contact) continue;
    if (!name) throw bad('Volunteer name is required alongside the contact number');
    out.push({ name, contact: phone(contact, `Contact number for ${name}`) });
  }
  return out;
}
async function lockedVillages(db, collegeId) {
  return new Set((await db.all('SELECT village_id id,ack_status s FROM assignments WHERE college_id=?', collegeId)).filter(a => LOCKED.has(a.s)).map(a => a.id));
}

route('POST', '/api/college/schedule', 'college', async ctx => {
  const { db, college: c, body: b } = ctx;
  if (!isDate(b.start) || !isDate(b.end) || b.end < b.start) throw bad('Choose a valid from and to date');
  const dates = dateRange(b.start, b.end, !!b.skip_sundays);
  if (!dates.length) throw bad('No days fall in that range');
  if (dates.length > 45) throw bad('Please keep the schedule within 45 days');
  const per = int(b.per_village || 3, 'Days per village', { min: 1, max: 15 });
  const locked = await lockedVillages(db, c.id);
  const open = (await db.all('SELECT village_id id FROM assignments WHERE college_id=? ORDER BY id', c.id)).map(r => r.id).filter(id => !locked.has(id));
  if (!open.length) throw bad('You have no villages available to schedule. Ask the admin to allot villages.');
  const pair = cleanPair(b.volunteers);
  const existing = await db.all(`SELECT d.id,(SELECT COUNT(*) FROM volunteers v WHERE v.day_id=d.id AND v.attended IS NOT NULL) rec
    FROM days d WHERE d.college_id=? AND d.village_id IN (${open.map(() => '?').join(',')})`, c.id, ...open);
  if (existing.length && !b.replace) throw new HttpError(409, 'You already have a schedule. Replace it?', { code: 'exists' });
  if (existing.some(e => e.rec)) throw new HttpError(409, 'Attendance has already been recorded, so the schedule cannot be replaced in one go. Edit or delete individual days instead.', { code: 'has_data' });
  await db.tx(async tx => {
    for (const e of existing) await tx.run('DELETE FROM days WHERE id=?', e.id);
    for (const [i, date] of dates.entries()) {
      const village = open[Math.floor(i / per) % open.length];
      const id = await tx.insert('INSERT INTO days(college_id,village_id,date,created_at) VALUES (?,?,?,?)', c.id, village, date, nowIso());
      for (const [s, v] of pair.entries()) await tx.run('INSERT INTO volunteers(day_id,slot,name,contact) VALUES (?,?,?,?)', id, s, v.name, v.contact);
    }
  });
  await clog(ctx, 'schedule', `${dates.length} days from ${dates[0]} to ${dates.at(-1)}`);
  return { ok: true, days: dates.length };
});

async function ownDay(ctx, id) {
  const d = await ctx.db.get('SELECT * FROM days WHERE id=? AND college_id=?', Number(id), ctx.college.id);
  if (!d) throw new HttpError(404, 'Day not found');
  if ((await lockedVillages(ctx.db, ctx.college.id)).has(d.village_id)) throw new HttpError(423, 'This village has been sent to the village officer, so it is locked. Ask the admin if a correction is needed.');
  return d;
}
async function ownAssignedVillage(ctx, vid) {
  const a = await ctx.db.get('SELECT * FROM assignments WHERE college_id=? AND village_id=?', ctx.college.id, Number(vid));
  if (!a) throw bad('That village is not allotted to you');
  if (LOCKED.has(a.ack_status)) throw new HttpError(423, 'That village is locked for acknowledgement');
  return a;
}

route('POST', '/api/college/days', 'college', async ctx => {
  const { db, body: b, college: c } = ctx;
  if (!isDate(b.date)) throw bad('Choose a valid date');
  await ownAssignedVillage(ctx, b.village_id);
  const vid = Number(b.village_id);
  const id = await db.insert('INSERT INTO days(college_id,village_id,date,created_at) VALUES (?,?,?,?)', c.id, vid, b.date, nowIso());
  const last = await db.get('SELECT id FROM days WHERE college_id=? AND village_id=? AND id<>? ORDER BY date DESC,id DESC LIMIT 1', c.id, vid, id);
  if (last) await db.run('INSERT INTO volunteers(day_id,slot,name,contact) SELECT ?::int,slot,name,contact FROM volunteers WHERE day_id=? ORDER BY slot', id, last.id);
  await clog(ctx, 'day_add', b.date);
  return { ok: true, id };
});

route('PATCH', '/api/college/days/:id', 'college', async ctx => {
  const d = await ownDay(ctx, ctx.params.id), b = ctx.body;
  const date = b.date ?? d.date;
  if (!isDate(date)) throw bad('Choose a valid date');
  let vid = d.village_id;
  if (b.village_id != null && Number(b.village_id) !== d.village_id) { await ownAssignedVillage(ctx, b.village_id); vid = Number(b.village_id); }
  await ctx.db.run('UPDATE days SET date=?,village_id=?,notes=? WHERE id=?', date, vid, str(b.notes ?? d.notes, 300), d.id);
  return { ok: true };
});

route('DELETE', '/api/college/days/:id', 'college', async ctx => {
  const d = await ownDay(ctx, ctx.params.id);
  const files = await ctx.db.all('SELECT drive_id FROM media WHERE day_id=?', d.id);
  await ctx.db.run('DELETE FROM days WHERE id=?', d.id);
  ctx.waitUntil(Promise.allSettled(files.map(f => driveDelete(ctx.env, f.drive_id))));
  await clog(ctx, 'day_delete', d.date);
  return { ok: true };
});

route('PUT', '/api/college/days/:id/volunteers', 'college', async ctx => {
  const d = await ownDay(ctx, ctx.params.id);
  const list = Array.isArray(ctx.body.volunteers) ? ctx.body.volunteers.slice(0, 4) : [];
  const future = d.date > todayStr();
  const rows = [];
  for (const v of list) {
    const name = str(v.name, 80), contact = str(v.contact, 20);
    if (!name && !contact) continue;
    if (!name) throw bad('Enter the volunteer name');
    const att = v.attended === 1 || v.attended === true ? 1 : v.attended === 0 || v.attended === false ? 0 : null;
    if (att !== null && future) throw bad(`${d.date} is still in the future, so attendance can't be marked yet`);
    let addressed = 0, registered = 0;
    if (att === 1) {
      addressed = int(v.addressed, `People addressed (${name})`);
      registered = int(v.registered, `Registered count (${name})`);
      if (registered > addressed) throw bad(`${name}: registered can't be more than people addressed`);
    }
    rows.push({ name, contact: phone(contact, `Contact number for ${name}`), att, addressed, registered });
  }
  await ctx.db.tx(async tx => {
    await tx.run('DELETE FROM volunteers WHERE day_id=?', d.id);
    for (const [i, r] of rows.entries()) await tx.run('INSERT INTO volunteers(day_id,slot,name,contact,attended,addressed,registered) VALUES (?,?,?,?,?,?,?)', d.id, i, r.name, r.contact, r.att, r.addressed, r.registered);
  });
  return { ok: true };
});

route('POST', '/api/college/block-volunteers', 'college', async ctx => {
  await ownAssignedVillage(ctx, ctx.body.village_id);
  const pair = cleanPair(ctx.body.volunteers);
  const days = await ctx.db.all('SELECT id FROM days WHERE college_id=? AND village_id=?', ctx.college.id, Number(ctx.body.village_id));
  await ctx.db.tx(async tx => {
    for (const d of days) {
      const cur = await tx.all('SELECT id,slot FROM volunteers WHERE day_id=? ORDER BY slot,id', d.id);
      for (const [i, v] of pair.entries()) {
        if (cur[i]) await tx.run('UPDATE volunteers SET name=?,contact=? WHERE id=?', v.name, v.contact, cur[i].id);
        else await tx.run('INSERT INTO volunteers(day_id,slot,name,contact) VALUES (?,?,?,?)', d.id, i, v.name, v.contact);
      }
      for (const extra of cur.slice(pair.length)) await tx.run('DELETE FROM volunteers WHERE id=? AND attended IS NULL', extra.id);
    }
  });
  await clog(ctx, 'volunteers_set', `${pair.length} volunteers for ${days.length} days`);
  return { ok: true, days: days.length };
});

// ----- photos (stored in Google Drive) -----
const MAX_PHOTOS = 8, MAX_BYTES = 4 * 1024 * 1024;
route('POST', '/api/college/days/:id/photos', 'college', async ctx => {
  const d = await ownDay(ctx, ctx.params.id), b = ctx.body;
  if (!/^image\/(jpeg|png|webp)$/.test(b.mime || '')) throw bad('Please upload a JPG, PNG or WebP photo');
  const data = String(b.data || '');
  if (!data || data.length * 0.75 > MAX_BYTES) throw bad('Photo is too large (max 4 MB). Try a smaller one.');
  if ((await ctx.db.get('SELECT COUNT(*) n FROM media WHERE day_id=?', d.id)).n >= MAX_PHOTOS) throw bad(`You can add up to ${MAX_PHOTOS} photos per day`);
  const ext = b.mime.split('/')[1].replace('jpeg', 'jpg');
  const up = await driveUpload(ctx.env, { name: `${d.date}_${Date.now()}.${ext}`, mime: b.mime, data, folder: `${ctx.college.name} (#${ctx.college.id})` });
  const id = await ctx.db.insert('INSERT INTO media(day_id,college_id,drive_id,name,mime,size,created_at) VALUES (?,?,?,?,?,?,?)',
    d.id, ctx.college.id, up.id, str(b.name, 100) || 'photo', b.mime, Math.round(data.length * 0.75), nowIso());
  return { ok: true, id };
});
route('DELETE', '/api/college/photos/:id', 'college', async ctx => {
  const m = await ctx.db.get('SELECT m.*,d.village_id FROM media m JOIN days d ON d.id=m.day_id WHERE m.id=? AND m.college_id=?', Number(ctx.params.id), ctx.college.id);
  if (!m) throw new HttpError(404, 'Photo not found');
  if ((await lockedVillages(ctx.db, ctx.college.id)).has(m.village_id)) throw new HttpError(423, 'This village is locked for acknowledgement');
  await ctx.db.run('DELETE FROM media WHERE id=?', m.id);
  ctx.waitUntil(driveDelete(ctx.env, m.drive_id).catch(() => {}));
  return { ok: true };
});
export async function photoResponse(ctx, row) {
  const f = await driveGet(ctx.env, row.drive_id);
  const bytes = Uint8Array.from(atob(f.data), ch => ch.charCodeAt(0));
  return { __raw: true, bytes, headers: { 'Content-Type': row.mime || f.mime, 'Cache-Control': 'private, max-age=3600' } };
}
route('GET', '/api/college/photos/:id', 'college', async ctx => {
  const m = await ctx.db.get('SELECT * FROM media WHERE id=? AND college_id=?', Number(ctx.params.id), ctx.college.id);
  if (!m) throw new HttpError(404, 'Photo not found');
  return photoResponse(ctx, m);
});

// ----- send to village officer -----
route('POST', '/api/college/submit-village', 'college', async ctx => {
  const { db, college: c, env } = ctx;
  const a = await ownAssignedVillage(ctx, ctx.body.village_id);
  const village = await db.get('SELECT * FROM villages WHERE id=?', a.village_id);
  const { days, totals } = await villageReport(db, c.id, a.village_id);
  if (!days.length) throw bad('Schedule at least one day for this village first');
  const problems = [];
  for (const d of days) {
    if (d.date > todayStr()) problems.push(`${d.date} is still in the future`);
    else if (!d.volunteers.length) problems.push(`${d.date} has no volunteers`);
    else if (d.volunteers.some(v => v.attended == null)) problems.push(`${d.date} has attendance not marked`);
  }
  if (problems.length) throw bad('Finish these before sending to the village officer: ' + problems.slice(0, 4).join('; ') + (problems.length > 4 ? '…' : ''));
  if (!totals.attended) throw bad('No volunteer attended any day, so there is nothing to acknowledge');
  const tk = a.ack_token || token(18);
  await db.run("UPDATE assignments SET ack_status='submitted',ack_token=?,submitted_at=?,query_note=NULL WHERE id=?", tk, nowIso(), a.id);
  const link = `${env.BASE_URL || new URL(ctx.req.url).origin}/#/ack/${tk}`;
  const mail = await sendMail(db, env, village.officer_email, `Please acknowledge Electoral Literacy Club work in ${village.name}`,
    `Dear ${village.officer_name || 'Village Officer'},\n\n${c.name} has completed its Electoral Literacy Club voter-enrolment activity in ${village.name}: ` +
    `${totals.attended} volunteer-days, ${totals.addressed} people addressed, ${totals.registered} registered.\n\n` +
    `Please review and acknowledge the report here (no login needed):\n${link}\n\nThank you,\nELC Kozhikode`);
  await clog(ctx, 'submit_village', `${village.name} sent for acknowledgement`);
  return { ok: true, emailed: mail.status };
});
