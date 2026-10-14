// Single source of truth for the tables. Each table is one tab in the Google Sheet (column order = sheet columns).
// col: [name, type, opts]  type: INTEGER | REAL | TEXT   opts: nn (not null), def (default), ref ['table','CASCADE'|'RESTRICT'|'SET NULL']
export const TABLES = {
  admins: { pk: ['id'], unique: [['username']], cols: [['id', 'INTEGER'], ['username', 'TEXT', { nn: 1 }], ['name', 'TEXT', { nn: 1 }], ['email', 'TEXT'],
    ['role', 'TEXT', { nn: 1 }], ['pass', 'TEXT', { nn: 1 }], ['active', 'INTEGER', { nn: 1, def: 1 }], ['last_login_at', 'TEXT'], ['created_at', 'TEXT']] },
  colleges: { pk: ['id'], cols: [['id', 'INTEGER'], ['name', 'TEXT', { nn: 1 }], ['short_name', 'TEXT'], ['address', 'TEXT'], ['phone', 'TEXT'], ['email', 'TEXT'], ['coordinator', 'TEXT'],
    ['lat', 'REAL'], ['lng', 'REAL'], ['passcode_hash', 'TEXT'], ['passcode_sent_at', 'TEXT'], ['last_login_at', 'TEXT'], ['active', 'INTEGER', { nn: 1, def: 1 }], ['created_at', 'TEXT']] },
  villages: { pk: ['id'], unique: [['name']], cols: [['id', 'INTEGER'], ['name', 'TEXT', { nn: 1 }], ['taluk', 'TEXT'], ['lat', 'REAL'], ['lng', 'REAL'],
    ['officer_name', 'TEXT'], ['officer_phone', 'TEXT'], ['officer_email', 'TEXT']] },
  intern_colleges: { pk: ['admin_id', 'college_id'], cols: [['admin_id', 'INTEGER', { nn: 1, ref: ['admins', 'CASCADE'] }], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }]] },
  intern_villages: { pk: ['admin_id', 'village_id'], cols: [['admin_id', 'INTEGER', { nn: 1, ref: ['admins', 'CASCADE'] }], ['village_id', 'INTEGER', { nn: 1, ref: ['villages', 'CASCADE'] }]] },
  // a village can be held by only ONE college
  assignments: { pk: ['id'], unique: [['village_id']], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['village_id', 'INTEGER', { nn: 1, ref: ['villages', 'RESTRICT'] }],
    ['ack_status', 'TEXT', { nn: 1, def: "'none'" }], ['ack_token', 'TEXT'], ['submitted_at', 'TEXT'], ['ack_name', 'TEXT'], ['ack_designation', 'TEXT'], ['ack_remarks', 'TEXT'], ['ack_at', 'TEXT'],
    ['query_note', 'TEXT'], ['created_at', 'TEXT']] },
  change_requests: { pk: ['id'], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['assignment_id', 'INTEGER', { ref: ['assignments', 'SET NULL'] }],
    ['to_village_id', 'INTEGER', { nn: 1, ref: ['villages', 'CASCADE'] }], ['reason', 'TEXT'], ['status', 'TEXT', { nn: 1, def: "'pending'" }], ['admin_note', 'TEXT'], ['decided_by', 'TEXT'],
    ['created_at', 'TEXT'], ['decided_at', 'TEXT']] },
  days: { pk: ['id'], cols: [['id', 'INTEGER'], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['village_id', 'INTEGER', { nn: 1, ref: ['villages', 'CASCADE'] }],
    ['date', 'TEXT', { nn: 1 }], ['notes', 'TEXT'], ['created_at', 'TEXT']] },
  volunteers: { pk: ['id'], cols: [['id', 'INTEGER'], ['day_id', 'INTEGER', { nn: 1, ref: ['days', 'CASCADE'] }], ['slot', 'INTEGER', { nn: 1, def: 0 }], ['name', 'TEXT', { nn: 1, def: "''" }],
    ['contact', 'TEXT', { nn: 1, def: "''" }], ['attended', 'INTEGER'], ['addressed', 'INTEGER', { nn: 1, def: 0 }], ['registered', 'INTEGER', { nn: 1, def: 0 }]] },
  media: { pk: ['id'], cols: [['id', 'INTEGER'], ['day_id', 'INTEGER', { nn: 1, ref: ['days', 'CASCADE'] }], ['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }],
    ['drive_id', 'TEXT', { nn: 1 }], ['name', 'TEXT'], ['mime', 'TEXT'], ['size', 'INTEGER'], ['created_at', 'TEXT']] },
  certificates: { pk: ['college_id'], cols: [['college_id', 'INTEGER', { nn: 1, ref: ['colleges', 'CASCADE'] }], ['number', 'TEXT', { nn: 1 }], ['issued_at', 'TEXT'], ['issued_by', 'TEXT']] },
  logs: { pk: ['id'], cols: [['id', 'INTEGER'], ['ts', 'TEXT', { nn: 1 }], ['actor_type', 'TEXT', { nn: 1 }], ['actor', 'TEXT'], ['role', 'TEXT'], ['action', 'TEXT', { nn: 1 }], ['detail', 'TEXT'], ['ip', 'TEXT']] },
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
