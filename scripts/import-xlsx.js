// Import the colleges / villages / allotments list from the district spreadsheet into the Google Sheet database.
//   npm install xlsx --no-save                     (once, only needed for this script)
//   node scripts/import-xlsx.js <file.xlsx> --dry   show what would happen, change nothing
//   node scripts/import-xlsx.js <file.xlsx> --geocode --prune
// Safe to run again: colleges and villages are matched by name and updated, allotments are matched by village.
// Columns expected: Sl No | College | College Address | College Email | College Contact | Located LSGI | Assigned LSGI | Village | Village Office Address | Village Office Contact | Distance (km)
import fs from 'node:fs';
import path from 'node:path';
import { open } from './_node-env.js';

const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--'));
const DRY = args.includes('--dry'), GEO = args.includes('--geocode'), PRUNE = args.includes('--prune');
if (!file) { console.log('Usage: node scripts/import-xlsx.js <file.xlsx> [--dry] [--geocode] [--prune]'); process.exit(1); }
let XLSX; try { XLSX = (await import('xlsx')).default; } catch { console.log('Run "npm install xlsx --no-save" first.'); process.exit(1); }

// ---------- read the spreadsheet ----------
const wb = XLSX.readFile(file), ws = wb.Sheets[wb.SheetNames[0]];
const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
const hi = grid.findIndex(r => String(r[1]).trim().toLowerCase() === 'college' && /village/i.test(String(r[7])));
if (hi < 0) throw new Error('Could not find the header row (expected "College" in column B and "Village" in column H)');
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const rows = grid.slice(hi + 1).filter(r => clean(r[1]) && clean(r[7])).map(r => {
  const raw = clean(r[10]), km = parseFloat(raw);
  return { college: clean(r[1]), address: clean(r[2]), email: clean(r[3]).toLowerCase(), phone: clean(r[4]), collegeLsgi: clean(r[5]), villageLsgi: clean(r[6]),
    village: clean(r[7]), officeAddress: clean(r[8]), officePhone: clean(r[9]),
    km: Number.isFinite(km) ? km : null, kmNote: /\*/.test(raw) ? 'approximate' : Number.isFinite(km) ? null : (raw ? raw.toLowerCase() : 'not available') };
});
const norm = s => clean(s).toLowerCase().replace(/[^a-z]/g, '');
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
const shortName = n => { let s = n.split(',')[0].trim(); if (s.length > 34) { s = s.slice(0, 34); s = s.slice(0, s.lastIndexOf(' ')); } return s; };

const colleges = new Map(), villages = new Map();
for (const r of rows) {
  if (!colleges.has(r.college)) colleges.set(r.college, r);
  if (villages.has(r.village)) console.log('! village listed twice:', r.village);
  villages.set(r.village, r);
}
console.log(`Spreadsheet: ${rows.length} allotment rows | ${colleges.size} colleges | ${villages.size} villages`);

// ---------- optional: place villages on the map using OpenStreetMap's free geocoder (cached, polite 1 request / 1.2 s) ----------
const cacheFile = path.resolve(import.meta.dirname, '..', 'data', 'geocode-cache.json');
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
const inDistrict = (la, lo) => la > 10.95 && la < 11.9 && lo > 75.45 && lo < 76.25;
async function geocode(v) {
  if (cache[v.village] !== undefined) return cache[v.village];
  const pin = (v.officeAddress.match(/\b67[3-5]\d{3}\b/) || [])[0];
  for (const q of [`${v.village}, ${pin || ''}, Kozhikode, Kerala`, pin ? `${pin}, Kerala, India` : null, `${v.village}, Kozhikode, Kerala`]) {
    if (!q) continue;
    const u = new URL('https://nominatim.openstreetmap.org/search');
    u.searchParams.set('format', 'jsonv2'); u.searchParams.set('limit', '1'); u.searchParams.set('countrycodes', 'in'); u.searchParams.set('q', q);
    await new Promise(r => setTimeout(r, 1200));
    try {
      const j = await (await fetch(u, { headers: { 'User-Agent': 'ELC-Kozhikode-portal/1.0 (one-off import)' } })).json();
      if (j[0] && inDistrict(+j[0].lat, +j[0].lon)) return (cache[v.village] = [Math.round(+j[0].lat * 1e5) / 1e5, Math.round(+j[0].lon * 1e5) / 1e5]);
    } catch { /* try the next query */ }
  }
  return (cache[v.village] = null);
}
const GEO_ONLY = args.includes('--geocode-only');
if ((GEO && !DRY) || GEO_ONLY) {
  let n = 0;
  for (const v of villages.values()) { await geocode(v); if (++n % 20 === 0) { console.log(`  geocoded ${n}/${villages.size}`); fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(cache)); } }
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(cache));
  console.log(`  map positions found for ${[...villages.keys()].filter(k => cache[k]).length} of ${villages.size} villages`);
}

if (GEO_ONLY) process.exit(0);

// ---------- write to the database ----------
const { db, done } = await open();
const now = new Date().toISOString();
const dbColleges = await db.all('SELECT id,name FROM colleges'), dbVillages = await db.all('SELECT id,name,taluk,lat,lng FROM villages');
const dbAsg = await db.all('SELECT id,college_id,village_id FROM assignments');
const sample = dbColleges.find(c => /^DCIP College of Tharikida/i.test(c.name));
const plan = { collegesNew: 0, collegesUpd: 0, villagesNew: 0, villagesUpd: 0, villagesPruned: 0, asgNew: 0, asgUpd: 0, conflicts: [] };

// free the sample college's villages (they belong to real colleges now) and give it three clearly-named test villages
const sampleFreed = sample ? dbAsg.filter(a => a.college_id === sample.id) : [];
if (sample && !DRY) {
  for (const a of sampleFreed) await db.run('DELETE FROM assignments WHERE id=?', a.id);
  await db.run('DELETE FROM days WHERE college_id=?', sample.id);      // its old test schedule belonged to those villages (volunteers and photos go with it)
}
const freeNow = new Set(dbAsg.filter(a => !sampleFreed.some(s => s.id === a.id)).map(a => a.village_id));

// colleges
const collegeId = new Map();
for (const [name, r] of colleges) {
  const ex = dbColleges.find(c => clean(c.name).toLowerCase() === name.toLowerCase());
  if (ex) {
    plan.collegesUpd++; collegeId.set(name, ex.id);
    if (!DRY) await db.run('UPDATE colleges SET short_name=?,address=?,phone=?,email=?,lsgi=? WHERE id=?', shortName(name), r.address, r.phone, r.email, r.collegeLsgi, ex.id);
  } else {
    plan.collegesNew++;
    if (!DRY) collegeId.set(name, await db.insert('INSERT INTO colleges(name,short_name,address,phone,email,lsgi,created_at) VALUES (?,?,?,?,?,?,?)', name, shortName(name), r.address, r.phone, r.email, r.collegeLsgi, now));
  }
}

// villages: reuse an existing record when the name matches (spelling differences allowed), keep its map position / taluk
const used = new Set(), villageId = new Map(), known = dbVillages.filter(v => v.taluk && v.lat != null);
const match = name => {
  const n = norm(name);
  let hit = dbVillages.find(v => !used.has(v.id) && norm(v.name) === n);
  if (!hit) { const c = dbVillages.filter(v => !used.has(v.id)).map(v => ({ v, d: lev(norm(v.name), n) })).filter(x => x.d <= 2 && n.length > 5).sort((a, b) => a.d - b.d); if (c[0] && (!c[1] || c[1].d > c[0].d)) hit = c[0].v; }
  return hit;
};
const nearTaluk = (la, lo) => { let best = null, bd = 1e9; for (const k of known) { const d = Math.hypot(k.lat - la, (k.lng - lo) * 0.98); if (d < bd) { bd = d; best = k; } } return best && bd < 0.14 ? best.taluk : ''; };
for (const [name, r] of villages) {
  const ex = match(name); if (ex) used.add(ex.id);
  let lat = ex?.lat ?? null, lng = ex?.lng ?? null;
  if (lat == null && cache[name]) [lat, lng] = cache[name];
  const taluk = ex?.taluk || (lat != null ? nearTaluk(lat, lng) : '');
  if (ex) {
    plan.villagesUpd++; villageId.set(name, ex.id);
    if (!DRY) await db.run('UPDATE villages SET name=?,taluk=?,lat=?,lng=?,lsgi=?,office_address=?,office_phone=? WHERE id=?', name, taluk, lat, lng, r.villageLsgi, r.officeAddress, r.officePhone, ex.id);
  } else {
    plan.villagesNew++;
    if (!DRY) villageId.set(name, await db.insert('INSERT INTO villages(name,taluk,lat,lng,lsgi,office_address,office_phone) VALUES (?,?,?,?,?,?,?)', name, taluk, lat, lng, r.villageLsgi, r.officeAddress, r.officePhone));
  }
}
// starter villages that are not in the district list (and nobody holds) are removed
if (PRUNE) for (const v of dbVillages.filter(v => !used.has(v.id) && !freeNow.has(v.id))) { plan.villagesPruned++; if (!DRY) await db.run('DELETE FROM villages WHERE id=?', v.id); }

// allotments
const bySample = new Set(sampleFreed.map(a => a.village_id));
for (const r of rows) {
  const cid = collegeId.get(r.college), vid = villageId.get(r.village);
  const ex = dbAsg.find(a => a.village_id === vid && !bySample.has(a.village_id));
  if (DRY) { ex ? (ex.college_id === cid ? plan.asgUpd++ : plan.conflicts.push(`${r.village}: held by another college already`)) : plan.asgNew++; continue; }
  if (ex && ex.college_id !== cid) { plan.conflicts.push(`${r.village}: already held by another college, skipped`); continue; }
  if (ex) { plan.asgUpd++; await db.run('UPDATE assignments SET distance_km=?,distance_note=? WHERE id=?', r.km, r.kmNote, ex.id); }
  else { plan.asgNew++; await db.run('INSERT INTO assignments(college_id,village_id,distance_km,distance_note,created_at) VALUES (?,?,?,?,?)', cid, vid, r.km, r.kmNote, now); }
}
// the sample college keeps working for testing, with three obvious test villages
if (sample && !DRY && !(await db.get("SELECT 1 x FROM villages WHERE name LIKE 'TEST Village%'"))) {
  for (let i = 1; i <= 3; i++) {
    const vid = await db.insert('INSERT INTO villages(name,taluk,lat,lng,lsgi) VALUES (?,?,?,?,?)', `TEST Village ${i} (delete me)`, 'Thamarassery', 11.3 + i * 0.01, 75.98, 'Sample only');
    await db.run('INSERT INTO assignments(college_id,village_id,created_at) VALUES (?,?,?)', sample.id, vid, now);
  }
}
console.log(DRY ? '\nDRY RUN (nothing written):' : '\nImported:', JSON.stringify(plan, null, 1));
if (!DRY) await done(); else db.close();
