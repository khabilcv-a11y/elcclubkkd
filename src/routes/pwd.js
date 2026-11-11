// Vote Unbound: the call campaign for persons with disabilities, from the district UDID data. The people live in the private register (src/registry.js),
// not in the Google Sheet. Here the Portal checks who is asking and which areas (local body, and optionally ward) are allotted to them: an institution
// can only ever list, open or record a call for people in its own allotted areas.
import { route } from '../lib/router.js';
import { log } from '../lib/db.js';
import { HttpError, bad, nowIso, str } from '../lib/util.js';
import { normName } from '../lib/ac.js';
import { OUTCOMES, HELP } from '../registry.js';

const OPS = ['super_admin', 'admin'];
// the register lives in its own Durable Object; when the free daily write allowance is used up it refuses, and people should be told why
const reg = ctx => { const stub = ctx.env.REGISTRY.get(ctx.env.REGISTRY.idFromName('pwd')); return new Proxy({}, { get: (_, k) => (k === 'then' ? undefined : async (...a) => { try { return await stub[k](...a); } catch (e) { if (/rows (written|read)|free tier|allowance/i.test(String(e && e.message))) throw new HttpError(503, 'The Vote Unbound register is paused: the free daily storage allowance is used up. It works again after 5:30 AM IST.'); throw e; } }) }); }
const slog = (ctx, a, d) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, a, d, ctx.ip);
const clog = (ctx, a, d) => log(ctx.db, 'college', ctx.college.name, null, a, d, ctx.ip);

// "koyilandy Municipality" -> { key, base_key, name, kind }: spelling and capital letters in the district's file differ from place to place
export function lsgdInfo(raw) {
  const s = String(raw || '').replace(/\s+/g, ' ').trim(), kind = /corporation/i.test(s) ? 'Corporation' : /municipal/i.test(s) ? 'Municipality' : 'Panchayat';
  const base = s.replace(/\b(grama\s+)?panchayat\b|\bmunicipality\b|\bcorporation\b/gi, '').replace(/\s+/g, ' ').trim();
  const pretty = base.split(' ').map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(' ');
  return { key: normName(base) + '|' + kind, base_key: normName(base), name: `${pretty} ${kind}`, kind };
}
const fnv = s => { let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995; for (let i = 0; i < s.length; i++) { a = Math.imul(a ^ s.charCodeAt(i), 16777619) >>> 0; b = Math.imul(b ^ s.charCodeAt(i), 2246822519) >>> 0; } return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0'); };
const udidOf = v => { const s = String(v || '').toLowerCase(); return /issued/.test(s) ? 'Issued' : /not\s*applied/.test(s) ? 'Not applied' : /appl/.test(s) ? 'Applied' : 'Not stated'; };
// one row of the district's file -> what the register keeps. Aadhaar and UDID numbers are never read, and the date of birth only makes the person's id.
function cleanRow(r) {
  const name = String(r.name || '').replace(/\s+/g, ' ').trim(), l = lsgdInfo(r.lsgd); if (!name || !r.lsgd) return null;
  const digits = String(r.mobile || '').replace(/\D/g, ''), mobile = digits.length >= 10 ? digits.slice(-10) : '', age = Number(r.age), pct = parseInt(r.pct, 10);
  return { pid: fnv(`${name.toLowerCase()}|${String(r.dob || '').trim()}|${mobile}`), name, age: age >= 0 && age <= 110 ? age : null, gender: ['Male', 'Female', 'Transgender'].includes(String(r.gender).trim()) ? String(r.gender).trim() : '',
    mobile, address: str(r.address, 200), ward: String(r.ward || '').trim().replace(/^0+(?=\d)/, ''), lsgd: l.name, lsgd_key: l.key, base_key: l.base_key, kind: l.kind, anganwadi: str(r.anganwadi, 80), icds: str(r.icds, 80),
    bedridden: /^y/i.test(String(r.bedridden || '')), disability: str(r.disability, 60), pct: Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : null, udid: udidOf(r.udid_status) };
}
const myScope = async ctx => (await ctx.db.all('SELECT lsgd_key, ward FROM pwd_alloc WHERE college_id=?', ctx.college.id)).map(a => ({ lsgd_key: a.lsgd_key, ward: a.ward || '' }));

// ======================================================================= the district (staff)
route('POST', '/api/staff/pwd/import', OPS, async ctx => {
  const rows = (Array.isArray(ctx.body.rows) ? ctx.body.rows : []).slice(0, 2500).map(cleanRow).filter(Boolean);
  if (!rows.length) throw bad('No usable rows in this part of the file');
  const r = await reg(ctx).importRows(rows);
  if (ctx.body.first) await slog(ctx, 'pwd_import', 'started a new import');
  return { ok: true, ...r, skipped: (ctx.body.rows || []).length - rows.length };
});
route('GET', '/api/staff/pwd/overview', 'staff', async ctx => {
  const [ov, allots, colleges, calls] = await Promise.all([reg(ctx).overview(), ctx.db.all('SELECT a.id,a.college_id,a.lsgd_key,a.ward,c.name college FROM pwd_alloc a JOIN colleges c ON c.id=a.college_id ORDER BY c.name'),
    ctx.db.all("SELECT id,name,COALESCE(kind,'college') kind,COALESCE(lsgi,'') lsgi FROM colleges WHERE active=1 ORDER BY name"), reg(ctx).collegeCalls()]);
  const byArea = new Map(); for (const a of allots) { if (!byArea.has(a.lsgd_key)) byArea.set(a.lsgd_key, []); byArea.get(a.lsgd_key).push(a); }
  const cc = new Map(calls.map(c => [c.college_id, c]));
  const owned = new Map(); for (const a of allots) { if (!owned.has(a.college_id)) owned.set(a.college_id, []); owned.get(a.college_id).push({ lsgd_key: a.lsgd_key, ward: a.ward || '' }); }
  const colProgress = [];
  for (const c of colleges) { const own = owned.get(c.id); if (!own) continue; const counted = await reg(ctx).areaCounts(own), k = cc.get(c.id) || {}; colProgress.push({ id: c.id, name: c.name, people: counted.reduce((s, a) => s + a.n, 0), areas: own.length, calls: k.calls || 0, called: k.people || 0, reached: k.reached || 0, help: k.help || 0, last: k.last || '' }); }
  return { ...ov, areas: ov.areas.map(a => ({ ...a, allotted: byArea.get(a.lsgd_key) || [] })), colleges: colleges.filter(c => c.kind === 'college').map(c => ({ id: c.id, name: c.name, kind: c.kind, lsgi: c.lsgi })), progress: colProgress, views: await reg(ctx).recentViews(15), outcomes: OUTCOMES, help: HELP };
});
route('GET', '/api/staff/pwd/wards/:key', 'staff', async ctx => ({ wards: await reg(ctx).wards(ctx.params.key) }));
// give a college a whole local body (no wards chosen) or chosen wards of it
route('POST', '/api/staff/pwd/alloc', OPS, async ctx => {
  const b = ctx.body, c = await ctx.db.get("SELECT id,name FROM colleges WHERE id=? AND COALESCE(kind,'college')='college'", Number(b.college_id)); if (!c) throw bad('Choose a college (special drives are for colleges only)');
  const key = String(b.lsgd_key || ''), wards = (await reg(ctx).wards(key)); if (!wards.length) throw bad('That local body is not in the register');
  const area = (await reg(ctx).overview()).areas.find(a => a.lsgd_key === key), chosen = [...new Set((Array.isArray(b.wards) ? b.wards : []).map(String))].filter(w => wards.some(x => String(x.ward) === w));
  const mine = await ctx.db.all('SELECT id,ward FROM pwd_alloc WHERE college_id=? AND lsgd_key=?', c.id, key);
  if (!chosen.length) { for (const m of mine) await ctx.db.run('DELETE FROM pwd_alloc WHERE id=?', m.id); await ctx.db.insert('INSERT INTO pwd_alloc(college_id,lsgd_key,lsgd,ward,created_by,created_at) VALUES (?,?,?,?,?,?)', c.id, key, area.lsgd, '', ctx.user.username, nowIso()); }
  else if (!mine.some(m => !m.ward)) for (const w of chosen) if (!mine.some(m => m.ward === w)) await ctx.db.insert('INSERT INTO pwd_alloc(college_id,lsgd_key,lsgd,ward,created_by,created_at) VALUES (?,?,?,?,?,?)', c.id, key, area.lsgd, w, ctx.user.username, nowIso());
  await slog(ctx, 'pwd_alloc', `${c.name}: ${area.lsgd} ${chosen.length ? 'wards ' + chosen.join(',') : '(all wards)'}`);
  return { ok: true };
});
route('DELETE', '/api/staff/pwd/alloc/:id', OPS, async ctx => {
  const a = await ctx.db.get('SELECT a.id,a.lsgd,a.ward,c.name FROM pwd_alloc a JOIN colleges c ON c.id=a.college_id WHERE a.id=?', Number(ctx.params.id)); if (!a) throw new HttpError(404, 'Not found');
  await ctx.db.run('DELETE FROM pwd_alloc WHERE id=?', a.id); await slog(ctx, 'pwd_unalloc', `${a.name}: ${a.lsgd} ${a.ward || '(all wards)'}`); return { ok: true };
});
// a local body that exactly one institution is based in goes to that institution; shared ones (the Corporation, the towns) are left to be shared out by ward
route('POST', '/api/staff/pwd/suggest', OPS, async ctx => {
  const [ov, colleges, have] = await Promise.all([reg(ctx).overview(), ctx.db.all("SELECT id,name,COALESCE(lsgi,'') lsgi FROM colleges WHERE active=1 AND COALESCE(kind,'college')='college'"), ctx.db.all('SELECT DISTINCT college_id FROM pwd_alloc')]);
  const done = new Set(have.map(h => h.college_id)), areaBy = new Map(ov.areas.map(a => [a.base_key, a])), groups = new Map(), none = [];
  for (const c of colleges) { if (done.has(c.id) || !c.lsgi) continue; const a = areaBy.get(lsgdInfo(c.lsgi).base_key); if (!a) { none.push(c.name); continue; } if (!groups.has(a.lsgd_key)) groups.set(a.lsgd_key, { a, cs: [] }); groups.get(a.lsgd_key).cs.push(c); }
  const made = [], shared = [];
  for (const { a, cs } of groups.values()) { if (cs.length === 1) { await ctx.db.insert('INSERT INTO pwd_alloc(college_id,lsgd_key,lsgd,ward,created_by,created_at) VALUES (?,?,?,?,?,?)', cs[0].id, a.lsgd_key, a.lsgd, '', ctx.user.username, nowIso()); made.push({ college: cs[0].name, area: a.lsgd, people: a.n }); } else shared.push({ area: a.lsgd, people: a.n, colleges: cs.map(c => c.name) }); }
  await slog(ctx, 'pwd_suggest', `${made.length} allotted`); return { ok: true, made, shared, none };
});
route('GET', '/api/staff/pwd/export-calls', OPS, async ctx => {
  const rows = await reg(ctx).exportCalls(), names = new Map((await ctx.db.all('SELECT id,name FROM colleges')).map(c => [c.id, c.name])), esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['When', 'Institution', 'Caller', 'Local body', 'Ward', 'Age', 'Gender', 'Disability', 'Outcome', 'Help needed', 'Note'];
  const text = '﻿' + [head, ...rows.map(r => [r.at, names.get(r.college_id) || '', r.by_name, r.lsgd, r.ward, r.age, r.gender, r.disability, OUTCOMES[r.outcome] || r.outcome, HELP[r.help] || '', r.note])].map(r => r.map(esc).join(',')).join('\r\n');
  await slog(ctx, 'pwd_export', rows.length + ' call records');
  return { __raw: true, text, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="vote-unbound-calls.csv"' } };
});

// ======================================================================= an institution (only its allotted areas)
route('GET', '/api/college/pwd', 'college', async ctx => {
  const scope = await myScope(ctx);
  if (!scope.length) return { allotted: false, stats: null, areas: [], outcomes: OUTCOMES, help: HELP };
  const [stats, areas] = await Promise.all([reg(ctx).stats(scope), reg(ctx).areas(scope)]);
  await reg(ctx).logView(ctx.college.id, ctx.college.name, 'open', stats.people);
  const by = new Map(); for (const a of areas) { if (!by.has(a.lsgd_key)) by.set(a.lsgd_key, { lsgd_key: a.lsgd_key, lsgd: a.lsgd, n: 0, wards: [] }); const g = by.get(a.lsgd_key); g.n += a.n; g.wards.push({ ward: a.ward, n: a.n }); }
  return { allotted: true, stats, areas: [...by.values()], outcomes: OUTCOMES, help: HELP };
});
route('GET', '/api/college/pwd/list', 'college', async ctx => {
  const scope = await myScope(ctx); if (!scope.length) throw new HttpError(403, 'No area has been allotted to you yet.');
  const f = { status: ['open', 'done', 'help', 'bed'].includes(ctx.query.status) ? ctx.query.status : '', q: str(ctx.query.q, 40), ward: str(ctx.query.ward, 12), lsgd_key: str(ctx.query.lsgd, 80), offset: Number(ctx.query.offset) || 0, limit: 30 };
  const r = await reg(ctx).list(scope, f); await reg(ctx).logView(ctx.college.id, ctx.college.name, 'list', r.people.length);
  return r;
});
route('GET', '/api/college/pwd/person/:pid', 'college', async ctx => {
  const scope = await myScope(ctx), p = scope.length ? await reg(ctx).person(scope, ctx.params.pid) : null; if (!p) throw new HttpError(404, 'Not found');
  await reg(ctx).logView(ctx.college.id, ctx.college.name, 'person', 1); return p;
});
route('POST', '/api/college/pwd/call', 'college', async ctx => {
  const b = ctx.body, pids = [...new Set((Array.isArray(b.pids) ? b.pids : []).map(String))].slice(0, 12), scope = await myScope(ctx);
  if (!pids.length) throw bad('Choose who was called');
  if (!OUTCOMES[b.outcome]) throw bad('Choose how the call went');
  const help = b.outcome === 'needs_help' ? (HELP[b.help] ? b.help : 'other') : '';
  const ok = scope.length ? await reg(ctx).allowed(scope, pids) : []; if (ok.length !== pids.length) throw new HttpError(403, 'This person is not in your allotted area.');
  const r = await reg(ctx).logCall(pids, ctx.college.id, str(ctx.college.coordinator || ctx.college.name, 80), b.outcome, help, str(b.note, 300));
  await clog(ctx, 'pwd_call', `${pids.length} call record${pids.length === 1 ? '' : 's'}: ${OUTCOMES[b.outcome]}`); return r;
});


// ======================================================================= villages (a village is a set of wards, because the register only knows local body and ward)
const vname = v => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 80);
async function areaIndex(ctx) { const ov = await reg(ctx).overview(); return ov.areas; }
// a local body as written in a sheet or by hand -> the register's local body (exact, or the only one with that name whatever its kind)
function findArea(areas, raw) { const i = lsgdInfo(raw), exact = areas.find(a => a.lsgd_key === i.key); if (exact) return exact; const same = areas.filter(a => a.base_key === i.base_key); return same.length === 1 ? same[0] : null; }
async function addLinks(ctx, village, area, wards) {
  let n = 0; const list = wards.length ? wards : [''];
  for (const w of list) { if (await ctx.db.get('SELECT id FROM pwd_village WHERE village=? AND lsgd_key=? AND ward=?', village, area.lsgd_key, w)) continue; await ctx.db.insert('INSERT INTO pwd_village(village,lsgd_key,lsgd,ward,created_by,created_at) VALUES (?,?,?,?,?,?)', village, area.lsgd_key, area.lsgd, w, ctx.user.username, nowIso()); n++; }
  return n;
}
route('GET', '/api/staff/pwd/villages', 'staff', async ctx => {
  const [links, allots, areas, names] = await Promise.all([ctx.db.all('SELECT id,village,lsgd_key,lsgd,ward FROM pwd_village ORDER BY village,lsgd,CAST(ward AS INTEGER),ward'), ctx.db.all('SELECT a.lsgd_key,a.ward,c.name college FROM pwd_alloc a JOIN colleges c ON c.id=a.college_id'), areaIndex(ctx), ctx.db.all('SELECT name FROM villages ORDER BY name')]);
  const counts = links.length ? await reg(ctx).areaCounts(links.map(l => ({ lsgd_key: l.lsgd_key, ward: l.ward }))) : [], by = new Map();
  links.forEach((l, i) => { if (!by.has(l.village)) by.set(l.village, { village: l.village, links: [], n: 0, allotted: new Set() }); const g = by.get(l.village), n = counts[i].n; g.links.push({ ...l, n }); g.n += n; for (const a of allots) if (a.lsgd_key === l.lsgd_key && (!a.ward || !l.ward || a.ward === l.ward)) g.allotted.add(a.college); });
  return { villages: [...by.values()].map(g => ({ ...g, allotted: [...g.allotted] })), areas: areas.map(a => ({ lsgd_key: a.lsgd_key, lsgd: a.lsgd })), names: names.map(v => v.name) };
});
route('POST', '/api/staff/pwd/villages', OPS, async ctx => {
  const village = vname(ctx.body.village); if (!village) throw bad('Give the village a name');
  const areas = await areaIndex(ctx), area = areas.find(a => a.lsgd_key === String(ctx.body.lsgd_key || '')); if (!area) throw bad('Choose the local body');
  const have = (await reg(ctx).wards(area.lsgd_key)).map(w => String(w.ward)), wards = [...new Set((Array.isArray(ctx.body.wards) ? ctx.body.wards : []).map(String))].filter(w => have.includes(w));
  const n = await addLinks(ctx, village, area, wards); await slog(ctx, 'pwd_village', `${village}: ${area.lsgd} ${wards.length ? 'wards ' + wards.join(',') : '(all wards)'}`); return { ok: true, n };
});
// a sheet of Village, Local body, Ward (several wards can be written together: 3, 4, 5)
route('POST', '/api/staff/pwd/villages/import', OPS, async ctx => {
  const areas = await areaIndex(ctx), rows = (Array.isArray(ctx.body.rows) ? ctx.body.rows : []).slice(0, 1500); let added = 0; const unmatched = new Set();
  for (const r of rows) {
    const village = vname(r.village); if (!village || !r.lsgd) continue; const area = findArea(areas, r.lsgd); if (!area) { unmatched.add(String(r.lsgd).trim()); continue; }
    const wards = [...new Set(String(r.ward || '').split(/[,;&\/]|\band\b/i).map(w => w.trim().replace(/^(ward\s*)/i, '').replace(/^0+(?=\d)/, '')).filter(Boolean))];
    added += await addLinks(ctx, village, area, wards);
  }
  if (ctx.body.first) await slog(ctx, 'pwd_village_import', 'started an import'); return { ok: true, added, unmatched: [...unmatched] };
});
route('DELETE', '/api/staff/pwd/villages/link/:id', OPS, async ctx => { await ctx.db.run('DELETE FROM pwd_village WHERE id=?', Number(ctx.params.id)); return { ok: true }; });
route('POST', '/api/staff/pwd/villages/remove', OPS, async ctx => { const v = vname(ctx.body.village); await ctx.db.run('DELETE FROM pwd_village WHERE village=?', v); await slog(ctx, 'pwd_village_del', v); return { ok: true }; });
// give an institution every ward a village covers
route('POST', '/api/staff/pwd/alloc-village', OPS, async ctx => {
  const c = await ctx.db.get("SELECT id,name FROM colleges WHERE id=? AND COALESCE(kind,'college')='college'", Number(ctx.body.college_id)); if (!c) throw bad('Choose a college (special drives are for colleges only)');
  const village = vname(ctx.body.village), links = await ctx.db.all('SELECT lsgd_key,lsgd,ward FROM pwd_village WHERE village=?', village); if (!links.length) throw bad('This village is not linked to any ward yet');
  const groups = new Map(); for (const l of links) { if (!groups.has(l.lsgd_key)) groups.set(l.lsgd_key, { lsgd: l.lsgd, whole: false, wards: [] }); const g = groups.get(l.lsgd_key); if (l.ward) g.wards.push(l.ward); else g.whole = true; }
  let n = 0;
  for (const [key, g] of groups) {
    const mine = await ctx.db.all('SELECT id,ward FROM pwd_alloc WHERE college_id=? AND lsgd_key=?', c.id, key), add = (w) => ctx.db.insert('INSERT INTO pwd_alloc(college_id,lsgd_key,lsgd,ward,created_by,created_at) VALUES (?,?,?,?,?,?)', c.id, key, g.lsgd, w, ctx.user.username, nowIso());
    if (mine.some(m => !m.ward)) continue;
    if (g.whole) { for (const m of mine) await ctx.db.run('DELETE FROM pwd_alloc WHERE id=?', m.id); await add(''); n++; }
    else for (const w of g.wards) if (!mine.some(m => m.ward === w)) { await add(w); n++; }
  }
  await slog(ctx, 'pwd_alloc_village', `${c.name}: ${village} (${n} areas)`); return { ok: true, n };
});

// start again with a fresh file: only the super admin, and only with the word typed (the call history is kept)
route('POST', '/api/staff/pwd/clear', ['super_admin'], async ctx => {
  if (String(ctx.body.confirm || '') !== 'DELETE') throw bad('Type DELETE to confirm');
  await reg(ctx).clearAll(); await slog(ctx, 'pwd_clear', 'the register was emptied'); return { ok: true };
});
