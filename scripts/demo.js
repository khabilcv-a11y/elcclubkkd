// Fills the sheet with clearly fictional DEMO data (fake phone numbers, example.org emails) using the real model:
// each village gets 15 field days, 2 students a day, rotating from the college's own student list.
// Usage:  npm run demo      (only runs when there are no colleges yet)
import { open } from './_node-env.js';
import { hashSecret, newPasscode, fmtDate } from '../src/lib/util.js';
import { planRoster, workingDates } from '../src/lib/roster.js';

const { db, done } = await open();
if ((await db.get('SELECT COUNT(*) n FROM colleges')).n) { console.log('Already has colleges - demo skipped.'); await done(); process.exit(0); }

const COLLEGES = [
  ['Farook College (Autonomous)', 'Farook', 'Farook College P.O., Kozhikode', 11.1790, 75.8420, 2],
  ['Providence Women\'s College', 'Providence', 'Malaparamba, Kozhikode', 11.2870, 75.7790, 2],
  ['Malabar Christian College', 'MCC', 'Guruvayurappan College Rd, Kozhikode', 11.2660, 75.7880, 1],
  ['Government Arts & Science College', 'Govt A&S', 'Meenchanda, Kozhikode', 11.2400, 75.7790, 2],
  ['Devagiri St. Joseph\'s College', 'Devagiri', 'Medical College P.O., Kozhikode', 11.2780, 75.8290, 3],
  ['Government College Madappally', 'Madappally', 'Madappally, Vadakara', 11.6150, 75.6030, 2],
  ['Government Arts College Koyilandy', 'Koyilandy GAC', 'Koyilandy, Kozhikode', 11.4370, 75.6990, 1],
  ['Markaz Arts & Science College Thamarassery', 'Markaz', 'Karanthur, Thamarassery', 11.3130, 75.9900, 2],
];
const NAMES = ['Aadil', 'Nandana', 'Fidha', 'Arjun', 'Meera', 'Sinan', 'Anjana', 'Rahul', 'Hiba', 'Devika', 'Shahid', 'Gouri', 'Amal', 'Safa', 'Vishnu', 'Lakshmi', 'Nihal', 'Aysha', 'Adithya', 'Fathima'];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const codes = [], now = new Date().toISOString(), taken = new Set(), today = fmtDate(new Date());
const vill = await db.all('SELECT id,lat,lng FROM villages WHERE lat IS NOT NULL');

for (const [ci, c] of COLLEGES.entries()) {
  const code = newPasscode(), nv = c[5];
  const cid = await db.insert('INSERT INTO colleges(name,short_name,address,phone,email,coordinator,lat,lng,passcode_hash,passcode_sent_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    c[0], c[1], c[2], `0495 270${String(1000 + ci * 37).slice(-4)}`, `elc.${ci + 1}@example.org`, `${pick(NAMES)} (Demo Coordinator)`, c[3], c[4], await hashSecret(code.replace('-', ''), 20000), now, now);
  codes.push([c[0], code]);
  const pool = [];
  for (let i = 0; i < nv * 4; i++) {            // 4 students per village
    const s = { name: `${pick(NAMES)} ${String.fromCharCode(65 + i)}.`, contact: `9${String(Math.floor(rnd() * 1e9)).padStart(9, '0')}` };
    await db.run('INSERT INTO pool(college_id,name,contact,active,created_at) VALUES (?,?,?,1,?)', cid, s.name, s.contact, now); pool.push(s);
  }
  const near = vill.filter(v => !taken.has(v.id)).map(v => ({ v, d: Math.hypot(v.lat - c[3], v.lng - c[4]) })).sort((a, b) => a.d - b.d).slice(0, nv);
  const progress = [1, 0.9, 0.6, 0.35, 0.2, 0.8, 0.5, 0][ci];
  const start = new Date(); start.setDate(start.getDate() - Math.round(15 * progress) - 1);
  const dates = workingDates(fmtDate(start), 15, false), villageDays = [];
  for (const [vi, n] of near.entries()) {
    taken.add(n.v.id);
    const ack = progress === 1 && vi === 0;
    await db.run('INSERT INTO assignments(college_id,village_id,ack_status,ack_name,ack_designation,ack_at,created_at,distance_km) VALUES (?,?,?,?,?,?,?,?)',
      cid, n.v.id, ack ? 'acknowledged' : 'none', ack ? 'Demo Village Officer' : null, ack ? 'Village Officer' : null, ack ? now : null, now, Math.round((2 + rnd() * 9) * 10) / 10);
    const days = [];
    for (const date of dates) days.push({ dayId: await db.insert('INSERT INTO days(college_id,village_id,date,created_at) VALUES (?,?,?,?)', cid, n.v.id, date, now), date });
    villageDays.push({ villageId: n.v.id, days });
  }
  for (const p of planRoster(pool, villageDays, 3).plan) {
    const date = villageDays.flatMap(v => v.days).find(d => d.dayId === p.dayId).date, past = date <= today;
    for (const [slot, st] of p.students.entries()) {
      const present = past ? (rnd() > 0.12 ? 1 : 0) : null, addr = present ? 25 + Math.floor(rnd() * 90) : 0;
      await db.run('INSERT INTO volunteers(day_id,slot,name,contact,attended,addressed,registered) VALUES (?,?,?,?,?,?,?)', p.dayId, slot, st.name, st.contact, present, addr, present ? Math.floor(addr * (0.2 + rnd() * 0.45)) : 0);
    }
  }
}
await done();
console.log('\nDemo data created. College passcodes (fictional colleges, for testing only):');
codes.forEach(([n, c]) => console.log(`  ${c}   ${n}`));
