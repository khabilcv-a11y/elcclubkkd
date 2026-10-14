// The Google Sheet is the database. This module keeps a fast copy of it:
//   Google Sheet  <--(Apps Script web app)-->  Worker  --> SQLite (in memory, built from the sheet) --> every query
// Reads are served from a per-datacentre cached copy and refreshed in the background (stale-while-revalidate).
// Writes run against the in-memory copy, then only the changed rows are sent to the sheet under a lock.
import { TABLES, TABLE_NAMES, ddl, sheetSchema } from './schema.js';
import { VILLAGES } from './villages.js';
import { hashSecret, HttpError } from './util.js';

let SQL = null;
export const setEngine = s => { SQL = s; };
export const engine = () => { if (!SQL) throw new Error('SQL engine not initialised'); return SQL; };

const STALE_MS = 8000;                       // refresh from the sheet in the background after this
const CACHE_KEY = 'https://elc-cache.internal/db-v1';

// ---------- talking to the Apps Script ----------
export async function callScript(env, payload) {
  if (!env.SCRIPT_URL || !env.SCRIPT_SECRET) throw new HttpError(503, 'The Google Sheet database is not connected yet (SCRIPT_URL / SCRIPT_SECRET missing).');
  let r;
  try { r = await fetch(env.SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ secret: env.SCRIPT_SECRET, ...payload }), redirect: 'follow' }); }
  catch (e) { throw new HttpError(502, 'Could not reach the Google Sheet service: ' + e.message); }
  const text = await r.text();
  let d; try { d = JSON.parse(text); } catch { throw new HttpError(502, 'The Google Sheet service returned an unexpected reply (check the Apps Script deployment is "Anyone" access).'); }
  if (d.error) throw new HttpError(d.conflict ? 409 : 502, d.conflict ? d.error : 'Google Sheet: ' + d.error, d.conflict ? { code: 'conflict' } : {});
  return d;
}

// ---------- sheet snapshot -> SQLite ----------
function coerce(v, type, nn) {
  if (v === '' || v == null) return type === 'TEXT' ? (nn ? '' : null) : null;
  if (type === 'TEXT') return String(v);
  const n = Number(v); return Number.isNaN(n) ? null : n;
}
export function buildBytes(tables) {
  const db = new (engine().Database)();
  db.run('PRAGMA foreign_keys=OFF');
  for (const s of ddl().filter(x => x.startsWith('CREATE TABLE'))) db.run(s);
  db.run('BEGIN');
  for (const name of TABLE_NAMES) {
    const t = TABLES[name], rows = tables[name] || [];
    if (!rows.length) continue;
    const st = db.prepare(`INSERT OR REPLACE INTO ${name}(${t.cols.map(c => c[0]).join(',')}) VALUES (${t.cols.map(() => '?').join(',')})`);
    for (const r of rows) st.run(t.cols.map((c, i) => coerce(r[i], c[1], c[2]?.nn)));
    st.free();
  }
  db.run('COMMIT');
  for (const s of ddl().filter(x => x.startsWith('CREATE TRIGGER'))) db.run(s);   // triggers after the bulk load so it isn't recorded
  const bytes = db.export(); db.close();
  return bytes;
}

// ---------- cache ----------
const cacheReq = () => new Request(CACHE_KEY);
async function cacheGet() {
  try {
    const r = await caches.default.match(cacheReq());
    if (!r) return null;
    return { bytes: new Uint8Array(await r.arrayBuffer()), version: Number(r.headers.get('x-version')), stamp: r.headers.get('x-stamp') || '', fetchedAt: Number(r.headers.get('x-fetched')) };
  } catch { return null; }
}
async function cachePut(e) {
  try { await caches.default.put(cacheReq(), new Response(e.bytes, { headers: { 'x-version': String(e.version), 'x-stamp': String(e.stamp || ''), 'x-fetched': String(e.fetchedAt), 'Cache-Control': 'max-age=86400' } })); } catch {}
}
let mem = null;      // fallback when the edge cache isn't available (command-line scripts)
const hasCache = () => typeof caches !== 'undefined';
async function cacheVersion() {
  try { const r = await caches.default.match(cacheReq()); if (!r) return -1; const v = Number(r.headers.get('x-version')); r.body?.cancel(); return v; } catch { return -1; }
}

async function fetchFresh(env, since) {
  const d = await callScript(env, { action: 'load', since });
  if (d.same) return { same: true, version: d.version, stamp: d.stamp };
  if (!d.init) {                         // brand-new sheet: create tabs, load villages and the first super admin
    await callScript(env, { action: 'setup', schema: sheetSchema() });
    const ops = [];
    const t0 = Date.now() * 1000;
    VILLAGES.forEach((v, i) => ops.push({ t: 'villages', op: 'i', pk: [t0 + i], row: [t0 + i, v[0], v[1], v[2], v[3], null, null, null] }));
    if (env.ADMIN_PASSWORD) {
      const id = t0 + 999;
      ops.push({ t: 'admins', op: 'i', pk: [id], row: [id, 'superadmin', 'Super Admin', null, 'super_admin', await hashSecret(env.ADMIN_PASSWORD), 1, null, new Date().toISOString()] });
    }
    try { await callScript(env, { action: 'apply', ops }); } catch (e) { if (e.extra?.code !== 'conflict') throw e; }   // another instance seeded first
    return fetchFresh(env, undefined);
  }
  return { version: d.version, stamp: d.stamp, bytes: buildBytes(d.tables) };
}

// Returns {bytes, version, fetchedAt}. Never blocks on the sheet unless there is no copy at all.
export async function getEntry(env, execCtx) {
  let e = hasCache() ? await cacheGet() : mem;
  if (!e) {
    const f = await fetchFresh(env);
    e = { bytes: f.bytes, version: f.version, stamp: f.stamp, fetchedAt: Date.now() };
    await putEntry(e);
    return e;
  }
  if (Date.now() - e.fetchedAt > STALE_MS) {
    const stale = e;
    const refreshed = { ...stale, fetchedAt: Date.now() };          // claim the refresh so parallel requests don't repeat it
    mem = refreshed; execCtx.waitUntil(cachePut(refreshed).then(async () => {
      try {
        const f = await fetchFresh(env, stale.stamp);
        const fresh = f.same ? { ...stale, fetchedAt: Date.now() } : { bytes: f.bytes, version: f.version, stamp: f.stamp, fetchedAt: Date.now() };
        await putEntry(fresh);
      } catch (err) { console.error('background refresh failed', err.message); }
    }));
    return refreshed;
  }
  return e;
}
// Never replace a newer copy with an older one.
export async function putEntry(e) {
  if (hasCache() && (await cacheVersion()) > e.version) return;
  mem = e; await cachePut(e);
}
// Scheduled keep-warm: make sure a fresh copy exists (so no visitor ever waits for a cold start) and pick up hand-edits.
export async function refreshNow(env) {
  const cur = hasCache() ? await cacheGet() : mem;
  if (!cur) { await putEntry({ ...(await reloadEntry(env)) }); return 'loaded'; }
  const f = await fetchFresh(env, cur.stamp);
  if (f.same) { await putEntry({ ...cur, fetchedAt: Date.now() }); return 'unchanged'; }
  await putEntry({ bytes: f.bytes, version: f.version, stamp: f.stamp, fetchedAt: Date.now() });
  return 'updated';
}
// Used after a write that raced with someone else's: take a fresh copy straight from the sheet.
export async function reloadEntry(env) {
  const f = await fetchFresh(env);
  return { bytes: f.bytes, version: f.version, stamp: f.stamp, fetchedAt: Date.now() };
}
