// Selfie contest (Campus to Booth): students of colleges and higher secondary schools send in selfies, several pictures per entry, without signing in.
// The district office looks through the entries and picks the best three of the district for the Chief Electoral Officer, Kerala.
// Pictures live in Google Drive (Selfie contest / <institution>); a small thumbnail is kept in the sheet so the list opens instantly.
import { route } from '../lib/router.js';
import { log } from '../lib/db.js';
import { driveUpload, driveDelete } from '../lib/drive.js';
import { featureMap } from '../lib/features.js';
import { HttpError, bad, nowIso, str, reqStr, phone, emailOk, token } from '../lib/util.js';
import { imageResponse, thumbResponse } from './gallery.js';

const OPS = ['super_admin', 'admin'];
export const SELFIE_MAX_PHOTOS = 5, MAX_BYTES = 6 * 1024 * 1024, STATUSES = ['new', 'shortlisted', 'top3', 'rejected'];
const slog = (ctx, a, d) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, a, d, ctx.ip);
const safe = s => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Unnamed';
const isOpen = async db => !!(await featureMap(db)).public.selfie;

route('GET', '/api/public/selfie', null, async ctx => {
  if (!(await isOpen(ctx.db))) return { open: false, institutions: [], max_photos: SELFIE_MAX_PHOTOS };
  const rows = await ctx.db.all("SELECT id,name,COALESCE(kind,'college') kind FROM colleges WHERE active=1 ORDER BY name");
  return { open: true, institutions: rows, max_photos: SELFIE_MAX_PHOTOS };
});

// 1. the entry itself; the reply carries a key that lets the same browser add the pictures
route('POST', '/api/public/selfie', null, async ctx => {
  if (!(await isOpen(ctx.db))) throw new HttpError(403, 'Selfie contest entries are closed right now.');
  await ctx.throttle(`sf:${ctx.ip}`, 12, 3600000);
  ctx.db.deferred = true;
  const b = ctx.body;
  if (b.website) throw bad('Could not accept this entry');                       // hidden field only robots fill in
  if (b.consent !== true && b.consent !== 'on') throw bad('Please tick the box to confirm the selfie is yours and may be shown');
  const name = reqStr(b.name, 'Your name', 100).replace(/\s+/g, ' ');
  let college = null, institution = '';
  if (b.college_id) {
    college = await ctx.db.get('SELECT id,name FROM colleges WHERE id=? AND active=1', Number(b.college_id));
    if (!college) throw bad('Choose your college or school from the list');
    institution = college.name;
  } else institution = reqStr(b.institution, 'Your college or school', 160).replace(/\s+/g, ' ');
  const key = token(16);
  const id = await ctx.db.insert('INSERT INTO selfie_entries(name,college_id,institution,course,phone,email,caption,status,rank,key,created_at,ip) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    name, college ? college.id : null, institution, str(b.course, 80), phone(b.phone, 'Your mobile number'), b.email ? emailOk(b.email, 'Email').toLowerCase() : '', str(b.caption, 400), 'new', 0, key, nowIso(), ctx.ip);
  await log(ctx.db, 'public', name, null, 'selfie_entry', institution, ctx.ip);
  return { ok: true, id, key };
});
// 2. one picture at a time (each is resized in the browser first)
route('POST', '/api/public/selfie/:id/photo', null, async ctx => {
  if (!(await isOpen(ctx.db))) throw new HttpError(403, 'Selfie contest entries are closed right now.');
  await ctx.throttle(`sfp:${ctx.ip}`, 60, 3600000);
  ctx.db.deferred = true;
  const b = ctx.body, e = await ctx.db.get('SELECT * FROM selfie_entries WHERE id=?', Number(ctx.params.id));
  if (!e || !e.key || e.key !== String(b.key || '')) throw new HttpError(403, 'This entry cannot take more pictures');
  if (!/^image\/(jpeg|png|webp)$/.test(b.mime || '')) throw bad('Each picture must be a JPG, PNG or WebP image');
  const data = String(b.data || '');
  if (!data || data.length * 0.75 > MAX_BYTES) throw bad('That picture is too large. Try again with a smaller one.');
  if (!/^[A-Za-z0-9+/=]+$/.test(data.slice(0, 200))) throw bad('That picture could not be read');
  if ((await ctx.db.get('SELECT COUNT(*) n FROM selfie_photos WHERE entry_id=?', e.id)).n >= SELFIE_MAX_PHOTOS) throw bad(`You can add up to ${SELFIE_MAX_PHOTOS} pictures to one entry`);
  const ext = b.mime.split('/')[1].replace('jpeg', 'jpg'), n = Date.now();
  const up = await driveUpload(ctx.env, { name: `${safe(e.name)}_${n}.${ext}`, mime: b.mime, data, folder: `Selfie contest/${safe(e.institution)}` });
  const id = await ctx.db.insert('INSERT INTO selfie_photos(entry_id,drive_id,mime,size,orientation,thumb,created_at) VALUES (?,?,?,?,?,?,?)',
    e.id, up.id, b.mime, Math.round(data.length * 0.75), b.orientation === 'portrait' ? 'portrait' : 'landscape', /^[A-Za-z0-9+/=]+$/.test(String(b.thumb || '')) && String(b.thumb).length <= 42000 ? String(b.thumb) : null, nowIso());
  return { ok: true, id };
});
// an entry that ended up without pictures (the connection dropped) is withdrawn by the same browser
route('POST', '/api/public/selfie/:id/discard', null, async ctx => {
  const e = await ctx.db.get('SELECT * FROM selfie_entries WHERE id=?', Number(ctx.params.id));
  if (!e || !e.key || e.key !== String(ctx.body.key || '')) throw new HttpError(403, 'Not allowed');
  if ((await ctx.db.get('SELECT COUNT(*) n FROM selfie_photos WHERE entry_id=?', e.id)).n) return { ok: true, kept: true };
  await ctx.db.run('DELETE FROM selfie_entries WHERE id=?', e.id);
  return { ok: true };
});

// ---------- staff: look through the entries ----------
route('GET', '/api/staff/selfie', 'staff', async ctx => {
  const [entries, photos] = await Promise.all([
    ctx.db.all('SELECT id,name,college_id,institution,course,phone,email,caption,status,rank,note,created_at FROM selfie_entries ORDER BY id DESC LIMIT 1500'),
    ctx.db.all('SELECT id,entry_id,orientation,size FROM selfie_photos ORDER BY id LIMIT 8000')]);
  const by = new Map(); for (const p of photos) { if (!by.has(p.entry_id)) by.set(p.entry_id, []); by.get(p.entry_id).push(p); }
  return { entries: entries.map(e => ({ ...e, photos: by.get(e.id) || [] })).filter(e => e.photos.length), open: await isOpen(ctx.db) };
});
async function photoRow(ctx) {
  const p = await ctx.db.get('SELECT * FROM selfie_photos WHERE id=?', Number(ctx.params.id));
  if (!p) throw new HttpError(404, 'Photo not found');
  return p;
}
route('GET', '/api/staff/selfie/photo/:id/image', 'staff', async ctx => imageResponse(ctx, await photoRow(ctx), 'private'));
route('GET', '/api/staff/selfie/photo/:id/thumb', 'staff', async ctx => thumbResponse(ctx, await photoRow(ctx), 'private'));
route('POST', '/api/staff/selfie/:id', OPS, async ctx => {
  const e = await ctx.db.get('SELECT id,name FROM selfie_entries WHERE id=?', Number(ctx.params.id));
  if (!e) throw new HttpError(404, 'Entry not found');
  const status = STATUSES.includes(ctx.body.status) ? ctx.body.status : null;
  if (!status) throw bad('Choose a status');
  await ctx.db.run('UPDATE selfie_entries SET status=?,note=? WHERE id=?', status, str(ctx.body.note, 300), e.id);
  await slog(ctx, 'selfie_status', `${e.name}: ${status}`);
  return { ok: true };
});
route('DELETE', '/api/staff/selfie/:id', OPS, async ctx => {
  const e = await ctx.db.get('SELECT id,name FROM selfie_entries WHERE id=?', Number(ctx.params.id));
  if (!e) throw new HttpError(404, 'Entry not found');
  const ps = await ctx.db.all('SELECT drive_id FROM selfie_photos WHERE entry_id=?', e.id);
  await ctx.db.run('DELETE FROM selfie_photos WHERE entry_id=?', e.id); await ctx.db.run('DELETE FROM selfie_entries WHERE id=?', e.id);
  for (const p of ps) if (p.drive_id) ctx.waitUntil(driveDelete(ctx.env, p.drive_id).catch(() => {}));
  await slog(ctx, 'selfie_delete', e.name);
  return { ok: true };
});
