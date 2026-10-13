// Tables are created automatically on first request. RLS is switched on with no policies, so
// Supabase's public REST API can't read anything; only this Worker (owner role) can.
const TABLES = `
CREATE TABLE IF NOT EXISTS admins(
  id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, email TEXT,
  role TEXT NOT NULL CHECK(role IN ('super_admin','admin','intern')),
  pass TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, last_login_at TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS colleges(
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, short_name TEXT, address TEXT, phone TEXT, email TEXT,
  coordinator TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, passcode_hash TEXT, passcode_sent_at TEXT, last_login_at TEXT,
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS villages(
  id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, taluk TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  officer_name TEXT, officer_phone TEXT, officer_email TEXT);
CREATE TABLE IF NOT EXISTS intern_colleges(admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE, PRIMARY KEY(admin_id, college_id));
CREATE TABLE IF NOT EXISTS intern_villages(admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  village_id INTEGER NOT NULL REFERENCES villages(id) ON DELETE CASCADE, PRIMARY KEY(admin_id, village_id));
CREATE TABLE IF NOT EXISTS assignments(
  id SERIAL PRIMARY KEY, college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  village_id INTEGER NOT NULL REFERENCES villages(id) ON DELETE RESTRICT,
  ack_status TEXT NOT NULL DEFAULT 'none', ack_token TEXT, submitted_at TEXT,
  ack_name TEXT, ack_designation TEXT, ack_remarks TEXT, ack_at TEXT, query_note TEXT,
  created_at TEXT NOT NULL, UNIQUE(college_id, village_id));
CREATE TABLE IF NOT EXISTS change_requests(
  id SERIAL PRIMARY KEY, college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  assignment_id INTEGER REFERENCES assignments(id) ON DELETE SET NULL,
  to_village_id INTEGER NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
  reason TEXT, status TEXT NOT NULL DEFAULT 'pending', admin_note TEXT, decided_by TEXT,
  created_at TEXT NOT NULL, decided_at TEXT);
CREATE TABLE IF NOT EXISTS days(
  id SERIAL PRIMARY KEY, college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  village_id INTEGER NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
  date TEXT NOT NULL, notes TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS days_college ON days(college_id, date);
CREATE TABLE IF NOT EXISTS volunteers(
  id SERIAL PRIMARY KEY, day_id INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL DEFAULT '', contact TEXT NOT NULL DEFAULT '',
  attended INTEGER, addressed INTEGER NOT NULL DEFAULT 0, registered INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS vol_day ON volunteers(day_id);
CREATE TABLE IF NOT EXISTS media(
  id SERIAL PRIMARY KEY, day_id INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  drive_id TEXT NOT NULL, name TEXT, mime TEXT, size INTEGER, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS media_day ON media(day_id);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, role TEXT NOT NULL, subject_id INTEGER NOT NULL, expires BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS logs(
  id SERIAL PRIMARY KEY, ts TEXT NOT NULL, actor_type TEXT NOT NULL, actor TEXT, role TEXT,
  action TEXT NOT NULL, detail TEXT, ip TEXT);
CREATE TABLE IF NOT EXISTS outbox(
  id SERIAL PRIMARY KEY, ts TEXT NOT NULL, to_addr TEXT, subject TEXT, body TEXT, status TEXT, error TEXT);
CREATE TABLE IF NOT EXISTS certificates(
  college_id INTEGER PRIMARY KEY REFERENCES colleges(id) ON DELETE CASCADE,
  number TEXT NOT NULL, issued_at TEXT NOT NULL, issued_by TEXT);
CREATE TABLE IF NOT EXISTS login_attempts(key TEXT NOT NULL, ts BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS la_key ON login_attempts(key, ts)`;
const NAMES = ['admins', 'colleges', 'villages', 'intern_colleges', 'intern_villages', 'assignments', 'change_requests', 'days', 'volunteers', 'media', 'sessions', 'logs', 'outbox', 'certificates', 'login_attempts'];
export const SCHEMA = TABLES + ';\n' + NAMES.map(t => `ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`).join(';\n');
