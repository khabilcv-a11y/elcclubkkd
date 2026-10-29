// Reports and exports with filters, sorting and column choice. Every dataset is built from the same base rows,
// so a college, village, student or day-by-day view always agrees with the others.
import { route, scopeOf } from '../lib/router.js';
import { log } from '../lib/db.js';
import { HttpError, csv, nowIso } from '../lib/util.js';
import { ENROL_DATASETS, enrolReport, PERF_DATASETS, performanceReport } from './campaign.js';
import { DESK_DATASETS, deskReport } from './desk.js';

const slog = (ctx, action, detail) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, action, detail, ctx.ip);
const att = a => (a === 1 ? 'Present' : a === 0 ? 'Absent' : 'Not marked');
const ver = v => (v === 'yes' ? 'Verified' : v === 'no' ? 'Disputed' : 'Not verified');
const ackLabel = s => ({ acknowledged: 'Certified', submitted: 'Awaiting officer', none: 'In progress' }[s] || 'In progress');
const pct = (a, b) => (b ? Math.round(a * 100 / b) : null);

// every volunteer-day, with college and village details attached
async function baseRows(ctx) {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all(`SELECT d.id day_id,d.date,d.college_id,c.name college,c.email college_email,c.phone college_phone,c.lsgi college_lsgi,
      d.village_id,v.name village,v.taluk,v.lsgi village_lsgi,v.officer_name,a.ack_status,
      x.id vol_id,x.name student,x.contact,x.attended,x.addressed,x.registered,x.verified
    FROM days d JOIN colleges c ON c.id=d.college_id AND c.active=1 JOIN villages v ON v.id=d.village_id
    LEFT JOIN assignments a ON a.college_id=d.college_id AND a.village_id=d.village_id
    LEFT JOIN volunteers x ON x.day_id=d.id AND x.name<>''`);
  return rows.filter(r => !s || (s.colleges.has(r.college_id) && s.villages.has(r.village_id)));
}

function applyFilters(rows, q) {
  const has = k => q[k] !== undefined && q[k] !== '';
  const text = has('q') ? String(q.q).toLowerCase() : null;
  return rows.filter(r => {
    if (has('college') && String(r.college_id) !== String(q.college)) return false;
    if (has('village') && String(r.village_id) !== String(q.village)) return false;
    if (has('taluk') && (r.taluk || '') !== q.taluk) return false;
    if (has('lsgi') && !String(r.village_lsgi || '').toLowerCase().includes(String(q.lsgi).toLowerCase())) return false;
    if (has('from') && r.date < q.from) return false;
    if (has('to') && r.date > q.to) return false;
    if (has('attendance')) { const a = att(r.attended).toLowerCase().replace(' ', '_'); if (a !== q.attendance) return false; }
    if (has('verified')) { const v = r.verified === 'yes' ? 'yes' : r.verified === 'no' ? 'no' : 'pending'; if (v !== q.verified) return false; }
    if (has('ack') && (r.ack_status || 'none') !== q.ack) return false;
    if (text && ![r.college, r.village, r.student, r.contact, r.taluk, r.village_lsgi, r.officer_name].some(x => String(x || '').toLowerCase().includes(text))) return false;
    return true;
  });
}

function group(rows, keyOf, make) {
  const m = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!m.has(k)) m.set(k, make(r));
    const g = m.get(k);
    g._days.add(r.day_id);
    if (r.vol_id) {
      g.rows++;
      if (r.attended === 1) { g.present++; g.addressed += r.addressed; g.registered += r.registered; } else if (r.attended === 0) g.absent++;
      if (r.attended != null) { if (r.verified === 'yes') g.verified++; else if (r.verified === 'no') g.disputed++; }
    }
  }
  return [...m.values()].map(g => { g.days = g._days.size; delete g._days; return g; });
}
const blank = extra => ({ _days: new Set(), rows: 0, present: 0, absent: 0, addressed: 0, registered: 0, verified: 0, disputed: 0, ...extra });
const finish = g => ({ ...g, attendance_pct: pct(g.present, g.present + g.absent), conversion_pct: pct(g.registered, g.addressed), verified_pct: pct(g.verified, g.present + g.absent) });

const N = (key, label) => ({ key, label, num: true });
const T = (key, label) => ({ key, label });
const DATASETS = {
  daily: { title: 'Day-by-day log', cols: [T('date', 'Date'), T('college', 'College'), T('village', 'Village'), T('taluk', 'Taluk'), T('student', 'Student'), T('contact', 'Contact'),
    T('attendance', 'Attendance'), N('addressed', 'People addressed'), N('registered', 'Registered'), T('verification', 'Officer check'), T('certification', 'Village certification')],
    build: rows => rows.filter(r => r.vol_id).map(r => ({ date: r.date, college: r.college, village: r.village, taluk: r.taluk, student: r.student, contact: r.contact, attendance: att(r.attended),
      addressed: r.attended === 1 ? r.addressed : null, registered: r.attended === 1 ? r.registered : null, verification: r.attended == null ? '' : ver(r.verified), certification: ackLabel(r.ack_status) })) },
  students: { title: 'Students', cols: [T('college', 'College'), T('student', 'Student'), T('contact', 'Contact'), N('days_assigned', 'Days assigned'), N('present', 'Days present'), N('absent', 'Days absent'),
    N('attendance_pct', 'Attendance %'), N('addressed', 'People addressed'), N('registered', 'Registered'), N('verified', 'Days verified by officer')],
    build: rows => group(rows.filter(r => r.vol_id), r => `${r.college_id}|${String(r.student).toLowerCase()}|${r.contact}`, r => blank({ college: r.college, student: r.student, contact: r.contact }))
      .map(g => ({ college: g.college, student: g.student, contact: g.contact, days_assigned: g.rows, present: g.present, absent: g.absent, attendance_pct: pct(g.present, g.present + g.absent), addressed: g.addressed, registered: g.registered, verified: g.verified })) },
  colleges: { title: 'Colleges', cols: [T('college', 'College'), T('lsgi', 'LSGI'), T('email', 'Email'), T('phone', 'Contact'), N('villages', 'Villages'), N('days', 'Field days'), N('students', 'Students'),
    N('present', 'Volunteer-days present'), N('attendance_pct', 'Attendance %'), N('addressed', 'People addressed'), N('registered', 'Registered'), N('conversion_pct', 'Registered / addressed %'),
    N('verified_pct', 'Officer-verified %'), N('certified', 'Villages certified')],
    build: rows => {
      const out = group(rows, r => r.college_id, r => blank({ college: r.college, lsgi: r.college_lsgi, email: r.college_email, phone: r.college_phone, _v: new Set(), _s: new Set(), _c: new Set() }));
      const extra = new Map();
      for (const r of rows) {
        const e = extra.get(r.college_id) || { v: new Set(), s: new Set(), c: new Set() };
        e.v.add(r.village_id); if (r.vol_id) e.s.add(String(r.student).toLowerCase() + r.contact); if (r.ack_status === 'acknowledged') e.c.add(r.village_id);
        extra.set(r.college_id, e);
      }
      const idByName = new Map(rows.map(r => [r.college, r.college_id]));
      return out.map(finish).map(g => { const e = extra.get(idByName.get(g.college)) || { v: new Set(), s: new Set(), c: new Set() };
        return { college: g.college, lsgi: g.lsgi, email: g.email, phone: g.phone, villages: e.v.size, days: g.days, students: e.s.size, present: g.present, attendance_pct: g.attendance_pct,
          addressed: g.addressed, registered: g.registered, conversion_pct: g.conversion_pct, verified_pct: g.verified_pct, certified: e.c.size }; });
    } },
  villages: { title: 'Villages', cols: [T('village', 'Village'), T('taluk', 'Taluk'), T('lsgi', 'LSGI'), T('college', 'College'), T('officer', 'Village officer'), N('days', 'Field days'), N('present', 'Volunteer-days present'),
    N('addressed', 'People addressed'), N('registered', 'Registered'), N('verified_pct', 'Officer-verified %'), T('certification', 'Certification')],
    build: rows => group(rows, r => r.village_id, r => blank({ village: r.village, taluk: r.taluk, lsgi: r.village_lsgi, college: r.college, officer: r.officer_name, ack: r.ack_status }))
      .map(finish).map(g => ({ village: g.village, taluk: g.taluk, lsgi: g.lsgi, college: g.college, officer: g.officer, days: g.days, present: g.present, addressed: g.addressed, registered: g.registered,
        verified_pct: g.verified_pct, certification: ackLabel(g.ack) })) },
};

// master list of colleges and the villages they hold (same layout as the district spreadsheet)
async function allotmentRows(ctx, q) {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all(`SELECT a.college_id,a.village_id,c.name college,c.address college_address,c.email college_email,c.phone college_phone,c.lsgi college_lsgi,
      v.name village,v.taluk,v.lsgi village_lsgi,v.office_address,v.office_phone,v.officer_name,a.distance_km,a.distance_note,a.ack_status
    FROM assignments a JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id ORDER BY c.name,v.name`);
  const text = q.q ? String(q.q).toLowerCase() : null;
  return rows.filter(r => (!s || (s.colleges.has(r.college_id) && s.villages.has(r.village_id))) && (!q.college || String(r.college_id) === String(q.college)) && (!q.village || String(r.village_id) === String(q.village))
    && (!q.taluk || (r.taluk || '') === q.taluk) && (!q.lsgi || String(r.village_lsgi || '').toLowerCase().includes(String(q.lsgi).toLowerCase())) && (!q.ack || (r.ack_status || 'none') === q.ack)
    && (!text || [r.college, r.village, r.taluk, r.village_lsgi, r.college_lsgi].some(x => String(x || '').toLowerCase().includes(text))))
    .map(r => ({ college: r.college, college_address: r.college_address, college_email: r.college_email, college_phone: r.college_phone, college_lsgi: r.college_lsgi, village: r.village, taluk: r.taluk,
      village_lsgi: r.village_lsgi, office_address: r.office_address, office_phone: r.office_phone, officer: r.officer_name, distance_km: r.distance_km, distance_note: r.distance_note, certification: ackLabel(r.ack_status) }));
}
const ALLOT_COLS = [T('college', 'College'), T('college_address', 'College address'), T('college_email', 'College email'), T('college_phone', 'College contact'), T('college_lsgi', 'Located LSGI'),
  T('village', 'Village'), T('taluk', 'Taluk'), T('village_lsgi', 'Assigned LSGI'), T('office_address', 'Village office address'), T('office_phone', 'Village office contact'), T('officer', 'Village officer'),
  N('distance_km', 'Distance (km)'), T('distance_note', 'Distance note'), T('certification', 'Certification')];

async function issueRows(ctx, q) {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all('SELECT i.*,c.name college FROM issues i JOIN colleges c ON c.id=i.college_id ORDER BY i.id DESC');
  const text = q.q ? String(q.q).toLowerCase() : null;
  return rows.filter(r => (!s || s.colleges.has(r.college_id)) && (!q.college || String(r.college_id) === String(q.college)) && (!q.status || r.status === q.status)
    && (!q.from || r.created_at.slice(0, 10) >= q.from) && (!q.to || r.created_at.slice(0, 10) <= q.to) && (!text || [r.college, r.subject, r.message, r.category].some(x => String(x || '').toLowerCase().includes(text))))
    .map(r => ({ created: r.created_at.slice(0, 10), college: r.college, category: r.category, subject: r.subject, message: r.message, status: r.status, reply: r.staff_reply, replied_by: r.replied_by }));
}
const ISSUE_COLS = [T('created', 'Raised on'), T('college', 'College'), T('category', 'Category'), T('subject', 'Subject'), T('message', 'Message'), T('status', 'Status'), T('reply', 'Reply'), T('replied_by', 'Replied by')];

async function build(ctx, type, q) {
  if (type === 'allotments') return { title: 'Colleges & villages (master list)', cols: ALLOT_COLS, rows: await allotmentRows(ctx, q) };
  if (type === 'performance') return performanceReport(ctx, q);
  if (ENROL_DATASETS.some(d => d.key === type)) return enrolReport(ctx, type, q);
  if (DESK_DATASETS.some(d => d.key === type)) return deskReport(ctx, type, q);
  if (type === 'issues') return { title: 'Issues raised', cols: ISSUE_COLS, rows: await issueRows(ctx, q) };
  const ds = DATASETS[type];
  if (!ds) throw new HttpError(404, 'Unknown report');
  return { title: ds.title, cols: ds.cols, rows: ds.build(applyFilters(await baseRows(ctx), q)) };
}

route('GET', '/api/staff/report-options', 'staff', async ctx => {
  const s = await scopeOf(ctx);
  const [colleges, villages] = await Promise.all([ctx.db.all('SELECT id,name FROM colleges WHERE active=1 ORDER BY name'), ctx.db.all('SELECT id,name,taluk,lsgi FROM villages ORDER BY name')]);
  const vs = villages.filter(v => !s || s.villages.has(v.id));
  return { colleges: colleges.filter(c => !s || s.colleges.has(c.id)), villages: vs.map(v => ({ id: v.id, name: v.name })), taluks: [...new Set(vs.map(v => v.taluk).filter(Boolean))].sort(),
    datasets: [...PERF_DATASETS, ...ENROL_DATASETS, ...DESK_DATASETS, { key: 'issues', title: 'Issues raised' }, ...Object.entries(DATASETS).map(([key, d]) => ({ key, title: d.title })), { key: 'allotments', title: 'Colleges & villages (master list)' }] };
});

route('GET', '/api/staff/reports/:type', 'staff', async ctx => {
  const q = ctx.query, r = await build(ctx, ctx.params.type, q);
  let cols = r.cols;
  if (q.cols) { const want = String(q.cols).split(','); const picked = want.map(k => r.cols.find(c => c.key === k)).filter(Boolean); if (picked.length) cols = picked; }
  let rows = r.rows;
  const sc = q.sort && r.cols.find(c => c.key === q.sort);
  if (sc) { const dir = q.dir === 'desc' ? -1 : 1;
    rows = [...rows].sort((a, b) => { const x = a[sc.key], y = b[sc.key]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      return (sc.num ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' })) * dir; }); }
  if (q.format === 'csv') {
    await slog(ctx, 'report_export', `${ctx.params.type} (${rows.length} rows)`);
    return { __raw: true, text: csv(rows, cols), headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="elc-${ctx.params.type}-${nowIso().slice(0, 10)}.csv"` } };
  }
  return { title: r.title, cols: r.cols, shown: cols.map(c => c.key), total: rows.length, rows: rows.slice(0, 1500) };
});

// per-college student summary used on certificates
export async function studentSummary(ctx, collegeId) {
  const rows = (await baseRows(ctx)).filter(r => r.college_id === collegeId);
  return DATASETS.students.build(rows).filter(r => r.present > 0);
}
