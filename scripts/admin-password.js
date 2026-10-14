// Reset a staff password:  npm run admin-password -- <username> <new-password>
import { open } from './_node-env.js';
import { hashSecret } from '../src/lib/util.js';
const [user, pw] = process.argv.slice(2);
if (!user || !pw || pw.length < 8) { console.log('Usage: npm run admin-password -- <username> <new-password (min 8 chars)>'); process.exit(1); }
const { db, done } = await open();
const r = await db.run('UPDATE admins SET pass=?,active=1 WHERE username=?', await hashSecret(pw), user.toLowerCase());
await done();
console.log(r.changes ? `Password updated for ${user}.` : `No staff account named ${user}.`);
