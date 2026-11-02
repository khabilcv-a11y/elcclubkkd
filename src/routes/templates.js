// Photo frames and poster / banner templates. A template is an image plus the boxes where text (or the college logo) is placed.
//   kind 'photo'  : the college's photo goes behind the image (the image has a transparent window), text boxes sit on top
//   kind 'poster' : the image is the whole design, text boxes are filled in by the college, then downloaded as JPG or PDF
import { route, whoIs } from '../lib/router.js';
import { log } from '../lib/db.js';
import { driveUpload, driveGet, driveDelete } from '../lib/drive.js';
import { HttpError, bad, nowIso, str, reqStr } from '../lib/util.js';

const OPS = ['super_admin', 'admin'];
const MAX_BYTES = 6 * 1024 * 1024;
const slog = (ctx, action, detail) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, action, detail, ctx.ip);
const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const hex = v => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : '#1c2162');

// keep only what the page needs, with every number inside the picture
function cleanFields(raw, w, h) {
  let list; try { list = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { throw bad('The text boxes could not be read'); }
  if (!Array.isArray(list)) throw bad('Add at least one text box');
  const out = list.slice(0, 20).map((f, i) => {
    const x = num(f.x, 0, w - 4), y = num(f.y, 0, h - 4);
    return { id: 'f' + (i + 1), label: str(f.label, 40) || 'Text ' + (i + 1), type: f.type === 'logo' ? 'logo' : 'text',
      src: ['college', 'ask', 'fixed'].includes(f.src) ? f.src : 'ask', value: str(f.value, 200), x, y, w: num(f.w, 4, w - x), h: num(f.h, 4, h - y),
      color: hex(f.color), weight: [400, 600, 800].includes(Number(f.weight)) ? Number(f.weight) : 800, align: ['left', 'center', 'right'].includes(f.align) ? f.align : 'center',
      caps: !!f.caps, lines: num(f.lines || 1, 1, 4) };
  });
  if (!out.length) throw bad('Add at least one text box');
  return out;
}
const PUBLIC = 'id,title,kind,category,width,height,fields,active,sort_order,created_at,(thumb IS NOT NULL) has_thumb';
const shape = r => ({ ...r, fields: (() => { try { return JSON.parse(r.fields || '[]'); } catch { return []; } })() });

// everyone signed in can list the templates; colleges see only the ones switched on
route('GET', '/api/templates', null, async ctx => {
  const who = await whoIs(ctx);
  if (who === 'public' || who === 'officer') throw new HttpError(401, 'Please sign in');
  const kind = ctx.query.kind === 'photo' || ctx.query.kind === 'poster' ? ctx.query.kind : null;
  const rows = await ctx.db.all(`SELECT ${PUBLIC} FROM templates WHERE (? IS NULL OR kind=?) ${who === 'staff' ? '' : 'AND active=1'} ORDER BY category,sort_order,id`, kind, kind);
  return rows.map(shape);
});
// the pictures are not secret and never change for an id, so they are cached hard
async function tpl(ctx) {
  const t = await ctx.db.get('SELECT * FROM templates WHERE id=?', Number(ctx.params.id));
  if (!t) throw new HttpError(404, 'Template not found');
  return t;
}
route('GET', '/api/templates/:id/image', null, async ctx => {
  const t = await tpl(ctx), f = await driveGet(ctx.env, t.drive_id);
  return { __raw: true, bytes: Uint8Array.from(atob(f.data), ch => ch.charCodeAt(0)), headers: { 'Content-Type': t.mime || f.mime || 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } };
});
route('GET', '/api/templates/:id/thumb', null, async ctx => {
  const t = await tpl(ctx);
  if (!t.thumb) throw new HttpError(404, 'No preview');
  return { __raw: true, bytes: Uint8Array.from(atob(t.thumb), ch => ch.charCodeAt(0)), headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } };
});

route('POST', '/api/staff/templates', OPS, async ctx => {
  const b = ctx.body;
  if (!/^image\/(jpeg|png|webp)$/.test(b.mime || '')) throw bad('The template must be a PNG, WebP or JPG image');
  const data = String(b.data || '');
  if (!data || data.length * 0.75 > MAX_BYTES) throw bad('The template image is too large (up to 6 MB)');
  const w = num(b.width, 100, 8000), h = num(b.height, 100, 8000), kind = b.kind === 'photo' ? 'photo' : 'poster';
  const fields = cleanFields(b.fields, w, h), title = reqStr(b.title, 'Template title', 80);
  const ext = b.mime.split('/')[1].replace('jpeg', 'jpg');
  const up = await driveUpload(ctx.env, { name: `${title.replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 50)}_${Date.now()}.${ext}`, mime: b.mime, data, folder: 'Templates' });
  const id = await ctx.db.insert('INSERT INTO templates(title,kind,category,width,height,fields,drive_id,mime,size,thumb,active,sort_order,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,0,?,?)',
    title, kind, str(b.category, 40) || (kind === 'photo' ? 'Photo frames' : 'Posters'), w, h, JSON.stringify(fields), up.id, b.mime, Math.round(data.length * 0.75),
    /^[A-Za-z0-9+/=]+$/.test(String(b.thumb || '')) && String(b.thumb).length <= 42000 ? String(b.thumb) : null, ctx.user.username, nowIso());
  await slog(ctx, 'template_add', title);
  return { ok: true, id };
});
route('PUT', '/api/staff/templates/:id', OPS, async ctx => {
  const t = await tpl(ctx), b = ctx.body;
  const fields = cleanFields(b.fields ?? t.fields, t.width, t.height), title = reqStr(b.title, 'Template title', 80);
  const thumb = /^[A-Za-z0-9+/=]+$/.test(String(b.thumb || '')) && String(b.thumb).length <= 42000 ? String(b.thumb) : t.thumb;
  await ctx.db.run('UPDATE templates SET thumb=?,title=?,category=?,fields=?,active=?,kind=?,sort_order=? WHERE id=?', thumb, title, str(b.category, 40) || t.category, JSON.stringify(fields), b.active === false || b.active === 0 ? 0 : 1, b.kind === 'photo' ? 'photo' : b.kind === 'poster' ? 'poster' : t.kind, num(b.sort_order ?? t.sort_order, 0, 9999), t.id);
  await slog(ctx, 'template_edit', title);
  return { ok: true };
});
route('DELETE', '/api/staff/templates/:id', OPS, async ctx => {
  const t = await tpl(ctx);
  await ctx.db.run('DELETE FROM templates WHERE id=?', t.id);
  ctx.waitUntil(driveDelete(ctx.env, t.drive_id).catch(() => {}));
  await slog(ctx, 'template_delete', t.title);
  return { ok: true };
});
