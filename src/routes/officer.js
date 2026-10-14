// Village officer panel: see which students are working in the officer's villages, verify attendance, review reports, certify.
import { route } from '../lib/router.js';
import { log } from '../lib/db.js';
import { daysWithVolunteers, reportFrom, photoResponse } from './college.js';
import { HttpError, bad, todayStr, nowIso, str, reqStr, int } from '../lib/util.js';

const olog = (ctx, action, detail) => log(ctx.db, 'officer', ctx.officer.name, null, action, detail, ctx.ip);
const inList = ids => (ids.length ? ids.map(() => '?').join(',') : 'NULL');
const plusDays = (iso, k) => new Date(Date.parse(iso + 'T00:00:00Z') + k * 864e5).toISOString().slice(0, 10);

async function myVillages(ctx) {
  return ctx.db.all(`SELECT v.id,v.name,v.taluk,v.lsgi,v.office_address,v.office_phone,a.id assignment_id,a.college_id,a.ack_status,a.query_note,a.submitted_at,a.ack_at,
      a.ack_name,a.distance_km,a.distance_note,c.name college,c.phone college_phone,c.email college_email,c.coordinator
    FROM villages v LEFT JOIN assignments a ON a.village_id=v.id LEFT JOIN colleges c ON c.id=a.college_id WHERE v.officer_id=? ORDER BY v.name`, ctx.officer.id);
}

route('GET', '/api/officer/me', 'officer', ctx => ({ id: ctx.officer.id, name: ctx.officer.name, designation: ctx.officer.designation }));

route('GET', '/api/officer/overview', 'officer', async ctx => {
  const { db, officer: o } = ctx, today = todayStr();
  const villages = await myVillages(ctx);
  const cache = new Map(), outVillages = [], todayRows = [], upcoming = [], queue = [];
  for (const v of villages) {
    let totals = { days: 0, attended: 0, absent: 0, addressed: 0, registered: 0 }, verified = 0, disputed = 0, unverified = 0;
    if (v.college_id) {
      if (!cache.has(v.college_id)) cache.set(v.college_id, await daysWithVolunteers(db, v.college_id));
      const rep = reportFrom(cache.get(v.college_id), v.id);
      totals = rep.totals;
      for (const d of rep.days) {
        const named = d.volunteers.filter(x => x.name);
        for (const x of named) {
          if (x.attended != null) { if (x.verified === 'yes') verified++; else if (x.verified === 'no') disputed++; else unverified++; }
        }
        const row = { day_id: d.id, date: d.date, village_id: v.id, village: v.name, college: v.college, college_phone: v.college_phone, notes: d.notes,
          volunteers: named.map(x => ({ id: x.id, name: x.name, contact: x.contact, attended: x.attended, addressed: x.addressed, registered: x.registered, verified: x.verified, verify_note: x.verify_note })),
          photos: d.media.length };
        if (d.date === today) todayRows.push(row);
        else if (d.date > today && d.date <= plusDays(today, 7)) upcoming.push(row);
        else if (d.date < today && named.some(x => x.attended != null && !x.verified)) queue.push(row);
      }
    }
    outVillages.push({ id: v.id, name: v.name, taluk: v.taluk, lsgi: v.lsgi, office_address: v.office_address, office_phone: v.office_phone,
      college: v.college, college_phone: v.college_phone, coordinator: v.coordinator, assignment_id: v.assignment_id, status: v.ack_status || 'none', unallotted: !v.college_id,
      query_note: v.query_note, submitted_at: v.submitted_at, ack_at: v.ack_at, distance_km: v.distance_km, distance_note: v.distance_note,
      totals: { ...totals, verified, disputed, unverified } });
  }
  todayRows.sort((a, b) => a.village.localeCompare(b.village));
  upcoming.sort((a, b) => a.date.localeCompare(b.date) || a.village.localeCompare(b.village));
  queue.sort((a, b) => b.date.localeCompare(a.date));
  return { officer: { id: o.id, name: o.name, designation: o.designation, phone: o.phone, email: o.email }, today, villages: outVillages, todayRows, upcoming, queue,
    pending: outVillages.filter(v => v.status === 'submitted').length };
});

// confirm or dispute the attendance entries the college marked
route('POST', '/api/officer/verify', 'officer', async ctx => {
  const { db, officer: o, body: b } = ctx;
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter(Boolean).slice(0, 200);
  if (!ids.length) throw bad('Select at least one entry');
  const decision = b.decision === 'no' ? 'no' : 'yes', note = str(b.note, 300);
  if (decision === 'no' && !note) throw bad('Please say what is wrong, so the college can correct it');
  const vids = (await db.all('SELECT id FROM villages WHERE officer_id=?', o.id)).map(r => r.id);
  const rows = await db.all(`SELECT x.id,x.attended,d.village_id FROM volunteers x JOIN days d ON d.id=x.day_id WHERE x.id IN (${inList(ids)})`, ...ids);
  if (rows.length !== ids.length || rows.some(r => !vids.includes(r.village_id))) throw new HttpError(403, 'Some of these entries are not in your villages');
  if (rows.some(r => r.attended == null)) throw bad('Attendance has not been marked for some of these entries yet');
  const at = nowIso();
  for (const id of ids) await db.run('UPDATE volunteers SET verified=?,verified_by=?,verified_at=?,verify_note=? WHERE id=?', decision, o.name, at, decision === 'no' ? note : null, id);
  await olog(ctx, decision === 'yes' ? 'verify' : 'dispute', `${ids.length} entr${ids.length > 1 ? 'ies' : 'y'}${note ? ' - ' + note : ''}`);
  return { ok: true, count: ids.length };
});

async function ownVillage(ctx, vid) {
  const v = await ctx.db.get('SELECT * FROM villages WHERE id=? AND officer_id=?', Number(vid), ctx.officer.id);
  if (!v) throw new HttpError(403, 'That village is not assigned to you');
  return v;
}

route('GET', '/api/officer/village/:id', 'officer', async ctx => {
  const v = await ownVillage(ctx, ctx.params.id);
  const a = await ctx.db.get('SELECT a.*,c.name college,c.phone college_phone,c.coordinator FROM assignments a JOIN colleges c ON c.id=a.college_id WHERE a.village_id=?', v.id);
  if (!a) return { village: v, college: null, days: [], totals: { days: 0, attended: 0, absent: 0, addressed: 0, registered: 0 } };
  const { days, totals } = reportFrom(await daysWithVolunteers(ctx.db, a.college_id), v.id);
  return { village: { id: v.id, name: v.name, lsgi: v.lsgi, office_address: v.office_address, office_phone: v.office_phone }, college: a.college, college_phone: a.college_phone, coordinator: a.coordinator,
    status: a.ack_status, query_note: a.query_note, assignment_id: a.id, totals, days: days.map(d => ({ id: d.id, date: d.date, media: d.media, volunteers: d.volunteers.filter(x => x.name) })) };
});

// the final step: certify the college's data for this village (or send it back for correction)
route('POST', '/api/officer/certify', 'officer', async ctx => {
  const { db, officer: o, body: b } = ctx;
  const a = await db.get(`SELECT a.*,v.name village,c.name college FROM assignments a JOIN villages v ON v.id=a.village_id JOIN colleges c ON c.id=a.college_id WHERE a.id=? AND v.officer_id=?`, Number(b.assignment_id), o.id);
  if (!a) throw new HttpError(403, 'That village is not assigned to you');
  if (a.ack_status !== 'submitted') throw bad('The college has not sent this village for certification yet');
  if (b.action === 'query') {
    const note = reqStr(b.remarks, 'Please say what needs correcting', 500);
    await db.run("UPDATE assignments SET ack_status='none',query_note=? WHERE id=?", `${o.name}: ${note}`, a.id);
    await olog(ctx, 'ack_query', `${a.village} / ${a.college}: ${note}`);
    return { ok: true };
  }
  const rows = reportFrom(await daysWithVolunteers(db, a.college_id), a.village_id);
  const disputed = rows.days.flatMap(d => d.volunteers).filter(x => x.verified === 'no').length;
  if (disputed) throw bad(`${disputed} attendance entr${disputed > 1 ? 'ies are' : 'y is'} marked as incorrect. Send the village back for correction instead, or verify them again.`);
  await db.run("UPDATE assignments SET ack_status='acknowledged',ack_name=?,ack_designation=?,ack_remarks=?,ack_at=?,query_note=NULL WHERE id=?",
    o.name, str(o.designation, 100) || str(b.designation, 100) || 'Village Officer', str(b.remarks, 500), nowIso(), a.id);
  await olog(ctx, 'certify', `${a.village} / ${a.college}`);
  return { ok: true };
});

route('GET', '/api/officer/photos/:id', 'officer', async ctx => {
  const m = await ctx.db.get('SELECT m.*,d.village_id FROM media m JOIN days d ON d.id=m.day_id WHERE m.id=?', Number(ctx.params.id));
  if (!m) throw new HttpError(404, 'Photo not found');
  await ownVillage(ctx, m.village_id);
  return photoResponse(ctx, m);
});
