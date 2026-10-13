// Fills the database with clearly fictional DEMO data (fake phone numbers, example.org emails).
// Usage:  DATABASE_URL=... npm run demo      (only runs on a database with no colleges yet)
import { connect, ensureReady } from '../src/lib/db.js';
import { hashSecret, newPasscode, fmtDate } from '../src/lib/util.js';

const env = { DATABASE_URL: process.env.DATABASE_URL, DATABASE_SSL: process.env.DATABASE_SSL, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD };
const db = connect(env);
await ensureReady(db, env);
if ((await db.get('SELECT COUNT(*) n FROM colleges')).n) { console.log('Database already has colleges - demo skipped.'); await db.close(); process.exit(0); }

const COLLEGES = [
  ['Farook College (Autonomous)', 'Farook', 'Farook College P.O., Kozhikode', 11.1790, 75.8420],
  ['Providence Women\'s College', 'Providence', 'Malaparamba, Kozhikode', 11.2870, 75.7790],
  ['Malabar Christian College', 'MCC', 'Guruvayurappan College Rd, Kozhikode', 11.2660, 75.7880],
  ['Government Arts & Science College', 'Govt A&S', 'Meenchanda, Kozhikode', 11.2400, 75.7790],
  ['Devagiri St. Joseph\'s College', 'Devagiri', 'Medical College P.O., Kozhikode', 11.2780, 75.8290],
  ['Government College Madappally', 'Madappally', 'Madappally, Vadakara', 11.6150, 75.6030],
  ['Government Arts College Koyilandy', 'Koyilandy GAC', 'Koyilandy, Kozhikode', 11.4370, 75.6990],
  ['Markaz Arts & Science College Thamarassery', 'Markaz', 'Karanthur, Thamarassery', 11.3130, 75.9900],
];
const NAMES = ['Aadil', 'Nandana', 'Fidha', 'Arjun', 'Meera', 'Sinan', 'Anjana', 'Rahul', 'Hiba', 'Devika', 'Shahid', 'Gouri', 'Amal', 'Safa', 'Vishnu', 'Lakshmi', 'Nihal', 'Aysha', 'Adithya', 'Fathima'];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const codes = [], now = new Date().toISOString();

await db.tx(async tx => {
  const vill = await tx.all('SELECT id,lat,lng FROM villages');
  for (const [ci, c] of COLLEGES.entries()) {
    const code = newPasscode();
    const cid = await tx.insert(`INSERT INTO colleges(name,short_name,address,phone,email,coordinator,lat,lng,passcode_hash,passcode_sent_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      c[0], c[1], c[2], `0495 270${String(1000 + ci * 37).slice(-4)}`, `elc.${ci + 1}@example.org`, `${pick(NAMES)} (Demo Coordinator)`, c[3], c[4], await hashSecret(code.replace('-', ''), 20000), now, now);
    codes.push([c[0], code]);
    const near = vill.map(v => ({ v, d: Math.hypot(v.lat - c[3], v.lng - c[4]) })).sort((a, b) => a.d - b.d).slice(ci * 3 % 9, ci * 3 % 9 + 5);
    const progress = [1, 0.9, 0.6, 0.35, 0.2, 0.8, 0.5, 0][ci];
    const start = new Date(); start.setDate(start.getDate() - Math.round(15 * progress) - 1);
    let dayN = 0;
    for (const [vi, n] of near.entries()) {
      const ack = progress === 1 && vi < 4;
      await tx.run('INSERT INTO assignments(college_id,village_id,ack_status,ack_name,ack_designation,ack_at,created_at) VALUES (?,?,?,?,?,?,?)',
        cid, n.v.id, ack ? 'acknowledged' : 'none', ack ? 'Demo Village Officer' : null, ack ? 'Village Officer' : null, ack ? now : null, now);
      const pair = [0, 1].map(() => ({ nm: pick(NAMES) + ' K', ph: `9${String(Math.floor(rnd() * 1e9)).padStart(9, '0')}` }));
      for (let k = 0; k < 3; k++, dayN++) {
        const d = new Date(start); d.setDate(d.getDate() + dayN);
        const id = await tx.insert('INSERT INTO days(college_id,village_id,date,created_at) VALUES (?,?,?,?)', cid, n.v.id, fmtDate(d), now);
        const done = d <= new Date();
        for (const [s, p] of pair.entries()) {
          const present = done ? (rnd() > 0.12 ? 1 : 0) : null, addr = present ? 25 + Math.floor(rnd() * 90) : 0;
          await tx.run('INSERT INTO volunteers(day_id,slot,name,contact,attended,addressed,registered) VALUES (?,?,?,?,?,?,?)', id, s, p.nm, p.ph, present, addr, present ? Math.floor(addr * (0.2 + rnd() * 0.45)) : 0);
        }
      }
    }
  }
});
await db.close();
console.log('\nDemo data created. College passcodes (fictional colleges, for testing only):');
codes.forEach(([n, c]) => console.log(`  ${c}   ${n}`));
