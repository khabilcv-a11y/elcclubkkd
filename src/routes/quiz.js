// Quiz competition (ECI letter of 30 Oct 2026): three rounds: institution (run by the ELC coordinator; top 2 go on), Assembly Constituency (run by the
// district team; top 10 go on) and the district final (district team; top 10 winners). Every round is one quiz with a join code. Students answer on their
// phones (self-paced, or live with the host controlling the questions) or on paper (printed paper, then the coordinator keys in the answers).
import { route as baseRoute } from '../lib/router.js';
// saves are acknowledged at once and reach the Google Sheet a moment later, so nobody waits for Google
const route = (method, path, guard, handler) => baseRoute(method, path, guard, async ctx => { ctx.db.deferred = true; return handler(ctx); });
import { log } from '../lib/db.js';
import { HttpError, bad, nowIso, str, reqStr, token } from '../lib/util.js';
import { featureMap } from '../lib/features.js';
import { BANK, THEMES } from '../lib/quizbank.js';

const OPS = ['super_admin', 'admin'];
const slog = (ctx, a, d) => log(ctx.db, 'staff', ctx.user.username, ctx.user.role, a, d, ctx.ip);
const clog = (ctx, a, d) => log(ctx.db, 'college', ctx.college.name, null, a, d, ctx.ip);
const LETTERS = 'abcd', CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const parse = (s, d) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
const isOn = async db => !!(await featureMap(db)).public.quiz;

// ---------- the question bank (the 50 reference questions are loaded the first time it is needed) ----------
let seeding = null;
function ensureBank(db) {
  return (seeding ||= (async () => {
    if ((await db.get('SELECT COUNT(*) n FROM quiz_questions')).n) return;
    let i = 0; for (const [theme, text, opts, correct] of BANK) await db.insert('INSERT INTO quiz_questions(theme,text,opts,correct,active,sort_order,src,created_at) VALUES (?,?,?,?,1,?,?,?)', theme, text, JSON.stringify(opts), correct, ++i, 'ECI Annexure-I', nowIso());
  })().finally(() => { seeding = null; }));
}
const shuffle = (a, rnd = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const seeded = seed => { let t = (Number(seed) || 1) >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
// n questions, taken in turn from the four themes so every theme is covered
async function pickQuestions(db, n) {
  const rows = await db.all('SELECT id,theme FROM quiz_questions WHERE active=1');
  if (!rows.length) throw bad('The question bank is empty');
  const by = new Map(); for (const r of shuffle(rows)) { if (!by.has(r.theme)) by.set(r.theme, []); by.get(r.theme).push(r.id); }
  const lists = [...by.values()], out = [];
  for (let k = 0; out.length < Math.min(n, rows.length); k++) for (const l of lists) if (l[k] !== undefined && out.length < n) out.push(l[k]);
  return shuffle(out);
}
const newCode = async db => {
  for (let t = 0; t < 30; t++) { let c = ''; for (const x of crypto.getRandomValues(new Uint8Array(6))) c += CODE_CH[x % CODE_CH.length]; if (!(await db.get('SELECT 1 x FROM quizzes WHERE code=?', c))) return c; }
  throw new HttpError(500, 'Could not make a join code, please try again');
};
const questionsOf = async (db, ids) => {
  const rows = ids.length ? await db.all(`SELECT * FROM quiz_questions WHERE id IN (${ids.map(Number).join(',')})`) : [], m = new Map(rows.map(r => [r.id, r]));
  return ids.map(id => m.get(id)).filter(Boolean);
};
// the answer given for each question, in the order of the quiz: a letter string such as "abcd-ca" ("-" or "." = not answered)
function scorePaper(str0, rows) {
  const s = String(str0 || '').toLowerCase().replace(/[\s,]+/g, '');
  if (!s) throw bad('Type the answers as letters, for example abcdabcd');
  if (s.length > rows.length) throw bad(`There are only ${rows.length} questions, but ${s.length} answers were typed`);
  if (/[^a-d\-.x?]/.test(s)) throw bad('Use only the letters a, b, c, d (and - for a question left blank)');
  let score = 0; const ans = {};
  [...s].forEach((ch, i) => { const k = LETTERS.indexOf(ch); if (k >= 0) { ans[rows[i].id] = { c: k }; if (k === rows[i].correct) score++; } });
  return { score, ans };
}
function rankPeople(list, topN) {
  const done = list.filter(p => p.score !== null && p.score !== undefined);
  done.sort((a, b) => b.score - a.score || (a.secs ?? 1e9) - (b.secs ?? 1e9) || a.name.localeCompare(b.name));
  let rank = 0, prev = null;
  done.forEach((p, i) => { const key = p.score + '|' + (p.secs ?? 'x'); if (key !== prev) { rank = i + 1; prev = key; } p.rank = rank; });
  const cut = done[topN - 1], next = done[topN];
  const tie = !!(cut && next && cut.score === next.score && (cut.secs ?? null) === (next.secs ?? null));
  return { ranked: done, tie, waiting: list.filter(p => p.score === null || p.score === undefined) };
}
const dto = (p, extra = {}) => ({ id: p.id, name: p.name, klass: p.klass || '', college_id: p.college_id, score: p.score ?? null, total: p.total ?? null, secs: p.secs ?? null, source: p.source || '', selected: !!p.selected, invited: !!p.invited, started: !!p.started_at, finished: !!p.finished_at || p.score !== null && p.score !== undefined, ...extra });
const byCode = async (db, code) => {
  const q = await db.get('SELECT * FROM quizzes WHERE code=?', String(code || '').trim().toUpperCase());
  if (!q) throw new HttpError(404, 'No quiz has this code. Please check it and try again.');
  return q;
};
const quizDto = (q, extra = {}) => ({ id: q.id, code: q.code, level: q.level, ac: q.ac || '', title: q.title, mode: q.mode, status: q.status, n: parse(q.q_ids, []).length, minutes: q.minutes, per_q: q.per_q, top_n: q.top_n, created_at: q.created_at, ...extra });
const nameOk = (s, label = 'Name') => { const v = reqStr(s, label, 60).replace(/\s+/g, ' '); if (v.length < 2) throw bad(label + ' is too short'); return v; };

// ======================================================================= students (no sign-in)
route('GET', '/api/public/quiz/:code', null, async ctx => {
  if (!(await isOn(ctx.db))) throw new HttpError(404, 'Not available');
  const q = await byCode(ctx.db, ctx.params.code), n = parse(q.q_ids, []).length;
  let college = '', invited = [];
  if (q.level === 'institution') college = (await ctx.db.get('SELECT name FROM colleges WHERE id=?', q.college_id))?.name || '';
  else invited = (await ctx.db.all('SELECT p.id,p.name,p.klass,p.finished_at,p.score,p.started_at,c.name college FROM quiz_people p LEFT JOIN colleges c ON c.id=p.college_id WHERE p.quiz_id=? AND p.invited=1 ORDER BY c.name,p.name', q.id)).map(p => ({ id: p.id, name: p.name, klass: p.klass || '', college: p.college || '', done: !!p.finished_at || (p.score !== null && p.score !== undefined) }));
  return { code: q.code, title: q.title, level: q.level, mode: q.mode, status: q.status, n, minutes: q.minutes, per_q: q.per_q, college, restricted: q.level !== 'institution', invited };
});
// join (and, in a self-paced quiz, receive the questions). The same device can come back with its token and carry on.
route('POST', '/api/public/quiz/:code/start', null, async ctx => {
  if (!(await isOn(ctx.db))) throw new HttpError(404, 'Not available');
  await ctx.throttle(`qs:${ctx.ip}`, 600, 3600000);            // a whole class may share one connection
  ctx.db.deferred = true;
  const q = await byCode(ctx.db, ctx.params.code), b = ctx.body, ids = parse(q.q_ids, []);
  let p = null;
  if (b.token) p = await ctx.db.get('SELECT * FROM quiz_people WHERE quiz_id=? AND token=?', q.id, String(b.token));
  if (!p) {
    if (q.status !== 'open') throw new HttpError(403, q.status === 'closed' ? 'This quiz has closed.' : 'This quiz is not open yet.');
    if (q.level === 'institution') {
      const name = nameOk(b.name, 'Your name'), klass = str(b.klass, 40);
      const same = await ctx.db.get('SELECT id,finished_at,score FROM quiz_people WHERE quiz_id=? AND lower(name)=lower(?) AND COALESCE(lower(klass),\'\')=lower(?)', q.id, name, klass);
      if (same) throw new HttpError(409, 'A student with this name and class has already taken part. If this is a different student, add the surname or the division.');
      const id = await ctx.db.insert('INSERT INTO quiz_people(quiz_id,name,klass,college_id,invited,total,created_at) VALUES (?,?,?,?,0,?,?)', q.id, name, klass, q.college_id, ids.length, nowIso());
      p = await ctx.db.get('SELECT * FROM quiz_people WHERE id=?', id);
    } else {
      p = await ctx.db.get('SELECT * FROM quiz_people WHERE id=? AND quiz_id=? AND invited=1', Number(b.person_id), q.id);
      if (!p) throw bad('Choose your name from the list');
      if (p.token || p.finished_at || (p.score !== null && p.score !== undefined)) throw new HttpError(409, p.finished_at || p.score !== null ? 'This student has already taken part.' : 'This student has already started on another device. Please ask the quiz team.');
    }
    const tk = token(16); await ctx.db.run('UPDATE quiz_people SET token=?,total=? WHERE id=?', tk, ids.length, p.id); p.token = tk;
  }
  if (q.mode === 'live') return { ok: true, live: true, token: p.token, name: p.name };
  if (p.finished_at) return { ok: true, finished: true, token: p.token, score: p.score, total: p.total };
  if (!p.started_at) { p.started_at = nowIso(); await ctx.db.run('UPDATE quiz_people SET started_at=? WHERE id=?', p.started_at, p.id); }
  const rows = await questionsOf(ctx.db, ids), rnd = seeded(p.id), order = shuffle(rows, rnd);
  const ends = new Date(p.started_at).getTime() + q.minutes * 60000 + 20000;
  return { ok: true, token: p.token, name: p.name, ends_at: ends, now: Date.now(), minutes: q.minutes, questions: order.map(r => ({ id: r.id, theme: r.theme, text: r.text, opts: shuffle(parse(r.opts, []).map((t, i) => ({ i, t })), rnd) })) };
});
route('POST', '/api/public/quiz/:code/submit', null, async ctx => {
  ctx.db.deferred = true;
  const q = await byCode(ctx.db, ctx.params.code), p = await ctx.db.get('SELECT * FROM quiz_people WHERE quiz_id=? AND token=?', q.id, String(ctx.body.token || ''));
  if (!p) throw new HttpError(403, 'This attempt could not be found. Please start again.');
  if (p.finished_at) return { ok: true, score: p.score, total: p.total };
  const rows = await questionsOf(ctx.db, parse(q.q_ids, [])), given = ctx.body.answers && typeof ctx.body.answers === 'object' ? ctx.body.answers : {};
  let score = 0; const ans = {};
  for (const r of rows) { const c = Number(given[r.id]); if (Number.isInteger(c) && c >= 0 && c < 4) { ans[r.id] = { c }; if (c === r.correct) score++; } }
  const secs = Math.min(q.minutes * 60, Math.max(1, (Date.now() - new Date(p.started_at).getTime()) / 1000));
  await ctx.db.run('UPDATE quiz_people SET finished_at=?,score=?,total=?,secs=?,answers=?,source=? WHERE id=?', nowIso(), score, rows.length, Math.round(secs * 10) / 10, JSON.stringify(ans), 'phone', p.id);
  return { ok: true, score, total: rows.length };
});

// ---------- live quiz: the host moves the questions on, the phones follow ----------
const liveOf = q => parse(q.live, { phase: 'lobby', idx: -1 });
route('GET', '/api/public/quiz/:code/live', null, async ctx => {
  const q = await byCode(ctx.db, ctx.params.code), live = liveOf(q), ids = parse(q.q_ids, []);
  const out = { phase: live.phase, idx: live.idx, n: ids.length, title: q.title, per_q: q.per_q, status: q.status };
  if (live.phase === 'question' || live.phase === 'reveal') {
    const r = (await questionsOf(ctx.db, [ids[live.idx]]))[0];
    if (r) { out.question = { id: r.id, theme: r.theme, text: r.text, opts: parse(r.opts, []).map((t, i) => ({ i, t })) }; if (live.phase === 'reveal') { out.correct = r.correct; out.counts = live.counts || [0, 0, 0, 0]; } }
    out.left = live.phase === 'question' ? Math.max(0, Math.ceil(q.per_q - (Date.now() - live.t0) / 1000)) : 0;
  }
  const p = ctx.query.token ? await ctx.db.get('SELECT id,name,score,answers FROM quiz_people WHERE quiz_id=? AND token=?', q.id, String(ctx.query.token)) : null;
  if (p) { const a = parse(p.answers, {}), mine = out.question ? a[out.question.id] : null; out.you = { name: p.name, score: p.score || 0, answered: mine ? mine.c : null, rank: live.ranks ? live.ranks[p.id] || null : null }; }
  if (live.phase === 'end') { out.board = live.board || []; }
  return out;
});
route('POST', '/api/public/quiz/:code/answer', null, async ctx => {
  ctx.db.deferred = true;
  const q = await byCode(ctx.db, ctx.params.code), live = liveOf(q), b = ctx.body;
  if (live.phase !== 'question' || Number(b.idx) !== live.idx) throw bad('This question is closed');
  const elapsed = Date.now() - live.t0; if (elapsed > (q.per_q + 2) * 1000) throw bad('Time is up for this question');
  const p = await ctx.db.get('SELECT * FROM quiz_people WHERE quiz_id=? AND token=?', q.id, String(b.token || ''));
  if (!p) throw new HttpError(403, 'Please join the quiz again');
  const r = (await questionsOf(ctx.db, [parse(q.q_ids, [])[live.idx]]))[0], c = Number(b.choice);
  if (!r || !Number.isInteger(c) || c < 0 || c > 3) throw bad('Choose one of the four answers');
  const a = parse(p.answers, {}); if (a[r.id]) return { ok: true, locked: true };
  const ms = Math.min(elapsed, q.per_q * 1000), ok = c === r.correct; a[r.id] = { c, ms };
  await ctx.db.run('UPDATE quiz_people SET answers=?,score=?,total=?,secs=?,started_at=COALESCE(started_at,?),source=? WHERE id=?', JSON.stringify(a), (p.score || 0) + (ok ? 1 : 0), parse(q.q_ids, []).length, Math.round(((p.secs || 0) + (ok ? ms / 1000 : 0)) * 10) / 10, nowIso(), 'live', p.id);
  return { ok: true };
});

// ======================================================================= college or school: the institution round
const myQuiz = (db, ctx) => db.get("SELECT * FROM quizzes WHERE level='institution' AND college_id=?", ctx.college.id);
const peopleOf = async (db, quizId) => db.all('SELECT * FROM quiz_people WHERE quiz_id=? ORDER BY id', quizId);
async function institutionView(db, quiz, collegeId) {
  const people = await peopleOf(db, quiz.id), { ranked, tie, waiting } = rankPeople(people.map(p => dto(p)), quiz.top_n);
  return { quiz: quizDto(quiz), people: [...ranked, ...waiting], tie, selected: ranked.filter(p => p.selected).length };
}
route('GET', '/api/college/quiz', 'college', async ctx => {
  await ensureBank(ctx.db);
  const [bank, quiz, col, ac_q] = await Promise.all([ctx.db.all('SELECT theme,COUNT(*) n FROM quiz_questions WHERE active=1 GROUP BY theme'), myQuiz(ctx.db, ctx), ctx.db.get('SELECT ac FROM colleges WHERE id=?', ctx.college.id), null]);
  const total = bank.reduce((n, b) => n + b.n, 0), out = { on: await isOn(ctx.db), ac: col?.ac || '', institution: ctx.college.name, bank: { total, themes: bank }, quiz: null };
  if (quiz) Object.assign(out, await institutionView(ctx.db, quiz, ctx.college.id));
  return out;
});
route('POST', '/api/college/quiz', 'college', async ctx => {
  if (!(await isOn(ctx.db))) throw new HttpError(403, 'The quiz is closed right now.');
  await ensureBank(ctx.db); ctx.db.deferred = true;
  const n = Math.max(5, Math.min(50, Number(ctx.body.n) || 20)), minutes = Math.max(5, Math.min(90, Number(ctx.body.minutes) || 20)), old = await myQuiz(ctx.db, ctx);
  const ids = await pickQuestions(ctx.db, n);
  if (old) {
    if ((await ctx.db.get('SELECT COUNT(*) c FROM quiz_people WHERE quiz_id=?', old.id)).c) throw bad('Students have already taken part, so the questions cannot be changed now.');
    await ctx.db.run('UPDATE quizzes SET q_ids=?,minutes=? WHERE id=?', JSON.stringify(ids), minutes, old.id);
    await clog(ctx, 'quiz_reset', `${ids.length} questions`); return { ok: true, id: old.id };
  }
  const id = await ctx.db.insert('INSERT INTO quizzes(code,level,college_id,title,mode,status,q_ids,minutes,per_q,top_n,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    await newCode(ctx.db), 'institution', ctx.college.id, `ELC Quiz · ${ctx.college.name}`, 'self', 'open', JSON.stringify(ids), minutes, 20, 2, ctx.college.name, nowIso());
  await clog(ctx, 'quiz_create', `${ids.length} questions`);
  return { ok: true, id };
});
route('POST', '/api/college/quiz/status', 'college', async ctx => {
  const q = await myQuiz(ctx.db, ctx); if (!q) throw new HttpError(404, 'Start the quiz first');
  const s = ctx.body.status === 'closed' ? 'closed' : 'open';
  await ctx.db.run('UPDATE quizzes SET status=?,closed_at=? WHERE id=?', s, s === 'closed' ? nowIso() : null, q.id);
  await clog(ctx, 'quiz_' + s, q.code); return { ok: true };
});
// the printable question paper and the answer key
async function paperOf(db, q) {
  const rows = await questionsOf(db, parse(q.q_ids, []));
  return { quiz: quizDto(q), questions: rows.map((r, i) => ({ no: i + 1, theme: r.theme, text: r.text, opts: parse(r.opts, []) })), key: rows.map(r => LETTERS[r.correct]) };
}
route('GET', '/api/college/quiz/paper', 'college', async ctx => { const q = await myQuiz(ctx.db, ctx); if (!q) throw new HttpError(404, 'Start the quiz first'); return paperOf(ctx.db, q); });
// a student who wrote on paper: the answers are typed as letters (or only the marks)
route('POST', '/api/college/quiz/people', 'college', async ctx => {
  ctx.db.deferred = true;
  const q = await myQuiz(ctx.db, ctx); if (!q) throw new HttpError(404, 'Start the quiz first');
  const b = ctx.body, name = nameOk(b.name, 'Student name'), klass = str(b.klass, 40), rows = await questionsOf(ctx.db, parse(q.q_ids, []));
  if (await ctx.db.get('SELECT 1 x FROM quiz_people WHERE quiz_id=? AND lower(name)=lower(?) AND COALESCE(lower(klass),\'\')=lower(?)', q.id, name, klass)) throw new HttpError(409, 'A student with this name and class is already listed. Add the surname or division if it is another student.');
  let score, ans = {};
  if (String(b.answers || '').trim()) ({ score, ans } = scorePaper(b.answers, rows));
  else { score = Number(b.marks); if (!Number.isInteger(score) || score < 0 || score > rows.length) throw bad(`Type the answers, or the marks (0 to ${rows.length})`); }
  const id = await ctx.db.insert('INSERT INTO quiz_people(quiz_id,name,klass,college_id,invited,finished_at,score,total,answers,source,created_at) VALUES (?,?,?,?,0,?,?,?,?,?,?)', q.id, name, klass, ctx.college.id, nowIso(), score, rows.length, JSON.stringify(ans), 'paper', nowIso());
  await clog(ctx, 'quiz_paper_entry', `${name}: ${score}`); return { ok: true, id, score, total: rows.length };
});
route('DELETE', '/api/college/quiz/people/:id', 'college', async ctx => {
  const q = await myQuiz(ctx.db, ctx), p = q && await ctx.db.get('SELECT id,name FROM quiz_people WHERE id=? AND quiz_id=?', Number(ctx.params.id), q.id);
  if (!p) throw new HttpError(404, 'Student not found');
  if (await ctx.db.get("SELECT 1 x FROM quizzes z WHERE z.level<>'institution' AND z.college_id IS NULL AND EXISTS (SELECT 1 FROM quiz_people r WHERE r.quiz_id=z.id AND r.invited=1 AND lower(r.name)=lower(?) AND r.college_id=?)", p.name, ctx.college.id)) throw bad('This student has already been invited to the next round. Please ask the district team.');
  await ctx.db.run('DELETE FROM quiz_people WHERE id=?', p.id); return { ok: true };
});
route('POST', '/api/college/quiz/select', 'college', async ctx => {
  ctx.db.deferred = true;
  const q = await myQuiz(ctx.db, ctx); if (!q) throw new HttpError(404, 'Start the quiz first');
  if (await ctx.db.get("SELECT 1 x FROM quizzes z JOIN quiz_people r ON r.quiz_id=z.id WHERE z.level='ac' AND r.invited=1 AND r.college_id=?", ctx.college.id)) throw bad('The AC round has already been prepared with your students. Please ask the district team to change the selection.');
  const ids = [...new Set((Array.isArray(ctx.body.ids) ? ctx.body.ids : []).map(Number))];
  if (ids.length > q.top_n) throw bad(`Only the top ${q.top_n} students go to the next round`);
  const mine = (await peopleOf(ctx.db, q.id)).filter(p => p.score !== null && p.score !== undefined).map(p => p.id);
  if (ids.some(i => !mine.includes(i))) throw bad('Choose students who have taken the quiz');
  await ctx.db.run('UPDATE quiz_people SET selected=0 WHERE quiz_id=?', q.id);
  for (const i of ids) await ctx.db.run('UPDATE quiz_people SET selected=1 WHERE id=?', i);
  await clog(ctx, 'quiz_select', `${ids.length} students`); return { ok: true };
});

// ======================================================================= staff: bank, rounds, results, live host, report
const ROUND_LABEL = { institution: 'Institution', ac: 'AC round', district: 'District final' };
route('GET', '/api/staff/quiz/questions', 'staff', async ctx => {
  await ensureBank(ctx.db);
  return { themes: THEMES, questions: (await ctx.db.all('SELECT * FROM quiz_questions ORDER BY sort_order,id')).map(r => ({ id: r.id, theme: r.theme, text: r.text, opts: parse(r.opts, []), correct: r.correct, active: !!r.active, src: r.src })) };
});
const qBody = b => {
  const opts = (Array.isArray(b.opts) ? b.opts : []).map(x => String(x || '').trim());
  if (opts.length !== 4 || opts.some(x => !x)) throw bad('Give four answers');
  const correct = Number(b.correct); if (!Number.isInteger(correct) || correct < 0 || correct > 3) throw bad('Choose the correct answer');
  return { theme: str(b.theme, 40) || 'Other', text: reqStr(b.text, 'Question', 500), opts: JSON.stringify(opts), correct };
};
route('POST', '/api/staff/quiz/questions', OPS, async ctx => {
  const o = qBody(ctx.body), last = (await ctx.db.get('SELECT COALESCE(MAX(sort_order),0) n FROM quiz_questions')).n;
  const id = await ctx.db.insert('INSERT INTO quiz_questions(theme,text,opts,correct,active,sort_order,src,created_at) VALUES (?,?,?,?,1,?,?,?)', o.theme, o.text, o.opts, o.correct, last + 1, 'Added by the office', nowIso());
  await slog(ctx, 'quiz_question_add', o.text.slice(0, 60)); return { ok: true, id };
});
route('PUT', '/api/staff/quiz/questions/:id', OPS, async ctx => {
  const id = Number(ctx.params.id), cur = await ctx.db.get('SELECT * FROM quiz_questions WHERE id=?', id); if (!cur) throw new HttpError(404, 'Question not found');
  if (ctx.body.toggle) { await ctx.db.run('UPDATE quiz_questions SET active=? WHERE id=?', cur.active ? 0 : 1, id); return { ok: true }; }
  if (await ctx.db.get("SELECT 1 x FROM quizzes WHERE q_ids LIKE ? OR q_ids LIKE ? OR q_ids LIKE ? OR q_ids=?", `%[${id},%`, `%,${id},%`, `%,${id}]%`, `[${id}]`)) throw bad('This question is already used in a quiz, so it cannot be changed. Switch it off and add a new one instead.');
  const o = qBody(ctx.body); await ctx.db.run('UPDATE quiz_questions SET theme=?,text=?,opts=?,correct=? WHERE id=?', o.theme, o.text, o.opts, o.correct, id); return { ok: true };
});

// everything on one page: the institutions with their round, the ACs with their qualifiers, and the AC and district quizzes
route('GET', '/api/staff/quiz/overview', 'staff', async ctx => {
  await ensureBank(ctx.db);
  const [inst, quizzes, people, bank] = await Promise.all([
    ctx.db.all("SELECT id,name,COALESCE(kind,'college') kind,COALESCE(ac,'') ac FROM colleges WHERE active=1 ORDER BY name"),
    ctx.db.all('SELECT * FROM quizzes ORDER BY id'),
    ctx.db.all('SELECT quiz_id,college_id,invited,selected,score,finished_at FROM quiz_people'),
    ctx.db.get('SELECT COUNT(*) n FROM quiz_questions WHERE active=1')]);
  const stat = new Map(); for (const q of quizzes) stat.set(q.id, { invited: 0, done: 0, selected: 0, joined: 0 });
  for (const p of people) { const s = stat.get(p.quiz_id); if (!s) continue; s.joined++; if (p.invited) s.invited++; if (p.score !== null || p.finished_at) s.done++; if (p.selected) s.selected++; }
  const instQ = new Map(quizzes.filter(q => q.level === 'institution').map(q => [q.college_id, q]));
  const institutions = inst.map(c => { const q = instQ.get(c.id), s = q && stat.get(q.id); return { id: c.id, name: c.name, kind: c.kind, ac: c.ac, quiz: q ? { id: q.id, code: q.code, status: q.status } : null, participants: s ? s.done : 0, selected: s ? s.selected : 0 }; });
  const rounds = quizzes.filter(q => q.level !== 'institution').map(q => ({ ...quizDto(q), ...stat.get(q.id) }));
  return { bank: bank.n, institutions, rounds, on: await isOn(ctx.db) };
});
route('GET', '/api/staff/quiz/institution/:collegeId', 'staff', async ctx => {
  const q = await ctx.db.get("SELECT * FROM quizzes WHERE level='institution' AND college_id=?", Number(ctx.params.collegeId));
  const c = await ctx.db.get('SELECT id,name FROM colleges WHERE id=?', Number(ctx.params.collegeId)); if (!c) throw new HttpError(404, 'Institution not found');
  return { institution: c.name, ...(q ? await institutionView(ctx.db, q, c.id) : { quiz: null, people: [] }) };
});
route('POST', '/api/staff/quiz/institution/:collegeId/select', OPS, async ctx => {
  ctx.db.deferred = true;
  const q = await ctx.db.get("SELECT * FROM quizzes WHERE level='institution' AND college_id=?", Number(ctx.params.collegeId)); if (!q) throw new HttpError(404, 'This institution has no quiz');
  const ids = [...new Set((Array.isArray(ctx.body.ids) ? ctx.body.ids : []).map(Number))];
  if (ids.length > q.top_n) throw bad(`Only the top ${q.top_n} students go to the next round`);
  await ctx.db.run('UPDATE quiz_people SET selected=0 WHERE quiz_id=?', q.id); for (const i of ids) await ctx.db.run('UPDATE quiz_people SET selected=1 WHERE id=? AND quiz_id=?', i, q.id);
  await slog(ctx, 'quiz_select_inst', `${q.title}: ${ids.length}`); return { ok: true };
});

// AC round (invites the students each institution of that AC selected) and the district final (invites the AC winners)
route('POST', '/api/staff/quiz/rounds', OPS, async ctx => {
  await ensureBank(ctx.db); ctx.db.deferred = true;
  const b = ctx.body, level = b.level === 'district' ? 'district' : 'ac', mode = b.mode === 'live' ? 'live' : 'self';
  const n = Math.max(5, Math.min(50, Number(b.n) || (level === 'ac' ? 25 : 30))), minutes = Math.max(5, Math.min(120, Number(b.minutes) || 25)), per_q = Math.max(8, Math.min(90, Number(b.per_q) || 20)), top_n = Math.max(1, Math.min(30, Number(b.top_n) || 10));
  let invited, title, ac = '';
  if (level === 'ac') {
    ac = String(b.ac || ''); if (!ac) throw bad('Choose the Assembly Constituency');
    if (await ctx.db.get("SELECT 1 x FROM quizzes WHERE level='ac' AND ac=?", ac)) throw bad('The round of this constituency is already created. Open it from the list.');
    invited = await ctx.db.all("SELECT p.name,p.klass,p.college_id FROM quiz_people p JOIN quizzes z ON z.id=p.quiz_id AND z.level='institution' JOIN colleges c ON c.id=p.college_id WHERE p.selected=1 AND c.ac=? ORDER BY c.name,p.score DESC", ac);
    title = `AC round · ${ac}`;
  } else {
    if (await ctx.db.get("SELECT 1 x FROM quizzes WHERE level='district'")) throw bad('The district final is already created. Open it from the list.');
    invited = await ctx.db.all("SELECT p.name,p.klass,p.college_id FROM quiz_people p JOIN quizzes z ON z.id=p.quiz_id AND z.level='ac' WHERE p.selected=1 ORDER BY z.ac,p.score DESC");
    title = 'District final';
  }
  if (!invited.length) throw bad(level === 'ac' ? 'No institution of this constituency has selected students yet.' : 'No AC round winners have been selected yet.');
  const ids = await pickQuestions(ctx.db, n);
  const id = await ctx.db.insert('INSERT INTO quizzes(code,level,college_id,ac,title,mode,status,q_ids,minutes,per_q,top_n,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', await newCode(ctx.db), level, null, ac, title, mode, 'draft', JSON.stringify(ids), minutes, per_q, top_n, ctx.user.username, nowIso());
  for (const p of invited) await ctx.db.run('INSERT INTO quiz_people(quiz_id,name,klass,college_id,invited,total,created_at) VALUES (?,?,?,?,1,?,?)', id, p.name, p.klass, p.college_id, ids.length, nowIso());
  await slog(ctx, 'quiz_round_create', `${title}: ${invited.length} invited`); return { ok: true, id, invited: invited.length };
});
const roundOf = async ctx => { const q = await ctx.db.get("SELECT * FROM quizzes WHERE id=? AND level<>'institution'", Number(ctx.params.id)); if (!q) throw new HttpError(404, 'Round not found'); return q; };
async function roundView(db, q) {
  const [people, cols] = await Promise.all([peopleOf(db, q.id), db.all('SELECT id,name FROM colleges')]), cm = new Map(cols.map(c => [c.id, c.name]));
  const { ranked, tie, waiting } = rankPeople(people.map(p => dto(p, { college: cm.get(p.college_id) || '' })), q.top_n);
  return { quiz: quizDto(q, { live: liveOf(q) }), people: [...ranked, ...waiting], tie, selected: ranked.filter(p => p.selected).length };
}
route('GET', '/api/staff/quiz/rounds/:id', 'staff', async ctx => roundView(ctx.db, await roundOf(ctx)));
route('GET', '/api/staff/quiz/rounds/:id/paper', 'staff', async ctx => paperOf(ctx.db, await roundOf(ctx)));
route('POST', '/api/staff/quiz/rounds/:id/status', OPS, async ctx => {
  const q = await roundOf(ctx), s = ['open', 'closed', 'draft'].includes(ctx.body.status) ? ctx.body.status : 'open';
  await ctx.db.run('UPDATE quizzes SET status=?,closed_at=? WHERE id=?', s, s === 'closed' ? nowIso() : null, q.id); await slog(ctx, 'quiz_round_' + s, q.title); return { ok: true };
});
route('POST', '/api/staff/quiz/rounds/:id/settings', OPS, async ctx => {
  const q = await roundOf(ctx), b = ctx.body;
  if ((await ctx.db.get('SELECT COUNT(*) c FROM quiz_people WHERE quiz_id=? AND score IS NOT NULL', q.id)).c && b.regenerate) throw bad('Students have already answered, so the questions cannot be changed.');
  const ids = b.regenerate ? await pickQuestions(ctx.db, Math.max(5, Math.min(50, Number(b.n) || parse(q.q_ids, []).length))) : parse(q.q_ids, []);
  await ctx.db.run('UPDATE quizzes SET q_ids=?,minutes=?,per_q=?,top_n=?,mode=? WHERE id=?', JSON.stringify(ids), Math.max(5, Math.min(120, Number(b.minutes) || q.minutes)), Math.max(8, Math.min(90, Number(b.per_q) || q.per_q)), Math.max(1, Math.min(30, Number(b.top_n) || q.top_n)), b.mode === 'live' ? 'live' : b.mode === 'self' ? 'self' : q.mode, q.id);
  if (b.regenerate) await ctx.db.run('UPDATE quiz_people SET total=? WHERE quiz_id=?', ids.length, q.id);
  return { ok: true };
});
route('POST', '/api/staff/quiz/rounds/:id/invite', OPS, async ctx => {
  const q = await roundOf(ctx), b = ctx.body, name = nameOk(b.name, 'Student name'), col = await ctx.db.get('SELECT id FROM colleges WHERE id=?', Number(b.college_id));
  if (!col) throw bad('Choose the institution');
  await ctx.db.insert('INSERT INTO quiz_people(quiz_id,name,klass,college_id,invited,total,created_at) VALUES (?,?,?,?,1,?,?)', q.id, name, str(b.klass, 40), col.id, parse(q.q_ids, []).length, nowIso());
  await slog(ctx, 'quiz_invite', `${q.title}: ${name}`); return { ok: true };
});
route('DELETE', '/api/staff/quiz/rounds/:id/people/:pid', OPS, async ctx => {
  const q = await roundOf(ctx); await ctx.db.run('DELETE FROM quiz_people WHERE id=? AND quiz_id=?', Number(ctx.params.pid), q.id); return { ok: true };
});
route('POST', '/api/staff/quiz/rounds/:id/people/:pid', OPS, async ctx => {
  ctx.db.deferred = true;
  const q = await roundOf(ctx), p = await ctx.db.get('SELECT * FROM quiz_people WHERE id=? AND quiz_id=?', Number(ctx.params.pid), q.id); if (!p) throw new HttpError(404, 'Student not found');
  const rows = await questionsOf(ctx.db, parse(q.q_ids, [])), b = ctx.body; let score, ans = {};
  if (String(b.answers || '').trim()) ({ score, ans } = scorePaper(b.answers, rows));
  else { score = Number(b.marks); if (!Number.isInteger(score) || score < 0 || score > rows.length) throw bad(`Type the answers, or the marks (0 to ${rows.length})`); }
  await ctx.db.run('UPDATE quiz_people SET finished_at=?,score=?,total=?,answers=?,source=?,secs=NULL WHERE id=?', nowIso(), score, rows.length, JSON.stringify(ans), 'paper', p.id);
  await slog(ctx, 'quiz_paper_entry', `${q.title}: ${p.name} ${score}`); return { ok: true, score };
});
route('POST', '/api/staff/quiz/rounds/:id/select', OPS, async ctx => {
  ctx.db.deferred = true;
  const q = await roundOf(ctx), ids = [...new Set((Array.isArray(ctx.body.ids) ? ctx.body.ids : []).map(Number))];
  if (ids.length > q.top_n) throw bad(`Only ${q.top_n} students can be selected`);
  await ctx.db.run('UPDATE quiz_people SET selected=0 WHERE quiz_id=?', q.id); for (const i of ids) await ctx.db.run('UPDATE quiz_people SET selected=1 WHERE id=? AND quiz_id=?', i, q.id);
  await slog(ctx, 'quiz_round_select', `${q.title}: ${ids.length}`); return { ok: true };
});
route('DELETE', '/api/staff/quiz/rounds/:id', OPS, async ctx => {
  const q = await roundOf(ctx); await ctx.db.run('DELETE FROM quiz_people WHERE quiz_id=?', q.id); await ctx.db.run('DELETE FROM quizzes WHERE id=?', q.id);
  await slog(ctx, 'quiz_round_delete', q.title); return { ok: true };
});

// the host of a live round
const topBoard = (people, k = 10) => rankPeople(people.filter(p => p.started_at || p.answers).map(p => ({ id: p.id, name: p.name, college_id: p.college_id, score: p.score || 0, secs: p.secs ?? 0 })), 1).ranked.slice(0, k);
async function hostView(ctx, q) {
  const live = liveOf(q), ids = parse(q.q_ids, []), people = await peopleOf(ctx.db, q.id), cols = new Map((await ctx.db.all('SELECT id,name FROM colleges')).map(c => [c.id, c.name]));
  const out = { quiz: quizDto(q), live, joined: people.filter(p => p.token).length, invited: q.level === 'institution' ? 0 : people.length };
  if (live.phase === 'question' || live.phase === 'reveal') {
    const r = (await questionsOf(ctx.db, [ids[live.idx]]))[0];
    if (r) { out.question = { id: r.id, theme: r.theme, text: r.text, opts: parse(r.opts, []) }; out.answered = people.filter(p => parse(p.answers, {})[r.id]).length; if (live.phase === 'reveal') out.correct = r.correct; }
    out.left = live.phase === 'question' ? Math.max(0, Math.ceil(q.per_q - (Date.now() - live.t0) / 1000)) : 0;
  }
  out.board = live.phase === 'end' ? live.board : topBoard(people).map(p => ({ name: p.name, college: cols.get(p.college_id) || '', score: p.score, rank: p.rank }));
  return out;
}
async function hostAct(ctx, q) {
  ctx.db.deferred = true;
  if (q.mode !== 'live') throw bad('This quiz is not set to live mode');
  const live = liveOf(q), ids = parse(q.q_ids, []), act = ctx.body.action, cols = new Map((await ctx.db.all('SELECT id,name FROM colleges')).map(c => [c.id, c.name]));
  let s = { ...live };
  if (act === 'lobby') { s = { phase: 'lobby', idx: -1 }; await ctx.db.run('UPDATE quizzes SET status=?,closed_at=NULL WHERE id=?', 'open', q.id); }   // back to the start, open for students to join
  else if (act === 'next') { const idx = live.idx + 1; if (live.phase === 'question') throw bad('Show the answer first'); s = idx >= ids.length ? { ...live, phase: 'ending' } : { phase: 'question', idx, t0: Date.now(), ranks: live.ranks }; }
  else if (act === 'reveal') {
    if (live.phase !== 'question') throw bad('There is no open question');
    const people = await peopleOf(ctx.db, q.id), r = (await questionsOf(ctx.db, [ids[live.idx]]))[0], counts = [0, 0, 0, 0];
    for (const p of people) { const a = parse(p.answers, {})[r.id]; if (a) counts[a.c]++; }
    const rk = rankPeople(people.filter(p => p.token).map(p => ({ id: p.id, name: p.name, score: p.score || 0, secs: p.secs ?? 0 })), 1).ranked, ranks = {}; rk.forEach(p => { ranks[p.id] = p.rank; });
    s = { ...live, phase: 'reveal', counts, ranks };
  } else if (act === 'end') s = { ...live, phase: 'ending' };
  else throw bad('Unknown action');
  if (s.phase === 'ending') {                                    // final standings are kept in the round, and the round is closed
    const people = await peopleOf(ctx.db, q.id), rk = rankPeople(people.filter(p => p.token || p.score !== null).map(p => ({ id: p.id, name: p.name, college_id: p.college_id, score: p.score || 0, secs: p.secs ?? 0 })), q.top_n).ranked;
    for (const p of people) if (p.token && !p.finished_at) await ctx.db.run('UPDATE quiz_people SET finished_at=?,total=? WHERE id=?', nowIso(), ids.length, p.id);
    s = { phase: 'end', idx: live.idx, board: rk.slice(0, 15).map(p => ({ name: p.name, college: cols.get(p.college_id) || '', score: p.score, rank: p.rank })) };
    await ctx.db.run('UPDATE quizzes SET status=?,closed_at=? WHERE id=?', 'closed', nowIso(), q.id);
  }
  await ctx.db.run('UPDATE quizzes SET live=? WHERE id=?', JSON.stringify(s), q.id);
  return { ok: true, live: s };
}
route('GET', '/api/staff/quiz/rounds/:id/live', 'staff', async ctx => hostView(ctx, await roundOf(ctx)));
route('POST', '/api/staff/quiz/rounds/:id/live', OPS, async ctx => hostAct(ctx, await roundOf(ctx)));
// a coordinator can also run the institution round live: the questions on the classroom screen, the answer buttons on the students' phones
const ownQuiz = async ctx => { const q = await myQuiz(ctx.db, ctx); if (!q) throw new HttpError(404, 'Start the quiz first'); return q; };
route('GET', '/api/college/quiz/live', 'college', async ctx => hostView(ctx, await ownQuiz(ctx)));
route('POST', '/api/college/quiz/live', 'college', async ctx => hostAct(ctx, await ownQuiz(ctx)));
route('POST', '/api/college/quiz/settings', 'college', async ctx => {
  const q = await ownQuiz(ctx), b = ctx.body, mode = b.mode === 'live' ? 'live' : 'self', per_q = Math.max(8, Math.min(90, Number(b.per_q) || q.per_q));
  await ctx.db.run('UPDATE quizzes SET mode=?,per_q=?,live=NULL WHERE id=?', mode, per_q, q.id);
  await clog(ctx, 'quiz_mode', mode); return { ok: true };
});

// Annexure-II of the Commission's letter: the district's row for the compliance report
route('GET', '/api/staff/quiz/compliance', 'staff', async ctx => {
  const [quizzes, people, cols] = await Promise.all([ctx.db.all('SELECT * FROM quizzes'), ctx.db.all('SELECT quiz_id,college_id,invited,selected,score,finished_at,name,klass FROM quiz_people'), ctx.db.all('SELECT id,name,COALESCE(ac,\'\') ac FROM colleges')]);
  const qm = new Map(quizzes.map(q => [q.id, q])), cn = new Map(cols.map(c => [c.id, c])), done = p => p.score !== null || !!p.finished_at;
  const lvl = l => people.filter(p => qm.get(p.quiz_id)?.level === l);
  const inst = lvl('institution').filter(done), acp = lvl('ac').filter(done), dis = lvl('district').filter(done);
  const winners = lvl('district').filter(p => p.selected).map(p => ({ name: p.name, klass: p.klass, college: cn.get(p.college_id)?.name || '' }));
  const acs = {}; for (const p of lvl('ac')) { const a = qm.get(p.quiz_id).ac; (acs[a] ||= { ac: a, invited: 0, took: 0, selected: 0 }); acs[a].invited++; if (done(p)) acs[a].took++; if (p.selected) acs[a].selected++; }
  return { institutions_participated: new Set(inst.map(p => p.college_id)).size, institutions_total: cols.length, institution_participants: inst.length, institution_selected: lvl('institution').filter(p => p.selected).length, ac_participants: acp.length, district_finalists: dis.length, winners, acs: Object.values(acs) };
});
