// Sections the super admin can switch on or off, per audience. [id, label, on by default]
// The village programme is not live yet, so those sections start switched off.
export const FEATURES = {
  college: {
    title: 'College logins',
    items: [['home', 'Home', 1], ['enrol', 'Enrolment drive (department link)', 1], ['desk', 'Help desk daily report', 1], ['gallery', 'Gallery and photo frames', 1], ['notices', 'Announcements', 1], ['help', 'Help desk (issues)', 1], ['resources', 'Resource centre', 1],
      ['students', 'Village volunteers (students list)', 0], ['schedule', 'Village schedule', 0], ['log', 'Village daily log', 0], ['villages', 'My villages', 0], ['report', 'Village reports', 0]],
  },
  school: {
    title: 'School logins',
    items: [['home', 'Home', 1], ['enrol', 'Enrolment drive (class link)', 1], ['desk', 'Help desk daily report', 1], ['gallery', 'Gallery and photo frames', 1], ['notices', 'Announcements', 1], ['help', 'Help desk (issues)', 1], ['resources', 'Resource centre', 1]],
  },
  staff: {
    title: 'Admin, intern and super admin consoles',
    items: [['colleges', 'Colleges', 1], ['schools', 'Schools', 1], ['enrol', 'Enrolment drive', 1], ['desk', 'Help desk daily reports', 1], ['gallery', 'Gallery moderation', 1], ['issues', 'Help desk (issues)', 1], ['notices', 'Announcements', 1], ['resources', 'Resources', 1], ['reports', 'Reports and exports', 1],
      ['villages', 'Villages', 0], ['allot', 'Allotments', 0], ['officers', 'Village officers', 0], ['requests', 'Change requests', 0], ['cert', 'Certification', 0]],
  },
  public: {
    title: 'Public home page',
    items: [['map', 'Village map', 0], ['officer_login', 'Village officer sign-in', 0], ['album', 'Photo album', 1], ['school_signup', 'School sign-up', 1], ['leaderboard', 'Leaderboard and display board', 1]],
  },
};
const DEFAULTS = Object.fromEntries(Object.entries(FEATURES).flatMap(([aud, g]) => g.items.map(([id, , on]) => [`${aud}.${id}`, !!on])));

// all switches as { college: {home: true, ...}, school: {...}, staff: {...}, public: {...} }
export async function featureMap(db) {
  const rows = await db.all('SELECT key,enabled FROM features');
  const saved = new Map(rows.map(r => [r.key, !!r.enabled]));
  const out = {};
  for (const [aud, g] of Object.entries(FEATURES)) out[aud] = Object.fromEntries(g.items.map(([id]) => [id, saved.has(`${aud}.${id}`) ? saved.get(`${aud}.${id}`) : DEFAULTS[`${aud}.${id}`]]));
  return out;
}
export const isFeature = (key) => key in DEFAULTS;

// which switch guards an API path (null = always available)
const COLLEGE_PATHS = [[/^\/api\/college\/(schedule|roster)/, 'schedule'], [/^\/api\/college\/days/, 'log'], [/^\/api\/college\/(pool|submit-village)/, 'students'], [/^\/api\/college\/(villages|requests)/, 'villages'],
  [/^\/api\/college\/photos/, 'log'], [/^\/api\/college\/enrol/, 'enrol'], [/^\/api\/college\/desk/, 'desk'], [/^\/api\/college\/gallery/, 'gallery'], [/^\/api\/college\/issues/, 'help']];
const STAFF_PATHS = [[/^\/api\/staff\/villages/, 'villages'], [/^\/api\/staff\/assignments/, 'allot'], [/^\/api\/staff\/officers/, 'officers'], [/^\/api\/staff\/requests/, 'requests'], [/^\/api\/staff\/(acks|certificates)/, 'cert'],
  [/^\/api\/staff\/enrol/, 'enrol'], [/^\/api\/staff\/gallery/, 'gallery']];
export function guardedFeature(path, audience) {
  const table = audience === 'staff' ? STAFF_PATHS : audience === 'officer' ? [[/./, 'officer_login']] : COLLEGE_PATHS;
  const hit = table.find(([re]) => re.test(path));
  if (!hit) return null;
  return audience === 'officer' ? 'public.officer_login' : `${audience}.${hit[1]}`;
}
