// Participation certificates. The district office opens a campaign and attaches a certificate design (a template with merge boxes).
// Each college or school then:  1. sees the students taken from its daily reports (or imported from a sheet),  2. verifies them and
// corrects dates and events,  3. submits the final list,  4. generates the certificates once. The PDFs are drawn in the browser
// from the frozen details stored here, so they can be downloaded again and again without storing files.
import { route, scopeOf } from '../lib/router.js';
import { log } from '../lib/db.js';
import { HttpError, bad, nowIso, todayStr, isDate, str, reqStr } from '../lib/util.js';
import { syncDeskVolunteers } from './desk.js';

const OPS = ['super_admin', 'admin'];
const slog = (ctx, a, d) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, a, d, ctx.ip);
const clog = (ctx, a, d) => log(ctx.db, 'college', ctx.college.name, null, a, d, ctx.ip);
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dLong = d => `${Number(d.slice(8, 10))} ${MON[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const dShort = d => `${Number(d.slice(8, 10))} ${MON[Number(d.slice(5, 7)) - 1].slice(0, 3)} ${d.slice(0, 4)}`;
const norm = s => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/\b(the|of)\b/g, ' ').replace(/[^a-z0-9]+/g, '');

// ---------- helpers ----------
const parseEntries = s => { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
function cleanEntries(list) {
  const seen = new Set(), out = [];
  for (const e of (Array.isArray(list) ? list : []).slice(0, 300)) {
    const d = String(e?.d || ''), a = str(e?.a, 60);
    if (!isDate(d) || d > todayStr() || !a) continue;
    const k = d + '|' + a.toLowerCase(); if (seen.has(k)) continue; seen.add(k); out.push({ d, a });
  }
  return out.sort((x, y) => x.d.localeCompare(y.d) || x.a.localeCompare(y.a));
}
const statsOf = es => { const dates = [...new Set(es.map(e => e.d))].sort(); return { days: dates.length, first: dates[0] || '', last: dates.at(-1) || '', acts: [...new Set(es.map(e => e.a))] }; };
function shape(p, withSnap) {
  const es = parseEntries(p.entries), st = statsOf(es);
  const o = { id: p.id, college_id: p.college_id, name: p.name, entries: es, days: st.days, first: st.first, last: st.last, activities: st.acts, eligible: p.eligible ? 1 : 0, source: p.source || 'portal', status: p.status || 'none', cert_no: p.cert_no || '', allow_regen: p.allow_regen ? 1 : 0, issued_at: p.issued_at || '' };
  if (withSnap && p.snapshot) { try { o.snapshot = JSON.parse(p.snapshot); } catch {} }
  return o;
}
const datesText = st => (!st.first ? '' : st.first === st.last ? dLong(st.first) : `${dShort(st.first)} to ${dShort(st.last)}`);
function snapshotFor(p, college, camp, serial) {
  const st = statsOf(parseEntries(p.entries));
  return { student: p.name, college: college.name, activities: st.acts.join(', ').slice(0, 160), dates: datesText(st), days: String(st.days), campaign: camp.title, serial, issued: dLong(todayStr()) };
}
async function campaignOr404(db, id) {
  const c = await db.get('SELECT * FROM cert_campaigns WHERE id=?', Number(id));
  if (!c) throw new HttpError(404, 'Campaign not found');
  return c;
}
async function templateOf(db, camp) {
  if (!camp.template_id) return null;
  const t = await db.get("SELECT id,title,width,height,fields,active FROM templates WHERE id=? AND kind='certificate'", camp.template_id);
  if (!t) return null;
  let fields = []; try { fields = JSON.parse(t.fields || '[]'); } catch {}
  return { id: t.id, title: t.title, width: t.width, height: t.height, kind: 'certificate', fields, active: !!t.active };
}
async function batchFor(db, campId, collegeId, create = true) {
  let b = await db.get('SELECT * FROM cert_batches WHERE campaign_id=? AND college_id=?', campId, collegeId);
  if (!b && create) { const id = await db.insert('INSERT INTO cert_batches(campaign_id,college_id,status,created_at) VALUES (?,?,?,?)', campId, collegeId, 'draft', nowIso()); b = await db.get('SELECT * FROM cert_batches WHERE id=?', id); }
  return b;
}
const actLabel = r => (r.activity === 'Other' && r.activity_other ? `Other: ${r.activity_other}` : r.activity);

// ---------- the college side ----------
route('GET', '/api/college/certs', 'college', async ctx => {
  const camps = await ctx.db.all('SELECT * FROM cert_campaigns WHERE live=1 ORDER BY id DESC');
  const counts = await ctx.db.all("SELECT campaign_id,COUNT(*) people,SUM(CASE WHEN eligible=1 THEN 1 ELSE 0 END) eligible,SUM(CASE WHEN status IN ('issued','ok') THEN 1 ELSE 0 END) issued FROM cert_people WHERE college_id=? GROUP BY campaign_id", ctx.college.id);
  const bs = await ctx.db.all('SELECT campaign_id,status FROM cert_batches WHERE college_id=?', ctx.college.id);
  const C = new Map(counts.map(r => [r.campaign_id, r])), B = new Map(bs.map(r => [r.campaign_id, r.status]));
  const out = [];
  for (const c of camps) out.push({ id: c.id, title: c.title, description: c.description, start_date: c.start_date, end_date: c.end_date, status: B.get(c.id) || 'draft', counts: C.get(c.id) || { people: 0, eligible: 0, issued: 0 }, ready: !!((await templateOf(ctx.db, c))?.active) });
  return out;
});
route('GET', '/api/college/certs/:cid', 'college', async ctx => {
  const camp = await campaignOr404(ctx.db, ctx.params.cid);
  if (!camp.live) throw new HttpError(403, 'Certificates for this campaign are not open yet');
  const [t, batch, people, known] = await Promise.all([templateOf(ctx.db, camp), batchFor(ctx.db, camp.id, ctx.college.id, false),
    ctx.db.all('SELECT * FROM cert_people WHERE campaign_id=? AND college_id=? ORDER BY name', camp.id, ctx.college.id),
    ctx.db.all("SELECT DISTINCT activity,activity_other FROM activity_log WHERE college_id=?", ctx.college.id)]);
  const events = [...new Set(['Help desk', 'Flash Mob', 'Class to Class Campaign', 'Game Zone', ...known.map(actLabel), ...people.flatMap(p => parseEntries(p.entries).map(e => e.a))])].filter(Boolean).sort();
  return { campaign: { id: camp.id, title: camp.title, description: camp.description, start_date: camp.start_date, end_date: camp.end_date, min_days: camp.min_days || 1 },
    batch: { status: batch?.status || 'draft', synced: !!batch?.synced_at, submitted_at: batch?.submitted_at || null, generated_at: batch?.generated_at || null },
    people: people.map(p => shape(p, true)), events, template: t && t.active ? t : null, today: todayStr(), institution: ctx.college.name };
});
route('POST', '/api/college/certs/:cid/sync', 'college', async ctx => {
  ctx.db.deferred = true;
  const camp = await campaignOr404(ctx.db, ctx.params.cid), c = ctx.college;
  if (!camp.live) throw new HttpError(403, 'Certificates for this campaign are not open yet');
  const batch = await batchFor(ctx.db, camp.id, c.id);
  if (batch.status === 'submitted') throw bad('The final list has been submitted. Ask the district office to reopen it if a change is needed.');
  const rows = await ctx.db.all('SELECT date,activity,activity_other,name,created_at FROM activity_log WHERE college_id=? AND created_at>? ORDER BY date', c.id, batch.synced_at || '');
  const inRange = d => (!camp.start_date || d >= camp.start_date) && (!camp.end_date || d <= camp.end_date);
  const existing = await ctx.db.all('SELECT * FROM cert_people WHERE campaign_id=? AND college_id=?', camp.id, c.id), by = new Map(existing.map(p => [p.name.toLowerCase(), p]));
  const touched = new Map();
  for (const r of rows) {
    if (!inRange(r.date)) continue;
    const key = String(r.name).replace(/\s+/g, ' ').trim().toLowerCase(), cur = touched.get(key) || { p: by.get(key) || null, name: String(r.name).replace(/\s+/g, ' ').trim(), entries: parseEntries(by.get(key)?.entries) };
    cur.entries.push({ d: r.date, a: actLabel(r) }); touched.set(key, cur);
  }
  let added = 0, updated = 0; const now = nowIso();
  for (const t of touched.values()) {
    const entries = cleanEntries(t.entries), days = statsOf(entries).days;
    if (!entries.length) continue;
    if (t.p) { await ctx.db.run('UPDATE cert_people SET entries=?,updated_at=? WHERE id=?', JSON.stringify(entries), now, t.p.id); updated++; }
    else { await ctx.db.insert('INSERT INTO cert_people(campaign_id,college_id,name,entries,eligible,source,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)', camp.id, c.id, t.name.slice(0, 80), JSON.stringify(entries), days >= (camp.min_days || 1) ? 1 : 0, 'portal', 'none', now, now); added++; }
  }
  await ctx.db.run('UPDATE cert_batches SET synced_at=? WHERE id=?', now, batch.id);
  return { ok: true, added, updated };
});
async function ownPerson(ctx, id, needDraft = true) {
  const p = await ctx.db.get('SELECT * FROM cert_people WHERE id=? AND college_id=?', Number(id), ctx.college.id);
  if (!p) throw new HttpError(404, 'Student not found');
  if (needDraft) { const b = await ctx.db.get('SELECT status FROM cert_batches WHERE campaign_id=? AND college_id=?', p.campaign_id, ctx.college.id); if (b?.status === 'submitted') throw bad('The final list has been submitted, so it can no longer be edited.'); }
  return p;
}
route('PUT', '/api/college/certs/people/:id', 'college', async ctx => {
  ctx.db.deferred = true;
  const p = await ownPerson(ctx, ctx.params.id), b = ctx.body;
  const name = b.name !== undefined ? reqStr(b.name, 'Student name', 80).replace(/\s+/g, ' ') : p.name;
  if (name.toLowerCase() !== p.name.toLowerCase() && await ctx.db.get('SELECT 1 x FROM cert_people WHERE campaign_id=? AND college_id=? AND lower(name)=lower(?)', p.campaign_id, p.college_id, name)) throw bad('A student with this name is already in the list');
  const entries = b.entries !== undefined ? cleanEntries(b.entries) : parseEntries(p.entries), eligible = b.eligible !== undefined ? (b.eligible ? 1 : 0) : p.eligible;
  await ctx.db.run('UPDATE cert_people SET name=?,entries=?,eligible=?,updated_at=? WHERE id=?', name, JSON.stringify(entries), eligible, nowIso(), p.id);
  return { ok: true };
});
route('DELETE', '/api/college/certs/people/:id', 'college', async ctx => {
  ctx.db.deferred = true;
  const p = await ownPerson(ctx, ctx.params.id);
  if (p.status !== 'none') throw bad('A certificate was already issued to this student');
  await ctx.db.run('DELETE FROM cert_people WHERE id=?', p.id);
  return { ok: true };
});
route('POST', '/api/college/certs/:cid/people', 'college', async ctx => {
  ctx.db.deferred = true;
  const camp = await campaignOr404(ctx.db, ctx.params.cid), c = ctx.college, b = ctx.body;
  const batch = await batchFor(ctx.db, camp.id, c.id);
  if (batch.status === 'submitted') throw bad('The final list has been submitted, so it can no longer be edited.');
  const name = reqStr(b.name, 'Student name', 80).replace(/\s+/g, ' ');
  if (await ctx.db.get('SELECT 1 x FROM cert_people WHERE campaign_id=? AND college_id=? AND lower(name)=lower(?)', camp.id, c.id, name)) throw bad('A student with this name is already in the list');
  const entries = cleanEntries(b.entries), now = nowIso();
  const id = await ctx.db.insert('INSERT INTO cert_people(campaign_id,college_id,name,entries,eligible,source,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)', camp.id, c.id, name, JSON.stringify(entries), 1, 'manual', 'none', now, now);
  return { ok: true, id };
});
route('POST', '/api/college/certs/:cid/select', 'college', async ctx => {
  ctx.db.deferred = true;
  const camp = await campaignOr404(ctx.db, ctx.params.cid), b = ctx.body, mode = b.mode;
  const batch = await batchFor(ctx.db, camp.id, ctx.college.id);
  if (batch.status === 'submitted') throw bad('The final list has been submitted, so it can no longer be edited.');
  const people = await ctx.db.all('SELECT id,entries,eligible FROM cert_people WHERE campaign_id=? AND college_id=?', camp.id, ctx.college.id), min = Math.max(1, Math.min(60, Number(b.n) || 1));
  for (const p of people) {
    const want = mode === 'all' ? 1 : mode === 'none' ? 0 : mode === 'min' ? (statsOf(parseEntries(p.entries)).days >= min ? 1 : 0) : p.eligible;
    if (want !== p.eligible) await ctx.db.run('UPDATE cert_people SET eligible=? WHERE id=?', want, p.id);
  }
  return { ok: true };
});
route('POST', '/api/college/certs/:cid/submit', 'college', async ctx => {
  ctx.db.deferred = true;
  const camp = await campaignOr404(ctx.db, ctx.params.cid), batch = await batchFor(ctx.db, camp.id, ctx.college.id);
  const n = (await ctx.db.get('SELECT COUNT(*) n FROM cert_people WHERE campaign_id=? AND college_id=? AND eligible=1', camp.id, ctx.college.id)).n;
  if (!n) throw bad('Select at least one student before submitting');
  await ctx.db.run("UPDATE cert_batches SET status='submitted',submitted_at=?,submitted_by=? WHERE id=?", nowIso(), ctx.college.coordinator || ctx.college.name, batch.id);
  await clog(ctx, 'cert_submit', `${camp.title}: ${n} students`);
  return { ok: true, count: n };
});
// issue the serial numbers and freeze what goes on each certificate; once issued a student is not issued again unless the office allows it
route('POST', '/api/college/certs/:cid/generate', 'college', async ctx => {
  ctx.db.deferred = true;
  const camp = await campaignOr404(ctx.db, ctx.params.cid), c = ctx.college;
  if (!camp.live) throw new HttpError(403, 'Certificates for this campaign are not open yet');
  const t = await templateOf(ctx.db, camp); if (!t || !t.active) throw new HttpError(403, 'The certificate design is not ready yet. The district office will switch it on.');
  const batch = await batchFor(ctx.db, camp.id, c.id);
  if (batch.status !== 'submitted') throw bad('Submit the final list first');
  const people = await ctx.db.all("SELECT * FROM cert_people WHERE campaign_id=? AND college_id=? AND eligible=1 AND (status='none' OR allow_regen=1) ORDER BY name", camp.id, c.id);
  if (!people.length) throw bad('Every selected student already has a certificate. If one needs to be made again, ask the district office to allow it.');
  let next = (await ctx.db.get("SELECT COUNT(*) n FROM cert_people WHERE campaign_id=? AND cert_no<>'' AND cert_no IS NOT NULL", camp.id)).n, now = nowIso();
  const year = todayStr().slice(0, 4), out = [];
  for (const p of people) {
    const serial = p.cert_no || `${camp.prefix || 'ELC'}-${year}-${String(++next).padStart(4, '0')}`, snap = snapshotFor(p, c, camp, serial);
    await ctx.db.run("UPDATE cert_people SET status='issued',cert_no=?,snapshot=?,issued_at=?,allow_regen=0,updated_at=? WHERE id=?", serial, JSON.stringify(snap), now, now, p.id);
    out.push({ id: p.id, snapshot: snap });
  }
  await ctx.db.run('UPDATE cert_batches SET generated_at=? WHERE id=?', now, batch.id);
  await clog(ctx, 'cert_generate', `${camp.title}: ${out.length} certificates`);
  return { ok: true, issued: out };
});
// the browser reports which certificates it managed to build
route('POST', '/api/college/certs/:cid/ack', 'college', async ctx => {
  ctx.db.deferred = true;
  const ids = (Array.isArray(ctx.body.ids) ? ctx.body.ids : []).map(Number).filter(Boolean).slice(0, 2000);
  for (const id of ids) await ctx.db.run("UPDATE cert_people SET status='ok' WHERE id=? AND college_id=? AND status IN ('issued','ok')", id, ctx.college.id);
  return { ok: true, count: ids.length };
});

// ---------- the district office ----------
route('GET', '/api/staff/certs/campaigns', 'staff', async ctx => {
  const [camps, tpls, agg] = await Promise.all([ctx.db.all('SELECT * FROM cert_campaigns ORDER BY id DESC'), ctx.db.all("SELECT id,title,active FROM templates WHERE kind='certificate' ORDER BY id DESC"),
    ctx.db.all("SELECT campaign_id,COUNT(DISTINCT college_id) colleges,COUNT(*) people,SUM(CASE WHEN eligible=1 THEN 1 ELSE 0 END) eligible,SUM(CASE WHEN status IN ('issued','ok') THEN 1 ELSE 0 END) issued,SUM(CASE WHEN status='ok' THEN 1 ELSE 0 END) ok FROM cert_people GROUP BY campaign_id")]);
  const A = new Map(agg.map(r => [r.campaign_id, r])), T = new Map(tpls.map(t => [t.id, t]));
  return { campaigns: camps.map(c => ({ ...c, template: T.get(c.template_id) || null, totals: A.get(c.id) || { colleges: 0, people: 0, eligible: 0, issued: 0, ok: 0 } })), templates: tpls };
});
function campaignBody(b) {
  const sd = str(b.start_date, 10), ed = str(b.end_date, 10);
  if ((sd && !isDate(sd)) || (ed && !isDate(ed))) throw bad('Choose valid dates, or leave them empty');
  return { title: reqStr(b.title, 'Campaign title', 100), description: str(b.description, 300), start_date: sd || null, end_date: ed || null, template_id: b.template_id ? Number(b.template_id) : null, live: b.live ? 1 : 0,
    prefix: (str(b.prefix, 10).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'ELC'), min_days: Math.max(1, Math.min(60, Number(b.min_days) || 1)) };
}
route('POST', '/api/staff/certs/campaigns', OPS, async ctx => {
  const o = campaignBody(ctx.body);
  const id = await ctx.db.insert('INSERT INTO cert_campaigns(title,description,start_date,end_date,template_id,live,prefix,min_days,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', o.title, o.description, o.start_date, o.end_date, o.template_id, o.live, o.prefix, o.min_days, ctx.user.username, nowIso());
  await slog(ctx, 'cert_campaign_add', o.title);
  return { ok: true, id };
});
route('PUT', '/api/staff/certs/campaigns/:id', OPS, async ctx => {
  const o = campaignBody(ctx.body), r = await ctx.db.run('UPDATE cert_campaigns SET title=?,description=?,start_date=?,end_date=?,template_id=?,live=?,prefix=?,min_days=? WHERE id=?', o.title, o.description, o.start_date, o.end_date, o.template_id, o.live, o.prefix, o.min_days, Number(ctx.params.id));
  if (!r.changes) throw new HttpError(404, 'Campaign not found');
  await slog(ctx, 'cert_campaign_edit', `${o.title}${o.live ? ' (live)' : ''}`);
  return { ok: true };
});
route('DELETE', '/api/staff/certs/campaigns/:id', OPS, async ctx => {
  const c = await campaignOr404(ctx.db, ctx.params.id);
  if (await ctx.db.get("SELECT 1 x FROM cert_people WHERE campaign_id=? AND status<>'none'", c.id)) throw bad('Certificates were already issued in this campaign, so it cannot be deleted. Switch it off instead.');
  await ctx.db.run('DELETE FROM cert_people WHERE campaign_id=?', c.id); await ctx.db.run('DELETE FROM cert_batches WHERE campaign_id=?', c.id); await ctx.db.run('DELETE FROM cert_campaigns WHERE id=?', c.id);
  await slog(ctx, 'cert_campaign_delete', c.title);
  return { ok: true };
});
// every institution's position in one campaign
route('GET', '/api/staff/certs/status', 'staff', async ctx => {
  const s = await scopeOf(ctx), camp = await campaignOr404(ctx.db, ctx.query.campaign);
  const [cs, agg, bs] = await Promise.all([ctx.db.all("SELECT id,name,COALESCE(kind,'college') kind,coordinator,coord_phone,phone FROM colleges WHERE active=1 ORDER BY name"),
    ctx.db.all("SELECT college_id,COUNT(*) people,SUM(CASE WHEN eligible=1 THEN 1 ELSE 0 END) eligible,SUM(CASE WHEN status IN ('issued','ok') THEN 1 ELSE 0 END) issued,SUM(CASE WHEN status='ok' THEN 1 ELSE 0 END) ok,SUM(CASE WHEN eligible=1 AND status='none' THEN 1 ELSE 0 END) remaining,SUM(CASE WHEN allow_regen=1 THEN 1 ELSE 0 END) allowed FROM cert_people WHERE campaign_id=? GROUP BY college_id", camp.id),
    ctx.db.all('SELECT college_id,status,submitted_at,generated_at FROM cert_batches WHERE campaign_id=?', camp.id)]);
  const A = new Map(agg.map(r => [r.college_id, r])), B = new Map(bs.map(r => [r.college_id, r]));
  const rows = cs.filter(c => !s || s.colleges.has(c.id)).map(c => { const a = A.get(c.id) || { people: 0, eligible: 0, issued: 0, ok: 0, remaining: 0, allowed: 0 }, b = B.get(c.id);
    return { id: c.id, name: c.name, kind: c.kind === 'school' ? 'school' : 'college', coordinator: c.coordinator, phone: c.coord_phone || c.phone, ...a, batch: b?.status || 'none', submitted_at: b?.submitted_at || null, generated_at: b?.generated_at || null }; });
  return { campaign: { id: camp.id, title: camp.title, live: camp.live }, rows };
});
route('GET', '/api/staff/certs/people', 'staff', async ctx => {
  const camp = await campaignOr404(ctx.db, ctx.query.campaign), cid = Number(ctx.query.college), s = await scopeOf(ctx);
  if (s && !s.colleges.has(cid)) throw new HttpError(403, 'This college is not assigned to you');
  const rows = await ctx.db.all('SELECT * FROM cert_people WHERE campaign_id=? AND college_id=? ORDER BY name', camp.id, cid);
  return rows.map(p => shape(p, false));
});
route('POST', '/api/staff/certs/reopen', OPS, async ctx => {
  const camp = await campaignOr404(ctx.db, ctx.body.campaign_id), r = await ctx.db.run("UPDATE cert_batches SET status='draft',reopened_at=? WHERE campaign_id=? AND college_id=?", nowIso(), camp.id, Number(ctx.body.college_id));
  if (!r.changes) throw new HttpError(404, 'Nothing submitted by this institution yet');
  await slog(ctx, 'cert_reopen', `${camp.title}: institution ${ctx.body.college_id}`);
  return { ok: true };
});
// let an institution generate again: for named students, or for everyone it has already generated for
route('POST', '/api/staff/certs/allow', OPS, async ctx => {
  const b = ctx.body, camp = await campaignOr404(ctx.db, b.campaign_id), cid = Number(b.college_id), on = b.allow === false ? 0 : 1;
  if (b.all) await ctx.db.run("UPDATE cert_people SET allow_regen=? WHERE campaign_id=? AND college_id=? AND status IN ('issued','ok')", on, camp.id, cid);
  else for (const id of (Array.isArray(b.ids) ? b.ids : []).slice(0, 2000)) await ctx.db.run("UPDATE cert_people SET allow_regen=? WHERE id=? AND campaign_id=? AND college_id=? AND status IN ('issued','ok')", on, Number(id), camp.id, cid);
  await slog(ctx, 'cert_allow', `${camp.title}: institution ${cid} ${b.all ? 'all' : (b.ids || []).length + ' students'} ${on ? 'allowed' : 'not allowed'}`);
  return { ok: true };
});

// ---------- bringing in participants from a sheet ----------
route('POST', '/api/staff/certs/fetch-sheet', OPS, async ctx => {
  let url = String(ctx.body.url || '').trim();
  if (!/^https:\/\//i.test(url)) throw bad('Paste the full link of the sheet (it starts with https://)');
  const g = url.match(/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (g) { const gid = (url.match(/[#&?]gid=(\d+)/) || [])[1] || '0'; url = `https://docs.google.com/spreadsheets/d/${g[1]}/export?format=csv&gid=${gid}`; }
  let r; try { r = await fetch(url, { redirect: 'follow', headers: { Accept: 'text/csv,text/plain,*/*' } }); } catch { throw bad('The sheet could not be reached. Check the link.'); }
  const type = r.headers.get('content-type') || '', text = await r.text();
  if (!r.ok || /text\/html/.test(type) || /^\s*<!doctype html|^\s*<html/i.test(text)) throw bad('The sheet could not be read. Open it, choose Share, and set "Anyone with the link" to Viewer. Then try again. (A private sheet can also be downloaded as CSV and uploaded here.)');
  if (text.length > 4e6) throw bad('The sheet is too large. Split it or remove unused columns.');
  return { ok: true, csv: text };
});
// The district office brings in a list of participating students (from a sheet or an Excel file). Each row names the institution exactly as it
// is in the portal. The students can go into the certificate list of a campaign, into the institution's own volunteer records (so they appear
// on its Daily report page and in the reports), or both.
const KNOWN_ACTIVITIES = ['Help desk', 'Flash Mob', 'Class to Class Campaign', 'Game Zone'];
route('POST', '/api/staff/certs/import', OPS, async ctx => {
  const camp = ctx.body.campaign_id ? await campaignOr404(ctx.db, ctx.body.campaign_id) : null, toVols = !!ctx.body.volunteers, rows = Array.isArray(ctx.body.rows) ? ctx.body.rows.slice(0, 8000) : [];
  if (!camp && !toVols) throw bad('Choose where the students should be added: a certificate campaign, the colleges\' volunteer records, or both');
  if (!rows.length) throw bad('There are no rows to import');
  const cs = await ctx.db.all('SELECT id,name FROM colleges WHERE active=1'), exact = new Map(cs.map(c => [norm(c.name), c]));
  const find = name => { const k = norm(name); if (!k) return null; if (exact.has(k)) return exact.get(k); const hits = cs.filter(c => { const n = norm(c.name); return n.includes(k) || k.includes(n); }); return hits.length === 1 ? hits[0] : null; };
  const group = new Map(), unmatched = new Map();
  for (const r of rows) {
    const col = find(r.college), name = String(r.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!name) continue;
    if (!col) { unmatched.set(String(r.college || '(blank)'), (unmatched.get(String(r.college || '(blank)')) || 0) + 1); continue; }
    const key = col.id + '|' + name.toLowerCase(), g = group.get(key) || { col, name, entries: [] };
    g.entries.push({ d: String(r.date || ''), a: String(r.activity || 'Participation') }); group.set(key, g);
  }
  let people = 0, merged = 0, entries = 0, recorded = 0, noDate = 0; const touchedColleges = new Set(), now = nowIso(), deskDays = new Set();
  for (const g of group.values()) {
    const add = cleanEntries(g.entries);
    touchedColleges.add(g.col.id); entries += add.length;
    if (toVols) {
      if (!add.length) noDate++;
      for (const e of add) {
        const known = KNOWN_ACTIVITIES.find(k => k.toLowerCase() === e.a.toLowerCase()), act = known || 'Other', other = known ? '' : (e.a === 'Participation' ? 'Participation' : e.a);
        if (await ctx.db.get("SELECT 1 x FROM activity_log WHERE college_id=? AND date=? AND activity=? AND COALESCE(activity_other,'')=? AND lower(name)=lower(?)", g.col.id, e.d, act, other, g.name)) continue;
        await ctx.db.insert('INSERT INTO activity_log(college_id,date,activity,activity_other,name,contact,created_at) VALUES (?,?,?,?,?,?,?)', g.col.id, e.d, act, other, g.name, '', now); recorded++;
        if (act === 'Help desk') deskDays.add(g.col.id + '|' + e.d);
      }
    }
    if (!camp) continue;
    await batchFor(ctx.db, camp.id, g.col.id);
    const ex = await ctx.db.get('SELECT * FROM cert_people WHERE campaign_id=? AND college_id=? AND lower(name)=lower(?)', camp.id, g.col.id, g.name);
    if (ex) { await ctx.db.run('UPDATE cert_people SET entries=?,updated_at=? WHERE id=?', JSON.stringify(cleanEntries([...parseEntries(ex.entries), ...add])), now, ex.id); merged++; }
    else { await ctx.db.insert('INSERT INTO cert_people(campaign_id,college_id,name,entries,eligible,source,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)', camp.id, g.col.id, g.name, JSON.stringify(add), 1, 'sheet', 'none', now, now); people++; }
  }
  for (const k of deskDays) { const [cid, d] = k.split('|'); await syncDeskVolunteers(ctx, Number(cid), d); }
  await slog(ctx, 'participants_import', `${camp ? camp.title + ': ' : ''}${people} new, ${merged} updated, ${recorded} volunteer records, ${touchedColleges.size} institutions`);
  return { ok: true, people, merged, entries, recorded, no_date: noDate, institutions: touchedColleges.size, unmatched: [...unmatched].map(([name, rows]) => ({ name, rows })) };
});
