import { TABLES, LAZY_TABLES } from './schema.js';
import { engine, getEntry, putEntry, reloadEntry, callScript, pending, hooks } from './store.js';

// ids are large unique numbers generated here (no auto-increment, so parallel writers never collide)
let lastId = 0;
export function newId() {
  let id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  if (id <= lastId) id = lastId + 1;
  return (lastId = id);
}
const lazyBuf = [], harmless = new Set();
let flushScheduled = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function flushLazy(env) {
  flushScheduled = false;
  if (!lazyBuf.length) return;
  const ops = lazyBuf.splice(0);
  try { harmless.add((await callScript(env, { action: 'apply', ops })).version); }
  catch (e) { console.error('background write failed', e.message); lazyBuf.push(...ops.filter(o => o.op === 'i' && LAZY_TABLES.has(o.t))); }   // keep audit rows for the next attempt
}
// Data-entry saves (daily report, volunteers, enrolment numbers, photos) are written into the portal's own copy at once and
// handed to the sheet in the background with retries, so nobody waits for Google. The copy is never refreshed from the sheet while any are pending.
const deferredBuf = []; let flushing = null, tries = 0;
async function flushDeferred(env) {
  if (flushing) return flushing;
  flushing = (async () => {
    while (deferredBuf.length) {
      const ops = deferredBuf.slice();
      try { const r = await callScript(env, { action: 'apply', ops }); deferredBuf.splice(0, ops.length); pending.n = deferredBuf.length; harmless.add(r.version); tries = 0; }
      catch (e) {
        if (e.extra?.code === 'conflict') { console.error('saved entry rejected by the sheet:', e.message); deferredBuf.splice(0, ops.length); pending.n = deferredBuf.length; continue; }
        tries++; console.error('background save failed (attempt ' + tries + '):', e.message);
        if (tries >= 6) break;                       // try again on the next save or the 5-minute job
        await sleep(Math.min(15000, 700 * 2 ** tries));
      }
    }
  })().finally(() => { flushing = null; });
  return flushing;
}
hooks.flush = flushDeferred;
const HAS_ID = new Set(Object.entries(TABLES).filter(([, t]) => t.pk.length === 1 && t.pk[0] === 'id').map(([n]) => n));

// Adds "id" to INSERT INTO t(cols) VALUES (...) for tables that use ids.
function withId(text, params) {
  const m = text.match(/^\s*INSERT INTO (\w+)\(([^)]*)\)\s*VALUES\s*\(/i);
  if (!m || !HAS_ID.has(m[1]) || /(^|,)\s*id\s*(,|$)/.test(m[2])) return null;
  const id = newId();
  return { id, text: text.replace(/^(\s*INSERT INTO \w+\()/i, '$1id,').replace(/(VALUES\s*\()/i, '$1?,'), params: [id, ...params] };
}
const norm = p => p.map(v => (v === undefined ? null : typeof v === 'boolean' ? +v : v));

function adapter(raw) {
  const all = (text, p) => {
    const st = raw.prepare(text);
    try { st.bind(norm(p)); const rows = []; while (st.step()) rows.push(st.getAsObject()); return rows; } finally { st.free(); }
  };
  const run = (text, p) => { raw.run(text, norm(p)); return raw.getRowsModified(); };
  return {
    all: async (text, ...p) => all(text, p),
    get: async (text, ...p) => all(text, p)[0],
    run: async (text, ...p) => { const w = withId(text, p); return { changes: run(w ? w.text : text, w ? w.params : p) }; },
    insert: async (text, ...p) => {
      const w = withId(text, p);
      if (!w) throw new Error('insert() needs a table with an id column');
      run(w.text, w.params); return w.id;
    },
    tx: async fn => {
      raw.run('SAVEPOINT tx');
      try { const r = await fn(adapter(raw)); raw.run('RELEASE tx'); return r; }
      catch (e) { raw.run('ROLLBACK TO tx'); raw.run('RELEASE tx'); throw e; }
    },
  };
}

// Open the database for one request.
export async function openDb(env, execCtx) {
  const entry = await getEntry(env, execCtx);
  const raw = new (engine().Database)(entry.bytes);
  raw.run('PRAGMA foreign_keys=ON');
  const db = adapter(raw);
  const extra = [];                       // rows that must be saved even if the request fails (audit log, outbox)

  db.addExtra = (t, row) => extra.push({ t, op: 'i', pk: [row[0]], row });
  db.raw = raw;

  // After a handler succeeded: send changed rows to the sheet. Failed requests send only the audit rows.
  db.finish = async ok => {
    const ops = ok ? coalesce(all(raw, 'SELECT t,op,pk,row FROM _chg ORDER BY seq', [])) : [];
    const ex = extra.slice();
    const send = [...ops, ...ex];
    if (!send.length) return;
    if (db.deferred && ok) {
      for (const e of ex) { const t = TABLES[e.t]; raw.run(`INSERT OR REPLACE INTO ${e.t}(${t.cols.map(c => c[0]).join(',')}) VALUES (${t.cols.map(() => '?').join(',')})`, norm(e.row)); }
      raw.run('DELETE FROM _chg');
      deferredBuf.push(...send); pending.n = deferredBuf.length; pending.seq++;
      await putEntry({ bytes: raw.export(), version: entry.version + 0.001, stamp: entry.stamp, fetchedAt: Date.now() });   // a hair newer than the sheet, so a refresh already in flight can never replace it
      execCtx.waitUntil(sleep(120).then(() => flushDeferred(env)));
      return;
    }
    // background writes (audit log, e-mail log, sign-in timestamps) are batched into ONE sheet call a moment later,
    // or ride along with the next real save, so they never queue in front of a user's save
    if (db.lazy || send.every(o => LAZY_TABLES.has(o.t))) {
      lazyBuf.push(...send);
      if (!flushScheduled) { flushScheduled = true; execCtx.waitUntil(sleep(1500).then(() => flushLazy(env))); }
      return;
    }
    // a background update (e.g. a sign-in time) queued earlier carries an older copy of its row: drop it when this save rewrites the same row
    const fresh = new Set(send.filter(o => o.op !== 'i').map(o => o.t + '|' + JSON.stringify(o.pk)));
    for (let i = lazyBuf.length - 1; i >= 0; i--) if (lazyBuf[i].op === 'u' && fresh.has(lazyBuf[i].t + '|' + JSON.stringify(lazyBuf[i].pk))) lazyBuf.splice(i, 1);
    const piggy = [];
    for (let i = lazyBuf.length - 1; i >= 0; i--) if (lazyBuf[i].op === 'i' && LAZY_TABLES.has(lazyBuf[i].t)) piggy.unshift(...lazyBuf.splice(i, 1));
    let r;
    try { r = await callScript(env, { action: 'apply', ops: [...piggy, ...send] }); }
    catch (e) {
      lazyBuf.push(...piggy);
      if (e.extra?.code === 'conflict') { await flushDeferred(env).catch(() => {}); await putEntry(await reloadEntry(env)).catch(() => {}); }   // our copy was stale: refresh it
      throw e;
    }
    if (!ok) return;
    for (const e of [...piggy, ...ex]) {              // write-through: keep the cached copy current
      const t = TABLES[e.t];
      raw.run(`INSERT OR REPLACE INTO ${e.t}(${t.cols.map(c => c[0]).join(',')}) VALUES (${t.cols.map(() => '?').join(',')})`, norm(e.row));
    }
    raw.run('DELETE FROM _chg');
    let skipped = 0, known = 0;                         // versions between my copy and my write: were they only our own background writes?
    for (let v = Math.floor(entry.version) + 1; v < r.version; v++) { skipped++; if (harmless.has(v)) known++; }
    if (skipped === known) await putEntry({ bytes: raw.export(), version: r.version, stamp: r.stamp, fetchedAt: Date.now() });
    else await putEntry(await reloadEntry(env));        // someone else saved at the same moment: take a fresh copy so nothing is missing
  };
  db.close = () => { try { raw.close(); } catch {} };
  return db;
}

function all(raw, text, p) {
  const st = raw.prepare(text);
  try { st.bind(p); const rows = []; while (st.step()) rows.push(st.getAsObject()); return rows; } finally { st.free(); }
}
// keep only the final state of each changed row
function coalesce(rows) {
  const m = new Map();
  for (const r of rows) {
    const key = r.t + '|' + r.pk, prev = m.get(key);
    const pk = JSON.parse(r.pk), row = r.row ? JSON.parse(r.row) : null;
    if (r.op === 'd') { if (prev && prev.op === 'i') m.delete(key); else m.set(key, { t: r.t, op: 'd', pk }); }
    else m.set(key, { t: r.t, op: prev && prev.op === 'i' ? 'i' : r.op === 'i' && prev && prev.op === 'd' ? 'u' : r.op, pk, row });
  }
  return [...m.values()];
}

export async function log(db, actorType, actor, role, action, detail, ip) {
  db.addExtra('logs', [newId(), new Date().toISOString(), actorType, actor || null, role || null, action, detail || null, ip || null]);
}
export { callScript };
