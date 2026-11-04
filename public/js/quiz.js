'use strict';
// ---- Quiz competition: the student pages (join, answer on a phone, live quiz) and the coordinator's page inside the college or school workspace ----
let QZ = null;      // the student's current quiz (join page, questions, answers, live state)
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private window: the quiz still works, only resuming does not */ } };
const mmss = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s)) % 60).padStart(2, '0')}`;
const qzLeaving = () => !location.hash.startsWith('#/quiz');
const QZ_LEVELS = [['Institution round', 'Run by your ELC coordinator', '2 – 7 Nov', 'Top 2 students of each college or school'], ['Assembly Constituency round', 'Run by the district team', '10 – 13 Nov', 'Top 10 students of each constituency'], ['District final', 'Run by the district team, live', '16 – 18 Nov', 'The final top 10 winners of Kozhikode']];

// Every quiz screen uses this focused layout: a slim header with the quiz name and the timer, and no website menu or footer, so everything on the
// screen is about taking part. `foot` is a bar fixed to the bottom (reachable with a thumb), `progress` a thin bar under the header.
function quizShell(inner, o = {}) {
  return html`<div class="qx ${o.cls || ''}"><header class="qx-bar"><a class="qx-brand" href="#/" aria-label="Leave the quiz and go to the website"><img src="${LOGO.district}" alt=""><span class="qx-sep"></span><img src="${LOGO.sweepDark}" alt="SWEEP Kozhikode"></a>
    <div class="qx-title">${o.title || 'ELC Quiz Competition'}</div><div class="qx-right">${o.right || html`<a class="qx-exit" href="#/">${icon('home')}<span>Website</span></a>`}</div></header>${o.progress || ''}
    <main class="qx-main" id="main" tabindex="-1">${inner}</main>${o.foot || ''}</div>`;
}
const qzPaint = (inner, o) => { document.body.classList.add('in-quiz'); show($('#app'), quizShell(inner, o)); };

// ---------- the join page ----------
async function renderQuiz(code) {
  if (!feat('public', 'quiz')) { location.hash = '#/'; return; }
  clearTimeout(QZ?.poll); clearInterval(QZ?.timer); QZ = null;
  if (!code) return qzPaint(quizHome(), { title: 'ELC Quiz Competition' });
  code = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  qzPaint(html`<div class="qx-card center"><div class="spin" style="margin:6px auto 12px"></div><p class="muted">Opening the quiz…</p></div>`);
  let info; try { info = await api('/api/public/quiz/' + code); } catch (e) { return qzPaint(quizHome(e.message), { title: 'ELC Quiz Competition' }); }
  const tk = lsGet('elcq:' + code);
  if (tk) { try { return quizEnter(info, await api(`/api/public/quiz/${code}/start`, 'POST', { token: tk })); } catch { lsSet('elcq:' + code, null); } }
  quizJoinPage(info);
}
function quizHome(err = '') {
  return html`<div class="qx-card qx-hero"><span class="qx-kicker">Electoral Literacy Clubs · 2 – 20 November 2026</span><h1>ELC Quiz Competition</h1>
    <p class="qx-lead">Questions on the electoral roll, EVMs and VVPAT, the polling process and counting. Enter the code your coordinator or the quiz team gave you.</p>
    <form data-form="qzCode" class="qx-codeform" novalidate><label class="sr" for="qzcodein">Quiz code</label><input id="qzcodein" class="qx-codein" name="code" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ENTER CODE" required>
      ${err ? html`<div class="alert err" role="alert">${err}</div>` : ''}<button class="btn accent lg" type="submit">Join the quiz ${icon('arrow-right')}</button></form></div>
    <div class="qx-rounds"><h2>Three rounds</h2><ol>${QZ_LEVELS.map(([t, by, d, up], i) => html`<li><span class="n">${i + 1}</span><div><b>${t}</b><span>${by} · ${d}</span><span>${up}</span></div></li>`)}</ol></div>`;
}
forms.qzCode = f => { const c = String(fd(f).code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length < 4) throw new Error('Type the quiz code'); location.hash = '#/quiz/' + c; };
function quizJoinPage(info) {
  const closed = info.status !== 'open', cols = [...new Set(info.invited.map(p => p.college))], live = info.mode === 'live';
  qzPaint(html`<div class="qx-card"><span class="qx-kicker">${info.level === 'institution' ? 'Institution round' : info.level === 'ac' ? 'AC round' : 'District final'}</span><h1>${info.title}</h1>
    <ul class="qx-facts"><li>${icon('help')}<b>${info.n}</b> questions</li><li>${icon('clock')}${live ? 'Live: answer each question as it appears' : '<b>' + info.minutes + '</b> minutes'}</li></ul>
    ${closed ? html`<div class="alert warn">${icon('alert')}<div>${info.status === 'closed' ? 'This quiz has closed.' : 'This quiz has not opened yet. Please wait for your coordinator or the quiz team.'}</div></div>`
      : html`<form data-form="qzJoin" class="stack-s" novalidate>
        ${info.restricted ? html`<label class="f"><span>Your college or school</span><select id="qzcol" required><option value="">Choose…</option>${cols.map(c => html`<option>${c}</option>`)}</select></label>
          <label class="f"><span>Your name</span><select name="person_id" id="qzper" required disabled><option value="">Choose your college first</option></select></label>`
        : html`<label class="f"><span>Your name *</span><input type="text" name="name" maxlength="60" autocomplete="name" required placeholder="Full name"></label>
          <label class="f"><span>Class or course</span><input type="text" name="klass" maxlength="40" placeholder="e.g. 2nd year BA, Plus Two B"></label>`}
        <div data-err></div><button class="btn accent lg block" type="submit">${live ? 'Join the quiz' : 'Start the quiz'} ${icon('arrow-right')}</button>
        <p class="small muted center">${live ? 'Keep this page open. Questions appear when the host starts.' : `The ${info.minutes} minutes begin as soon as you start. Answer all ${info.n} questions and press Finish.`}</p></form>`}</div>`, { title: info.title });
  QZ = { info };
  const col = $('#qzcol'); col?.addEventListener('change', () => {
    const per = $('#qzper'), list = info.invited.filter(p => p.college === col.value);
    per.disabled = !list.length; per.innerHTML = list.length ? `<option value="">Choose your name…</option>` + list.map(p => `<option value="${p.id}" ${p.done ? 'disabled' : ''}>${esc(p.name)}${p.klass ? ' · ' + esc(p.klass) : ''}${p.done ? ' (done)' : ''}</option>`).join('') : '<option value="">Choose your college first</option>';
  });
}
forms.qzJoin = async f => {
  const info = QZ.info, v = fd(f);
  const r = await api(`/api/public/quiz/${info.code}/start`, 'POST', info.restricted ? { person_id: v.person_id } : { name: v.name, klass: v.klass });
  lsSet('elcq:' + info.code, r.token); quizEnter(info, r);
};
function quizEnter(info, r) {
  if (r.finished) return quizResult(info, r.score, r.total);
  if (r.live) return quizLive(info, r);
  quizPlay(info, r);
}

// ---------- answering on the phone (each student at their own pace, within the time) ----------
function quizPlay(info, r) {
  let saved = {}; try { saved = JSON.parse(lsGet('elcq:' + info.code + ':a') || '{}'); } catch { /* start fresh */ }
  QZ = { info, token: r.token, qs: r.questions, ans: saved, i: 0, deadline: Date.now() + (r.ends_at - r.now) - 20000, done: false };   // the server allows 20 more seconds, so a slow connection does not lose answers
  const first = QZ.qs.findIndex(q => saved[q.id] === undefined); QZ.i = first < 0 ? 0 : first;
  quizPaintQ();
  clearInterval(QZ.timer); QZ.timer = setInterval(() => {
    if (qzLeaving() || !QZ) return clearInterval(QZ?.timer);
    const left = (QZ.deadline - Date.now()) / 1000, t = $('#qzt'); if (t) { t.textContent = mmss(left); t.parentElement.classList.toggle('low', left < 60); }
    if (left <= 0 && !QZ.done) { clearInterval(QZ.timer); toast('Time is up. Sending your answers.'); quizSubmit(true); }
  }, 500);
}
function quizPaintQ() {
  const { qs, i, ans, info } = QZ, q = qs[i], answered = qs.filter(x => ans[x.id] !== undefined).length, left = (QZ.deadline - Date.now()) / 1000;
  qzPaint(html`<div class="qx-qtop"><span class="qx-qn">Question <b>${i + 1}</b> of ${qs.length}</span>${q.theme ? html`<span class="qx-topic">${q.theme}</span>` : ''}</div>
    <h1 class="qx-q">${q.text}</h1>
    <div class="qx-opts" role="radiogroup" aria-label="Answers">${q.opts.map((o, k) => html`<button class="qx-opt ${ans[q.id] === o.i ? 'on' : ''}" role="radio" aria-checked="${ans[q.id] === o.i}" data-act="qzPick" data-q="${q.id}" data-i="${o.i}"><span class="qx-l">${'ABCD'[k]}</span><span class="qx-t">${o.t}</span><span class="qx-chk">${icon('check-circle')}</span></button>`)}</div>`,
    { title: info.title, cls: 'play',
      right: html`<span class="qx-timer ${left < 60 ? 'low' : ''}" title="Time left">${icon('clock')}<b id="qzt">${mmss(left)}</b></span>`,
      progress: html`<div class="qx-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${answered}"><i style="width:${Math.round(answered / qs.length * 100)}%"></i></div>`,
      foot: html`<footer class="qx-foot"><button class="btn secondary" data-act="qzGo" data-d="-1" ${i === 0 ? 'disabled' : ''}>${icon('arrow-left')}<span>Previous</span></button><span class="qx-count"><b>${answered}</b> of ${qs.length} answered</span>
        ${i < qs.length - 1 ? html`<button class="btn primary" data-act="qzGo" data-d="1"><span>Next</span>${icon('arrow-right')}</button>` : html`<button class="btn accent" data-act="qzFinish">${icon('check-circle')}<span>Finish</span></button>`}</footer>` });
}
actions.qzPick = el => { QZ.ans[el.dataset.q] = Number(el.dataset.i); lsSet('elcq:' + QZ.info.code + ':a', JSON.stringify(QZ.ans)); quizPaintQ(); $('.qx-opt.on')?.focus(); };
actions.qzGo = el => { QZ.i = Math.max(0, Math.min(QZ.qs.length - 1, QZ.i + Number(el.dataset.d))); quizPaintQ(); window.scrollTo(0, 0); };
actions.qzFinish = async () => {
  const left = QZ.qs.filter(x => QZ.ans[x.id] === undefined).length;
  if (left && !await confirmBox(`${left} question${left === 1 ? ' is' : 's are'} not answered. Finish anyway?`, 'Finish', false)) return;
  quizSubmit(false);
};
async function quizSubmit(auto) {
  if (QZ.done) return; QZ.done = true; clearInterval(QZ.timer);
  try {
    const r = await api(`/api/public/quiz/${QZ.info.code}/submit`, 'POST', { token: QZ.token, answers: QZ.ans });
    lsSet('elcq:' + QZ.info.code + ':a', null); quizResult(QZ.info, r.score, r.total);
  } catch (e) { QZ.done = false; toast(e.message, true); if (auto) setTimeout(() => quizSubmit(true), 3000); }
}
function quizResult(info, score, total) {
  const pct = total ? Math.round(score / total * 100) : 0;
  qzPaint(html`<div class="qx-card center qx-result"><div class="qx-ring" style="--p:${pct}"><b>${score}</b><span>out of ${total}</span></div><h1>${pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Well done!' : 'Thank you for taking part!'}</h1>
    <p class="qx-lead">You answered <b>${score}</b> of ${total} questions correctly (${pct}%). Your coordinator or the quiz team will announce who goes on to the next round.</p><a class="btn secondary" href="#/">${icon('home')} Back to the website</a></div>`, { title: info.title });
}

// ---------- the live quiz on a phone: the question is on the big screen, the phone gives the answer buttons ----------
function quizLive(info, r) {
  QZ = { info, token: r.token, name: r.name, key: '', poll: null, timer: null };
  const tick = async () => {
    if (qzLeaving() || !QZ || QZ.info !== info) return;
    let s; try { s = await api(`/api/public/quiz/${info.code}/live?token=${encodeURIComponent(QZ.token)}`); } catch { QZ.poll = setTimeout(tick, 3000); return; }
    const key = [s.phase, s.idx, s.you?.answered, s.status].join('|');
    QZ.state = s; QZ.endAt = Date.now() + (s.left || 0) * 1000;
    if (key !== QZ.key) { QZ.key = key; qzLivePaint(s); }
    QZ.poll = setTimeout(tick, s.phase === 'question' ? 1200 : 2200);
  };
  clearInterval(QZ.timer); QZ.timer = setInterval(() => { const t = $('#qzlt'); if (t && QZ?.endAt) { const l = Math.max(0, Math.ceil((QZ.endAt - Date.now()) / 1000)); t.textContent = l; t.parentElement.classList.toggle('low', l <= 5); } }, 250);
  tick();
}
function qzLivePaint(s) {
  const info = QZ.info, you = s.you || { score: 0 }, has = you.answered !== null && you.answered !== undefined, who = html`<span class="qx-who">${icon('user-check')}<b>${QZ.name}</b></span>`;
  let body;
  if (s.phase === 'lobby') body = html`<div class="qx-card center qx-wait"><span class="qx-pulse">${icon('check-circle')}</span><h1>You are in, ${QZ.name.split(' ')[0]}!</h1><p class="qx-lead">Look at the main screen. The first question appears when the host starts.</p></div>`;
  else if (s.phase === 'question' && s.question) body = html`<div class="qx-qtop"><span class="qx-qn">Question <b>${s.idx + 1}</b> of ${s.n}</span><span class="qx-timer ${s.left <= 5 ? 'low' : ''}">${icon('clock')}<b id="qzlt">${s.left}</b><small>s</small></span></div>
      <p class="qx-hint">${has ? 'Answer locked. Wait for the answer to be shown on the main screen.' : 'Read the question on the main screen, then choose your answer.'}</p>
      <div class="qx-opts big">${s.question.opts.map(o => html`<button class="qx-opt c${o.i} ${you.answered === o.i ? 'on' : ''} ${has && you.answered !== o.i ? 'dim' : ''}" data-act="qzLiveAns" data-i="${o.i}" ${has ? 'disabled' : ''}><span class="qx-l">${'ABCD'[o.i]}</span><span class="qx-t">${o.t}</span></button>`)}</div>
      <details class="qx-showq"><summary>Show the question on my phone</summary><p>${s.question.text}</p></details>`;
  else if (s.phase === 'reveal' && s.question) { const ok = you.answered === s.correct; body = html`<div class="qx-qtop"><span class="qx-qn">Question <b>${s.idx + 1}</b> of ${s.n}</span><span class="qx-score">Score <b>${you.score}</b></span></div>
      <div class="qx-verdict ${!has ? 'none' : ok ? 'ok' : 'no'}">${icon(ok ? 'check-circle' : 'alert')}<div><b>${!has ? 'No answer given' : ok ? 'Correct!' : 'Not this time'}</b>${you.rank ? html`<span>You are number ${you.rank}</span>` : ''}</div></div>
      <h2 class="qx-q small">${s.question.text}</h2>
      <div class="qx-opts">${s.question.opts.map(o => html`<div class="qx-opt static ${o.i === s.correct ? 'win' : 'dim'} ${you.answered === o.i ? 'mine' : ''}"><span class="qx-l">${'ABCD'[o.i]}</span><span class="qx-t">${o.t}</span><em>${s.counts?.[o.i] ?? 0}</em></div>`)}</div>`; }
  else if (s.phase === 'end') body = html`<div class="qx-card center"><h1>The quiz is over</h1><p class="qx-lead">You scored <b>${you.score}</b> of ${s.n}${you.rank ? html` and finished <b>number ${you.rank}</b>` : ''}.</p>
      <ol class="qx-board">${(s.board || []).slice(0, 10).map(b => html`<li><b>${b.rank}</b><span>${b.name}<small>${b.college}</small></span><i>${b.score}</i></li>`)}</ol></div>`;
  else body = html`<div class="qx-card center qx-wait"><div class="spin" style="margin:0 auto 10px"></div><p class="muted">Waiting for the next question…</p></div>`;
  qzPaint(body, { title: info.title, right: who, cls: 'live' });
}
actions.qzLiveAns = async el => {
  const s = QZ.state, i = Number(el.dataset.i);
  try { await api(`/api/public/quiz/${QZ.info.code}/answer`, 'POST', { token: QZ.token, idx: s.idx, choice: i }); QZ.state.you = { ...(s.you || {}), answered: i }; QZ.key = [s.phase, s.idx, i, s.status].join('|'); qzLivePaint({ ...s, you: { ...(s.you || {}), answered: i } }); }
  catch (e) { toast(e.message, true); }
};

// ======================================================================= the coordinator's page (college or school workspace)
let QD = null;
async function pgQuiz(el) {
  const d = await api('/api/college/quiz'); QD = d;
  const q = d.quiz;
  if (!q) return show(el, html`${pageHead('Quiz competition', 'Run the institution round of the ELC Quiz Competition for your students. The 50 questions of the Election Commission are already loaded.', '', 'Campus to booth')}
    <div class="card qz-start"><div class="qz-steps"><div><span class="n">1</span><b>Create the quiz</b><p>Press the button. Questions are chosen for you from all four topics.</p></div><div><span class="n">2</span><b>Students join</b><p>Show the code or QR on a screen. Students answer on their phones. No phones? Print the paper instead.</p></div><div><span class="n">3</span><b>Send the top 2</b><p>The results are ranked automatically. Select the best 2 students for the next round.</p></div></div>
      ${d.on ? html`<form data-form="qzCreate" class="row" style="gap:14px;align-items:flex-end;margin-top:14px"><label class="f" style="margin:0"><span>Questions</span><select name="n"><option>10</option><option>15</option><option selected>20</option><option>25</option><option>30</option></select></label><label class="f" style="margin:0"><span>Minutes</span><select name="minutes"><option>10</option><option>15</option><option selected>20</option><option>30</option><option>45</option></select></label><button class="btn accent lg" type="submit">${icon('check-circle')} Create the quiz</button></form><div data-err></div>`
        : html`<div class="alert warn" style="margin-top:14px">${icon('alert')}<div>The quiz is not open right now.</div></div>`}</div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>What the quiz covers</h3></div><div class="pillrow">${d.bank.themes.map(t => badge(`${t.theme} (${t.n})`, 'info'))}</div></div>`);
  const link = `${location.origin}/#/quiz/${q.code}`, open = q.status === 'open', ppl = d.people, done = ppl.filter(p => p.score !== null);
  show(el, html`${pageHead('Quiz competition', 'Institution round: your students answer on their phones, or on paper if phones cannot be used. The best 2 go on to the Assembly Constituency round.', html`<button class="btn secondary" data-act="qzScreen">${icon('target')} Show the code on a screen</button>`, 'Campus to booth')}
    <div class="card qz-codecard"><div class="qz-qr" id="qzqr">${raw(qrSvg(link))}</div><div class="qz-codetxt"><span class="small muted">Quiz code</span><div class="qz-bigcode">${q.code}</div><div class="small">Students open <b>${location.host}</b> and choose <b>Quiz</b>, or scan the QR code.</div>
      <div class="row gap-s" style="margin-top:8px"><button class="btn secondary sm" data-act="qzCopy">${icon('copy')} Copy the link</button><a class="btn secondary sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`ELC Quiz: join with code ${q.code} or open ${link}`)}">${icon('share')} WhatsApp</a></div></div>
      <div class="qz-status"><div class="small muted">${q.n} questions · ${q.mode === 'live' ? q.per_q + ' seconds each, live' : q.minutes + ' minutes'}</div><div>${open ? badge('Open for students', 'ok') : badge('Closed', 'grey')}</div><button class="btn sm ${open ? 'secondary' : 'primary'}" data-act="qzStatus" data-s="${open ? 'closed' : 'open'}">${open ? 'Close the quiz' : 'Open the quiz'}</button></div></div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>${icon('target')} How will you run the quiz?</h3></div>
      <div class="qz-modes"><button class="qz-mode ${q.mode === 'live' ? 'on' : ''}" data-act="qzMode" data-m="live"><b>Live on the screen</b><span>You show each question on the classroom screen or projector. Students see only the answer buttons on their phones, and the next question appears when you move on. Like Mentimeter or Kahoot.</span></button>
        <button class="qz-mode ${q.mode === 'live' ? '' : 'on'}" data-act="qzMode" data-m="self"><b>On phones, at their own pace</b><span>Every student gets all the questions on their phone and answers within the time. Good when the screen cannot be shared or students join from home.</span></button></div>
      ${q.mode === 'live' ? html`<div class="row" style="margin-top:12px;gap:14px;align-items:flex-end"><label class="f" style="margin:0"><span>Seconds for each question</span><select id="qzperq" aria-label="Seconds for each question">${[10, 15, 20, 30, 45, 60].map(v => html`<option ${q.per_q === v ? 'selected' : ''}>${v}</option>`)}</select></label><button class="btn accent lg" data-act="qzHost">${icon('target')} Open the host screen</button></div><p class="small muted" style="margin-top:8px">Ask students to join first (code or QR above), then press <b>Start the quiz</b> on the host screen. Use <b>Show the answer</b> and <b>Next question</b> to move on.</p>` : ''}</div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>${icon('printer')} Without phones: use paper</h3></div><p class="small muted" style="margin-bottom:10px">Give each student an answer sheet and show or print the questions, then type each student's answers below. The same questions are used, so paper and phone results are ranked together.</p>
      <div class="row gap-s"><button class="btn secondary" data-act="qpPrint" data-k="project" data-url="/api/college/quiz/paper" data-inst="${esc(d.institution)}">${icon('target')} Show the questions on a screen</button><button class="btn secondary" data-act="qpPrint" data-k="sheet" data-url="/api/college/quiz/paper" data-inst="${esc(d.institution)}">${icon('clipboard')} Answer sheets</button><button class="btn secondary" data-act="qpPrint" data-k="paper" data-url="/api/college/quiz/paper" data-inst="${esc(d.institution)}">${icon('file')} Question paper</button><button class="btn secondary" data-act="qpPrint" data-k="key" data-url="/api/college/quiz/paper" data-inst="${esc(d.institution)}">${icon('check-circle')} Answer key (for you)</button></div>
      <p class="small muted" style="margin-top:8px">${icon('info')} <b>Saving paper:</b> show the questions on a screen or projector (or read them out) and print only the <b>answer sheets</b>: three to a page, so 30 students need 10 pages. If you print the question paper, it is two columns on two pages for 20 questions; print one for every four or five students to share.</p>
      <form data-form="qzPaper" class="qz-paper" novalidate><label class="f"><span>Student name *</span><input name="name" maxlength="60" required></label><label class="f"><span>Class</span><input name="klass" maxlength="40"></label>
        <label class="f qz-ans"><span>Answers, in order (a b c d, - if blank)</span><input name="answers" id="qzans" maxlength="80" autocomplete="off" spellcheck="false" placeholder="abcdabcd…"><small id="qzansn" class="muted">0 of ${q.n}</small></label><label class="f" style="max-width:110px"><span>or only marks</span><input name="marks" type="number" min="0" max="${q.n}" inputmode="numeric"></label>
        <button class="btn primary" type="submit">${icon('plus')} Add</button></form><div data-err></div></div>
    <div class="card pad0" style="margin-top:16px"><div class="filterbar"><div class="row"><b>Results</b><span class="muted small">${done.length} student${done.length === 1 ? '' : 's'} finished${ppl.length > done.length ? `, ${ppl.length - done.length} still answering` : ''}</span></div>
      <div class="row gap-s"><button class="btn secondary sm" data-act="qzRefresh">${icon('refresh')} Refresh</button><button class="btn secondary sm" data-act="qzCsv">${icon('download')} Download</button><button class="btn primary sm" data-act="qzTop" ${done.length ? '' : 'disabled'}>Select the top ${q.top_n}</button></div></div>
      ${d.tie ? html`<div class="alert warn" style="margin:0 16px 10px">${icon('alert')}<div>Students are tied at the cut-off. The letter allows a tie-breaker round: ask the tied students a few more questions, then tick the winners yourself.</div></div>` : ''}
      ${ppl.length ? html`<div class="tablewrap"><table data-nosort><thead><tr><th>#</th><th>Student</th><th>Class</th><th class="num">Score</th><th class="num">Time</th><th>Answered</th><th class="ia">Next round</th><th class="ia"></th></tr></thead><tbody>${ppl.map(p => html`<tr><td>${p.rank ?? '–'}</td><td><b>${p.name}</b></td><td>${p.klass}</td><td class="num">${p.score === null ? html`<span class="muted small">answering…</span>` : html`<b>${p.score}</b> / ${p.total}`}</td><td class="num">${p.secs ? mmss(p.secs) : '–'}</td><td>${p.source === 'paper' ? badge('Paper', 'grey') : p.source ? badge('Phone', 'info') : ''}</td><td class="ia">${p.score === null ? '' : html`<label class="chk"><input type="checkbox" data-qzsel="${p.id}" ${p.selected ? 'checked' : ''}> Selected</label>`}</td><td class="ia"><button class="ib danger" data-act="qzDel" data-id="${p.id}" title="Remove" aria-label="Remove ${esc(p.name)}">${icon('trash')}</button></td></tr>`)}</tbody></table></div>`
        : html`<div style="padding:18px">${empty('No one has taken part yet', 'Share the code, or add paper results above.', 'users')}</div>`}
      <div class="small muted" style="padding:10px 16px">${d.selected ? `${d.selected} selected for the next round.` : ''} ${d.ac ? `Your students go to the <b>${d.ac}</b> Assembly Constituency round.` : 'Your Assembly Constituency is not set yet. Please tell the district team.'}</div></div>`);
  $$('[data-qzsel]', el).forEach(c => c.addEventListener('change', async () => {
    const ids = $$('[data-qzsel]:checked', el).map(x => Number(x.dataset.qzsel));
    try { await api('/api/college/quiz/select', 'POST', { ids }); toast('Saved'); } catch (e) { c.checked = !c.checked; toast(e.message, true); }
  }));
  $('#qzans', el)?.addEventListener('input', e => { const n = e.target.value.replace(/[\s,]+/g, '').length; $('#qzansn').textContent = `${n} of ${q.n}`; });
}
forms.qzCreate = async f => { const v = fd(f); await api('/api/college/quiz', 'POST', { n: Number(v.n), minutes: Number(v.minutes) }); toast('Quiz created'); pgQuiz($('#pg')); };
forms.qzPaper = async f => {
  const v = fd(f); const r = await api('/api/college/quiz/people', 'POST', { name: v.name, klass: v.klass, answers: v.answers, marks: v.marks });
  toast(`${v.name}: ${r.score} of ${r.total}`); await pgQuiz($('#pg')); $('form[data-form=qzPaper] input[name=name]')?.focus();
};
actions.qzMode = async el => { await api('/api/college/quiz/settings', 'POST', { mode: el.dataset.m, per_q: Number($('#qzperq')?.value) || QD.quiz.per_q }); toast(el.dataset.m === 'live' ? 'Live mode: the questions will be shown on your screen' : 'Students will answer on their phones at their own pace'); pgQuiz($('#pg')); };
document.addEventListener('change', async e => { if (e.target.id === 'qzperq') { try { await api('/api/college/quiz/settings', 'POST', { mode: 'live', per_q: Number(e.target.value) }); toast('Saved'); } catch (er) { toast(er.message, true); } } });
actions.qzHost = () => quizHost({ code: QD.quiz.code, url: '/api/college/quiz/live', onClose: () => pgQuiz($('#pg')) });
actions.qzRefresh = () => pgQuiz($('#pg'));
actions.qzStatus = async el => { await api('/api/college/quiz/status', 'POST', { status: el.dataset.s }); toast(el.dataset.s === 'open' ? 'Quiz opened' : 'Quiz closed'); pgQuiz($('#pg')); };
actions.qzCopy = () => copyText(`${location.origin}/#/quiz/${QD.quiz.code}`, 'Link copied');
actions.qzDel = async el => { if (!await confirmBox('Remove this student from the results?', 'Remove', true)) return; await api('/api/college/quiz/people/' + el.dataset.id, 'DELETE'); pgQuiz($('#pg')); };
actions.qzTop = async () => {
  const ids = QD.people.filter(p => p.score !== null).slice(0, QD.quiz.top_n).map(p => p.id);
  if (QD.tie && !await confirmBox('Some students are tied at the cut-off. Select the first ' + QD.quiz.top_n + ' in the list anyway?', 'Select', false)) return;
  await api('/api/college/quiz/select', 'POST', { ids }); toast('Selected'); pgQuiz($('#pg'));
};
actions.qzCsv = () => download('quiz-results.csv', toCsv(['Rank', 'Student', 'Class', 'Score', 'Out of', 'Seconds', 'Answered on', 'Selected'], QD.people.map(p => [p.rank ?? '', p.name, p.klass, p.score ?? '', p.total ?? '', p.secs ?? '', p.source, p.selected ? 'Yes' : ''])));
// a big code and QR for the classroom screen
actions.qzScreen = () => { const q = QD.quiz, link = `${location.origin}/#/quiz/${q.code}`; modal(html`<div class="qz-screen"><h2>Join the ELC Quiz</h2><div class="qz-qr big">${raw(qrSvg(link))}</div><p>Open <b>${location.host}</b>, choose <b>Quiz</b> and type</p><div class="qz-bigcode huge">${q.code}</div><p class="muted">${QD.institution}</p></div>`, { wide: true }); };
