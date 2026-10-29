// Announcements, the resource centre and the college issue desk.
import { route, whoIs, assertCollege, scopeOf } from '../lib/router.js';
import { log } from '../lib/db.js';
import { driveUpload, driveGet, driveDelete, driveConfigured } from '../lib/drive.js';
import { HttpError, bad, nowIso, todayStr, str, reqStr, isDate } from '../lib/util.js';
import { featureMap } from '../lib/features.js';

const OPS = ['super_admin', 'admin'];
const slog = (ctx, action, detail) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, action, detail, ctx.ip);

// ---------------- announcements ----------------
const AUDIENCES = ['all', 'colleges', 'officers'];
route('GET', '/api/announcements', null, async ctx => {
  const who = await whoIs(ctx), today = todayStr();
  const rows = await ctx.db.all('SELECT * FROM announcements ORDER BY pinned DESC, id DESC LIMIT 200');
  if (who === 'staff') return rows.map(r => ({ ...r, expired: !!r.expires_on && r.expires_on < today }));
  const ok = r => (!r.expires_on || r.expires_on >= today) && (r.audience === 'all' || (r.audience === 'colleges' && who === 'college') || (r.audience === 'officers' && who === 'officer'));
  return rows.filter(ok).map(({ id, title, body, audience, pinned, created_at, expires_on }) => ({ id, title, body, audience, pinned, created_at, expires_on }));
});
function announcementBody(b) {
  const audience = AUDIENCES.includes(b.audience) ? b.audience : 'all';
  const expires = str(b.expires_on, 10);
  if (expires && !isDate(expires)) throw bad('Choose a valid "show until" date, or leave it empty');
  return { title: reqStr(b.title, 'Title', 140), body: str(b.body, 2000), audience, pinned: b.pinned ? 1 : 0, expires_on: expires || null };
}
route('POST', '/api/staff/announcements', OPS, async ctx => {
  const o = announcementBody(ctx.body);
  const id = await ctx.db.insert('INSERT INTO announcements(title,body,audience,pinned,created_by,created_at,expires_on) VALUES (?,?,?,?,?,?,?)', o.title, o.body, o.audience, o.pinned, ctx.user.username, nowIso(), o.expires_on);
  await slog(ctx, 'announce', o.title);
  return { ok: true, id };
});
route('PUT', '/api/staff/announcements/:id', OPS, async ctx => {
  const o = announcementBody(ctx.body);
  const r = await ctx.db.run('UPDATE announcements SET title=?,body=?,audience=?,pinned=?,expires_on=? WHERE id=?', o.title, o.body, o.audience, o.pinned, o.expires_on, Number(ctx.params.id));
  if (!r.changes) throw new HttpError(404, 'Announcement not found');
  await slog(ctx, 'announce_edit', o.title);
  return { ok: true };
});
route('DELETE', '/api/staff/announcements/:id', OPS, async ctx => {
  const r = await ctx.db.run('DELETE FROM announcements WHERE id=?', Number(ctx.params.id));
  if (!r.changes) throw new HttpError(404, 'Announcement not found');
  await slog(ctx, 'announce_delete', '#' + ctx.params.id);
  return { ok: true };
});

// ---------------- resource centre ----------------
const RES_AUDIENCES = ['public', 'colleges', 'officers', 'staff'];
const ALLOWED = /\.(pdf|docx?|xlsx?|pptx?|csv|txt|png|jpe?g|webp|zip)$/i;
function canSee(who, audience) {
  return who === 'staff' || audience === 'public' || (audience === 'colleges' && who === 'college') || (audience === 'officers' && who === 'officer');
}
route('GET', '/api/resources', null, async ctx => {
  const who = await whoIs(ctx);
  const rows = await ctx.db.all('SELECT id,title,description,category,audience,kind,url,filename,mime,size,created_by,created_at FROM resources ORDER BY category,title');
  return rows.filter(r => canSee(who, r.audience)).map(r => (who === 'staff' || r.kind === 'file' ? r : r)).map(r => ({ ...r, url: r.kind === 'link' ? r.url : null }));
});
route('GET', '/api/resources/:id/download', null, async ctx => {
  const who = await whoIs(ctx);
  const r = await ctx.db.get('SELECT * FROM resources WHERE id=?', Number(ctx.params.id));
  if (!r || !canSee(who, r.audience)) throw new HttpError(404, 'File not found');
  if (r.kind !== 'file') throw bad('This resource is a link');
  const f = await driveGet(ctx.env, r.drive_id);
  const bytes = Uint8Array.from(atob(f.data), ch => ch.charCodeAt(0));
  return { __raw: true, bytes, headers: { 'Content-Type': r.mime || f.mime || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${(r.filename || 'file').replace(/[^\w.\- ]/g, '_')}"`, 'Cache-Control': 'private, max-age=300' } };
});
route('POST', '/api/staff/resources', OPS, async ctx => {
  const b = ctx.body, kind = b.kind === 'link' ? 'link' : 'file';
  const base = { title: reqStr(b.title, 'Title', 140), description: str(b.description, 500), category: str(b.category, 40) || 'General', audience: RES_AUDIENCES.includes(b.audience) ? b.audience : 'colleges' };
  let url = null, driveId = null, filename = null, mime = null, size = null;
  if (kind === 'link') {
    url = reqStr(b.url, 'Link', 500);
    if (!/^https:\/\//i.test(url)) throw bad('The link must start with https://');
  } else {
    if (!driveConfigured(ctx.env)) throw new HttpError(503, 'File storage is not connected (Google Drive). You can add a link instead.');
    filename = reqStr(b.filename, 'File', 120);
    if (!ALLOWED.test(filename)) throw bad('Allowed files: PDF, Word, Excel, PowerPoint, CSV, text, images and ZIP');
    const data = String(b.data || '');
    size = Math.round(data.length * 0.75);
    if (!data || size > 5 * 1024 * 1024) throw bad('Files can be up to 5 MB');
    mime = str(b.mime, 100) || 'application/octet-stream';
    driveId = (await driveUpload(ctx.env, { name: filename, mime, data, folder: 'Resources' })).id;
  }
  const id = await ctx.db.insert('INSERT INTO resources(title,description,category,audience,kind,url,drive_id,filename,mime,size,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    base.title, base.description, base.category, base.audience, kind, url, driveId, filename, mime, size, ctx.user.username, nowIso());
  await slog(ctx, 'resource_add', base.title);
  return { ok: true, id };
});
route('PUT', '/api/staff/resources/:id', OPS, async ctx => {
  const b = ctx.body;
  const r = await ctx.db.run('UPDATE resources SET title=?,description=?,category=?,audience=? WHERE id=?', reqStr(b.title, 'Title', 140), str(b.description, 500), str(b.category, 40) || 'General',
    RES_AUDIENCES.includes(b.audience) ? b.audience : 'colleges', Number(ctx.params.id));
  if (!r.changes) throw new HttpError(404, 'Resource not found');
  await slog(ctx, 'resource_edit', '#' + ctx.params.id);
  return { ok: true };
});
route('DELETE', '/api/staff/resources/:id', OPS, async ctx => {
  const r = await ctx.db.get('SELECT * FROM resources WHERE id=?', Number(ctx.params.id));
  if (!r) throw new HttpError(404, 'Resource not found');
  await ctx.db.run('DELETE FROM resources WHERE id=?', r.id);
  if (r.drive_id) ctx.waitUntil(driveDelete(ctx.env, r.drive_id).catch(() => {}));
  await slog(ctx, 'resource_delete', r.title);
  return { ok: true };
});

// ---------------- issues raised by colleges ----------------
// campaign topics; the village topics return only if the village programme is switched back on
const CAMPAIGN_CATEGORIES = ['Enrolment numbers', 'Help desk or volunteers', 'Photos or gallery', 'Login or password', 'Portal / technical problem', 'Other'];
const VILLAGE_CATEGORIES = ['Village allotment', 'Attendance or data correction', 'Village officer'];
async function categories(db) {
  const f = await featureMap(db), village = f.college.villages;
  return village ? [...CAMPAIGN_CATEGORIES.slice(0, -1), ...VILLAGE_CATEGORIES, 'Other'] : CAMPAIGN_CATEGORIES;
}
route('GET', '/api/issue-categories', null, ctx => categories(ctx.db));
route('POST', '/api/college/issues', 'college', async ctx => {
  const b = ctx.body, now = nowIso();
  const category = (await categories(ctx.db)).includes(b.category) ? b.category : 'Other';
  const id = await ctx.db.insert('INSERT INTO issues(college_id,category,subject,message,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
    ctx.college.id, category, reqStr(b.subject, 'Subject', 140), reqStr(b.message, 'Please describe the issue', 2000), 'open', now, now);
  await log(ctx.db, 'college', ctx.college.name, null, 'issue_raise', category, ctx.ip);
  return { ok: true, id };
});
route('GET', '/api/college/issues', 'college', ctx => ctx.db.all('SELECT id,category,subject,message,status,staff_reply,replied_by,replied_at,created_at,updated_at FROM issues WHERE college_id=? ORDER BY id DESC', ctx.college.id));

route('GET', '/api/staff/issues', 'staff', async ctx => {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all(`SELECT i.*,c.name college,c.phone college_phone,c.email college_email FROM issues i JOIN colleges c ON c.id=i.college_id ORDER BY (i.status='resolved') ASC, i.id DESC LIMIT 500`);
  return rows.filter(r => !s || s.colleges.has(r.college_id));
});
route('POST', '/api/staff/issues/:id', 'staff', async ctx => {
  const i = await ctx.db.get('SELECT * FROM issues WHERE id=?', Number(ctx.params.id));
  if (!i) throw new HttpError(404, 'Issue not found');
  await assertCollege(ctx, i.college_id);
  const status = ['open', 'in_progress', 'resolved'].includes(ctx.body.status) ? ctx.body.status : i.status;
  const reply = str(ctx.body.reply, 2000);
  await ctx.db.run('UPDATE issues SET status=?,staff_reply=?,replied_by=?,replied_at=?,updated_at=? WHERE id=?', status, reply || i.staff_reply, reply ? ctx.user.username : i.replied_by, reply ? nowIso() : i.replied_at, nowIso(), i.id);
  await slog(ctx, 'issue_update', `#${i.id} → ${status}`);
  return { ok: true };
});
