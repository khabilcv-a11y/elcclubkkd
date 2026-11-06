'use strict';
// ---------- Quiz competition, staff side: institutions' progress, the AC rounds and the district final, the live host screen, the question bank, the compliance report ----------
const QA_ACS = ['Vadakara', 'Kuttiady', 'Nadapuram', 'Koyilandy', 'Perambra', 'Balussery', 'Elathur', 'Kozhikode North', 'Kozhikode South', 'Beypore', 'Kunnamangalam', 'Koduvally', 'Thiruvambady'];
let QA = { tab: 'overview', f: 'all', ac: '', q: '', d: null, round: null };
const qaMmss = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s)) % 60).padStart(2, '0')}`;
const qaStatus = s => (s === 'open' ? badge('Open', 'ok') : s === 'closed' ? badge('Closed', 'grey') : badge('Not opened yet', 'warn'));
const qaLevel = l => (l === 'ac' ? 'AC round' : l === 'district' ? 'District final' : 'Institution round');

async function apQuiz(el) {
  QA.round = null;
  const d = await api('/api/staff/quiz/overview'); QA.d = d;
  const tabs = [['overview', 'Institutions'], ['rounds', 'AC rounds and final'], ['bank', 'Question bank'], ['report', 'Compliance report']];
  show(el, html`${pageHead('Quiz competition', 'ELC Quiz Competition (ECI letter of 30 Oct 2026): the institution round is run by each ELC coordinator; the AC rounds and the district final are run from here.', html`<a class="btn secondary" href="/#/quiz" target="_blank" rel="noopener">${icon('external')} Public join page</a>`, 'Campus to booth')}
    ${d.on ? '' : html`<div class="alert warn" style="margin-bottom:14px">${icon('alert')}<div>The quiz is switched off in Access control, so students cannot join.</div></div>`}
    <div class="chips" style="margin-bottom:14px" role="tablist">${tabs.map(([k, l]) => html`<button class="chip ${QA.tab === k ? 'on' : ''}" role="tab" aria-selected="${QA.tab === k}" data-act="qaTab" data-k="${k}">${l}</button>`)}</div><div id="qabody"></div>`);
  await qaBody();
}
actions.qaTab = el => { QA.tab = el.dataset.k; apQuiz($('#pg')); };
async function qaBody() {
  const b = $('#qabody'); if (!b) return;
  if (QA.tab === 'overview') return qaOverview(b);
  if (QA.tab === 'rounds') return qaRounds(b);
  if (QA.tab === 'bank') return qaBank(b);
  return qaReport(b);
}

// ---- institutions ----
function qaOverview(b) {
  const d = QA.d, I = d.institutions, started = I.filter(x => x.quiz), took = I.reduce((s, x) => s + x.participants, 0), sel = I.reduce((s, x) => s + x.selected, 0);
  const q = QA.q.trim().toLowerCase(), list = I.filter(x => (!q || x.name.toLowerCase().includes(q)) && (!QA.ac || (QA.ac === '-' ? !x.ac : x.ac === QA.ac)) && (QA.f === 'all' || (QA.f === 'none' && !x.quiz) || (QA.f === 'run' && x.quiz && !x.selected) || (QA.f === 'sel' && x.selected)));
  show(b, html`<div class="kpis">${kpi('Institutions started', started.length + ' of ' + I.length, { ic: 'building', count: false })}${kpi('Students who took part', took, { ic: 'users', tone: 'saffron' })}${kpi('Selected for the AC round', sel, { ic: 'award', tone: 'green' })}${kpi('AC rounds created', d.rounds.filter(r => r.level === 'ac').length + ' of 13', { ic: 'target', count: false })}</div>
    <div class="card pad0" style="margin-top:16px"><div class="filterbar"><div class="chips">${[['all', 'All'], ['none', 'Not started'], ['run', 'Running'], ['sel', 'Selected students']].map(([k, l]) => html`<button class="chip ${QA.f === k ? 'on' : ''}" data-act="qaFilter" data-k="${k}">${l}</button>`)}</div>
      <div class="row gap-s"><label class="f" style="margin:0"><span class="sr">Constituency</span><select id="qaac" aria-label="Constituency"><option value="">All constituencies</option>${QA_ACS.map(a => html`<option ${QA.ac === a ? 'selected' : ''}>${a}</option>`)}<option value="-" ${QA.ac === '-' ? 'selected' : ''}>No constituency set</option></select></label>
        <label class="f" style="margin:0;min-width:200px"><span class="sr">Search</span><input type="search" id="qaq" placeholder="Search institutions…" value="${esc(QA.q)}"></label></div></div>
      <div class="tablewrap"><table><thead><tr><th>Institution</th><th>Type</th><th>Constituency</th><th>Quiz</th><th class="num">Students</th><th class="num">Selected</th><th class="ia"></th></tr></thead><tbody>
      ${list.map(x => html`<tr><td><b>${x.name}</b></td><td>${x.kind === 'school' ? 'School' : 'College'}</td><td>${x.ac || html`<span class="muted small">not set</span>`}</td><td>${x.quiz ? html`${qaStatus(x.quiz.status)} <span class="xs muted">${x.quiz.code}</span>` : html`<span class="muted small">not started</span>`}</td><td class="num">${x.participants}</td><td class="num">${x.selected}</td><td class="ia">${x.quiz ? html`<button class="btn sm secondary" data-act="qaInst" data-id="${x.id}">View</button>` : ''}</td></tr>`)}</tbody></table></div>
      ${list.length ? '' : html`<div style="padding:18px">${empty('No institution matches', 'Try another filter.', 'building')}</div>`}</div>`);
  $('#qaac', b).addEventListener('change', e => { QA.ac = e.target.value; qaOverview(b); });
  const qi = $('#qaq', b); qi.addEventListener('input', () => { QA.q = qi.value; clearTimeout(QA.t); QA.t = setTimeout(() => { qaOverview(b); const n = $('#qaq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300); });
}
actions.qaFilter = el => { QA.f = el.dataset.k; qaOverview($('#qabody')); };
actions.qaInst = async el => {
  const r = await api('/api/staff/quiz/institution/' + el.dataset.id), ops = isOps(); window.__qai = { id: el.dataset.id, r };
  modal(html`<h2>${r.institution}</h2><p class="muted small">Institution round · code ${r.quiz.code} · ${r.quiz.n} questions</p>
    ${r.tie ? html`<div class="alert warn">${icon('alert')}<div>Tied at the cut-off. A tie-breaker is needed before choosing.</div></div>` : ''}
    ${r.people.length ? html`<div class="tablewrap" style="max-height:50vh"><table data-nosort><thead><tr><th>#</th><th>Student</th><th>Class</th><th class="num">Score</th><th class="num">Time</th><th></th>${ops ? html`<th class="ia">Selected</th>` : ''}</tr></thead><tbody>${r.people.map(p => html`<tr><td>${p.rank ?? '–'}</td><td><b>${p.name}</b></td><td>${p.klass}</td><td class="num">${p.score === null ? '…' : p.score + ' / ' + p.total}</td><td class="num">${p.secs ? qaMmss(p.secs) : '–'}</td><td>${p.source === 'paper' ? badge('Paper', 'grey') : p.source ? badge('Phone', 'info') : ''}</td>${ops ? html`<td class="ia">${p.score === null ? '' : html`<input type="checkbox" data-qasel="${p.id}" ${p.selected ? 'checked' : ''} aria-label="Select ${esc(p.name)}">`}</td>` : ''}</tr>`)}</tbody></table></div>` : empty('No students yet', '', 'users')}
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" data-act="closeModal">Close</button></div>`, { wide: true });
  document.querySelectorAll('[data-qasel]').forEach(c => c.addEventListener('change', async () => {
    const ids = [...document.querySelectorAll('[data-qasel]:checked')].map(x => Number(x.dataset.qasel));
    try { await api(`/api/staff/quiz/institution/${window.__qai.id}/select`, 'POST', { ids }); toast('Saved'); } catch (e) { c.checked = !c.checked; toast(e.message, true); }
  }));
};

// ---- AC rounds and the district final ----
function qaRounds(b) {
  const d = QA.d, I = d.institutions, unset = I.filter(x => !x.ac).length, ac = QA_ACS.map(a => {
    const ins = I.filter(x => x.ac === a), qual = ins.reduce((s, x) => s + x.selected, 0), round = d.rounds.find(r => r.level === 'ac' && r.ac === a);
    return { a, ins: ins.length, qual, round };
  }), fin = d.rounds.find(r => r.level === 'district'), winners = d.rounds.filter(r => r.level === 'ac').reduce((s, r) => s + r.selected, 0);
  const card = x => html`<article class="qa-ac ${x.round ? 'has' : ''}"><div class="row between"><b>${x.a}</b>${x.round ? qaStatus(x.round.status) : ''}</div><div class="small muted">${x.ins} institutions · ${x.qual} students qualified</div>
    ${x.round ? html`<div class="qa-bar" title="${x.round.done} of ${x.round.invited} finished"><i style="width:${x.round.invited ? Math.round(x.round.done / x.round.invited * 100) : 0}%"></i></div><div class="small">${x.round.done} of ${x.round.invited} finished · ${x.round.selected} selected${x.round.mode === 'live' ? ' · live' : ''}</div><button class="btn sm primary" data-act="qaOpen" data-id="${x.round.id}">Open the round</button>`
      : html`<div class="small muted">${x.qual ? 'Ready to create' : 'Waiting for institutions to select students'}</div>${isOps() ? html`<button class="btn sm ${x.qual ? 'primary' : 'secondary'}" data-act="qaNew" data-level="ac" data-ac="${x.a}" ${x.qual ? '' : 'disabled'}>Create the round</button>` : ''}`}</article>`;
  show(b, html`${unset ? html`<div class="alert warn" style="margin-bottom:14px">${icon('alert')}<div><b>${unset} active institutions have no Assembly Constituency</b>, so their students will not appear in any AC round. Set them from the Dashboard notice.</div></div>` : ''}
    <div class="qa-grid">${ac.map(card)}</div>
    <div class="card qa-final" style="margin-top:18px"><div class="row between"><div><h3>${icon('trophy')} District final</h3><p class="small muted">The ${winners} students selected in the AC rounds. The best ${fin?.top_n || 10} are the district winners.</p></div>
      ${fin ? html`<div class="row">${qaStatus(fin.status)}<button class="btn primary" data-act="qaOpen" data-id="${fin.id}">Open the final</button></div>` : isOps() ? html`<button class="btn primary" data-act="qaNew" data-level="district" ${winners ? '' : 'disabled'}>Create the final</button>` : ''}</div></div>`);
}
actions.qaNew = el => {
  const lvl = el.dataset.level, ac = el.dataset.ac || '';
  modal(html`<h2>${lvl === 'ac' ? 'AC round · ' + ac : 'District final'}</h2><p class="muted small">The students selected at the earlier round are invited automatically. Questions are chosen from all four topics.</p>
    <form data-form="qaCreate" data-level="${lvl}" data-ac="${ac}" class="stack-s"><div class="formgrid"><label class="f"><span>How it is run</span><select name="mode"><option value="self" ${lvl === 'ac' ? 'selected' : ''}>On phones, each at their own pace</option><option value="live" ${lvl === 'district' ? 'selected' : ''}>Live: the host shows each question</option></select></label>
      <label class="f"><span>Questions</span><input type="number" name="n" min="5" max="50" value="${lvl === 'ac' ? 25 : 30}"></label>
      <label class="f"><span>Minutes (phones) </span><input type="number" name="minutes" min="5" max="120" value="25"></label>
      <label class="f"><span>Seconds per question (live)</span><input type="number" name="per_q" min="8" max="90" value="20"></label>
      <label class="f"><span>Students selected for the next level</span><input type="number" name="top_n" min="1" max="30" value="10"></label><label class="f"><span>Order of the questions</span><select name="shuffle"><option value="1" selected>Shuffled</option><option value="0">Same as the question bank</option></select></label></div>${mfoot('Create')}</form>`);
};
forms.qaCreate = async f => {
  const v = fd(f), r = await api('/api/staff/quiz/rounds', 'POST', { level: f.dataset.level, ac: f.dataset.ac, mode: v.mode, n: Number(v.n), minutes: Number(v.minutes), per_q: Number(v.per_q), top_n: Number(v.top_n), shuffle: v.shuffle !== '0' });
  f.closest('.overlay').close(); toast(`Round created with ${r.invited} students`); QA.tab = 'rounds'; qaOpenRound(r.id);
};
actions.qaOpen = el => qaOpenRound(el.dataset.id);

// ---- one round ----
async function qaOpenRound(id) {
  const r = await api('/api/staff/quiz/rounds/' + id); QA.round = r; const q = r.quiz, ops = isOps(), link = `${location.origin}/#/quiz/${q.code}`;
  show($('#pg'), html`${pageHead(q.title, `${qaLevel(q.level)} · ${q.n} questions · ${q.mode === 'live' ? q.per_q + ' seconds each, live' : q.minutes + ' minutes on phones'} · top ${q.top_n} go on`, html`<button class="btn secondary" data-act="qaBack">${icon('arrow-left')} All rounds</button>`, 'Quiz competition')}
    <div class="card qz-codecard"><div class="qz-qr">${raw(qrSvg(link))}</div><div class="qz-codetxt"><span class="small muted">Quiz code</span><div class="qz-bigcode">${q.code}</div><div class="small">Students open <b>${location.host}</b>, choose <b>Quiz</b> and type the code, then pick their college and name.</div>
      <div class="row gap-s" style="margin-top:8px"><button class="btn secondary sm" data-act="qaCopy">${icon('copy')} Copy the link</button><button class="btn secondary sm" data-act="qaScreen">${icon('target')} Show on a screen</button></div></div>
      <div class="qz-status">${qaStatus(q.status)}${ops ? html`${q.status !== 'open' ? html`<button class="btn sm primary" data-act="qaStatus" data-s="open">Open for students</button>` : html`<button class="btn sm secondary" data-act="qaStatus" data-s="closed">Close</button>`}<button class="btn sm secondary" data-act="qaSettings">${icon('edit')} Settings</button>` : ''}
        ${q.mode === 'live' ? html`<button class="btn sm accent" data-act="qaHost" data-id="${q.id}">${icon('target')} Open the host screen</button>` : ''}</div></div>
    ${ops ? qzOrderCard(q, r.people.some(p => p.started || p.score !== null), `/api/staff/quiz/rounds/${q.id}/order`) : ''}
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>${icon('printer')} On paper</h3></div><div class="row gap-s"><button class="btn secondary" data-act="qpPrint" data-k="project" data-url="/api/staff/quiz/rounds/${q.id}/paper" data-inst="${esc(q.title)}">${icon('target')} Show the questions on a screen</button><button class="btn secondary" data-act="qpPrint" data-k="sheet" data-url="/api/staff/quiz/rounds/${q.id}/paper" data-inst="${esc(q.title)}">${icon('clipboard')} Answer sheets</button><button class="btn secondary" data-act="qpPrint" data-k="paper" data-url="/api/staff/quiz/rounds/${q.id}/paper" data-inst="${esc(q.title)}">${icon('file')} Question paper</button><button class="btn secondary" data-act="qpPrint" data-k="key" data-url="/api/staff/quiz/rounds/${q.id}/paper" data-inst="${esc(q.title)}">${icon('check-circle')} Answer key</button></div><p class="small muted" style="margin-top:8px">Project the questions and print only the answer sheets (three to a page) to save paper. Then use <b>Enter result</b> against each student below.</p></div>
    <div class="card pad0" style="margin-top:16px"><div class="filterbar"><div class="row"><b>Students</b><span class="muted small">${r.people.filter(p => p.score !== null).length} of ${r.people.length} finished</span></div>
      <div class="row gap-s">${ops ? html`<button class="btn secondary sm" data-act="qaInvite">${icon('plus')} Add a student</button>` : ''}<button class="btn secondary sm" data-act="qaRefresh">${icon('refresh')} Refresh</button><button class="btn secondary sm" data-act="qaCsv">${icon('download')} Download</button>${ops ? html`<button class="btn primary sm" data-act="qaTop">Select the top ${q.top_n}</button>` : ''}</div></div>
      ${ops ? qaTie(r) : (r.tie ? html`<div class="alert warn" style="margin:0 16px 10px">${icon('alert')}<div>Students are tied at the cut-off. A tie-breaker is needed.</div></div>` : '')}
      <div class="tablewrap"><table data-nosort><thead><tr><th>#</th><th>Student</th><th>Institution</th><th>Class</th><th class="num">Score</th><th class="num">Time</th><th></th>${ops ? html`<th class="ia">Selected</th><th class="ia"></th>` : ''}</tr></thead><tbody>
      ${r.people.map(p => html`<tr><td>${p.rank ?? '–'}</td><td><b>${p.name}</b></td><td class="small">${p.college}</td><td>${p.klass}</td><td class="num">${p.score === null ? html`<span class="muted small">${p.started ? 'answering…' : 'waiting'}</span>` : html`<b>${p.score}</b> / ${p.total}`}</td><td class="num">${p.secs ? qaMmss(p.secs) : '–'}</td><td>${p.source === 'paper' ? badge('Paper', 'grey') : p.source === 'live' ? badge('Live', 'info') : p.source ? badge('Phone', 'info') : ''}</td>
        ${ops ? html`<td class="ia">${p.score === null ? '' : html`<input type="checkbox" data-qarsel="${p.id}" ${p.selected ? 'checked' : ''} aria-label="Select ${esc(p.name)}">`}</td><td class="ia"><div class="row gap-s nowrap"><button class="btn sm secondary" data-act="qaEnter" data-id="${p.id}">Enter result</button><button class="ib danger" data-act="qaRm" data-id="${p.id}" aria-label="Remove ${esc(p.name)}">${icon('trash')}</button></div></td>` : ''}</tr>`)}</tbody></table></div>
      <div class="small muted" style="padding:10px 16px">${r.selected} selected${q.level === 'ac' ? ' for the district final' : ' as district winners'}.</div></div>
    ${ops ? html`<p class="small muted" style="margin-top:12px"><button class="btn sm danger" data-act="qaDelRound">${icon('trash')} Delete this round</button></p>` : ''}`);
  document.querySelectorAll('[data-qarsel]').forEach(c => c.addEventListener('change', async () => {
    const ids = [...document.querySelectorAll('[data-qarsel]:checked')].map(x => Number(x.dataset.qarsel));
    try { await api(`/api/staff/quiz/rounds/${q.id}/select`, 'POST', { ids }); toast('Saved'); } catch (e) { c.checked = !c.checked; toast(e.message, true); }
  }));
}
const qaId = () => QA.round.quiz.id;
const qaTie = r => { const id = r.quiz.id, tb = r.tiebreak ? r.tiebreak.quiz.id : 0; window.__tbCode = r.tiebreak?.quiz.code; return quizTieBox(r, { create: `/api/staff/quiz/rounds/${id}/tiebreak`, status: `/api/staff/quiz/rounds/${tb}/status`, people: `/api/staff/quiz/rounds/${tb}/people`, live: `/api/staff/quiz/rounds/${tb}/live`, del: `/api/staff/quiz/rounds/${tb}`, paper: `/api/staff/quiz/rounds/${tb}/paper`, refresh: () => qaOpenRound(id) }); };
actions.qaBack = () => { QA.tab = 'rounds'; apQuiz($('#pg')); };
actions.qaRefresh = () => qaOpenRound(qaId());
actions.qaCopy = () => copyText(`${location.origin}/#/quiz/${QA.round.quiz.code}`, 'Link copied');
actions.qaScreen = () => { const q = QA.round.quiz; modal(html`<div class="qz-screen"><h2>Join the ELC Quiz</h2><div class="qz-qr big">${raw(qrSvg(`${location.origin}/#/quiz/${q.code}`))}</div><p>Open <b>${location.host}</b>, choose <b>Quiz</b> and type</p><div class="qz-bigcode huge">${q.code}</div><p class="muted">${q.title}</p></div>`, { wide: true }); };
actions.qaStatus = async el => { await api(`/api/staff/quiz/rounds/${qaId()}/status`, 'POST', { status: el.dataset.s }); toast(el.dataset.s === 'open' ? 'Opened for students' : 'Closed'); qaOpenRound(qaId()); };
actions.qaSettings = () => {
  const q = QA.round.quiz, started = QA.round.people.some(p => p.score !== null);
  modal(html`<h2>Round settings</h2><form data-form="qaSet" class="stack-s"><div class="formgrid"><label class="f"><span>How it is run</span><select name="mode"><option value="self" ${q.mode === 'self' ? 'selected' : ''}>On phones, each at their own pace</option><option value="live" ${q.mode === 'live' ? 'selected' : ''}>Live: the host shows each question</option></select></label>
    <label class="f"><span>Minutes (phones)</span><input type="number" name="minutes" min="5" max="120" value="${q.minutes}"></label><label class="f"><span>Seconds per question (live)</span><input type="number" name="per_q" min="8" max="90" value="${q.per_q}"></label><label class="f"><span>Students selected for the next level</span><input type="number" name="top_n" min="1" max="30" value="${q.top_n}"></label></div>
    <label class="chk"><input type="checkbox" name="regenerate" ${started ? 'disabled' : ''}> Choose new questions ${started ? '(not possible once students have answered)' : ''}</label><label class="f"><span>Number of questions</span><input type="number" name="n" min="5" max="50" value="${q.n}" ${started ? 'disabled' : ''}></label>${mfoot('Save')}</form>`);
};
forms.qaSet = async f => { const v = fd(f); await api(`/api/staff/quiz/rounds/${qaId()}/settings`, 'POST', { mode: v.mode, minutes: Number(v.minutes), per_q: Number(v.per_q), top_n: Number(v.top_n), regenerate: !!v.regenerate, n: Number(v.n) }); f.closest('.overlay').close(); toast('Saved'); qaOpenRound(qaId()); };
actions.qaInvite = () => modal(html`<h2>Add a student</h2><p class="muted small">For a substitute or a student who was missed.</p><form data-form="qaInv" class="stack-s"><label class="f"><span>Institution *</span><select name="college_id" required><option value="">Choose…</option>${QA.d.institutions.map(i => html`<option value="${i.id}">${i.name}</option>`)}</select></label>
  <label class="f"><span>Student name *</span><input name="name" maxlength="60" required></label><label class="f"><span>Class</span><input name="klass" maxlength="40"></label>${mfoot('Add')}</form>`);
forms.qaInv = async f => { await api(`/api/staff/quiz/rounds/${qaId()}/invite`, 'POST', fd(f)); f.closest('.overlay').close(); toast('Added'); qaOpenRound(qaId()); };
actions.qaEnter = el => {
  const p = QA.round.people.find(x => x.id === Number(el.dataset.id)), n = QA.round.quiz.n;
  modal(html`<h2>Result of ${p.name}</h2><p class="muted small">${p.college} · type the answers in order as letters, or only the marks.</p><form data-form="qaEnterF" data-id="${p.id}" class="stack-s"><label class="f"><span>Answers (a b c d, - if blank) · ${n} questions</span><input name="answers" maxlength="80" autocomplete="off" spellcheck="false" placeholder="abcdabcd…"></label><label class="f"><span>or only the marks (0 to ${n})</span><input name="marks" type="number" min="0" max="${n}"></label>${mfoot('Save')}</form>`);
};
forms.qaEnterF = async f => { const v = fd(f), r = await api(`/api/staff/quiz/rounds/${qaId()}/people/${f.dataset.id}`, 'POST', { answers: v.answers, marks: v.marks }); f.closest('.overlay').close(); toast('Score ' + r.score); qaOpenRound(qaId()); };
actions.qaRm = async el => { if (!await confirmBox('Remove this student from the round?', 'Remove', true)) return; await api(`/api/staff/quiz/rounds/${qaId()}/people/${el.dataset.id}`, 'DELETE'); qaOpenRound(qaId()); };
actions.qaTop = async () => {
  const r = QA.round, ids = r.people.filter(p => p.score !== null).slice(0, r.quiz.top_n).map(p => p.id);
  if (r.tie && !await confirmBox('Students are tied at the cut-off. Select the first ' + r.quiz.top_n + ' in the list anyway?', 'Select', false)) return;
  await api(`/api/staff/quiz/rounds/${r.quiz.id}/select`, 'POST', { ids }); toast('Selected'); qaOpenRound(r.quiz.id);
};
actions.qaDelRound = async () => { if (!await confirmBox('Delete this round and all its results?', 'Delete', true)) return; await api('/api/staff/quiz/rounds/' + qaId(), 'DELETE'); toast('Deleted'); actions.qaBack(); };
actions.qaCsv = () => download('quiz-round-results.csv', toCsv(['Rank', 'Student', 'Institution', 'Class', 'Score', 'Out of', 'Seconds', 'Answered on', 'Selected'], QA.round.people.map(p => [p.rank ?? '', p.name, p.college, p.klass, p.score ?? '', p.total ?? '', p.secs ?? '', p.source, p.selected ? 'Yes' : ''])));
const qaEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// ---- the live host screen: shown on the projector; the phones follow ----
actions.qaHost = el => quizHost({ code: QA.round.quiz.code, url: `/api/staff/quiz/rounds/${el.dataset.id}/live`, onClose: () => qaOpenRound(Number(el.dataset.id)) });

// ---- the question bank ----
let QB = { theme: '', list: null };
async function qaBank(b) {
  if (!QB.list) QB.list = await api('/api/staff/quiz/questions');
  const L = QB.list, ops = isOps(), shown = L.questions.filter(x => !QB.theme || x.theme === QB.theme);
  show(b, html`<div class="card pad0"><div class="filterbar"><div class="chips"><button class="chip ${QB.theme === '' ? 'on' : ''}" data-act="qbTheme" data-k="">All (${L.questions.length})</button>${L.themes.map(t => html`<button class="chip ${QB.theme === t ? 'on' : ''}" data-act="qbTheme" data-k="${t}">${t} (${L.questions.filter(x => x.theme === t).length})</button>`)}</div>${ops ? html`<button class="btn primary sm" data-act="qbEdit" data-id="">${icon('plus')} Add a question</button>` : ''}</div>
    <div class="tablewrap"><table data-nosort><thead><tr><th>#</th><th>Question</th><th>Topic</th><th>Answer</th><th>Source</th><th class="ia">In use</th>${ops ? html`<th class="ia"></th>` : ''}</tr></thead><tbody>
    ${shown.map((x, i) => html`<tr class="${x.active ? '' : 'dim'}"><td>${x.id === shown[0].id ? 1 : L.questions.indexOf(x) + 1}</td><td style="max-width:520px"><b>${x.text}</b><div class="xs muted">${x.opts.map((o, k) => (k === x.correct ? '✓ ' : '') + 'abcd'[k] + ') ' + o).join('  ·  ').slice(0, 220)}</div></td><td>${x.theme}</td><td><b>${'ABCD'[x.correct]}</b></td><td class="small">${x.src}</td><td class="ia">${ops ? html`<input type="checkbox" data-qbact="${x.id}" ${x.active ? 'checked' : ''} aria-label="Use this question">` : (x.active ? 'Yes' : 'No')}</td>${ops ? html`<td class="ia"><button class="btn sm secondary" data-act="qbEdit" data-id="${x.id}">Edit</button></td>` : ''}</tr>`)}</tbody></table></div></div>
    <p class="small muted" style="margin-top:10px">The 50 reference questions of the Election Commission are loaded. A question already used in a quiz cannot be edited; switch it off and add a new one. Only questions marked <b>In use</b> are drawn for new quizzes.</p>`);
  b.querySelectorAll('[data-qbact]').forEach(c => c.addEventListener('change', async () => { try { await api('/api/staff/quiz/questions/' + c.dataset.qbact, 'PUT', { toggle: true }); QB.list = null; toast('Saved'); } catch (e) { c.checked = !c.checked; toast(e.message, true); } }));
}
actions.qbTheme = el => { QB.theme = el.dataset.k; qaBank($('#qabody')); };
actions.qbEdit = el => {
  const x = QB.list.questions.find(q => q.id === Number(el.dataset.id)) || { opts: ['', '', '', ''], correct: 0, theme: QB.theme || QB.list.themes[0], text: '' };
  modal(html`<h2>${x.id ? 'Edit the question' : 'Add a question'}</h2><form data-form="qbSave" data-id="${x.id || ''}" class="stack-s"><label class="f"><span>Topic</span><select name="theme">${QB.list.themes.map(t => html`<option ${x.theme === t ? 'selected' : ''}>${t}</option>`)}</select></label>
    <label class="f"><span>Question *</span><textarea name="text" rows="2" maxlength="500" required>${x.text}</textarea></label>
    ${[0, 1, 2, 3].map(i => html`<label class="f"><span>Answer ${'ABCD'[i]} *</span><div class="row gap-s nowrap"><input name="o${i}" value="${esc(x.opts[i])}" maxlength="300" required style="flex:1"><label class="chk"><input type="radio" name="correct" value="${i}" ${x.correct === i ? 'checked' : ''}> Correct</label></div></label>`)}${mfoot('Save')}</form>`, { wide: true });
};
forms.qbSave = async f => {
  const v = fd(f), id = f.dataset.id, body = { theme: v.theme, text: v.text, opts: [v.o0, v.o1, v.o2, v.o3], correct: Number(v.correct) };
  await api(id ? '/api/staff/quiz/questions/' + id : '/api/staff/quiz/questions', id ? 'PUT' : 'POST', body); QB.list = null; f.closest('.overlay').close(); toast('Saved'); qaBank($('#qabody'));
};

// ---- Annexure-II of the Commission's letter ----
async function qaReport(b) {
  const r = await api('/api/staff/quiz/compliance'); window.__qar = r;
  show(b, html`<div class="card"><div class="card-head"><h3>Compliance report (Annexure-II): Kozhikode</h3><div class="row gap-s"><button class="btn secondary sm" data-act="qaRepCsv">${icon('download')} Download</button><button class="btn secondary sm" data-act="qaRepPrint">${icon('printer')} Print</button></div></div>
    <div class="tablewrap"><table data-nosort id="qarep"><thead><tr><th>District</th><th class="num">Institutions participated</th><th class="num">Institution-level participants (Quiz)</th><th class="num">AC-level participants (Quiz)</th><th class="num">District finalists (Quiz)</th><th>Top 10 winners list attached</th></tr></thead>
      <tbody><tr><td><b>Kozhikode</b></td><td class="num">${r.institutions_participated} of ${r.institutions_total}</td><td class="num">${r.institution_participants}</td><td class="num">${r.ac_participants}</td><td class="num">${r.district_finalists}</td><td>${r.winners.length ? 'Yes' : 'Not yet'}</td></tr></tbody></table></div>
    <p class="small muted" style="margin-top:8px">The Essay Competition is not run on the portal, so its columns and the social media links are filled in by hand. Report due to the Commission by 27 November 2026.</p></div>
    <div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-head"><h3>District winners</h3></div>${r.winners.length ? html`<ol class="qa-win">${r.winners.map(w => html`<li><b>${w.name}</b><span class="small muted">${w.college}${w.klass ? ' · ' + w.klass : ''}</span></li>`)}</ol>` : empty('Not selected yet', 'Winners appear here when the district final is finished and selected.', 'trophy')}</div>
      <div class="card"><div class="card-head"><h3>By Assembly Constituency</h3></div>${r.acs.length ? html`<div class="tablewrap"><table data-nosort><thead><tr><th>Constituency</th><th class="num">Invited</th><th class="num">Took part</th><th class="num">Selected</th></tr></thead><tbody>${r.acs.map(a => html`<tr><td>${a.ac}</td><td class="num">${a.invited}</td><td class="num">${a.took}</td><td class="num">${a.selected}</td></tr>`)}</tbody></table></div>` : empty('No AC rounds yet', '', 'target')}</div></div>`);
}
actions.qaRepCsv = () => { const r = window.__qar; download('quiz-compliance-kozhikode.csv', toCsv(['District', 'Institutions participated', 'Institution-level participants (Quiz)', 'AC-level participants (Quiz)', 'District finalists (Quiz)', 'Top 10 winners list attached', 'Winners'], [['Kozhikode', r.institutions_participated, r.institution_participants, r.ac_participants, r.district_finalists, r.winners.length ? 'Y' : 'N', r.winners.map(w => `${w.name} (${w.college})`).join('; ')]])); };
actions.qaRepPrint = () => { const r = window.__qar; document.getElementById('printarea')?.remove(); const d = document.createElement('div'); d.id = 'printarea'; d.innerHTML = `<div class="pp-head"><b>ELC Quiz Competition 2026: compliance report (Annexure-II)</b><span>Kozhikode</span></div><table class="pp-tbl"><tbody><tr><th>Institutions participated</th><td>${r.institutions_participated}</td></tr><tr><th>Institution-level participants</th><td>${r.institution_participants}</td></tr><tr><th>AC-level participants</th><td>${r.ac_participants}</td></tr><tr><th>District finalists</th><td>${r.district_finalists}</td></tr></tbody></table><h3>District winners</h3><ol>${r.winners.map(w => `<li>${qaEsc(w.name)}, ${qaEsc(w.college)}</li>`).join('')}</ol>`; document.body.append(d); const done = () => { d.remove(); removeEventListener('afterprint', done); }; addEventListener('afterprint', done); setTimeout(() => print(), 80); };
