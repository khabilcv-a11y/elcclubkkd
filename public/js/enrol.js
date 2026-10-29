'use strict';
// ---- Campus to booth: school sign-up, the college's enrolment page with its shareable link, and the public department page ----

// ---------- school sign-up ----------
function renderSchoolSignup() {
  if (!feat('public', 'school_signup')) { location.hash = '#/login/school'; return; }
  show($('#app'), publicShell(html`<div class="loginpage"><div class="logincard" style="max-width:520px"><div class="lg"><img src="${LOGO.sweepDark}" alt="SWEEP Kozhikode"></div>
    <h1>Register your school</h1><p class="sub">No Electoral Literacy Club yet? Register here and start the campus-to-booth drive in your school.</p>
    <form data-form="schoolSignup" class="stack-s">
      <label class="f"><span>School name *</span><input type="text" name="name" required maxlength="160" autocomplete="organization"></label>
      <label class="f"><span>Address *</span><textarea name="address" required maxlength="300" rows="2"></textarea></label>
      <div class="formgrid"><label class="f"><span>Teacher in charge *</span><input type="text" name="coordinator" required maxlength="100"></label><label class="f"><span>Mobile number *</span><input type="tel" name="phone" required inputmode="tel"></label></div>
      <label class="f"><span>School email *</span><input type="email" name="email" required autocomplete="email"></label>
      <div class="formgrid"><label class="f"><span>Choose a password *</span><input type="password" name="password" required minlength="8" autocomplete="new-password"><span class="hint">At least 8 characters. You can change it later.</span></label>
        <label class="f"><span>Repeat the password *</span><input type="password" name="password2" required minlength="8" autocomplete="new-password"></label></div>
      <div data-err></div><button class="btn primary lg" type="submit" style="width:100%">Register and continue</button>
      <p class="hint center">Already registered? <a href="#/login/school">Sign in</a></p></form></div></div>`, ''));
}
forms.schoolSignup = async f => {
  const v = fd(f); if (v.password !== v.password2) throw new Error('The two passwords do not match');
  await api('/api/public/school-signup', 'POST', v); await detectMe(); toast('Welcome! Your school is registered.'); location.hash = '#/me';
};

// ---------- the numbers, shared by the college page and the department page ----------
const eligibleOf = r => Math.max(0, r.strength - r.ineligible);
const balanceOf = r => Math.max(0, eligibleOf(r) - r.registered);
const coveredPct = r => (eligibleOf(r) ? Math.min(100, Math.round(r.registered * 100 / eligibleOf(r))) : null);
const enrolKpis = t => html`<div class="kpis">${kpi('Total students', t.strength, { ic: 'users' })}${kpi('Registered', t.registered, { ic: 'user-check', tone: 'green' })}${kpi('Not eligible (under 17)', t.ineligible, { ic: 'clock' })}${kpi('Balance to cover', t.balance, { ic: 'target', tone: 'saffron' })}</div>`;

// ---------- the college / school page ----------
async function pgEnrol(el) {
  const d = await api('/api/college/enrol'), school = d.kind === 'school', unit = school ? 'section' : 'department', Unit = school ? 'Section' : 'Department';
  window.__enrol = d;
  show(el, html`${pageHead('Enrolment drive', `Campus to booth: every eligible student on the electoral roll. Share one link with your ${unit} coordinators; they add their classes and numbers, and everything adds up here.`, '', 'Campus to booth')}
    <div class="card" style="margin-bottom:16px"><div class="progress-head row between"><div><b>${d.totals.pct == null ? 'No numbers yet' : d.totals.pct + '% of eligible students registered'}</b><div class="small muted">${n(d.totals.registered)} of ${n(d.totals.eligible)} eligible students · target 100%</div></div></div>${progress(d.totals.pct || 0, d.totals.pct >= 100 ? 'green' : 'saffron')}</div>
    ${enrolKpis(d.totals)}
    <div class="card" style="margin:16px 0"><div class="card-head"><h3>${icon('link')} Link for ${unit} coordinators</h3></div>
      ${d.link ? html`<p class="small muted" style="margin-bottom:8px">Anyone with this link can add or update the numbers for ${school ? 'a section' : 'a department'} of <b>${COL.college.name}</b>. Send it to your ${unit} coordinators (WhatsApp is fine).</p>
        <div class="row nowrap"><input type="text" readonly value="${d.link}" id="enlink" style="flex:1" aria-label="Link to share"><button class="btn primary" data-act="copyEnLink">${icon('clipboard')} Copy</button><button class="btn green" data-act="shareEnLink">${icon('share')} WhatsApp</button></div>
        <p class="hint" style="margin-top:8px">If the link reaches the wrong people, <button class="linkbtn" data-act="newEnLink">create a new link</button>. The old one stops working.</p>`
        : html`<p class="muted" style="margin-bottom:10px">Create your link once. It already knows which ${school ? 'school' : 'college'} it belongs to, so coordinators only enter their ${unit} and classes.</p><button class="btn primary" data-act="makeEnLink">${icon('link')} Create the link</button>`}</div>
    <div class="card pad0"><div class="card-head pad"><h3>${Unit}s</h3><span class="small muted">${d.depts.length} reported</span></div>
      ${d.depts.length ? html`<div class="tablewrap"><table><caption class="sr">Enrolment by ${unit}</caption><thead><tr><th>${Unit}</th><th>Coordinator</th><th class="num">Classes</th><th class="num">Students</th><th class="num">Registered</th><th class="num">Under 17</th><th class="num">Balance</th><th class="num">Covered</th><th></th></tr></thead><tbody>
        ${d.depts.map((x, i) => html`<tr><td><button class="linkbtn strong" data-act="toggleDept" data-i="${i}" aria-expanded="false">${icon('chevron-down')} ${x.dept}</button></td><td class="small">${x.coordinator || ''}${x.phone ? html`<br>${tel(x.phone)}` : ''}<div class="xs muted">${x.updated_at ? 'Updated ' + fdt(x.updated_at) : ''}</div></td>
          <td class="num">${x.classes.length}</td><td class="num">${n(x.totals.strength)}</td><td class="num">${n(x.totals.registered)}</td><td class="num">${n(x.totals.ineligible)}</td><td class="num"><b>${n(x.totals.balance)}</b></td><td class="num">${pct(x.totals.pct)}</td>
          <td class="right"><button class="btn sm danger" data-act="delDept" data-i="${i}" aria-label="Remove ${x.dept}">${icon('trash')}</button></td></tr>
          <tr class="detail" id="dept-${i}" hidden><td colspan="9"><table class="mini"><thead><tr><th>Class</th><th class="num">Students</th><th class="num">Registered</th><th class="num">Under 17</th><th class="num">Balance</th></tr></thead><tbody>${x.classes.map(c => html`<tr><td>${c.name}</td><td class="num">${c.strength}</td><td class="num">${c.registered}</td><td class="num">${c.ineligible}</td><td class="num">${balanceOf(c)}</td></tr>`)}</tbody></table></td></tr>`)}
        <tr class="total"><td colspan="3"><b>Total</b></td><td class="num"><b>${n(d.totals.strength)}</b></td><td class="num"><b>${n(d.totals.registered)}</b></td><td class="num"><b>${n(d.totals.ineligible)}</b></td><td class="num"><b>${n(d.totals.balance)}</b></td><td class="num"><b>${pct(d.totals.pct)}</b></td><td></td></tr></tbody></table></div>`
        : html`<div style="padding:20px">${empty(`No ${unit} has reported yet`, `Share the link above. Numbers appear here as soon as a ${unit} coordinator submits.`, 'users')}</div>`}</div>`);
}
const enLink = () => window.__enrol?.link || '';
actions.makeEnLink = async () => { await api('/api/college/enrol/link', 'POST'); toast('Link created'); reloadCol(); };
actions.newEnLink = async () => { if (!await confirmBox('Create a new link? The old link stops working for everyone who has it.', 'Create new link', true)) return; await api('/api/college/enrol/link', 'POST', { regenerate: true }); toast('New link created'); reloadCol(); };
actions.copyEnLink = async () => { try { await navigator.clipboard.writeText(enLink()); toast('Link copied'); } catch { const i = $('#enlink'); i.select(); document.execCommand('copy'); toast('Link copied'); } };
actions.shareEnLink = () => {
  const school = window.__enrol.kind === 'school', msg = `${COL.college.name}: please add your ${school ? 'section' : 'department'}'s class-wise enrolment numbers (total students, already registered voters, under 17) here: ${enLink()}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
};
actions.toggleDept = el => { const row = $('#dept-' + el.dataset.i), open = row.hidden; row.hidden = !open; el.setAttribute('aria-expanded', open); };
actions.delDept = async el => { const x = window.__enrol.depts[Number(el.dataset.i)]; if (!await confirmBox(`Remove all the numbers of ${x.dept}? Its coordinator can submit them again with the link.`, 'Remove', true)) return; await api('/api/college/enrol/delete', 'POST', { dept: x.dept }); toast('Removed'); reloadCol(); };

// ---------- home page of a college / school workspace while the village programme is off ----------
async function pgHomeCampaign(el) {
  const [d, ds] = await Promise.all([api('/api/college/enrol'), api('/api/college/desk/summary').catch(() => null)]);
  const school = COL.college.kind === 'school', t = d.totals;
  const tiles = [['enrol', 'target', 'Enrolment drive', d.depts.length ? `${d.depts.length} ${school ? 'section' : 'department'}${d.depts.length > 1 ? 's' : ''} reported` : `Share the link with your ${school ? 'section' : 'department'} coordinators`],
    ['desk', 'clipboard', 'Daily help-desk report', ds ? `${n(ds.registrations)} registrations · ${ds.days} day${ds.days === 1 ? '' : 's'} reported` : 'Record registrations and volunteers each day'], ['gallery', 'camera', 'Gallery and photo frames', 'Make framed photos of your events and share them']]
    .filter(([id]) => feat(school ? 'school' : 'college', id));
  show(el, html`${pageHead(`Welcome, ${COL.college.short_name || COL.college.name}`, 'Campus to booth: bring every eligible student onto the electoral roll.', '', school ? 'School workspace' : 'College workspace')}
    <div class="card" style="margin-bottom:16px"><b>${t.pct == null ? 'Start by sharing your link' : t.pct + '% of eligible students registered'}</b><div class="small muted">${n(t.registered)} of ${n(t.eligible)} eligible · ${n(t.balance)} still to cover · target 100%</div>${progress(t.pct || 0, t.pct >= 100 ? 'green' : 'saffron')}</div>
    ${enrolKpis(t)}
    <div class="grid g3" style="margin-top:16px">${tiles.map(([id, ic, ti, sub]) => html`<a class="card rv hometile" href="#/me/${id}" style="text-decoration:none;color:inherit"><span class="kpi" style="padding:0;border:0;box-shadow:none"><span class="ico" style="position:static;width:42px;height:42px">${icon(ic)}</span></span><h3 style="margin:10px 0 4px">${ti}</h3><p class="small muted">${sub}</p></a>`)}</div>
    ${CANN.length ? html`<h3 style="margin:22px 0 8px">Latest announcements</h3><div class="stack-s">${CANN.slice(0, 3).map(a => html`<article class="notice ${a.pinned ? 'pinned' : ''}"><h3>${a.title}</h3>${a.body ? html`<p>${a.body}</p>` : ''}<div class="when">${fdt(a.created_at)}</div></article>`)}</div>` : ''}`);
}

// ---------- the public department / class page ----------
let DEPT = null;
async function renderDept(tokenStr) {
  show($('#app'), publicShell(html`<div class="wrap section"><div class="loading"><div class="spin"></div>Opening…</div></div>`, ''));
  try { DEPT = { token: tokenStr, ...(await api('/api/dept/' + encodeURIComponent(tokenStr))) }; }
  catch (e) { return show($('#app'), publicShell(html`<div class="loginpage"><div class="logincard"><h1>Link not valid</h1><div class="alert err" style="margin-top:12px">${e.message}</div></div></div>`, '')); }
  const school = DEPT.kind === 'school', unit = school ? 'Section' : 'Department';
  show($('#app'), publicShell(html`<div class="wrap section" style="max-width:860px"><div class="crumb">Campus to booth</div><h1 style="margin-bottom:4px">${DEPT.institution}</h1>
    <p class="muted" style="margin-bottom:16px">Add the class-wise numbers for your ${unit.toLowerCase()}. It takes two minutes. You can come back with the same link to correct them.</p>
    <div id="deptbody"></div></div>`, ''));
  deptForm({ dept: '', coordinator: '', phone: '', classes: [{ name: '', strength: '', registered: '', ineligible: '' }] });
}
function deptForm(d) {
  const school = DEPT.kind === 'school', unit = school ? 'Section' : 'Department';
  DEPT.rows = d.classes.length ? d.classes : [{ name: '', strength: '', registered: '', ineligible: '' }];
  show($('#deptbody'), html`<form data-form="deptSave" class="stack">
    <div class="card"><div class="formgrid"><label class="f"><span>${unit} name *</span><input type="text" name="dept" list="deptnames" value="${d.dept}" required maxlength="80" placeholder="${school ? 'e.g. High school' : 'e.g. Department of Commerce'}" autocomplete="off"><datalist id="deptnames">${DEPT.depts.map(x => html`<option value="${x}">`)}</datalist></label>
      <label class="f"><span>Your name *</span><input type="text" name="coordinator" value="${d.coordinator || ''}" required maxlength="80" autocomplete="name"></label>
      <label class="f"><span>Mobile number</span><input type="tel" name="phone" value="${d.phone || ''}" inputmode="tel" autocomplete="tel"></label></div>
      <p class="hint" id="deptnote">Already submitted before? Pick your ${unit.toLowerCase()} name from the list and its classes load for editing.</p></div>
    <div class="card pad0"><div class="card-head pad"><h3>Classes</h3><span class="small muted">Registered = already on the electoral roll · Under 17 = not yet eligible</span></div>
      <div class="enrows" id="enrows"></div>
      <div class="pad"><button type="button" class="btn secondary" data-act="addClassRow">${icon('plus')} Add a class</button></div></div>
    <div class="card" id="entotal"></div>
    <div data-err></div><button class="btn primary lg" type="submit">${icon('check-circle')} Submit</button></form>`);
  paintRows();
  const dn = $('input[name=dept]', $('#deptbody'));
  dn?.addEventListener('change', async () => { const v = dn.value.trim(); if (!v || !DEPT.depts.some(x => x.toLowerCase() === v.toLowerCase())) return; try { const x = await api(`/api/dept/${encodeURIComponent(DEPT.token)}/classes?dept=${encodeURIComponent(v)}`); if (x) { DEPT.rows = x.classes.map(c => ({ name: c.name, strength: c.strength, registered: c.registered, ineligible: c.ineligible })); $('input[name=coordinator]', $('#deptbody')).value = x.coordinator || ''; $('input[name=phone]', $('#deptbody')).value = x.phone || ''; dn.value = x.dept; paintRows(); toast('Loaded your earlier numbers'); } } catch {} });
}
function paintRows() {
  show($('#enrows'), html`<div class="enrow head" aria-hidden="true"><span>Class</span><span>Total students</span><span>Registered</span><span>Under 17</span><span>Balance</span><span></span></div>
    ${DEPT.rows.map((r, i) => html`<div class="enrow" data-i="${i}"><label><span class="sr">Class name</span><input type="text" data-k="name" value="${r.name}" placeholder="e.g. 1st Year BCom" maxlength="60" aria-label="Class name"></label>
      <label><span class="lbl">Total students</span><input type="number" min="0" inputmode="numeric" data-k="strength" value="${r.strength}" aria-label="Total students"></label>
      <label><span class="lbl">Registered</span><input type="number" min="0" inputmode="numeric" data-k="registered" value="${r.registered}" aria-label="Registered voters"></label>
      <label><span class="lbl">Under 17</span><input type="number" min="0" inputmode="numeric" data-k="ineligible" value="${r.ineligible}" aria-label="Students under 17"></label>
      <output class="bal" aria-label="Balance to cover">${balanceOf(rowNums(r))}</output><button type="button" class="iconbtn" data-act="delClassRow" data-i="${i}" aria-label="Remove this class" ${DEPT.rows.length < 2 ? 'disabled' : ''}>${icon('x')}</button></div>`)}`);
  paintTotal();
}
const rowNums = r => ({ strength: Number(r.strength) || 0, registered: Number(r.registered) || 0, ineligible: Number(r.ineligible) || 0 });
function paintTotal() {
  const t = DEPT.rows.map(rowNums).reduce((a, r) => ({ strength: a.strength + r.strength, registered: a.registered + r.registered, ineligible: a.ineligible + r.ineligible }), { strength: 0, registered: 0, ineligible: 0 });
  show($('#entotal'), html`<div class="campus-facts"><div><b>${t.strength}</b><span>students</span></div><div><b>${t.registered}</b><span>registered</span></div><div><b>${t.ineligible}</b><span>under 17</span></div><div><b>${balanceOf(t)}</b><span>balance to cover</span></div><div><b>${coveredPct(t) == null ? '—' : coveredPct(t) + '%'}</b><span>covered</span></div></div>`);
}
document.addEventListener('input', e => {
  const row = e.target.closest?.('.enrow'); if (!row || !DEPT?.rows) return;
  const r = DEPT.rows[Number(row.dataset.i)]; r[e.target.dataset.k] = e.target.value;
  $('.bal', row).textContent = balanceOf(rowNums(r)); paintTotal();
});
actions.addClassRow = () => { DEPT.rows.push({ name: '', strength: '', registered: '', ineligible: '' }); paintRows(); const inputs = $$('.enrow input[data-k=name]'); inputs.at(-1)?.focus(); };
actions.delClassRow = el => { DEPT.rows.splice(Number(el.dataset.i), 1); paintRows(); };
forms.deptSave = async f => {
  const v = fd(f);
  const classes = DEPT.rows.filter(r => String(r.name).trim() || r.strength !== '' || r.registered !== '' || r.ineligible !== '').map(r => ({ name: r.name, strength: Number(r.strength) || 0, registered: Number(r.registered) || 0, ineligible: Number(r.ineligible) || 0 }));
  const r = await api('/api/dept/' + encodeURIComponent(DEPT.token), 'PUT', { dept: v.dept, coordinator: v.coordinator, phone: v.phone, classes });
  if (!DEPT.depts.includes(r.dept)) DEPT.depts.push(r.dept);
  show($('#deptbody'), html`<div class="card" style="text-align:center;padding:30px"><span class="ico-ok">${icon('check-circle')}</span><h2 style="margin:8px 0">Thank you!</h2><p class="muted">The numbers for <b>${r.dept}</b> have been added to <b>${r.institution}</b>.</p>
    <div class="campus-facts" style="justify-content:center;margin:16px 0"><div><b>${r.totals.strength}</b><span>students</span></div><div><b>${r.totals.registered}</b><span>registered</span></div><div><b>${r.totals.ineligible}</b><span>under 17</span></div><div><b>${r.totals.balance}</b><span>balance to cover</span></div></div>
    <p class="small muted" style="margin-bottom:12px">Please ask the remaining students to register at <a href="https://voters.eci.gov.in" target="_blank" rel="noopener">voters.eci.gov.in</a> (Form 6) or call 1950.</p>
    <button class="btn secondary" data-act="deptAgain">Edit these numbers again</button></div>`);
  DEPT.last = { dept: r.dept, coordinator: v.coordinator, phone: v.phone, classes };
};
actions.deptAgain = () => deptForm(DEPT.last || { dept: '', coordinator: '', phone: '', classes: [] });
