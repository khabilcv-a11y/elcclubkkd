// Social media posts shown on the home page. Instagram does not give out a public feed of an account, so the district office chooses which posts
// to show (pasting their links) and each is displayed with Instagram's own embed. Until the first post is added, the latest posts of the
// district's page are shown from the list below.
import { route } from '../lib/router.js';
import { log } from '../lib/db.js';
import { HttpError, bad, nowIso } from '../lib/util.js';
import { featureMap } from '../lib/features.js';

const OPS = ['super_admin', 'admin'];
const HANDLE = 'sveep.kozhikode';
const DEFAULT_CODES = ['DfKaW3lEqGl', 'DfCpllrEhn1', 'DfCpe7KkrT_', 'DfCJs32krM0', 'DfCJnwpEp3l', 'DfCJfwmEtrS', 'DfATwZUkq4M', 'DfAEyCWkttN', 'De_x9XGkpNy'];
const slog = (ctx, a, d) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, a, d, ctx.ip);
const codeOf = u => { const m = String(u || '').match(/instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,20})/i) || String(u || '').trim().match(/^([A-Za-z0-9_-]{8,14})$/); return m ? m[1] : null; };
const shape = (code, id = null) => ({ id, code, url: `https://www.instagram.com/p/${code}/` });
const customOn = async db => !!(await db.get("SELECT 1 x FROM features WHERE key='setting.social_custom'"));
const markCustom = async (db, user) => { if (!(await customOn(db))) await db.run('INSERT INTO features(key,enabled,updated_by,updated_at) VALUES (?,?,?,?)', 'setting.social_custom', 1, user, nowIso()); };

route('GET', '/api/public/social', null, async ctx => {
  if (!(await featureMap(ctx.db)).public.social) throw new HttpError(404, 'Not available');
  const rows = await ctx.db.all('SELECT id,code FROM social_posts ORDER BY sort_order DESC,id DESC LIMIT 12');
  return { handle: HANDLE, profile: `https://www.instagram.com/${HANDLE}/`, posts: rows.length || (await customOn(ctx.db)) ? rows.map(r => shape(r.code, r.id)) : DEFAULT_CODES.map(c => shape(c)) };
});
route('GET', '/api/staff/social', 'staff', async ctx => {
  const rows = await ctx.db.all('SELECT id,code,sort_order,created_at FROM social_posts ORDER BY sort_order DESC,id DESC');
  return { handle: HANDLE, posts: rows.map(r => ({ ...shape(r.code, r.id), created_at: r.created_at })), suggested: rows.length || (await customOn(ctx.db)) ? [] : DEFAULT_CODES.map(c => shape(c)) };
});
route('POST', '/api/staff/social', OPS, async ctx => {
  const raw = Array.isArray(ctx.body.urls) ? ctx.body.urls : String(ctx.body.urls || '').split(/[\s,]+/);
  const codes = [...new Set(raw.map(codeOf).filter(Boolean))].slice(0, 40);
  if (!codes.length) throw bad('Paste one or more Instagram post links, for example https://www.instagram.com/p/AbC123xyz/');
  let top = (await ctx.db.get('SELECT COALESCE(MAX(sort_order),0) n FROM social_posts')).n, added = 0;
  // the first link pasted goes on top, so paste the newest post first (or use the arrows afterwards)
  for (const code of codes.slice().reverse()) {
    if (await ctx.db.get('SELECT 1 x FROM social_posts WHERE code=?', code)) continue;
    await ctx.db.insert('INSERT INTO social_posts(platform,code,url,caption,sort_order,created_by,created_at) VALUES (?,?,?,?,?,?,?)', 'instagram', code, `https://www.instagram.com/p/${code}/`, '', ++top, ctx.user.username, nowIso()); added++;
  }
  await markCustom(ctx.db, ctx.user.username); await slog(ctx, 'social_add', `${added} posts`);
  return { ok: true, added };
});
route('POST', '/api/staff/social/:id/move', OPS, async ctx => {
  const rows = await ctx.db.all('SELECT id,sort_order FROM social_posts ORDER BY sort_order DESC,id DESC'), i = rows.findIndex(r => r.id === Number(ctx.params.id));
  if (i < 0) throw new HttpError(404, 'Post not found');
  const j = ctx.body.dir === 'up' ? i - 1 : i + 1; if (j < 0 || j >= rows.length) return { ok: true };
  // renumber so that moving is always a clean swap
  const order = rows.map(r => r.id); [order[i], order[j]] = [order[j], order[i]];
  for (let k = 0; k < order.length; k++) await ctx.db.run('UPDATE social_posts SET sort_order=? WHERE id=?', order.length - k, order[k]);
  return { ok: true };
});
route('DELETE', '/api/staff/social/:id', OPS, async ctx => {
  const r = await ctx.db.run('DELETE FROM social_posts WHERE id=?', Number(ctx.params.id));
  if (!r.changes) throw new HttpError(404, 'Post not found');
  await markCustom(ctx.db, ctx.user.username); await slog(ctx, 'social_delete', '#' + ctx.params.id);
  return { ok: true };
});
