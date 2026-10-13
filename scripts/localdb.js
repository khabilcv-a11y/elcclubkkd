// Optional: a throw-away local Postgres (PGlite) so you can try the portal without Supabase.
// Terminal 1: npm run localdb      Terminal 2: put DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres and DATABASE_SSL=off in .dev.vars, then npm run dev
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
const db = await PGlite.create(process.argv[2] || './data/local-pg');
const server = new PGLiteSocketServer({ db, port: 5433, host: '127.0.0.1' });
await server.start();
console.log('Local Postgres listening on 127.0.0.1:5433 (data in ./data/local-pg). Ctrl+C to stop.');
