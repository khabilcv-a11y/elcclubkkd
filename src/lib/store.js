// The Google Sheet is the database. This module keeps a fast copy of it:
//   Google Sheet  <--(Apps Script web app)-->  Worker  --> SQLite (in memory, built from the sheet) --> every query
// Reads are served from the live copy and refreshed from the sheet in the background (stale-while-revalidate).
// Writes run against the in-memory copy, then only the changed rows are sent to the sheet under a lock.
import { TABLES, TABLE_NAMES, ddl, sheetSchema, SCHEMA_VER } from './schema.js';
import { VILLAGES } from './villages.js';
import { hashSecret, HttpError } from './util.js';

let SQL = null;
export const setEngine = s => { SQL = s; };
export const engine = () => { if (!SQL) throw new Error('SQL engine not initialised'); return SQL; };

const STALE_MS = 8000;                       // refresh from the sheet in the background after this

// ---------- talking to the Apps Script ----------
// If the sheet's saved table list is older than this version of the portal (e.g. an older deployment set it up last), repair it and retry once.
export async function callScript(env, payload) {
  try { return await callScriptOnce(env, payload); }
  catch (e) {
    if (payload.action === 'apply' && /Unknown table|Missing tab|Not set up/.test(e.message || '')) {
      await callScriptOnce(env, { action: 'setup', schema: sheetSchema() });
      return callScriptOnce(env, payload);
    }
    throw e;
  }
}
async function callScriptOnce(env, payload) {
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

// seed rows are written with the current table width, so adding columns later never breaks first-run setup
const pad = (t, row) => row.concat(Array(Math.max(0, TABLES[t].cols.length - row.length)).fill(null));

async function fetchFresh(env, since, prepareSheet) {
  // a new deployment may have new tables/columns: (re)create the tabs and headings first (safe to repeat; existing data is untouched)
  if (prepareSheet) await callScript(env, { action: 'setup', schema: sheetSchema() });
  const d = await callScript(env, { action: 'load', since });
  if (d.same) return { same: true, version: d.version, stamp: d.stamp };
  if (!d.init) {                         // brand-new sheet: create tabs, load villages and the first super admin
    await callScript(env, { action: 'setup', schema: sheetSchema() });
    const ops = [];
    const t0 = Date.now() * 1000;
    VILLAGES.forEach((v, i) => ops.push({ t: 'villages', op: 'i', pk: [t0 + i], row: pad('villages', [t0 + i, v[0], v[1], v[2], v[3]]) }));
    if (env.ADMIN_PASSWORD) {
      const id = t0 + 999;
      ops.push({ t: 'admins', op: 'i', pk: [id], row: pad('admins', [id, 'superadmin', 'Super Admin', null, 'super_admin', await hashSecret(env.ADMIN_PASSWORD), 1, null, new Date().toISOString()]) });
    }
    try { await callScript(env, { action: 'apply', ops }); } catch (e) { if (e.extra?.code !== 'conflict') throw e; }   // another instance seeded first
    return fetchFresh(env, undefined);
  }
  return { version: d.version, stamp: d.stamp, bytes: buildBytes(d.tables) };
}

// ---------- the working copy ----------
// One Durable Object owns the live copy, so there is a single writer and no cache races. The copy is kept in memory and
// saved to the object's own (free) storage so it survives the object being put to sleep. Command-line scripts keep it in memory only.
let mem = null, backend = null, savedBytes = null;
export const setBackend = b => { backend = b; };
async function save(e) {
  e = { ...e, schema: SCHEMA_VER };
  mem = e;
  if (backend) { await backend.put(e, e.bytes !== savedBytes); savedBytes = e.bytes; }
}
async function current() {
  if (!mem && backend) { mem = await backend.get(); savedBytes = mem && mem.bytes; }
  if (mem && mem.schema !== SCHEMA_VER) { mem = null; savedBytes = null; }      // saved by an older version of the portal: rebuild
  return mem;
}
let loading = null;   // only one first-time load at a time, however many requests arrive together

// Returns {bytes, version, stamp, fetchedAt}. Never blocks on the sheet unless there is no copy at all.
export async function getEntry(env, execCtx) {
  const e = await current();
  if (!e) {
    loading ||= (async () => {
      const f = await fetchFresh(env, undefined, !env.SKIP_SETUP);
      const first = { bytes: f.bytes, version: f.version, stamp: f.stamp, fetchedAt: Date.now() };
      await save(first);
      return first;
    })().finally(() => { loading = null; });
    return loading;
  }
  if (Date.now() - e.fetchedAt > STALE_MS) {
    const claimed = { ...e, fetchedAt: Date.now() };          // claim the refresh so parallel requests don't repeat it
    mem = claimed;
    execCtx.waitUntil((async () => {
      try {
        const f = await fetchFresh(env, e.stamp);
        await putEntry(f.same ? { ...e, fetchedAt: Date.now() } : { bytes: f.bytes, version: f.version, stamp: f.stamp, fetchedAt: Date.now() });
      } catch (err) { console.error('background refresh failed', err.message); }
    })());
    return claimed;
  }
  return e;
}
// Never replace a newer copy with an older one.
export async function putEntry(e) {
  if (mem && mem.version > e.version) return;
  await save(e);
}
// Scheduled keep-warm: check the sheet for changes (also picks up hand-edits) even when nobody is using the site.
export async function refreshNow(env) {
  const cur = await current();
  if (!cur) { await putEntry(await reloadEntry(env)); return 'loaded'; }
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
