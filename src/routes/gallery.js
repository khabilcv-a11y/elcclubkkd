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

// Drive is slow (a second or more per picture), so pictures already fetched are kept in memory and small thumbnails live in the sheet itself.
const imgCache = new Map(), inflight = new Map(); let imgBytes = 0;
const IMG_CACHE_MAX = 24 * 1024 * 1024;
async function driveBytes(env, driveId, mime) {
  const hit = imgCache.get(driveId);
  if (hit) { imgCache.delete(driveId); imgCache.set(driveId, hit); return hit; }
  if (!inflight.has(driveId)) inflight.set(driveId, (async () => {
    const f = await driveGet(env, driveId), bytes = Uint8Array.from(atob(f.data), ch => ch.charCodeAt(0)), rec = { bytes, mime: mime || f.mime };
    imgCache.set(driveId, rec); imgBytes += bytes.length;
    for (const [k, v] of imgCache) { if (imgBytes <= IMG_CACHE_MAX) break; imgCache.delete(k); imgBytes -= v.bytes.length; }
    return rec;
  })().finally(() => inflight.delete(driveId)));
  return inflight.get(driveId);
}
const extGo = (row, size) => ({ __raw: true, status: 302, headers: { Location: row.ext_url.replace('{s}', size), 'Cache-Control': 'public, max-age=86400' } });
export async function imageResponse(ctx, row, scope) {
  if (row.ext_url) return extGo(row, 'xlarge');
  const rec = await driveBytes(ctx.env, row.drive_id, row.mime);
  return { __raw: true, bytes: rec.bytes, headers: { 'Content-Type': row.mime || rec.mime || 'image/jpeg', 'Cache-Control': scope === 'public' ? 'public, max-age=604800, immutable' : 'private, max-age=86400, immutable' } };
}
export async function thumbResponse(ctx, row, scope) {
  if (row.ext_url) return extGo(row, 'large');
  if (!row.thumb) return imageResponse(ctx, row, scope);          // photos saved before thumbnails existed
  return { __raw: true, bytes: Uint8Array.from(atob(row.thumb), ch => ch.charCodeAt(0)), headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': scope === 'public' ? 'public, max-age=604800, immutable' : 'private, max-age=604800, immutable' } };
}
const LIST = 'id,album_id,title,description,activity,event_date,orientation,visible,created_at';

// ---------- the college's gallery ----------
route('GET', '/api/college/gallery', 'college', async ctx => ({
  items: await ctx.db.all(`SELECT ${LIST} FROM gallery WHERE college_id=? ORDER BY id DESC`, ctx.college.id),
  activities: GALLERY_ACTIVITIES, today: todayStr(), institution: ctx.college.name,
}));
route('POST', '/api/college/gallery', 'college', async ctx => {
  ctx.db.deferred = true;
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
  const id = await ctx.db.insert('INSERT INTO gallery(college_id,title,description,activity,event_date,drive_id,mime,size,orientation,visible,created_at,thumb) VALUES (?,?,?,?,?,?,?,?,?,1,?,?)',
    c.id, title, description, activity, date, up.id, b.mime, Math.round(data.length * 0.75), orientation, nowIso(), /^[A-Za-z0-9+/=]+$/.test(String(b.thumb || '')) && String(b.thumb).length <= 42000 ? String(b.thumb) : null);
  await clog(ctx, 'gallery_add', `${activity}: ${title}`);
  return { ok: true, id, folder };
});
route('GET', '/api/college/gallery/:id/image', 'college', async ctx => {
  const g = await ctx.db.get('SELECT * FROM gallery WHERE id=? AND college_id=?', Number(ctx.params.id), ctx.college.id);
  if (!g) throw new HttpError(404, 'Photo not found');
  return imageResponse(ctx, g, 'private');
});
route('GET', '/api/college/gallery/:id/thumb', 'college', async ctx => {
  const g = await ctx.db.get('SELECT * FROM gallery WHERE id=? AND college_id=?', Number(ctx.params.id), ctx.college.id);
  if (!g) throw new HttpError(404, 'Photo not found');
  return thumbResponse(ctx, g, 'private');
});
route('DELETE', '/api/college/gallery/:id', 'college', async ctx => {
  ctx.db.deferred = true;
  const g = await ctx.db.get('SELECT * FROM gallery WHERE id=? AND college_id=?', Number(ctx.params.id), ctx.college.id);
  if (!g) throw new HttpError(404, 'Photo not found');
  await ctx.db.run('DELETE FROM gallery WHERE id=?', g.id);
  ctx.waitUntil(driveDelete(ctx.env, g.drive_id).catch(() => {}));
  await clog(ctx, 'gallery_delete', g.title);
  return { ok: true };
});


// ---------- public: home page album and the gallery page ----------
// A photo is public when it is switched on and its institution is active (photos uploaded by the district office have no institution).
const PUBLIC_FROM = `FROM gallery g LEFT JOIN colleges c ON c.id=g.college_id LEFT JOIN gallery_albums a ON a.id=g.album_id WHERE g.visible=1 AND (g.college_id IS NULL OR c.active=1)`;
const PUBLIC_COLS = `g.ext_url,g.description,g.id,g.title,g.activity,g.event_date,g.orientation,g.album_id,g.college_id,c.logo_at logo_v,COALESCE(c.name,'District Election Office') college,a.title album`;
// photos from the district administration (added by the office) come before those of colleges and schools
const DISTRICT_FIRST = 'CASE WHEN g.college_id IS NULL THEN 0 ELSE 1 END';
async function albumOn(ctx) { if (!(await featureMap(ctx.db)).public.album) throw new HttpError(404, 'Not available'); }
route('GET', '/api/public/album', null, async ctx => {
  await albumOn(ctx);
  // the home page shows the running campaign; the office can also put a photo from a "previous works" album there
  // the district office's photos and the colleges' and schools' photos are fetched separately so neither crowds out the other
  const w = `SELECT ${PUBLIC_COLS} ${PUBLIC_FROM} AND (g.album_id IS NULL OR a.current=1 OR g.home=1)`, lim = ctx.query.all ? 300 : 40;
  const [office, inst] = await Promise.all([ctx.db.all(`${w} AND g.college_id IS NULL ORDER BY g.id DESC LIMIT ${lim}`), ctx.db.all(`${w} AND g.college_id IS NOT NULL ORDER BY g.id DESC LIMIT ${lim}`)]);
  return [...office, ...inst];
});
async function publicPhoto(ctx) {
  await albumOn(ctx);
  const g = await ctx.db.get(`SELECT g.* ${PUBLIC_FROM} AND g.id=?`, Number(ctx.params.id));
  if (!g) throw new HttpError(404, 'Photo not found');
  return g;
}
route('GET', '/api/public/album/:id/image', null, async ctx => imageResponse(ctx, await publicPhoto(ctx), 'public'));
route('GET', '/api/public/album/:id/thumb', null, async ctx => thumbResponse(ctx, await publicPhoto(ctx), 'public'));

// the gallery page: the running campaign (highlighted) and the albums of previous works
route('GET', '/api/public/gallery', null, async ctx => {
  await albumOn(ctx);
  const [current, albums, counts] = await Promise.all([
    ctx.db.all(`SELECT ${PUBLIC_COLS} ${PUBLIC_FROM} AND (g.album_id IS NULL OR a.current=1) ORDER BY ${DISTRICT_FIRST}, g.id DESC LIMIT 300`),
    ctx.db.all('SELECT id,title,description,current,sort_order FROM gallery_albums ORDER BY sort_order,id DESC'),
    ctx.db.all(`SELECT g.album_id,COUNT(*) n,MAX(g.id) cover,MAX(g.event_date) last ${PUBLIC_FROM} AND g.album_id IS NOT NULL GROUP BY g.album_id`)]);
  const cnt = new Map(counts.map(r => [r.album_id, r])), ext = new Map((await ctx.db.all(`SELECT id,ext_url FROM gallery WHERE id IN (${counts.map(r => Number(r.cover)).join(',') || 0}) AND ext_url IS NOT NULL`)).map(r => [r.id, r.ext_url]));
  return {
    current,
    albums: albums.filter(a => cnt.has(a.id)).map(a => ({ ...a, count: cnt.get(a.id).n, last: cnt.get(a.id).last || '', cover: cnt.get(a.id).cover, cover_ext: ext.get(cnt.get(a.id).cover) || null })),
    stats: { photos: current.length, institutions: new Set(current.filter(x => x.college_id).map(x => x.college_id)).size },
  };
});
// The photo wall: every public photo as one endless stream, newest or featured first, searchable, shuffle-able and paged.
// "Featured" puts the district administration's photos of the running campaign first, then colleges and schools, then the earlier albums.
const WALL_SORTS = {
  featured: "CASE WHEN (g.album_id IS NULL OR a.current=1) THEN (CASE WHEN g.college_id IS NULL THEN 0 ELSE 1 END) ELSE 2 END, COALESCE(g.event_date,'') DESC, g.id DESC",
  newest: "CASE WHEN g.event_date IS NULL THEN 1 ELSE 0 END, g.event_date DESC, g.id DESC",
  oldest: "CASE WHEN g.event_date IS NULL THEN 1 ELSE 0 END, g.event_date ASC, g.id ASC",
};
route('GET', '/api/public/gallery/wall', null, async ctx => {
  await albumOn(ctx);
  const q = String(ctx.query.q || '').trim().toLowerCase().slice(0, 60), off = Math.max(0, Number(ctx.query.offset) || 0), lim = Math.min(80, Math.max(1, Number(ctx.query.limit) || 60));
  const where = q ? " AND (lower(g.title) LIKE ? OR lower(COALESCE(g.activity,'')) LIKE ? OR lower(COALESCE(c.name,'District Election Office')) LIKE ? OR lower(COALESCE(a.title,'')) LIKE ?)" : '', args = q ? Array(4).fill('%' + q + '%') : [];
  const seed = Math.max(1, Math.min(99999, Number(ctx.query.seed) || 1));
  const order = ctx.query.sort === 'shuffle' ? `((g.id % 1000003) * ${seed}) % 1000033, g.id` : (WALL_SORTS[ctx.query.sort] || WALL_SORTS.featured);
  const [total, photos] = await Promise.all([ctx.db.get(`SELECT COUNT(*) n ${PUBLIC_FROM}${where}`, ...args), ctx.db.all(`SELECT ${PUBLIC_COLS} ${PUBLIC_FROM}${where} ORDER BY ${order} LIMIT ${lim} OFFSET ${off}`, ...args)]);
  return { total: total.n, photos };
});
route('GET', '/api/public/gallery/photo/:id', null, async ctx => {
  await albumOn(ctx);
  const g = await ctx.db.get(`SELECT ${PUBLIC_COLS} ${PUBLIC_FROM} AND g.id=?`, Number(ctx.params.id));
  if (!g) throw new HttpError(404, 'Photo not found');
  return g;
});
route('GET', '/api/public/gallery/album/:id', null, async ctx => {
  await albumOn(ctx);
  const a = await ctx.db.get('SELECT id,title,description,current FROM gallery_albums WHERE id=?', Number(ctx.params.id));
  if (!a) throw new HttpError(404, 'Album not found');
  return { album: a, photos: await ctx.db.all(`SELECT ${PUBLIC_COLS} ${PUBLIC_FROM} AND g.album_id=? ORDER BY g.event_date DESC,g.id DESC LIMIT 400`, a.id) };
});

// ---------- staff: every photo, moderation, uploads by the office ----------
const OPS = ['super_admin', 'admin'];
route('GET', '/api/staff/gallery/:id/thumb', 'staff', async ctx => {
  const g = await ctx.db.get('SELECT * FROM gallery WHERE id=?', Number(ctx.params.id));
  if (!g) throw new HttpError(404, 'Photo not found');
  return thumbResponse(ctx, g, 'private');
});
route('GET', '/api/staff/gallery', 'staff', async ctx => {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all(`SELECT g.id,g.college_id,g.album_id,g.title,g.description,g.activity,g.event_date,g.orientation,g.visible,g.home,g.by_staff,g.created_at,g.ext_url,COALESCE(c.name,'District Election Office') college FROM gallery g LEFT JOIN colleges c ON c.id=g.college_id ORDER BY g.id DESC LIMIT 400`);
  return rows.filter(r => !s || (r.college_id && s.colleges.has(r.college_id)));
});
route('GET', '/api/staff/gallery/:id/image', 'staff', async ctx => {
  const g = await ctx.db.get('SELECT * FROM gallery WHERE id=?', Number(ctx.params.id));
  if (!g) throw new HttpError(404, 'Photo not found');
  return imageResponse(ctx, g, 'private');
});
route('POST', '/api/staff/gallery/:id/visible', OPS, async ctx => {
  const r = await ctx.db.run('UPDATE gallery SET visible=? WHERE id=?', ctx.body.visible ? 1 : 0, Number(ctx.params.id));
  if (!r.changes) throw new HttpError(404, 'Photo not found');
  await slog(ctx, ctx.body.visible ? 'gallery_show' : 'gallery_hide', '#' + ctx.params.id);
  return { ok: true };
});
route('POST', '/api/staff/gallery/:id/album', OPS, async ctx => {
  const aid = ctx.body.album_id ? Number(ctx.body.album_id) : null;
  if (aid && !(await ctx.db.get('SELECT 1 x FROM gallery_albums WHERE id=?', aid))) throw bad('Choose an album');
  const r = await ctx.db.run('UPDATE gallery SET album_id=?,home=? WHERE id=?', aid, ctx.body.home ? 1 : 0, Number(ctx.params.id));
  if (!r.changes) throw new HttpError(404, 'Photo not found');
  await slog(ctx, 'gallery_move', `#${ctx.params.id} to ${aid ? 'album ' + aid : 'the current campaign'}`);
  return { ok: true };
});
// admins and super admins add photos; photos added this way count as the district administration's and are shown first
route('POST', '/api/staff/gallery', OPS, async ctx => {
  const b = ctx.body;
  if (!/^image\/(jpeg|png|webp)$/.test(b.mime || '')) throw bad('The picture must be a JPG, PNG or WebP image');
  const data = String(b.data || '');
  if (!data || data.length * 0.75 > MAX_BYTES) throw bad('The picture is too large. Try again with a smaller photo.');
  const title = reqStr(b.title, 'Please give the photo a title', 100), description = str(b.description, 500), activity = str(b.activity, 60);
  const aid = b.album_id ? Number(b.album_id) : null, album = aid ? await ctx.db.get('SELECT * FROM gallery_albums WHERE id=?', aid) : null;
  if (aid && !album) throw bad('Choose an album');
  const date = isDate(b.event_date) && b.event_date <= todayStr() ? b.event_date : todayStr();
  const folder = `Gallery/${safe(album ? album.title : 'Current campaign')}`, ext = b.mime.split('/')[1].replace('jpeg', 'jpg');
  const up = await driveUpload(ctx.env, { name: `${date}_${safe(title).slice(0, 40)}_${Date.now()}.${ext}`, mime: b.mime, data, folder });
  const id = await ctx.db.insert('INSERT INTO gallery(college_id,title,description,activity,event_date,drive_id,mime,size,orientation,visible,created_at,thumb,album_id,by_staff,home) VALUES (NULL,?,?,?,?,?,?,?,?,1,?,?,?,?,?)',
    title, description, activity, date, up.id, b.mime, Math.round(data.length * 0.75), b.orientation === 'portrait' ? 'portrait' : 'landscape', nowIso(), /^[A-Za-z0-9+/=]+$/.test(String(b.thumb || '')) && String(b.thumb).length <= 42000 ? String(b.thumb) : null, aid, ctx.user.username, b.home ? 1 : 0);
  await slog(ctx, 'gallery_upload', `${album ? album.title : 'Current campaign'}: ${title}`);
  return { ok: true, id };
});
route('DELETE', '/api/staff/gallery/:id', OPS, async ctx => {
  const g = await ctx.db.get('SELECT * FROM gallery WHERE id=?', Number(ctx.params.id));
  if (!g) throw new HttpError(404, 'Photo not found');
  await ctx.db.run('DELETE FROM gallery WHERE id=?', g.id);
  if (g.drive_id) ctx.waitUntil(driveDelete(ctx.env, g.drive_id).catch(() => {}));
  await slog(ctx, 'gallery_delete', g.title);
  return { ok: true };
});

// albums: the titles that sort the public gallery
route('GET', '/api/staff/gallery-albums', 'staff', async ctx => {
  const [albums, counts] = await Promise.all([ctx.db.all('SELECT id,title,description,current,sort_order FROM gallery_albums ORDER BY sort_order,id DESC'), ctx.db.all('SELECT album_id,COUNT(*) n FROM gallery WHERE album_id IS NOT NULL GROUP BY album_id')]);
  const cnt = new Map(counts.map(r => [r.album_id, r.n]));
  return albums.map(a => ({ ...a, count: cnt.get(a.id) || 0 }));
});
const albumBody = b => ({ title: reqStr(b.title, 'Album title', 80), description: str(b.description, 300), current: b.current ? 1 : 0 });
route('POST', '/api/staff/gallery-albums', OPS, async ctx => {
  const o = albumBody(ctx.body);
  if (await ctx.db.get('SELECT 1 x FROM gallery_albums WHERE lower(title)=lower(?)', o.title)) throw new HttpError(409, 'An album with this title already exists');
  const id = await ctx.db.insert('INSERT INTO gallery_albums(title,description,current,sort_order,created_by,created_at) VALUES (?,?,?,?,?,?)', o.title, o.description, o.current, 0, ctx.user.username, nowIso());
  await slog(ctx, 'album_add', o.title);
  return { ok: true, id };
});
route('PUT', '/api/staff/gallery-albums/:id', OPS, async ctx => {
  const o = albumBody(ctx.body), id = Number(ctx.params.id);
  if (await ctx.db.get('SELECT 1 x FROM gallery_albums WHERE lower(title)=lower(?) AND id<>?', o.title, id)) throw new HttpError(409, 'An album with this title already exists');
  const r = await ctx.db.run('UPDATE gallery_albums SET title=?,description=?,current=? WHERE id=?', o.title, o.description, o.current, id);
  if (!r.changes) throw new HttpError(404, 'Album not found');
  await slog(ctx, 'album_edit', o.title);
  return { ok: true };
});
route('DELETE', '/api/staff/gallery-albums/:id', OPS, async ctx => {
  const id = Number(ctx.params.id), a = await ctx.db.get('SELECT * FROM gallery_albums WHERE id=?', id);
  if (!a) throw new HttpError(404, 'Album not found');
  if (await ctx.db.get('SELECT 1 x FROM gallery WHERE album_id=?', id)) {
    // an album of linked photos (imported from another site) can be removed together with them; uploaded photos must be moved or deleted first
    if (ctx.query.force === '1' && !(await ctx.db.get('SELECT 1 x FROM gallery WHERE album_id=? AND ext_url IS NULL', id))) await ctx.db.run('DELETE FROM gallery WHERE album_id=?', id);
    else throw bad('This album still has photos. Move or delete them first.');
  }
  await ctx.db.run('DELETE FROM gallery_albums WHERE id=?', id);
  await slog(ctx, 'album_delete', a.title);
  return { ok: true };
});

// Link photos that already live on a Pixieset gallery into an album. Nothing is copied: the picture is shown from images.pixieset.com
// in the sizes the page needs ({s} stands for thumb, small, medium, large, xlarge or xxlarge). Running it again skips photos already linked.
const EXT_URL = /^https:\/\/images\.pixieset\.com\/\d+\/[a-f0-9]+-\{s\}\.(jpe?g|png|webp)$/i;
route('POST', '/api/staff/gallery/import-external', OPS, async ctx => {
  const b = ctx.body, title = reqStr(b.album_title, 'Album title', 80), photos = Array.isArray(b.photos) ? b.photos.slice(0, 400) : [];
  if (!photos.length) throw bad('There are no photos to import');
  let album = await ctx.db.get('SELECT * FROM gallery_albums WHERE lower(title)=lower(?)', title), created = false;
  if (!album) { const id = await ctx.db.insert('INSERT INTO gallery_albums(title,description,current,sort_order,created_by,created_at) VALUES (?,?,?,?,?,?)', title, str(b.album_description, 300), b.current ? 1 : 0, 0, ctx.user.username, nowIso()); album = { id }; created = true; }
  const have = new Set((await ctx.db.all('SELECT src_key FROM gallery WHERE album_id=? AND src_key IS NOT NULL', album.id)).map(r => r.src_key));
  const ptitle = str(b.photo_title, 100) || title, now = nowIso(); let added = 0, skipped = 0;
  for (const p of photos) {
    const key = str(p.k, 80), url = String(p.u || '');
    if (!key || !EXT_URL.test(url) || have.has(key)) { skipped++; continue; }
    await ctx.db.insert('INSERT INTO gallery(college_id,title,description,activity,event_date,drive_id,mime,size,orientation,visible,created_at,thumb,album_id,by_staff,home,ext_url,src_key) VALUES (NULL,?,?,?,?,?,?,?,?,1,?,NULL,?,?,0,?,?)',
      ptitle, '', '', isDate(p.d) && p.d <= todayStr() ? p.d : null, '', 'image/jpeg', 0, Number(p.h) > Number(p.w) ? 'portrait' : 'landscape', now, album.id, ctx.user.username, url, key);
    have.add(key); added++;
  }
  if (added) await slog(ctx, 'gallery_import_external', `${title}: ${added} photos`);
  return { ok: true, album_id: album.id, created, added, skipped };
});
