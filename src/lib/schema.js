// Single source of truth for the tables. Each table is one tab in the Google Sheet (column order = sheet columns).
// col: [name, type, opts]  type: INTEGER | REAL | TEXT   opts: nn (not null), def (default), ref ['table','CASCADE'|'RESTRICT'|'SET NULL']
export const TABLES = {
  admins: { pk: ['id'], unique: [['username']], cols: [['id', 'INTEGER'], ['username', 'TEXT', { nn: 1 }], ['name', 'TEXT', { nn: 1 }], ['email', 'TEXT'],
    ['role', 'TEXT', { nn: 1 }], ['pass', 'TEXT', { nn: 1 }], ['active', 'INTEGER', { nn: 1, def: 1 }], ['last_login_at', 'TEXT'], ['created_at', 'TEXT']] },
  colleges: { pk: ['id'], cols: [['id', 'INTEGER'], ['name', 'TEXT', { nn: 1 }], ['short_name', 'TEXT'], ['address', 'TEXT'], ['phone', 'TEXT'], ['email', 'TEXT'], ['coordinator', 'TEXT'],
    ['lat', 'REAL'], ['lng', 'REAL'], ['passcode_hash', 'TEXT'], ['passcode_sent_at', 'TEXT'], ['last_login_at', 'TEXT'], ['active', 'INTEGER', { nn: 1, def: 1 }], ['created_at', 'TEXT'],
    ['lsgi', 'TEXT'], ['passcode_plain', 'TEXT'], ['kind', 'TEXT'], ['drive_token', 'TEXT'], ['logo', 'TEXT'], ['logo_mime', 'TEXT'], ['logo_at', 'TEXT'],
    ['coord_phone', 'TEXT'], ['coord_email', 'TEXT'], ['designation', 'TEXT'], ['head_name', 'TEXT'], ['head_phone', 'TEXT'], ['inst_type', 'TEXT'], ['inst_code', 'TEXT'], ['profile_at', 'TEXT'], ['ac', 'TEXT'], ['ac_all', 'TEXT']] },
  villages: { pk: ['id'], unique: [['name']], cols: [['id', 'INTEGER'], ['name', 'TEXT', { nn: 1 }], ['taluk', 'TEXT'], ['lat', 'REAL'], ['lng', 'REAL'],
    ['officer_name', 'TEXT'], ['officer_phone', 'TEXT'], ['officer_email', 'TEXT'],
    ['lsgi', 'TEXT'], ['office_address', 'TEXT'], ['office_phone', 'TEXT'], ['officer_id', 'INTEGER', { ref: ['officers', 'SET NULL'] }]] },
  officers: { pk: ['id'], cols: [['id', 'INTEGER'], ['name', 'TEXT', { nn: 1 }], ['designation', 'TEXT'], ['phone', 'TEXT'], ['email', 'TEXT'], ['passcode_hash', 'TEXT'],
    ['passcode_sent_at', 'TEXT'], ['last_login_at', 'TEXT'], ['active', 'INTEGER', { nn: 1, def: 1 }], ['created_at', 'TEXT']] },
  intern_colleges: { pk: ['admin_id', 'college_id'], cols: [['admin_id', 'INTEGER', { nn: 1, ref: ['admins', 'CASCADE'] }], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }]] },
  intern_villages: { pk: ['admin_id', 'village_id'], cols: [['admin_id', 'INTEGER', { nn: 1, ref: ['admins', 'CASCADE'] }], ['village_id', 'INTEGER', { nn: 1, ref: ['villages', 'CASCADE'] }]] },
  // a village can be held by only ONE college
  assignments: { pk: ['id'], unique: [['village_id']], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['village_id', 'INTEGER', { nn: 1, ref: ['villages', 'RESTRICT'] }],
    ['ack_status', 'TEXT', { nn: 1, def: "'none'" }], ['ack_token', 'TEXT'], ['submitted_at', 'TEXT'], ['ack_name', 'TEXT'], ['ack_designation', 'TEXT'], ['ack_remarks', 'TEXT'], ['ack_at', 'TEXT'],
    ['query_note', 'TEXT'], ['created_at', 'TEXT'], ['distance_km', 'REAL'], ['distance_note', 'TEXT'], ['cert_no', 'TEXT']] },
  change_requests: { pk: ['id'], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['assignment_id', 'INTEGER', { ref: ['assignments', 'SET NULL'] }],
    ['to_village_id', 'INTEGER', { nn: 1, ref: ['villages', 'CASCADE'] }], ['reason', 'TEXT'], ['status', 'TEXT', { nn: 1, def: "'pending'" }], ['admin_note', 'TEXT'], ['decided_by', 'TEXT'],
    ['created_at', 'TEXT'], ['decided_at', 'TEXT']] },
  days: { pk: ['id'], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['village_id', 'INTEGER', { nn: 1, ref: ['villages', 'CASCADE'] }],
    ['date', 'TEXT', { nn: 1 }], ['notes', 'TEXT'], ['created_at', 'TEXT']] },
  volunteers: { pk: ['id'], cols: [['id', 'INTEGER'], ['day_id', 'INTEGER', { nn: 1, ref: ['days', 'CASCADE'] }], ['slot', 'INTEGER', { nn: 1, def: 0 }], ['name', 'TEXT', { nn: 1, def: "''" }],
    ['contact', 'TEXT', { nn: 1, def: "''" }], ['attended', 'INTEGER'], ['addressed', 'INTEGER', { nn: 1, def: 0 }], ['registered', 'INTEGER', { nn: 1, def: 0 }],
    ['verified', 'TEXT'], ['verified_by', 'TEXT'], ['verified_at', 'TEXT'], ['verify_note', 'TEXT']] },
  // each college's own list of student volunteers; the 15-day shift roster is built from it
  pool: { pk: ['id'], unique: [['college_id', 'contact']], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['name', 'TEXT', { nn: 1 }],
    ['contact', 'TEXT', { nn: 1 }], ['active', 'INTEGER', { nn: 1, def: 1 }], ['created_at', 'TEXT']] },
  media: { pk: ['id'], cols: [['id', 'INTEGER'], ['day_id', 'INTEGER', { nn: 1, ref: ['days', 'CASCADE'] }], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }],
    ['drive_id', 'TEXT', { nn: 1 }], ['name', 'TEXT'], ['mime', 'TEXT'], ['size', 'INTEGER'], ['created_at', 'TEXT']] },
  certificates: { pk: ['college_id'], cols: [['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['number', 'TEXT', { nn: 1 }], ['issued_at', 'TEXT'], ['issued_by', 'TEXT']] },
  logs: { pk: ['id'], cols: [['id', 'INTEGER'], ['ts', 'TEXT', { nn: 1 }], ['actor_type', 'TEXT', { nn: 1 }], ['actor', 'TEXT'], ['role', 'TEXT'], ['action', 'TEXT', { nn: 1 }], ['detail', 'TEXT'], ['ip', 'TEXT']] },
  announcements: { pk: ['id'], cols: [['id', 'INTEGER'], ['title', 'TEXT', { nn: 1 }], ['body', 'TEXT'], ['audience', 'TEXT', { nn: 1, def: "'all'" }], ['pinned', 'INTEGER', { nn: 1, def: 0 }],
    ['created_by', 'TEXT'], ['created_at', 'TEXT'], ['expires_on', 'TEXT']] },
  issues: { pk: ['id'], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['category', 'TEXT'], ['subject', 'TEXT', { nn: 1 }], ['message', 'TEXT'],
    ['status', 'TEXT', { nn: 1, def: "'open'" }], ['staff_reply', 'TEXT'], ['replied_by', 'TEXT'], ['replied_at', 'TEXT'], ['created_at', 'TEXT'], ['updated_at', 'TEXT']] },
  resources: { pk: ['id'], cols: [['id', 'INTEGER'], ['title', 'TEXT', { nn: 1 }], ['description', 'TEXT'], ['category', 'TEXT'], ['audience', 'TEXT', { nn: 1, def: "'colleges'" }], ['kind', 'TEXT', { nn: 1, def: "'file'" }],
    ['url', 'TEXT'], ['drive_id', 'TEXT'], ['filename', 'TEXT'], ['mime', 'TEXT'], ['size', 'INTEGER'], ['created_by', 'TEXT'], ['created_at', 'TEXT'], ['thumb', 'TEXT']] },
  // switches the super admin uses to turn sections on or off for colleges, schools, staff and the public site (key = "audience.section")
  features: { pk: ['key'], cols: [['key', 'TEXT', { nn: 1 }], ['enabled', 'INTEGER', { nn: 1, def: 1 }], ['updated_by', 'TEXT'], ['updated_at', 'TEXT']] },
  // Campus to booth drive: classes of each department with their enrolment numbers (entered by department coordinators through the college's link)
  enrol_classes: { pk: ['id'], unique: [['college_id', 'dept', 'class_name']], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['dept', 'TEXT', { nn: 1 }],
    ['coordinator', 'TEXT'], ['phone', 'TEXT'], ['class_name', 'TEXT', { nn: 1 }], ['strength', 'INTEGER', { nn: 1, def: 0 }], ['registered', 'INTEGER', { nn: 1, def: 0 }], ['ineligible', 'INTEGER', { nn: 1, def: 0 }], ['updated_at', 'TEXT'], ['remaining', 'INTEGER']] },
  // help desk daily report and the volunteers of other activities
  desk_days: { pk: ['id'], unique: [['college_id', 'date']], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['date', 'TEXT', { nn: 1 }],
    ['registrations', 'INTEGER', { nn: 1, def: 0 }], ['volunteers', 'INTEGER', { nn: 1, def: 0 }], ['notes', 'TEXT'], ['created_at', 'TEXT'], ['updated_at', 'TEXT']] },
  activity_log: { pk: ['id'], unique: [['college_id', 'date', 'activity', 'activity_other', 'name']], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['date', 'TEXT', { nn: 1 }],
    ['activity', 'TEXT', { nn: 1 }], ['activity_other', 'TEXT'], ['name', 'TEXT', { nn: 1 }], ['contact', 'TEXT'], ['created_at', 'TEXT']] },
  // photos made with the frame editor (files live in Google Drive)
  gallery: { pk: ['id'], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { ref: ['colleges', 'CASCADE'] }], ['title', 'TEXT', { nn: 1 }], ['description', 'TEXT'], ['activity', 'TEXT'],
    ['event_date', 'TEXT'], ['drive_id', 'TEXT', { nn: 1 }], ['mime', 'TEXT'], ['size', 'INTEGER'], ['orientation', 'TEXT'], ['visible', 'INTEGER', { nn: 1, def: 1 }], ['created_at', 'TEXT'], ['thumb', 'TEXT'], ['album_id', 'INTEGER'], ['by_staff', 'TEXT'], ['home', 'INTEGER'], ['ext_url', 'TEXT'], ['src_key', 'TEXT']] },
  // albums the district office creates to sort the public gallery (current = part of the running campaign, otherwise "previous works")
  gallery_albums: { pk: ['id'], cols: [['id', 'INTEGER'], ['title', 'TEXT', { nn: 1 }], ['description', 'TEXT'], ['current', 'INTEGER', { nn: 1, def: 0 }], ['sort_order', 'INTEGER', { nn: 1, def: 0 }], ['created_by', 'TEXT'], ['created_at', 'TEXT']] },
  // photo frames and poster / banner templates: an image plus the boxes where text (or the logo) is placed
  templates: { pk: ['id'], cols: [['id', 'INTEGER'], ['title', 'TEXT', { nn: 1 }], ['kind', 'TEXT', { nn: 1, def: "'poster'" }], ['category', 'TEXT'], ['width', 'INTEGER'], ['height', 'INTEGER'], ['fields', 'TEXT'],
    ['drive_id', 'TEXT'], ['mime', 'TEXT'], ['size', 'INTEGER'], ['thumb', 'TEXT'], ['active', 'INTEGER', { nn: 1, def: 1 }], ['sort_order', 'INTEGER', { nn: 1, def: 0 }], ['created_by', 'TEXT'], ['created_at', 'TEXT']] },
  // participation certificates: a campaign, each institution's list of students for it, and the students themselves
  cert_campaigns: { pk: ['id'], cols: [['id', 'INTEGER'], ['title', 'TEXT', { nn: 1 }], ['description', 'TEXT'], ['start_date', 'TEXT'], ['end_date', 'TEXT'], ['template_id', 'INTEGER'], ['live', 'INTEGER', { nn: 1, def: 0 }], ['prefix', 'TEXT'], ['min_days', 'INTEGER', { nn: 1, def: 1 }], ['created_by', 'TEXT'], ['created_at', 'TEXT']] },
  cert_batches: { pk: ['id'], unique: [['campaign_id', 'college_id']], cols: [['id', 'INTEGER'], ['campaign_id', 'INTEGER', { nn: 1 }], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['status', 'TEXT', { nn: 1, def: "'draft'" }], ['synced_at', 'TEXT'], ['submitted_at', 'TEXT'], ['submitted_by', 'TEXT'], ['generated_at', 'TEXT'], ['reopened_at', 'TEXT'], ['created_at', 'TEXT']] },
  cert_people: { pk: ['id'], unique: [['campaign_id', 'college_id', 'name']], cols: [['id', 'INTEGER'], ['campaign_id', 'INTEGER', { nn: 1 }], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['name', 'TEXT', { nn: 1 }], ['entries', 'TEXT'], ['eligible', 'INTEGER', { nn: 1, def: 0 }], ['source', 'TEXT'], ['status', 'TEXT', { nn: 1, def: "'none'" }], ['cert_no', 'TEXT'], ['snapshot', 'TEXT'], ['issued_at', 'TEXT'], ['allow_regen', 'INTEGER', { nn: 1, def: 0 }], ['created_at', 'TEXT'], ['updated_at', 'TEXT']] },
  // Instagram posts shown on the home page (embedded from Instagram; only the post code is kept)
  social_posts: { pk: ['id'], unique: [['code']], cols: [['id', 'INTEGER'], ['platform', 'TEXT'], ['code', 'TEXT', { nn: 1 }], ['url', 'TEXT'], ['caption', 'TEXT'], ['sort_order', 'INTEGER', { nn: 1, def: 0 }], ['created_by', 'TEXT'], ['created_at', 'TEXT']] },
  // Selfie contest: entries (no sign-in needed; the key lets the sender's browser add pictures) and their pictures
  selfie_entries: { pk: ['id'], cols: [['id', 'INTEGER'], ['name', 'TEXT', { nn: 1 }], ['college_id', 'INTEGER'], ['institution', 'TEXT'], ['course', 'TEXT'], ['phone', 'TEXT'], ['email', 'TEXT'], ['caption', 'TEXT'], ['status', 'TEXT', { nn: 1, def: 'new' }], ['rank', 'INTEGER', { nn: 1, def: 0 }], ['note', 'TEXT'], ['key', 'TEXT'], ['created_at', 'TEXT'], ['ip', 'TEXT']] },
  selfie_photos: { pk: ['id'], cols: [['id', 'INTEGER'], ['entry_id', 'INTEGER', { nn: 1 }], ['drive_id', 'TEXT'], ['mime', 'TEXT'], ['size', 'INTEGER'], ['orientation', 'TEXT'], ['thumb', 'TEXT'], ['created_at', 'TEXT']] },
  // Quiz competition (ECI, Nov 2026): the question bank, one quiz per round (institution / AC / district) and the students taking part
  quiz_questions: { pk: ['id'], cols: [['id', 'INTEGER'], ['theme', 'TEXT'], ['text', 'TEXT', { nn: 1 }], ['opts', 'TEXT', { nn: 1 }], ['correct', 'INTEGER', { nn: 1, def: 0 }], ['active', 'INTEGER', { nn: 1, def: 1 }], ['sort_order', 'INTEGER', { nn: 1, def: 0 }], ['src', 'TEXT'], ['created_at', 'TEXT']] },
  quizzes: { pk: ['id'], unique: [['code']], cols: [['id', 'INTEGER'], ['code', 'TEXT', { nn: 1 }], ['level', 'TEXT', { nn: 1 }], ['college_id', 'INTEGER'], ['ac', 'TEXT'], ['title', 'TEXT'], ['mode', 'TEXT', { nn: 1, def: 'self' }], ['status', 'TEXT', { nn: 1, def: 'open' }], ['q_ids', 'TEXT'], ['minutes', 'INTEGER', { nn: 1, def: 20 }], ['per_q', 'INTEGER', { nn: 1, def: 20 }], ['top_n', 'INTEGER', { nn: 1, def: 2 }], ['live', 'TEXT'], ['created_by', 'TEXT'], ['created_at', 'TEXT'], ['closed_at', 'TEXT'], ['parent_id', 'INTEGER']] },
  quiz_people: { pk: ['id'], cols: [['id', 'INTEGER'], ['quiz_id', 'INTEGER', { nn: 1 }], ['name', 'TEXT', { nn: 1 }], ['klass', 'TEXT'], ['college_id', 'INTEGER'], ['token', 'TEXT'], ['invited', 'INTEGER', { nn: 1, def: 0 }], ['started_at', 'TEXT'], ['finished_at', 'TEXT'], ['score', 'INTEGER'], ['total', 'INTEGER'], ['secs', 'REAL'], ['answers', 'TEXT'], ['source', 'TEXT'], ['selected', 'INTEGER', { nn: 1, def: 0 }], ['created_at', 'TEXT'], ['from_id', 'INTEGER']] },
  outbox: { pk: ['id'], cols: [['id', 'INTEGER'], ['ts', 'TEXT'], ['to_addr', 'TEXT'], ['subject', 'TEXT'], ['body', 'TEXT'], ['status', 'TEXT'], ['error', 'TEXT']] },
};
export const TABLE_NAMES = Object.keys(TABLES);
// tables whose writes can be flushed to the sheet in the background (never block the user)
export const LAZY_TABLES = new Set(['logs', 'outbox']);

const colSql = ([n, t, o = {}]) => `${n} ${t}${o.nn ? ' NOT NULL' : ''}${o.def !== undefined ? ` DEFAULT ${o.def}` : ''}`;
export function ddl() {
  const out = [];
  for (const [name, t] of Object.entries(TABLES)) {
    const parts = t.cols.map(colSql);
    parts.push(`PRIMARY KEY(${t.pk.join(',')})`);
    for (const u of t.unique || []) parts.push(`UNIQUE(${u.join(',')})`);
    for (const [n, , o = {}] of t.cols) if (o.ref) parts.push(`FOREIGN KEY(${n}) REFERENCES ${o.ref[0]}(id) ON DELETE ${o.ref[1]}`);
    out.push(`CREATE TABLE ${name}(${parts.join(', ')})`);
  }
  out.push('CREATE TABLE _chg(seq INTEGER PRIMARY KEY AUTOINCREMENT, t TEXT, op TEXT, pk TEXT, row TEXT)');
  // triggers record every change so only changed rows are sent to the sheet
  for (const [name, t] of Object.entries(TABLES)) {
    const arr = p => `json_array(${t.cols.map(c => `${p}.${c[0]}`).join(',')})`, pk = p => `json_array(${t.pk.map(k => `${p}.${k}`).join(',')})`;
    out.push(`CREATE TRIGGER ${name}_ti AFTER INSERT ON ${name} BEGIN INSERT INTO _chg(t,op,pk,row) VALUES('${name}','i',${pk('NEW')},${arr('NEW')}); END`);
    out.push(`CREATE TRIGGER ${name}_tu AFTER UPDATE ON ${name} BEGIN INSERT INTO _chg(t,op,pk,row) VALUES('${name}','u',${pk('NEW')},${arr('NEW')}); END`);
    out.push(`CREATE TRIGGER ${name}_td AFTER DELETE ON ${name} BEGIN INSERT INTO _chg(t,op,pk,row) VALUES('${name}','d',${pk('OLD')},NULL); END`);
  }
  return out;
}
// plain description sent to the Apps Script so it can create the tabs and enforce uniqueness
export const sheetSchema = () => Object.fromEntries(Object.entries(TABLES).map(([n, t]) => [n, { pk: t.pk, unique: t.unique || [], cols: t.cols.map(c => [c[0], c[1], c[2]?.nn ? 1 : 0]) }]));

// fingerprint of the table definitions; a new deployment with a different value re-prepares the sheet and rebuilds the live copy
export const SCHEMA_VER = (() => { let h = 5381; const t = JSON.stringify(sheetSchema()); for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return 'v' + (h >>> 0).toString(36); })();
