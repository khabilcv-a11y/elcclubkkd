// The private register for the Vote Unbound call campaign (persons with disabilities, from the district UDID data).
// It is a separate Durable Object with its own SQLite storage: the people are NOT kept in the Google Sheet, so the sensitive details never sit in a
// spreadsheet and the 34,000 rows do not slow down the rest of the portal. Only the Portal object calls it, after checking who is asking and which
// areas that institution has been allotted; every method that returns people takes the allowed areas ("scope") and enforces them here too.
// Aadhaar and UDID numbers are never imported: the campaign does not need them.
import { DurableObject } from 'cloudflare:workers';

export const OUTCOMES = {
  reached_ok: 'Reached: nothing more needed',
  needs_help: 'Reached: needs help',
  callback: 'Call again later',
  not_reachable: 'Not reachable',
  wrong_number: 'Wrong number',
  refused: 'Does not wish to talk',
};
export const HELP = { home_voting: 'Home voting (Form 12D)', transport: 'Transport to the booth', ramp: 'Ramp, wheelchair or assistance at the booth', udid: 'UDID card', roll: 'Name on the electoral roll', other: 'Something else' };
const OPEN = "(last_outcome IS NULL OR last_outcome IN ('not_reachable','callback'))";
const q = s => "'" + String(s ?? '').replace(/'/g, "''") + "'";            // values in scope are plain keys and ward numbers, quoted here so a long list never hits the bound-value limit

export class Registry extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS people (pid TEXT PRIMARY KEY, name TEXT, age INTEGER, gender TEXT, mobile TEXT, address TEXT, ward TEXT, lsgd TEXT, lsgd_key TEXT, base_key TEXT, kind TEXT, anganwadi TEXT, icds TEXT, bedridden INTEGER DEFAULT 0, disability TEXT, pct INTEGER, udid TEXT, last_outcome TEXT, last_help TEXT, last_at TEXT, last_college INTEGER, calls INTEGER DEFAULT 0)`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS people_area ON people(lsgd_key, ward)'); this.sql.exec('CREATE INDEX IF NOT EXISTS people_mobile ON people(mobile)');
    this.sql.exec(`CREATE TABLE IF NOT EXISTS calls (id INTEGER PRIMARY KEY AUTOINCREMENT, pid TEXT, college_id INTEGER, by_name TEXT, outcome TEXT, help TEXT, note TEXT, at TEXT)`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS calls_pid ON calls(pid)'); this.sql.exec('CREATE INDEX IF NOT EXISTS calls_college ON calls(college_id)');
    this.sql.exec(`CREATE TABLE IF NOT EXISTS views (id INTEGER PRIMARY KEY AUTOINCREMENT, college_id INTEGER, who TEXT, action TEXT, n INTEGER, at TEXT)`);
  }
  // the areas an institution may see: [{lsgd_key, ward}] where ward is empty for the whole local body; null = everything (staff)
  scopeSql(scope) {
    if (!scope) return '1=1'; if (!scope.length) return '0=1';
    return '(' + scope.map(s => (s.ward ? `(lsgd_key=${q(s.lsgd_key)} AND ward=${q(s.ward)})` : `(lsgd_key=${q(s.lsgd_key)})`)).join(' OR ') + ')';
  }
  // add or refresh people; call history is kept because a person's id comes from their own details
  importRows(rows) {
    const ins = `INSERT INTO people (pid,name,age,gender,mobile,address,ward,lsgd,lsgd_key,base_key,kind,anganwadi,icds,bedridden,disability,pct,udid) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(pid) DO UPDATE SET name=excluded.name,age=excluded.age,gender=excluded.gender,mobile=excluded.mobile,address=excluded.address,ward=excluded.ward,lsgd=excluded.lsgd,lsgd_key=excluded.lsgd_key,base_key=excluded.base_key,kind=excluded.kind,anganwadi=excluded.anganwadi,icds=excluded.icds,bedridden=excluded.bedridden,disability=excluded.disability,pct=excluded.pct,udid=excluded.udid`;
    this.ctx.storage.transactionSync(() => { for (const r of rows) this.sql.exec(ins, r.pid, r.name, r.age, r.gender, r.mobile, r.address, r.ward, r.lsgd, r.lsgd_key, r.base_key, r.kind, r.anganwadi, r.icds, r.bedridden ? 1 : 0, r.disability, r.pct, r.udid); });
    return { n: rows.length, total: this.sql.exec('SELECT COUNT(*) n FROM people').one().n };
  }
  clearAll() { this.ctx.storage.transactionSync(() => { this.sql.exec('DELETE FROM people'); }); return { ok: true }; }

  // ---------- the district's view ----------
  overview() {
    const one = (s, ...p) => this.sql.exec(s, ...p).one(), all = (s, ...p) => this.sql.exec(s, ...p).toArray();
    const t = one(`SELECT COUNT(*) n, SUM(bedridden) bed, SUM(last_outcome IS NOT NULL) called, SUM(last_outcome IN ('reached_ok','needs_help')) reached, SUM(last_outcome='needs_help') help, COUNT(DISTINCT mobile) numbers FROM people`);
    return {
      total: t.n || 0, bedridden: t.bed || 0, called: t.called || 0, reached: t.reached || 0, needs_help: t.help || 0, numbers: t.numbers || 0,
      udid: all('SELECT udid k, COUNT(*) n FROM people GROUP BY udid ORDER BY n DESC'), disability: all("SELECT COALESCE(NULLIF(disability,''),'Not stated') k, COUNT(*) n FROM people GROUP BY 1 ORDER BY n DESC"),
      areas: all(`SELECT lsgd_key, lsgd, kind, base_key, COUNT(*) n, SUM(bedridden) bed, COUNT(DISTINCT ward) wards, SUM(last_outcome IS NOT NULL) called, SUM(last_outcome IN ('reached_ok','needs_help')) reached, SUM(last_outcome='needs_help') help FROM people GROUP BY lsgd_key ORDER BY n DESC`),
    };
  }
  wards(lsgd_key) { return this.sql.exec(`SELECT ward, COUNT(*) n, SUM(last_outcome IS NOT NULL) called FROM people WHERE lsgd_key=? GROUP BY ward ORDER BY CAST(ward AS INTEGER), ward`, lsgd_key).toArray(); }
  // per institution: what it has done (calls are logged with the institution that made them)
  collegeCalls() { return this.sql.exec(`SELECT college_id, COUNT(*) calls, COUNT(DISTINCT pid) people, SUM(outcome IN ('reached_ok','needs_help')) reached, SUM(outcome='needs_help') help, MAX(at) last FROM calls GROUP BY college_id`).toArray(); }
  // allotted people per area, so the district can see how many each institution has been given
  areaCounts(areas) { return areas.map(a => ({ ...a, n: this.sql.exec(`SELECT COUNT(*) n FROM people WHERE ${this.scopeSql([a])}`).one().n })); }
  exportCalls() {
    return this.sql.exec(`SELECT c.at, c.college_id, c.by_name, p.lsgd, p.ward, p.age, p.gender, p.disability, c.outcome, c.help, c.note FROM calls c LEFT JOIN people p ON p.pid=c.pid ORDER BY c.id`).toArray();
  }

  // ---------- an institution's call desk ----------
  stats(scope) {
    const w = this.scopeSql(scope), t = this.sql.exec(`SELECT COUNT(*) n, SUM(bedridden) bed, COUNT(DISTINCT mobile) numbers, SUM(last_outcome IS NOT NULL) called, SUM(last_outcome IN ('reached_ok','needs_help')) reached, SUM(last_outcome='needs_help') help, SUM(${OPEN}) open FROM people WHERE ${w}`).one();
    return { people: t.n || 0, bedridden: t.bed || 0, numbers: t.numbers || 0, called: t.called || 0, reached: t.reached || 0, needs_help: t.help || 0, open: t.open || 0 };
  }
  areas(scope) { return this.sql.exec(`SELECT lsgd_key, lsgd, ward, COUNT(*) n FROM people WHERE ${this.scopeSql(scope)} GROUP BY lsgd_key, ward ORDER BY lsgd, CAST(ward AS INTEGER), ward`).toArray(); }
  // one page of "calls": people are grouped by phone number, so a family that shares one number is one call; bedridden people come first
  list(scope, f = {}) {
    const w = [this.scopeSql(scope)];
    if (f.lsgd_key) w.push(`lsgd_key=${q(f.lsgd_key)}`); if (f.ward) w.push(`ward=${q(f.ward)}`);
    if (f.status === 'open') w.push(OPEN); else if (f.status === 'done') w.push(`last_outcome IN ('reached_ok','needs_help','wrong_number','refused')`); else if (f.status === 'help') w.push(`last_outcome='needs_help'`); else if (f.status === 'bed') w.push('bedridden=1');
    if (f.q) { const s = '%' + String(f.q).replace(/[%_']/g, '').trim() + '%'; w.push(`(name LIKE ${q(s)} OR mobile LIKE ${q(s)})`); }
    const where = w.join(' AND '), limit = Math.min(60, Number(f.limit) || 30), offset = Math.max(0, Number(f.offset) || 0);
    const total = this.sql.exec(`SELECT COUNT(DISTINCT mobile) n FROM people WHERE ${where}`).one().n;
    const nums = this.sql.exec(`SELECT mobile FROM people WHERE ${where} GROUP BY mobile ORDER BY MIN(CASE WHEN bedridden=1 THEN 0 ELSE 1 END), MIN(CASE WHEN last_outcome IS NULL THEN 0 ELSE 1 END), mobile LIMIT ${limit} OFFSET ${offset}`).toArray().map(r => r.mobile);
    const people = nums.length ? this.sql.exec(`SELECT pid,name,age,gender,mobile,ward,lsgd,bedridden,disability,pct,udid,last_outcome,last_help,last_at,calls FROM people WHERE mobile IN (${nums.map(q).join(',')}) AND ${this.scopeSql(scope)} ORDER BY mobile, bedridden DESC, name`).toArray() : [];
    return { total, numbers: nums, people };
  }
  person(scope, pid) {
    const p = this.sql.exec(`SELECT pid,name,age,gender,mobile,address,ward,lsgd,anganwadi,bedridden,disability,pct,udid,last_outcome,last_help,last_at,calls FROM people WHERE pid=? AND ${this.scopeSql(scope)}`, pid).toArray()[0];
    if (!p) return null;
    return { ...p, history: this.sql.exec('SELECT at, by_name, outcome, help, note FROM calls WHERE pid=? ORDER BY id DESC LIMIT 20', pid).toArray() };
  }
  // the people (inside the allowed areas) that a call may be recorded for
  allowed(scope, pids) {
    if (!pids.length) return [];
    return this.sql.exec(`SELECT pid FROM people WHERE pid IN (${pids.map(q).join(',')}) AND ${this.scopeSql(scope)}`).toArray().map(r => r.pid);
  }
  logCall(pids, college_id, by_name, outcome, help, note) {
    const at = new Date().toISOString();
    this.ctx.storage.transactionSync(() => {
      for (const pid of pids) {
        this.sql.exec('INSERT INTO calls (pid,college_id,by_name,outcome,help,note,at) VALUES (?,?,?,?,?,?,?)', pid, college_id, by_name, outcome, help || '', note || '', at);
        this.sql.exec('UPDATE people SET last_outcome=?,last_help=?,last_at=?,last_college=?,calls=calls+1 WHERE pid=?', outcome, help || '', at, college_id, pid);
      }
    });
    return { ok: true, n: pids.length };
  }
  logView(college_id, who, action, n) { this.sql.exec('INSERT INTO views (college_id,who,action,n,at) VALUES (?,?,?,?,?)', college_id, who, action, n, new Date().toISOString()); }
  recentViews(limit = 50) { return this.sql.exec('SELECT college_id, who, action, n, at FROM views ORDER BY id DESC LIMIT ?', limit).toArray(); }
}
