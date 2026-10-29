// College and school logos: stored as a small resized picture in the sheet itself (fast, no Drive round trip) and shown next to the name everywhere.
import { route } from '../lib/router.js';
import { log } from '../lib/db.js';
import { HttpError, bad, nowIso } from '../lib/util.js';

const MAX_B64 = 42000;   // a sheet cell holds up to 50,000 characters
const clog = (ctx, action, detail) => log(ctx.db, 'college', ctx.college.name, null, action, detail, ctx.ip);

route('PUT', '/api/college/logo', 'college', async ctx => {
  const mime = String(ctx.body.mime || ''), data = String(ctx.body.data || '');
  if (!/^image\/(png|jpeg|webp)$/.test(mime)) throw bad('Please choose a PNG, JPG or WebP picture');
  if (data.length < 100 || !/^[A-Za-z0-9+/=]+$/.test(data)) throw bad('That picture could not be read. Try another one.');
  try { atob(data); } catch { throw bad('That picture could not be read. Try another one.'); }
  if (data.length > MAX_B64) throw bad('That logo is too detailed. Try a simpler or smaller picture.');
  const at = nowIso();
  await ctx.db.run('UPDATE colleges SET logo=?,logo_mime=?,logo_at=? WHERE id=?', data, mime, at, ctx.college.id);
  await clog(ctx, 'logo_set', 'Logo updated');
  return { ok: true, logo_v: at };
});
route('DELETE', '/api/college/logo', 'college', async ctx => {
  await ctx.db.run('UPDATE colleges SET logo=NULL,logo_mime=NULL,logo_at=NULL WHERE id=?', ctx.college.id);
  await clog(ctx, 'logo_remove', 'Logo removed');
  return { ok: true };
});
// public: the picture itself (the page adds ?v=<time> so a new logo shows straight away)
route('GET', '/api/logo/:id', null, async ctx => {
  const c = await ctx.db.get('SELECT logo,logo_mime FROM colleges WHERE id=? AND active=1', Number(ctx.params.id));
  if (!c || !c.logo) throw new HttpError(404, 'No logo');
  return { __raw: true, bytes: Uint8Array.from(atob(c.logo), ch => ch.charCodeAt(0)), headers: { 'Content-Type': c.logo_mime || 'image/webp', 'Cache-Control': 'public, max-age=604800, immutable' } };
});
