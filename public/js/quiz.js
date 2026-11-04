'use strict';
// ---- Quiz competition: the student pages (join, answer on a phone, live quiz) and the coordinator's page inside the college or school workspace ----
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private window: the quiz still works, only resuming does not */ } };
const mmss = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s)) % 60).padStart(2, '0')}`;
const qzLeaving = () => !location.hash.startsWith('#/quiz');
const QZ_LEVELS = [['Institution round', 'Run by your ELC coordinator', '2 – 7 Nov', 'Top 2 students of each college or school'], ['Assembly Constituency round', 'Run by the district team', '10 – 13 Nov', 'Top 10 students of each constituency'], ['District final', 'Run by the district team, live', '16 – 18 Nov', 'The final top 10 winners of Kozhikode']];

// ---------- the join page ----------
async function renderQuiz(code) {
  if (!feat('public', 'quiz')) { location.hash = '#/'; return; }
  clearTimeout(QZ?.poll); clearInterval(QZ?.timer); QZ = null;
  if (!code) return show($('#app'), publicShell(quizHome(), 'quiz'));
  code = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  show($('#app'), publicShell(html`<div class="wrap section"><div class="loading"><div class="spin"></div>Opening the quiz…</div></div>`, 'quiz'));
  let info; try { info = await api('/api/public/quiz/' + code); } catch (e) { return show($('#app'), publicShell(quizHome(e.message), 'quiz')); }
  const tk = lsGet('elcq:' + code);
  if (tk) { try { return quizEnter(info, await api(`/api/public/quiz/${code}/start`, 'POST', { token: tk })); } catch { lsSet('elcq:' + code, null); } }
  quizJoinPage(info);
}
function quizHome(err = '') {
  return html`<section class="hero qz-hero"><div class="wrap"><div><span class="eyebrow"><span class="live"></span> Electoral Literacy Clubs · 2 – 20 November 2026</span><h1>The ELC <em>Quiz</em> Competition</h1>
      <p class="lead">Questions on the electoral roll, EVMs and VVPAT, the polling process and counting. Take part from your phone with the code your ELC coordinator or the quiz team gives you.</p></div>
    <form class="hero-card qz-code" data-form="qzCode" novalidate><b>Enter the quiz code</b><input class="qz-code-in" name="code" maxlength="6" autocomplete="off" autocapitalize="characters" inputmode="text" placeholder="e.g. K7PX4M" aria-label="Quiz code" required>
      ${err ? html`<div class="alert err" role="alert">${err}</div>` : ''}<button class="btn accent lg" type="submit">${icon('arrow-right')} Join the quiz</button><small class="muted">The code is six letters and numbers.</small></form></div></section>
  <section class="section"><div class="wrap"><div class="section-head"><div><h2>Three rounds</h2><p>Students who do well go on to the next round.</p></div></div>
    <ol class="qz-levels">${QZ_LEVELS.map(([t, by, d, up], i) => html`<li class="rv"><span class="n">${i + 1}</span><h3>${t}</h3><p class="small muted">${by}</p><div class="qz-when">${icon('calendar')} ${d}</div><p>${up}</p></li>`)}</ol></div></section>`;
}
forms.qzCode = f => { const c = String(fd(f).code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length < 4) throw new Error('Type the quiz code'); location.hash = '#/quiz/' + c; };
function quizJoinPage(info) {
  const closed = info.status !== 'open', cols = [...new Set(info.invited.map(p => p.college))];
  show($('#app'), publicShell(html`<div class="wrap qz-wrap"><div class="card qz-join"><span class="qz-badge">${info.level === 'institution' ? 'Institution round' : info.level === 'ac' ? 'AC round' : 'District final'}</span>
    <h1>${info.title}</h1><p class="muted">${info.n} questions · ${info.mode === 'live' ? 'live quiz, answer when the question appears' : info.minutes + ' minutes'}</p>
    ${closed ? html`<div class="alert warn">${icon('alert')}<div>${info.status === 'closed' ? 'This quiz has closed.' : 'This quiz has not opened yet. Please wait for your coordinator or the quiz team.'}</div></div>`
      : html`<form data-form="qzJoin" class="stack-s" novalidate>
        ${info.restricted ? html`<label class="f"><span>Your college or school</span><select id="qzcol" required><option value="">Choose…</option>${cols.map(c => html`<option>${c}</option>`)}</select></label>
          <label class="f"><span>Your name</span><select name="person_id" id="qzper" required disabled><option value="">Choose your college first</option></select></label>`
        : html`<label class="f"><span>Your name *</span><input type="text" name="name" maxlength="60" autocomplete="name" required placeholder="Full name"></label>
          <label class="f"><span>Class or course</span><input type="text" name="klass" maxlength="40" placeholder="e.g. 2nd year BA, Plus Two B"></label>`}
        <div data-err></div><button class="btn accent lg" type="submit">${icon('arrow-right')} ${info.mode === 'live' ? 'Join the quiz' : 'Start the quiz'}</button>
        <p class="small muted">${info.mode === 'live' ? 'Keep this page open. Questions appear when the host starts.' : `Once you start, the ${info.minutes} minutes begin. Answer all ${info.n} questions and press Finish.`}</p></form>`}</div>
    <p class="center small muted" style="margin-top:12px"><a href="#/quiz">Use a different code</a></p></div>`, 'quiz'));
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
  QZ = { info, token: r.token, qs: r.questions, ans: saved, i: 0, deadline: Date.now() + (r.ends_at - r.now), done: false };
  const first = QZ.qs.findIndex(q => saved[q.id] === undefined); QZ.i = first < 0 ? 0 : first;
  quizPaint();
  clearInterval(QZ.timer); QZ.timer = setInterval(() => {
    if (qzLeaving() || !QZ) return clearInterval(QZ?.timer);
    const left = (QZ.deadline - Date.now()) / 1000, t = $('#qzt'); if (t) { t.textContent = mmss(left); t.classList.toggle('low', left < 60); }
    if (left <= 0 && !QZ.done) { clearInterval(QZ.timer); toast('Time is up. Sending your answers.'); quizSubmit(true); }
  }, 500);
}
function quizPaint() {
  const { qs, i, ans, info } = QZ, q = qs[i], answered = qs.filter(x => ans[x.id] !== undefined).length;
  show($('#app'), publicShell(html`<div class="wrap qz-wrap"><div class="qz-top"><div><b>${info.title}</b><div class="small muted">${info.college || ''}</div></div><div class="qz-time" title="Time left">${icon('clock')} <span id="qzt">${mmss((QZ.deadline - Date.now()) / 1000)}</span></div></div>
    <div class="qz-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${answered}"><i style="width:${Math.round(answered / qs.length * 100)}%"></i></div>
    <div class="card qz-q"><div class="qz-qn">Question ${i + 1} of ${qs.length}${q.theme ? html` <span class="badge grey">${q.theme}</span>` : ''}</div><h2>${q.text}</h2>
      <div class="qz-opts" role="radiogroup" aria-label="Answers">${q.opts.map((o, k) => html`<button class="qz-opt c${k} ${ans[q.id] === o.i ? 'on' : ''}" role="radio" aria-checked="${ans[q.id] === o.i}" data-act="qzPick" data-q="${q.id}" data-i="${o.i}"><span class="qz-l">${'ABCD'[k]}</span><span>${o.t}</span></button>`)}</div></div>
    <div class="qz-nav"><button class="btn secondary" data-act="qzGo" data-d="-1" ${i === 0 ? 'disabled' : ''}>${icon('arrow-left')} Previous</button>
      <div class="qz-dots" aria-hidden="true">${qs.map((x, k) => html`<button class="${k === i ? 'cur' : ''} ${ans[x.id] !== undefined ? 'ok' : ''}" data-act="qzJump" data-k="${k}" tabindex="-1"></button>`)}</div>
      ${i < qs.length - 1 ? html`<button class="btn primary" data-act="qzGo" data-d="1">Next ${icon('arrow-right')}</button>` : html`<button class="btn accent" data-act="qzFinish">${icon('check-circle')} Finish</button>`}</div></div>`, 'quiz'));
}
actions.qzPick = el => { QZ.ans[el.dataset.q] = Number(el.dataset.i); lsSet('elcq:' + QZ.info.code + ':a', JSON.stringify(QZ.ans)); quizPaint(); $('.qz-opt.on')?.focus(); };
actions.qzGo = el => { QZ.i = Math.max(0, Math.min(QZ.qs.length - 1, QZ.i + Number(el.dataset.d))); quizPaint(); window.scrollTo(0, 0); };
actions.qzJump = el => { QZ.i = Number(el.dataset.k); quizPaint(); };
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
  show($('#app'), publicShell(html`<div class="wrap qz-wrap"><div class="card qz-done"><div class="qz-ring" style="--p:${pct}"><b>${score}</b><span>of ${total}</span></div><h1>${pct >= 80 ? 'Excellent!' : pct >= 50 ? 'Well done!' : 'Thank you for taking part!'}</h1>
    <p class="muted">You answered <b>${score}</b> of ${total} questions correctly. Your coordinator or the quiz team will announce who goes on to the next round.</p>
    <a class="btn secondary" href="#/">${icon('home')} Back to the home page</a></div></div>`, 'quiz'));
}

// ---------- the live quiz on a phone ----------
function quizLive(info, r) {
  QZ = { info, token: r.token, name: r.name, key: '', poll: null };
  const tick = async () => {
    if (qzLeaving() || !QZ || QZ.info !== info) return;
    let s; try { s = await api(`/api/public/quiz/${info.code}/live?token=${encodeURIComponent(QZ.token)}`); } catch { QZ.poll = setTimeout(tick, 3000); return; }
    const key = [s.phase, s.idx, s.you?.answered, s.status].join('|');
    if (key !== QZ.key) { QZ.key = key; QZ.state = s; qzLivePaint(s); } else { QZ.state = s; const t = $('#qzlt'); if (t) t.textContent = s.left; }
    QZ.poll = setTimeout(tick, s.phase === 'question' ? 1500 : 2500);
  };
  tick();
}
function qzLivePaint(s) {
  const info = QZ.info, you = s.you || { score: 0 };
  let body;
  if (s.phase === 'lobby') body = html`<div class="card qz-live"><span class="sf-tick">${icon('check-circle')}</span><h2>You are in, ${QZ.name.split(' ')[0]}!</h2><p class="muted">Keep this page open. The first question appears when the host starts.</p></div>`;
  else if (s.phase === 'question' && s.question) body = html`<div class="qz-livehead"><span>Question ${s.idx + 1} of ${s.n}</span><span class="qz-time">${icon('clock')} <span id="qzlt">${s.left}</span>s</span></div><div class="card qz-q"><h2>${s.question.text}</h2>
      ${you.answered !== null && you.answered !== undefined ? html`<div class="alert info" style="margin:12px 0">${icon('check-circle')}<div>Answer locked. Wait for the answer to be shown.</div></div>` : ''}
      <div class="qz-opts">${s.question.opts.map(o => html`<button class="qz-opt c${o.i} ${you.answered === o.i ? 'on' : ''}" data-act="qzLiveAns" data-i="${o.i}" ${you.answered !== null && you.answered !== undefined ? 'disabled' : ''}><span class="qz-l">${'ABCD'[o.i]}</span><span>${o.t}</span></button>`)}</div></div>`;
  else if (s.phase === 'reveal' && s.question) { const ok = you.answered === s.correct; body = html`<div class="qz-livehead"><span>Question ${s.idx + 1} of ${s.n}</span><span>Score ${you.score}</span></div><div class="card qz-q"><h2>${s.question.text}</h2>
      <div class="alert ${you.answered === null || you.answered === undefined ? 'warn' : ok ? 'ok' : 'err'}" style="margin:12px 0">${icon(ok ? 'check-circle' : 'alert')}<div><b>${you.answered === null || you.answered === undefined ? 'No answer given' : ok ? 'Correct!' : 'Not this time'}</b>${you.rank ? ` · you are number ${you.rank}` : ''}</div></div>
      <div class="qz-opts">${s.question.opts.map(o => html`<div class="qz-opt c${o.i} ${o.i === s.correct ? 'right' : 'dim'} ${you.answered === o.i ? 'on' : ''}"><span class="qz-l">${'ABCD'[o.i]}</span><span>${o.t}</span><em>${s.counts?.[o.i] ?? 0}</em></div>`)}</div></div>`; }
  else if (s.phase === 'end') body = html`<div class="card qz-done"><h1>The quiz is over</h1><p class="muted">You scored <b>${you.score}</b> of ${s.n}${you.rank ? html` and finished <b>number ${you.rank}</b>` : ''}.</p>
      <ol class="qz-board">${(s.board || []).slice(0, 10).map(b => html`<li><b>${b.rank}</b><span>${b.name}<small>${b.college}</small></span><i>${b.score}</i></li>`)}</ol></div>`;
  else body = html`<div class="card qz-live"><div class="spin"></div><p class="muted">Waiting for the next question…</p></div>`;
  show($('#app'), publicShell(html`<div class="wrap qz-wrap"><div class="qz-top"><div><b>${info.title}</b></div><div class="small muted">${QZ.name}</div></div>${body}</div>`, 'quiz'));
}
actions.qzLiveAns = async el => {
  const s = QZ.state, i = Number(el.dataset.i);
  try { await api(`/api/public/quiz/${QZ.info.code}/answer`, 'POST', { token: QZ.token, idx: s.idx, choice: i }); QZ.state.you = { ...(s.you || {}), answered: i }; QZ.key = ''; qzLivePaint({ ...s, you: { ...(s.you || {}), answered: i } }); QZ.key = [s.phase, s.idx, i, s.status].join('|'); }
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
      <div class="qz-status"><div class="small muted">${q.n} questions · ${q.minutes} minutes</div><div>${open ? badge('Open for students', 'ok') : badge('Closed', 'grey')}</div><button class="btn sm ${open ? 'secondary' : 'primary'}" data-act="qzStatus" data-s="${open ? 'closed' : 'open'}">${open ? 'Close the quiz' : 'Open the quiz'}</button></div></div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>${icon('printer')} Without phones: use paper</h3></div><p class="small muted" style="margin-bottom:10px">Print the question paper and the answer sheet, let the students write, then type each student's answers below. The same questions are used, so paper and phone results are ranked together.</p>
      <div class="row gap-s"><button class="btn secondary" data-act="qzPrint" data-k="paper">${icon('file')} Question paper</button><button class="btn secondary" data-act="qzPrint" data-k="sheet">${icon('clipboard')} Answer sheet</button><button class="btn secondary" data-act="qzPrint" data-k="key">${icon('check-circle')} Answer key (for you)</button></div>
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
const qzEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// printing: the paper is placed in a print-only layer, so the page behind it is not printed
async function qzPrintData(kind, url) {
  const p = await api(url), q = p.quiz, bits = [];
  const head = `<div class="pp-head"><b>ELC Quiz Competition 2026</b><span>${qzEsc(QD?.institution || q.title)}</span></div>`;
  if (kind === 'paper') {
    bits.push(`${head}<div class="pp-fields"><span>Name: ________________________________</span><span>Class: ______________</span><span>Date: ____________</span></div><p class="pp-note">${q.n} questions · ${q.minutes} minutes · Choose one answer for each question and mark it on the answer sheet.</p>`);
    bits.push(p.questions.map(x => `<div class="pp-q"><b>${x.no}.</b> ${qzEsc(x.text)}<ol type="a">${x.opts.map(o => `<li>${qzEsc(o)}</li>`).join('')}</ol></div>`).join(''));
  } else if (kind === 'sheet') {
    bits.push(`${head}<div class="pp-fields"><span>Name: ________________________________</span><span>Class: ______________</span></div><p class="pp-note">Fill one circle for each question.</p><table class="pp-omr"><tbody>${p.questions.map(x => `<tr><th>${x.no}</th>${'abcd'.split('').map(l => `<td><span class="pp-bub">${l}</span></td>`).join('')}</tr>`).join('')}</tbody></table>`);
  } else {
    bits.push(`${head}<h3>Answer key (for the coordinator only)</h3><table class="pp-key"><tbody>${p.key.map((k, i) => `<tr><th>${i + 1}</th><td>${k}</td></tr>`).join('')}</tbody></table>`);
  }
  return bits.join('');
}
actions.qzPrint = async el => {
  const htmlText = await qzPrintData(el.dataset.k, '/api/college/quiz/paper');
  quizPrintLayer(htmlText);
};
function quizPrintLayer(htmlText) {
  document.getElementById('printarea')?.remove();
  const d = document.createElement('div'); d.id = 'printarea'; d.innerHTML = htmlText; document.body.append(d);
  const done = () => { d.remove(); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); setTimeout(() => window.print(), 80);
}
