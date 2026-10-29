// Gallery: framed event photos made with the photo-frame editor. Files live in Google Drive:
//   <College or school name> / <Activity> /            first event of an activity
//   <College or school name> / <Activity> / <date> /   when the same activity is held again
import { route, scopeOf } from '../lib/router.js';
import { log } from '../lib/db.js';
import { driveUpload, driveGet, driveDelete } from '../lib/drive.js';
import { featureMap } from '../lib/features.js';
import { HttpError, bad, isDate, todayStr, nowIso, str, reqStr } from '../lib/util.js';

export const GALLERY_ACTIVITIES = ['Help desk', 'Flash Mob', 'Class to Class Campaign', 'Game Zone', 'Awareness rally', 'Other'];
const MAX_BYTES = 6 * 1024 * 1024;
const clog = (ctx, action, detail) => log(ctx.db, 'college', ctx.college.name, null, action, detail, ctx.ip);
const slog = (ctx, action, detail) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, action, detail, ctx.ip);
const safe = s => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Unnamed';

async function imageResponse(ctx, row, scope) {
  const f = await driveGet(ctx.env, row.drive_id);
  const bytes = Uint8Array.from(atob(f.data), ch => ch.charCodeAt(0));
  return { __raw: true, bytes, headers: { 'Content-Type': row.mime || f.mime || 'image/jpeg', 'Cache-Control': scope === 'public' ? 'public, max-age=86400' : 'private, max-age=3600' } };
}
const LIST = 'id,title,description,activity,event_date,orientation,visible,created_at';

// ---------- the college's gallery ----------
route('GET', '/api/college/gallery', 'college', async ctx => ({
  items: await ctx.db.all(`SELECT ${LIST} FROM gallery WHERE college_id=? ORDER BY id DESC`, ctx.college.id),
  activities: GALLERY_ACTIVITIES, today: todayStr(), institution: ctx.college.name,
}));
route('POST', '/api/college/gallery', 'college', async ctx => {
  const b = ctx.body, c = ctx.college;
  if (!/^image\/(jpeg|png|webp)$/.test(b.mime || '')) throw bad('The picture must be a JPG, PNG or WebP image');
  const data = String(b.data || '');
  if (!data || data.length * 0.75 > MAX_BYTES) throw bad('The picture is too large. Try again with a smaller photo.');
  const title = reqStr(b.title, 'Please give the event a short title', 100), description = str(b.description, 500);
  const activity = b.activity === 'Other' ? safe(reqStr(b.activity_other, 'Please say which activity', 60)) : (GALLERY_ACTIVITIES.includes(b.activity) ? b.activity : null);
  if (!activity) throw bad('Choose the activity');
  const date = isDate(b.event_date) && b.event_date <= todayStr() ? b.event_date : todayStr();
  const orientation = b.orientation === 'portrait' ? 'portrait' : 'landscape';
  const earlier = await ctx.db.get('SELECT 1 x FROM gallery WHERE college_id=? AND activity=? AND COALESCE(event_date,\'\')<>?', c.id, activity, date);
  const folder = `${safe(c.name)}/${safe(activity)}${earlier ? '/' + date : ''}`;
  const ext = b.mime.split('/')[1].replace('jpeg', 'jpg');
  const up = await driveUpload(ctx.env, { name: `${date}_${safe(title).slice(0, 40)}_${Date.now()}.${ext}`, mime: b.mime, data, folder });
  const id = await ctx.db.insert('INSERT INTO gallery(college_id,title,description,activity,event_date,drive_id,mime,size,orientation,visible,created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?)',
    c.id, title, description, activity, date, up.id, b.mime, Math.round(data.length * 0.75), orientation, nowIso());
  await clog(ctx, 'gallery_add', `${activity}: ${title}`);
  return { ok: true, id, folder };
});
route('GET', '/api/college/gallery/:id/image', 'college', async ctx => {
  const g = await ctx.db.get('SELECT * FROM gallery WHERE id=? AND college_id=?', Number(ctx.params.id), ctx.college.id);
  if (!g) throw new HttpError(404, 'Photo not found');
  return imageResponse(ctx, g, 'private');
});
route('DELETE', '/api/college/gallery/:id', 'college', async ctx => {
  const g = await ctx.db.get('SELECT * FROM gallery WHERE id=? AND college_id=?', Number(ctx.params.id), ctx.college.id);
  if (!g) throw new HttpError(404, 'Photo not found');
  await ctx.db.run('DELETE FROM gallery WHERE id=?', g.id);
  ctx.waitUntil(driveDelete(ctx.env, g.drive_id).catch(() => {}));
  await clog(ctx, 'gallery_delete', g.title);
  return { ok: true };
});

// ---------- public album on the home page ----------
async function albumOn(ctx) { if (!(await featureMap(ctx.db)).public.album) throw new HttpError(404, 'Not available'); }
route('GET', '/api/public/album', null, async ctx => {
  await albumOn(ctx);
  return ctx.db.all(`SELECT g.id,g.title,g.activity,g.event_date,g.orientation,c.name college FROM gallery g JOIN colleges c ON c.id=g.college_id AND c.active=1 WHERE g.visible=1 ORDER BY g.id DESC LIMIT 40`);
});
route('GET', '/api/public/album/:id/image', null, async ctx => {
  await albumOn(ctx);
  const g = await ctx.db.get('SELECT g.* FROM gallery g JOIN colleges c ON c.id=g.college_id AND c.active=1 WHERE g.id=? AND g.visible=1', Number(ctx.params.id));
  if (!g) throw new HttpError(404, 'Photo not found');
  return imageResponse(ctx, g, 'public');
});

// ---------- staff moderation ----------
route('GET', '/api/staff/gallery', 'staff', async ctx => {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all(`SELECT g.id,g.college_id,g.title,g.description,g.activity,g.event_date,g.orientation,g.visible,g.created_at,c.name college FROM gallery g JOIN colleges c ON c.id=g.college_id ORDER BY g.id DESC LIMIT 300`);
  return rows.filter(r => !s || s.colleges.has(r.college_id));
});
route('GET', '/api/staff/gallery/:id/image', 'staff', async ctx => {
  const g = await ctx.db.get('SELECT * FROM gallery WHERE id=?', Number(ctx.params.id));
  if (!g) throw new HttpError(404, 'Photo not found');
  return imageResponse(ctx, g, 'private');
});
route('POST', '/api/staff/gallery/:id/visible', ['super_admin', 'admin'], async ctx => {
  const r = await ctx.db.run('UPDATE gallery SET visible=? WHERE id=?', ctx.body.visible ? 1 : 0, Number(ctx.params.id));
  if (!r.changes) throw new HttpError(404, 'Photo not found');
  await slog(ctx, ctx.body.visible ? 'gallery_show' : 'gallery_hide', '#' + ctx.params.id);
  return { ok: true };
});
route('DELETE', '/api/staff/gallery/:id', ['super_admin', 'admin'], async ctx => {
  const g = await ctx.db.get('SELECT * FROM gallery WHERE id=?', Number(ctx.params.id));
  if (!g) throw new HttpError(404, 'Photo not found');
  await ctx.db.run('DELETE FROM gallery WHERE id=?', g.id);
  ctx.waitUntil(driveDelete(ctx.env, g.drive_id).catch(() => {}));
  await slog(ctx, 'gallery_delete', g.title);
  return { ok: true };
});
