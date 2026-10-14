// Places each college on the map (needed to sort villages by distance when a college asks for a different village).
// Uses OpenStreetMap's free geocoder politely (1 request / 1.2 s) and caches answers in data/geocode-colleges.json.
// Colleges it cannot find fall back to the position of a village with the same LSGI. Run:  node scripts/geocode-colleges.js [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { open } from './_node-env.js';

const DRY = process.argv.includes('--dry');
const cacheFile = path.resolve(import.meta.dirname, '..', 'data', 'geocode-colleges.json');
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const inKerala = (lat, lng) => lat > 8 && lat < 13 && lng > 74.5 && lng < 77.5;
const clean = s => String(s || '').replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();

async function search(q) {
  const u = new URL('https://nominatim.openstreetmap.org/search');
  u.search = new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'in', viewbox: '75.2,12.0,76.4,11.0', bounded: '0' }).toString();
  try {
    const j = await (await fetch(u, { headers: { 'User-Agent': 'ELC-Kozhikode-portal/1.0 (one-off college placement)' } })).json();
    await sleep(1200);
    const p = j[0] && { lat: Number(j[0].lat), lng: Number(j[0].lon) };
    return p && inKerala(p.lat, p.lng) ? p : null;
  } catch { await sleep(1200); return null; }
}

const { db, done } = await open();
const colleges = await db.all('SELECT id,name,address,lsgi,lat,lng FROM colleges WHERE lat IS NULL OR lng IS NULL ORDER BY name');
const villages = await db.all('SELECT name,lsgi,lat,lng FROM villages WHERE lat IS NOT NULL');
console.log(`${colleges.length} colleges without a position`);
let found = 0, viaVillage = 0, missed = [];
for (const c of colleges) {
  let p = cache[c.id] || null, how = p ? 'cache' : '';
  if (!p) {
    for (const q of [`${clean(c.name)}, Kozhikode, Kerala`, `${clean(c.name)}, Kerala`, clean(c.address) && `${clean(c.address)}, Kerala`].filter(Boolean)) {
      p = await search(q); if (p) { how = 'osm'; break; }
    }
  }
  if (!p && c.lsgi) {
    const key = clean(c.lsgi).toLowerCase().replace(/\b(grama|gram|municipality|corporation|panchayath|panchayat|block)\b/g, '').trim();
    const v = key && villages.find(x => clean(x.lsgi).toLowerCase().includes(key) || clean(x.name).toLowerCase() === key);
    if (v) { p = { lat: v.lat, lng: v.lng }; how = 'village'; viaVillage++; }
  }
  if (!p) { missed.push(c.name); continue; }
  cache[c.id] = p; found++;
  if (!DRY) await db.run('UPDATE colleges SET lat=?,lng=? WHERE id=?', p.lat, p.lng, c.id);
  if (found % 10 === 0) { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(cache)); console.log(`  placed ${found}/${colleges.length}`); }
}
fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(cache));
console.log(`placed ${found} (${viaVillage} by the village of the same LSGI); not found: ${missed.length}`);
if (missed.length) console.log('  ' + missed.join('\n  '));
if (!DRY) await done(); else db.close();
