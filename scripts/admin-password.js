// Reset a staff password:  DATABASE_URL=... npm run admin-password -- <username> <new-password>
import { connect, ensureReady } from '../src/lib/db.js';
import { hashSecret } from '../src/lib/util.js';
const [user, pw] = process.argv.slice(2);
if (!user || !pw || pw.length < 8) { console.log('Usage: npm run admin-password -- <username> <new-password (min 8 chars)>'); process.exit(1); }
const env = { DATABASE_URL: process.env.DATABASE_URL, DATABASE_SSL: process.env.DATABASE_SSL };
const db = connect(env);
await ensureReady(db, env);
const r = await db.run('UPDATE admins SET pass=?,active=1 WHERE username=?', await hashSecret(pw), user.toLowerCase());
console.log(r.changes ? `Password updated for ${user}.` : `No staff account named ${user}.`);
await db.close();
