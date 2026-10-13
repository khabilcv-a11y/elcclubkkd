import postgres from 'postgres';
import { VILLAGES } from './villages.js';
import { SCHEMA } from './schema.js';
import { hashSecret } from './util.js';

// One short-lived connection per request (Workers can't share sockets across requests).
// Use the Supabase *transaction pooler* URL (port 6543) in production.
export function connect(env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const sql = postgres(env.DATABASE_URL, {
    prepare: false, max: 1, fetch_types: false, idle_timeout: 5, connect_timeout: 10, onnotice() {},
    ssl: env.DATABASE_SSL === 'off' ? false : 'require',
    types: { bigint: { to: 20, from: [20], parse: Number, serialize: String } },
  });
  const wrap = s => {
    const run = async (text, p) => s.unsafe(text.replace(/\?/g, (() => { let i = 0; return () => `$${++i}`; })()), p.map(v => (v === undefined ? null : v)));
    return {
      all: async (text, ...p) => [...await run(text, p)],
      get: async (text, ...p) => (await run(text, p))[0],
      run: async (text, ...p) => ({ changes: (await run(text, p)).count }),
      insert: async (text, ...p) => (await run(text + ' RETURNING id', p))[0].id,
    };
  };
  const db = wrap(sql);
  db.tx = fn => sql.begin(s => fn(wrap(s)));
  db.close = () => sql.end({ timeout: 1 }).catch(() => {});
  return db;
}

export async function log(db, actorType, actor, role, action, detail, ip) {
  await db.run('INSERT INTO logs(ts,actor_type,actor,role,action,detail,ip) VALUES (?,?,?,?,?,?,?)',
    new Date().toISOString(), actorType, actor || null, role || null, action, detail || null, ip || null);
}

// Creates tables on first run, loads the village list, creates the first super admin from ADMIN_PASSWORD.
let ready = null;
export function ensureReady(db, env) {
  if (!ready) ready = boot(db, env).catch(e => { ready = null; throw e; });
  return ready;
}
async function boot(db, env) {
  const t = await db.get("SELECT to_regclass('public.admins') t");
  if (!t.t) await db.tx(async tx => { for (const stmt of SCHEMA.split(';\n').map(s => s.trim()).filter(Boolean)) await tx.run(stmt); });
  if (!(await db.get('SELECT COUNT(*) n FROM villages')).n)
    await db.tx(async tx => { for (const v of VILLAGES) await tx.run('INSERT INTO villages(name,taluk,lat,lng) VALUES (?,?,?,?) ON CONFLICT DO NOTHING', v[0], v[1], v[2], v[3]); });
  if (!(await db.get('SELECT COUNT(*) n FROM admins')).n && env.ADMIN_PASSWORD) {
    await db.run("INSERT INTO admins(username,name,role,pass,created_at) VALUES ('superadmin','Super Admin','super_admin',?,?)", await hashSecret(env.ADMIN_PASSWORD), new Date().toISOString());
  }
  await db.run('DELETE FROM sessions WHERE expires < ?', Date.now());
}
