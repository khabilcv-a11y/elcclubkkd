// Shared bootstrap for the command-line scripts: load .dev.vars / environment, start the SQL engine, open the database.
import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';
import { setEngine } from '../src/lib/store.js';
import { openDb } from '../src/lib/db.js';

export function loadEnv() {
  const env = { ...process.env, SKIP_SETUP: '1' };       // scripts assume the sheet is already prepared (run "npm run migrate" after a schema change)
  const f = path.resolve(import.meta.dirname, '..', '.dev.vars');
  if (fs.existsSync(f)) for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return env;
}
export async function open() {
  const env = loadEnv();
  setEngine(await initSqlJs());
  const pending = [];
  const db = await openDb(env, { waitUntil: p => pending.push(p) });
  return { env, db, done: async () => { await db.finish(true); await Promise.allSettled(pending); db.close(); } };
}
