// The Durable Object that runs the portal. One instance ("main") owns the live copy of the sheet, so every request is
// handled by a single writer: no cache races, and the heavy work (rebuilding the copy, password hashing) gets the Durable
// Object's CPU allowance instead of the 10 ms a plain free-plan request gets. Its storage is free (SQLite-backed).
import initSqlJs from 'sql.js/dist/sql-wasm.js';
import wasm from 'sql.js/dist/sql-wasm.wasm';
import { setEngine, setBackend, refreshNow } from './lib/store.js';
import { handle } from './app.js';
import { HttpError } from './lib/util.js';

// sql.js looks for self.location when it starts up; Workers don't define it
globalThis.location ??= { href: 'https://elc.local/' };
let engineReady = null;
const initEngine = () => engineReady ||= initSqlJs({ instantiateWasm(imports, ok) { WebAssembly.instantiate(wasm, imports).then(i => ok(i)); return {}; } }).then(setEngine);

const SAVE_GAP_MS = 20000;
const CHUNK = 900 * 1024;     // keep every stored value comfortably under the per-value limit

export class Portal {
  constructor(state, env) {
    this.state = state; this.env = env; this.writeLock = Promise.resolve();
    const st = state.storage;
    setBackend({
      async get() {
        try {
          const m = await st.get('meta');
          if (!m) return null;
          const parts = []; let len = 0;
          for (let i = 0; i < m.n; i++) { const p = await st.get('db' + i); if (!p) return null; parts.push(p); len += p.length; }
          const bytes = new Uint8Array(len); let o = 0;
          for (const p of parts) { bytes.set(p, o); o += p.length; }
          return { bytes, version: m.version, stamp: m.stamp, fetchedAt: m.fetchedAt, schema: m.schema };
        } catch (err) { console.error('storage read refused, loading from the sheet instead:', err.message); return null; }   // the daily allowance is used up: fall back to the sheet
      },
      // The Durable Object's storage is only a copy for fast restarts (the Google Sheet is the record), and the free plan allows 100,000 row writes a day.
      // So saves are gathered: at most one every SAVE_GAP_MS, however many changes arrive, and a refused write (limit reached) never breaks a request.
      put: (e, withBytes) => this.persist(e, withBytes),
    });
  }
  persist(e, withBytes) {
    this.latest = e; this.needBytes = this.needBytes || !!withBytes;
    if (this.saveTimer) return;
    const wait = Math.max(0, (this.lastSave || 0) + SAVE_GAP_MS - Date.now());
    if (!wait) return this.flushSave();
    this.saveTimer = new Promise(res => setTimeout(async () => { this.saveTimer = null; await this.flushSave(); res(); }, wait));
    this.state.waitUntil(this.saveTimer);
  }
  async flushSave() {
    const e = this.latest, withBytes = this.needBytes, st = this.state.storage; this.needBytes = false; this.lastSave = Date.now();
    try {
      const old = await st.get('meta'), n = Math.ceil(e.bytes.length / CHUNK);
      const rec = { meta: { n, version: e.version, stamp: e.stamp, fetchedAt: e.fetchedAt, schema: e.schema } };
      if (withBytes || !old || old.n !== n) for (let i = 0; i < n; i++) rec['db' + i] = e.bytes.slice(i * CHUNK, (i + 1) * CHUNK);
      await st.put(rec);
      if (old && old.n > n) await st.delete(Array.from({ length: old.n - n }, (_, i) => 'db' + (n + i)));
    } catch (err) { this.needBytes = this.needBytes || withBytes; console.error('storage save skipped:', err.message); }
  }

  // login attempt limiter, kept in this object's storage so it survives the object sleeping
  async throttle(key, max = 8, windowMs = 600000) {
    const k = 'thr:' + key, now = Date.now(); this.thr ||= new Map();
    let r = this.thr.get(k);
    if (!r) { try { r = await this.state.storage.get(k); } catch { r = null; } }
    if (!r || r.until < now) r = { n: 0, until: now + windowMs };
    if (r.n >= max) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
    r.n++; this.thr.set(k, r);
    try { await this.state.storage.put(k, r); } catch { /* the daily write allowance is used up: the in-memory count still limits attempts */ }
  }
  clearThrottle(key) { this.thr?.delete('thr:' + key); return this.state.storage.delete('thr:' + key).catch(() => {}); }

  async fetch(req) {
    await initEngine();
    const url = new URL(req.url);
    const execCtx = { waitUntil: p => this.state.waitUntil(p) };
    if (url.pathname === '/__refresh') {                       // called by the 5-minute scheduled job
      this.state.waitUntil(refreshNow(this.env).then(r => console.log('keep-warm:', r)).catch(e => console.error('keep-warm failed', e.message)));
      return new Response('ok');
    }
    const extra = { throttle: (k, a, b) => this.throttle(k, a, b), clearThrottle: k => this.clearThrottle(k) };
    if (req.method === 'GET') return handle(req, this.env, execCtx, extra);      // reads run side by side
    // writes go one at a time, so two saves can never start from the same copy
    const run = this.writeLock.then(() => handle(req, this.env, execCtx, extra));
    this.writeLock = run.then(() => {}, () => {});
    return run;
  }
}
