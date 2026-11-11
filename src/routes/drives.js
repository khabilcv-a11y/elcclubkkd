// Vote Unnathi, Sea Your Vote and the Vote Unbound welfare institutions: the places of each drive, their allotment to institutions, and the visits an institution records. Only the
// units allotted to an institution are ever sent to it, and it can only record visits for those.
import { route } from '../lib/router.js';
import { log } from '../lib/db.js';
import { HttpError, bad, nowIso, str, isDate, todayStr } from '../lib/util.js';
import { normName } from '../lib/ac.js';
import { lsgdInfo } from './pwd.js';
import { DRIVES, STATUS } from '../lib/drives.js';

const OPS = ['super_admin', 'admin'];
const drive = ctx => { const d = DRIVES[ctx.params.drive]; if (!d) throw new HttpError(404, 'Not found'); return d; };
const slog = (ctx, a, d) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, a, d, ctx.ip);
const clog = (ctx, a, d) => log(ctx.db, 'college', ctx.college.name, null, a, d, ctx.ip);
const whole = (v, max = 1e6) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= max ? n : 0; };
const ukey = u => `${normName(u.name)}|${normName(u.lsgd)}|${u.ward}`;
// the volunteers of a visit, kept as a JSON list of names
const volsOf = v => { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a.map(String) : []; } catch { return []; } };
function cleanVols(v) {
  const list = Array.isArray(v) ? v : String(v || '').split(/[,\n;]/), seen = new Set(), out = [];
  for (const x of list) { const nm = str(x, 80), key = nm.toLowerCase(); if (nm && !seen.has(key)) { seen.add(key); out.push(nm); } if (out.length >= 80) break; }
  return out;
}
// names this institution has used before (earlier drive visits, help desk and other activities, its student list), most recent first
async function knownNames(db, collegeId) {
  const [visits, acts, pool] = await Promise.all([db.all('SELECT volunteers FROM drive_visits WHERE college_id=? ORDER BY id DESC LIMIT 200', collegeId),
    db.all('SELECT name,MAX(date) last FROM activity_log WHERE college_id=? GROUP BY name ORDER BY last DESC LIMIT 300', collegeId), db.all('SELECT name FROM pool WHERE college_id=? AND active=1 ORDER BY name', collegeId)]);
  const seen = new Set(), out = [];
  for (const nm of [...visits.flatMap(v => volsOf(v.volunteers)), ...acts.map(r => r.name), ...pool.map(r => r.name)]) { const t = String(nm || '').trim(), key = t.toLowerCase(); if (key && !seen.has(key)) { seen.add(key); out.push(t); } }
  return out.slice(0, 500);
}
async function logVols(db, collegeId, date, driveName, names) {
  let n = 0;
  for (const nm of names) {
    if (await db.get("SELECT 1 x FROM activity_log WHERE college_id=? AND date=? AND activity='Other' AND COALESCE(activity_other,'')=? AND lower(name)=lower(?)", collegeId, date, driveName, nm)) continue;
    await db.insert('INSERT INTO activity_log(college_id,date,activity,activity_other,name,contact,created_at) VALUES (?,?,?,?,?,?,?)', collegeId, date, 'Other', driveName, nm, '', nowIso()); n++;
  }
  return n;
}
const phoneOf = v => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : ''; };
function cleanUnit(r, d) {
  const name = str(r.name, 120); if (!name) return null;
  const kind = d.kinds.find(k => k.toLowerCase() === String(r.kind || '').trim().toLowerCase()) || str(r.kind, 40) || d.kinds[0];
  const u = { name, kind, lsgd: str(r.lsgd, 100) ? lsgdInfo(r.lsgd).name : '', ward: String(r.ward || '').trim().replace(/^0+(?=\d)/, '').slice(0, 12), village: str(r.village, 80), address: str(r.address, 200),
    population: whole(r.population), households: whole(r.households), contact_name: str(r.contact_name, 80), contact_phone: phoneOf(r.contact_phone), note: str(r.note, 300) };
  return { ...u, ukey: ukey(u) };
}
const unitCols = 'id,name,kind,lsgd,ward,village,address,population,households,contact_name,contact_phone,note';
const INS = 'INSERT INTO drive_units(drive,ukey,name,kind,lsgd,ward,village,address,population,households,contact_name,contact_phone,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
const insUnit = (ctx, k, u) => ctx.db.insert(INS, k, u.ukey, u.name, u.kind, u.lsgd, u.ward, u.village, u.address, u.population, u.households, u.contact_name, u.contact_phone, u.note, nowIso());
const insAlloc = (ctx, k, unitId, collegeId) => ctx.db.insert("INSERT INTO drive_alloc(drive,unit_id,college_id,status,created_by,created_at,updated_at) VALUES (?,?,?,'todo',?,?,?)", k, unitId, collegeId, ctx.user.username, nowIso(), nowIso());

// ======================================================================= the district (staff)
route('GET', '/api/staff/drives/:drive/overview', 'staff', async ctx => {
  const d = drive(ctx), k = ctx.params.drive;
  const [units, allots, colleges, vis] = await Promise.all([ctx.db.all(`SELECT ${unitCols} FROM drive_units WHERE drive=? ORDER BY lsgd,name`, k),
    ctx.db.all('SELECT a.id,a.unit_id,a.college_id,a.status,c.name college FROM drive_alloc a JOIN colleges c ON c.id=a.college_id WHERE a.drive=?', k),
    ctx.db.all("SELECT id,name,COALESCE(kind,'college') kind,COALESCE(lsgi,'') lsgi FROM colleges WHERE active=1 AND COALESCE(kind,'college')='college' ORDER BY name"),
    ctx.db.all('SELECT unit_id,COUNT(*) n,COALESCE(SUM(people),0) people,COALESCE(SUM(registered),0) registered,MAX(on_date) last FROM drive_visits WHERE drive=? GROUP BY unit_id', k)]);
  const al = new Map(allots.map(a => [a.unit_id, a])), vm = new Map(vis.map(v => [v.unit_id, v]));
  const out = units.map(u => { const a = al.get(u.id), v = vm.get(u.id) || {}; return { ...u, alloc_id: a?.id || null, college_id: a?.college_id || null, college: a?.college || '', status: a ? a.status : '', visits: v.n || 0, people: v.people || 0, registered: v.registered || 0, last: v.last || '' }; });
  const prog = new Map();
  for (const u of out) if (u.college_id) { if (!prog.has(u.college_id)) prog.set(u.college_id, { id: u.college_id, name: u.college, units: 0, doing: 0, done: 0, visits: 0, people: 0, registered: 0, last: '' }); const p = prog.get(u.college_id); p.units++; if (u.status === 'doing') p.doing++; if (u.status === 'done') p.done++; p.visits += u.visits; p.people += u.people; p.registered += u.registered; if (u.last > p.last) p.last = u.last; }
  const recent = await ctx.db.all('SELECT v.id,v.unit_id,v.on_date,v.type,v.people,v.registered,v.note,v.by_name,v.volunteers,v.college_id,c.name college,u.name unit FROM drive_visits v JOIN colleges c ON c.id=v.college_id LEFT JOIN drive_units u ON u.id=v.unit_id WHERE v.drive=? ORDER BY v.id DESC LIMIT 25', k);
  for (const r of recent) r.volunteers = volsOf(r.volunteers);
  return { cfg: d, status: STATUS, units: out, colleges: colleges.map(c => ({ id: c.id, name: c.name, lsgi: c.lsgi })), progress: [...prog.values()].sort((a, b) => a.name.localeCompare(b.name)), recent,
    totals: { units: out.length, allotted: out.filter(u => u.college_id).length, started: out.filter(u => u.visits || u.status === 'doing' || u.status === 'done').length, done: out.filter(u => u.status === 'done').length, people: out.reduce((s, u) => s + u.people, 0), registered: out.reduce((s, u) => s + u.registered, 0), population: out.reduce((s, u) => s + u.population, 0) } };
});
route('POST', '/api/staff/drives/:drive/import', OPS, async ctx => {
  const d = drive(ctx), k = ctx.params.drive, rows = (Array.isArray(ctx.body.rows) ? ctx.body.rows : []).slice(0, 800).map(r => cleanUnit(r, d)).filter(Boolean);
  if (!rows.length) throw bad('No usable rows in this part of the file');
  let added = 0, updated = 0;
  for (const u of rows) {
    const ex = await ctx.db.get('SELECT id FROM drive_units WHERE drive=? AND ukey=?', k, u.ukey);
    if (ex) { await ctx.db.run('UPDATE drive_units SET kind=?,village=?,address=?,population=?,households=?,contact_name=?,contact_phone=?,note=? WHERE id=?', u.kind, u.village, u.address, u.population, u.households, u.contact_name, u.contact_phone, u.note, ex.id); updated++; }
    else { await insUnit(ctx, k, u); added++; }
  }
  if (ctx.body.first) await slog(ctx, `${k}_import`, 'started an import');
  return { ok: true, added, updated, skipped: (ctx.body.rows || []).length - rows.length };
});
route('POST', '/api/staff/drives/:drive/unit', OPS, async ctx => {
  const d = drive(ctx), k = ctx.params.drive, u = cleanUnit(ctx.body, d); if (!u) throw bad(`Give the ${d.unit} a name`);
  const id = Number(ctx.body.id) || 0, same = await ctx.db.get('SELECT id FROM drive_units WHERE drive=? AND ukey=?', k, u.ukey);
  if (same && same.id !== id) throw bad(`This ${d.unit} is already in the list`);
  if (id) {
    if (!await ctx.db.get('SELECT id FROM drive_units WHERE id=? AND drive=?', id, k)) throw new HttpError(404, 'Not found');
    await ctx.db.run('UPDATE drive_units SET ukey=?,name=?,kind=?,lsgd=?,ward=?,village=?,address=?,population=?,households=?,contact_name=?,contact_phone=?,note=? WHERE id=?', u.ukey, u.name, u.kind, u.lsgd, u.ward, u.village, u.address, u.population, u.households, u.contact_name, u.contact_phone, u.note, id);
  } else await insUnit(ctx, k, u);
  await slog(ctx, `${k}_unit`, `${id ? 'edited' : 'added'} ${u.name}`); return { ok: true };
});
route('POST', '/api/staff/drives/:drive/units/remove', OPS, async ctx => {
  drive(ctx); const k = ctx.params.drive, ids = [...new Set((Array.isArray(ctx.body.ids) ? ctx.body.ids : []).map(Number).filter(Number.isInteger))].slice(0, 5000);
  if (!ids.length) throw bad('Choose at least one entry'); let n = 0;
  for (const id of ids) {
    if (!await ctx.db.get('SELECT id FROM drive_units WHERE id=? AND drive=?', id, k)) continue;
    await ctx.db.run('DELETE FROM drive_visits WHERE unit_id=?', id); await ctx.db.run('DELETE FROM drive_alloc WHERE unit_id=?', id); await ctx.db.run('DELETE FROM drive_units WHERE id=?', id); n++;
  }
  await slog(ctx, `${k}_unit_del`, `${n} entries removed`); return { ok: true, n };
});
route('DELETE', '/api/staff/drives/:drive/unit/:id', OPS, async ctx => {
  drive(ctx); const k = ctx.params.drive, id = Number(ctx.params.id), u = await ctx.db.get('SELECT id,name FROM drive_units WHERE id=? AND drive=?', id, k); if (!u) throw new HttpError(404, 'Not found');
  await ctx.db.run('DELETE FROM drive_visits WHERE unit_id=?', id); await ctx.db.run('DELETE FROM drive_alloc WHERE unit_id=?', id); await ctx.db.run('DELETE FROM drive_units WHERE id=?', id);
  await slog(ctx, `${k}_unit_del`, u.name); return { ok: true };
});
// give an institution chosen units, or every unit of a local body or village
route('POST', '/api/staff/drives/:drive/alloc', OPS, async ctx => {
  const d = drive(ctx), k = ctx.params.drive, b = ctx.body, c = await ctx.db.get("SELECT id,name FROM colleges WHERE id=? AND COALESCE(kind,'college')='college'", Number(b.college_id)); if (!c) throw bad('Choose a college (special drives are for colleges only)');
  let ids = (Array.isArray(b.unit_ids) ? b.unit_ids : []).map(Number).filter(Boolean);
  if (b.lsgd) ids = ids.concat((await ctx.db.all('SELECT id FROM drive_units WHERE drive=? AND lsgd=?', k, String(b.lsgd))).map(u => u.id));
  if (b.village) ids = ids.concat((await ctx.db.all('SELECT id FROM drive_units WHERE drive=? AND village=?', k, String(b.village))).map(u => u.id));
  ids = [...new Set(ids)]; if (!ids.length) throw bad(`Choose at least one ${d.unit}`);
  let n = 0;
  for (const id of ids) {
    if (!await ctx.db.get('SELECT id FROM drive_units WHERE id=? AND drive=?', id, k)) continue;
    const ex = await ctx.db.get('SELECT id,college_id FROM drive_alloc WHERE drive=? AND unit_id=?', k, id);
    if (ex && ex.college_id === c.id) continue;
    if (ex) await ctx.db.run("UPDATE drive_alloc SET college_id=?,status='todo',updated_at=? WHERE id=?", c.id, nowIso(), ex.id); else await insAlloc(ctx, k, id, c.id);
    n++;
  }
  await slog(ctx, `${k}_alloc`, `${c.name}: ${n} ${d.units}`); return { ok: true, n };
});
route('DELETE', '/api/staff/drives/:drive/alloc/:id', OPS, async ctx => {
  drive(ctx); const k = ctx.params.drive, a = await ctx.db.get('SELECT a.id,c.name,u.name unit FROM drive_alloc a JOIN colleges c ON c.id=a.college_id JOIN drive_units u ON u.id=a.unit_id WHERE a.id=? AND a.drive=?', Number(ctx.params.id), k); if (!a) throw new HttpError(404, 'Not found');
  await ctx.db.run('DELETE FROM drive_alloc WHERE id=?', a.id); await slog(ctx, `${k}_unalloc`, `${a.name}: ${a.unit}`); return { ok: true };
});
// an institution that is the only one based in a local body gets that body's units
route('POST', '/api/staff/drives/:drive/suggest', OPS, async ctx => {
  drive(ctx); const k = ctx.params.drive;
  const [units, colleges] = await Promise.all([ctx.db.all('SELECT u.id,u.lsgd FROM drive_units u WHERE u.drive=? AND NOT EXISTS (SELECT 1 FROM drive_alloc a WHERE a.unit_id=u.id)', k), ctx.db.all("SELECT id,name,COALESCE(lsgi,'') lsgi FROM colleges WHERE active=1 AND COALESCE(kind,'college')='college'")]);
  const byBody = new Map(); for (const u of units) { const b = u.lsgd ? lsgdInfo(u.lsgd).base_key : ''; if (b) { if (!byBody.has(b)) byBody.set(b, []); byBody.get(b).push(u.id); } }
  const owners = new Map(); for (const c of colleges) { if (!c.lsgi) continue; const b = lsgdInfo(c.lsgi).base_key; if (!owners.has(b)) owners.set(b, []); owners.get(b).push(c); }
  const made = [], shared = [];
  for (const [b, ids] of byBody) {
    const cs = owners.get(b) || [];
    if (cs.length === 1) { for (const id of ids) await insAlloc(ctx, k, id, cs[0].id); made.push({ college: cs[0].name, n: ids.length }); }
    else if (cs.length > 1) shared.push({ n: ids.length, colleges: cs.map(c => c.name) });
  }
  await slog(ctx, `${k}_suggest`, `${made.length} institutions`); return { ok: true, made, shared };
});
route('GET', '/api/staff/drives/:drive/export', OPS, async ctx => {
  const d = drive(ctx), k = ctx.params.drive, esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = await ctx.db.all('SELECT v.on_date,c.name college,u.name unit,u.lsgd,u.ward,v.type,v.people,v.registered,v.by_name,v.note,v.volunteers FROM drive_visits v JOIN colleges c ON c.id=v.college_id LEFT JOIN drive_units u ON u.id=v.unit_id WHERE v.drive=? ORDER BY v.on_date,v.id', k);
  const text = '﻿' + [['Date', 'College or school', d.unit[0].toUpperCase() + d.unit.slice(1), 'Local body', 'Ward', 'Activity', 'People reached', 'New registrations helped', 'Volunteers', 'Number of volunteers', 'Recorded by', 'Note'], ...rows.map(r => { const vs = volsOf(r.volunteers); return [r.on_date, r.college, r.unit, r.lsgd, r.ward, d.types[r.type] || r.type, r.people, r.registered, vs.join(', '), vs.length, r.by_name, r.note]; })].map(r => r.map(esc).join(',')).join('\r\n');
  await slog(ctx, `${k}_export`, rows.length + ' visits');
  return { __raw: true, text, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${d.slug}-visits.csv"` } };
});
route('POST', '/api/staff/drives/volunteers/catchup', OPS, async ctx => {
  ctx.db.deferred = true;
  const visits = await ctx.db.all("SELECT drive,college_id,on_date,volunteers FROM drive_visits WHERE volunteers IS NOT NULL AND volunteers<>'' AND volunteers<>'[]'");
  let added = 0, seen = 0;
  for (const v of visits) { const d = DRIVES[v.drive], names = volsOf(v.volunteers); if (!d || !names.length) continue; seen++; added += await logVols(ctx.db, v.college_id, v.on_date, d.name, names); }
  await slog(ctx, 'drives_vols_catchup', `${seen} visits checked, ${added} volunteer entries added`);
  return { ok: true, visits: seen, added };
});
route('POST', '/api/staff/drives/:drive/clear', ['super_admin'], async ctx => {
  drive(ctx); if (String(ctx.body.confirm || '') !== 'DELETE') throw bad('Type DELETE to confirm');
  const k = ctx.params.drive; for (const t of ['drive_visits', 'drive_alloc', 'drive_units']) await ctx.db.run(`DELETE FROM ${t} WHERE drive=?`, k);
  await slog(ctx, `${k}_clear`, 'the list was emptied'); return { ok: true };
});

// ======================================================================= an institution (only its allotted units)
const mineUnit = (ctx, id) => ctx.db.get('SELECT u.id,u.name,a.id alloc_id,a.status FROM drive_units u JOIN drive_alloc a ON a.unit_id=u.id WHERE u.id=? AND u.drive=? AND a.college_id=?', Number(id), ctx.params.drive, ctx.college.id);
route('GET', '/api/college/drives/:drive', 'college', async ctx => {
  const d = drive(ctx), k = ctx.params.drive;
  const units = await ctx.db.all(`SELECT u.id,u.name,u.kind,u.lsgd,u.ward,u.village,u.address,u.population,u.households,u.contact_name,u.contact_phone,u.note,a.status,
      (SELECT COUNT(*) FROM drive_visits v WHERE v.unit_id=u.id AND v.college_id=a.college_id) visits, (SELECT COALESCE(SUM(people),0) FROM drive_visits v WHERE v.unit_id=u.id AND v.college_id=a.college_id) people,
      (SELECT COALESCE(SUM(registered),0) FROM drive_visits v WHERE v.unit_id=u.id AND v.college_id=a.college_id) registered, (SELECT MAX(on_date) FROM drive_visits v WHERE v.unit_id=u.id AND v.college_id=a.college_id) last
    FROM drive_alloc a JOIN drive_units u ON u.id=a.unit_id WHERE a.drive=? AND a.college_id=? ORDER BY u.lsgd,u.ward,u.name`, k, ctx.college.id);
  return { cfg: d, status: STATUS, allotted: units.length > 0, units, suggestions: units.length ? await knownNames(ctx.db, ctx.college.id) : [], stats: { units: units.length, started: units.filter(u => u.status !== 'todo').length, done: units.filter(u => u.status === 'done').length, visits: units.reduce((s, u) => s + u.visits, 0), people: units.reduce((s, u) => s + u.people, 0), registered: units.reduce((s, u) => s + u.registered, 0) } };
});
route('GET', '/api/college/drives/:drive/unit/:id', 'college', async ctx => {
  drive(ctx); const u = await mineUnit(ctx, ctx.params.id); if (!u) throw new HttpError(404, 'Not found');
  const visits = await ctx.db.all('SELECT id,on_date,type,people,registered,note,by_name,volunteers FROM drive_visits WHERE unit_id=? AND college_id=? ORDER BY on_date DESC,id DESC LIMIT 50', u.id, ctx.college.id);
  for (const v of visits) v.volunteers = volsOf(v.volunteers);
  return { visits };
});
route('POST', '/api/college/drives/:drive/visit', 'college', async ctx => {
  const d = drive(ctx), b = ctx.body, u = await mineUnit(ctx, b.unit_id); if (!u) throw new HttpError(403, `This ${d.unit} is not allotted to you.`);
  if (!d.types[b.type]) throw bad('Choose what was done');
  if (!isDate(b.on_date) || b.on_date > todayStr()) throw bad('Choose the date of the visit (not a future date)');
  const people = whole(b.people, 100000), registered = whole(b.registered, 100000); if (registered > people) throw bad('New registrations cannot be more than the people reached');
  const vols = cleanVols(b.volunteers);
  await ctx.db.insert('INSERT INTO drive_visits(drive,unit_id,college_id,on_date,type,people,registered,note,by_name,created_at,volunteers) VALUES (?,?,?,?,?,?,?,?,?,?,?)', ctx.params.drive, u.id, ctx.college.id, b.on_date, b.type, people, registered, str(b.note, 400), str(ctx.college.coordinator || ctx.college.name, 80), nowIso(), JSON.stringify(vols));
  // each volunteer also goes into the institution's volunteer list (activity 'Other: <drive name>'), so the visit counts for certificates
  await logVols(ctx.db, ctx.college.id, b.on_date, d.name, vols);
  if (u.status === 'todo') await ctx.db.run("UPDATE drive_alloc SET status='doing',updated_at=? WHERE id=?", nowIso(), u.alloc_id);
  await clog(ctx, `${ctx.params.drive}_visit`, `${u.name}: ${d.types[b.type]}, ${people} people, ${vols.length} volunteers`); return { ok: true };
});
route('POST', '/api/college/drives/:drive/status', 'college', async ctx => {
  const d = drive(ctx), u = await mineUnit(ctx, ctx.body.unit_id); if (!u) throw new HttpError(403, `This ${d.unit} is not allotted to you.`);
  const s = String(ctx.body.status); if (!STATUS[s]) throw bad('Unknown status');
  await ctx.db.run('UPDATE drive_alloc SET status=?,updated_at=? WHERE id=?', s, nowIso(), u.alloc_id); await clog(ctx, `${ctx.params.drive}_status`, `${u.name}: ${STATUS[s]}`); return { ok: true };
});
