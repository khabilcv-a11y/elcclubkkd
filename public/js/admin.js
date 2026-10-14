'use strict';
// ---- staff console: super admin / admin / intern ----
const app = $('#app');
let ME = null;   // { user, scope, smtp }
const ROLE = { super_admin: 'Super admin', admin: 'Admin', intern: 'Intern' };
const isSuper = () => ME.user.role === 'super_admin', isOps = () => ME.user.role !== 'intern', isIntern = () => ME.user.role === 'intern';
let badges = {};

const TABS = () => [
  ['dashboard', '📊 Dashboard'], ['colleges', '🏫 Colleges'], ['villages', '🏡 Villages'], ['allot', '🧭 Allotments'],
  ['requests', '🔁 Requests', badges.pending_requests], ['acks', '✍️ Acknowledgements', badges.awaiting_ack], ['reports', '📑 Reports'], ['certs', '🏆 Certificates'],
  ...(isOps() ? [['outbox', '✉️ Outbox']] : []), ...(isSuper() ? [['team', '👥 Team'], ['logs', '🛡 Activity log']] : []),
];
const RENDER = { dashboard: tDashboard, colleges: tColleges, villages: tVillages, allot: tAllot, requests: tRequests, acks: tAcks, reports: tReports, certs: tCerts, outbox: tOutbox, team: tTeam, logs: tLogs };

setUnauth(() => { ME = null; renderLogin(); });

async function boot() {
  try { ME = await api('/api/staff/me'); } catch { ME = null; }
  window.addEventListener('hashchange', route);
  route();
}
function renderNav() {
  show($('#navlinks'), ME ? html`<span class="pill-role">${ROLE[ME.user.role]}</span><span class="small" style="opacity:.85">${ME.user.name}</span>
    ${ME.user.role === 'super_admin' && ME.sheet_url ? html`<a class="btn sm white" href="${ME.sheet_url}" target="_blank" rel="noopener">📗 Sheet</a>` : ''}<button class="btn sm white" data-act="pw">🔑</button><button class="btn sm white" data-act="logout">Sign out</button>` : '');
}
async function route() {
  renderNav();
  if (!ME) return renderLogin();
  const tab = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const key = RENDER[tab] && TABS().some(t => t[0] === tab) ? tab : 'dashboard';
  try { const d = await api('/api/staff/dashboard'); badges = d.totals; } catch (e) { if (e.status === 401) return; }
  show(app, html`<div class="wrap app"><div class="apphead"><div><span class="chip ${isSuper() ? 'pink' : isIntern() ? 'warn' : 'violet'}">${ROLE[ME.user.role]}</span>
      <h1>Staff <em>console</em></h1>${isIntern() ? html`<div class="muted">You're seeing only the ${ME.scope.colleges.length} college(s) and ${ME.scope.villages.length} village(s) assigned to you.</div>` : ''}</div></div>
    <div class="subnav" role="tablist">${TABS().map(([k, l, b]) => html`<button class="${k === key ? 'on' : ''}" role="tab" data-act="tab" data-k="${k}">${l}${b ? html`<span class="badge">${b}</span>` : ''}</button>`)}</div><div id="tab"><div class="loading">Loading…</div></div></div>`);
  RENDER[key]().catch(handleErr);
}
actions.tab = el => { location.hash = '#/' + el.dataset.k; };
const refresh = () => route();
const closeM = el => el.closest('.overlay').close();
actions.closeModal = closeM;
const mfoot = (label, cls = 'btn pink') => html`<div data-err></div><div class="row" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn white" data-act="closeModal">Cancel</button><button class="btn ${cls}" type="submit">${label}</button></div>`;

// ---------- login ----------
function renderLogin() {
  renderNav();
  show(app, html`<div class="login-bg"><div class="card"><h2 style="font-size:2rem;text-transform:uppercase">Staff sign-in</h2>
    <p class="muted">Super admins, admins and interns sign in here. Every sign-in is logged.</p>
    <form data-form="login" class="stack"><label class="f"><span>Username</span><input type="text" name="username" autocomplete="username" required autofocus></label>
    <label class="f"><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label><div data-err></div>
    <button class="btn pink xl" type="submit" style="width:100%">Sign in</button></form><p class="small"><a href="/">← Back to the public leaderboard</a></p></div></div>`);
}
forms.login = async f => { await api('/api/auth/staff', 'POST', fd(f)); ME = await api('/api/staff/me'); location.hash = '#/dashboard'; route(); };
actions.logout = async () => { await api('/api/auth/staff/logout', 'POST'); ME = null; renderNav(); renderLogin(); };
actions.pw = () => modal(html`<h3>Change password</h3><form data-form="pw" class="stack"><label class="f"><span>Current password</span><input type="password" name="current" required></label>
  <label class="f"><span>New password (min 8)</span><input type="password" name="next" minlength="8" required></label>${mfoot('Update')}</form>`);
forms.pw = async f => { await api('/api/staff/password', 'POST', fd(f)); closeM(f); toast('Password updated. Other sessions were signed out.'); };

const empty = m => html`<div class="empty">${m}</div>`;
const table = (head, rows, cls = '') => html`<div class="tablewrap"><table class="${cls}"><thead><tr>${head.map(h => html`<th class="${h.startsWith('#') ? 'num' : ''}">${h.replace(/^#/, '')}</th>`)}</tr></thead><tbody>${rows}</tbody></table></div>`;
const searchBox = (id, ph) => html`<label class="f" style="max-width:340px;margin:0"><input type="search" id="${id}" placeholder="${ph}"></label>`;
function wireSearch(id, sel) { const q = $('#' + id); if (!q) return; q.addEventListener('input', () => { const v = q.value.toLowerCase(); $$(sel).forEach(r => r.classList.toggle('hide', !r.textContent.toLowerCase().includes(v))); }); }

// ---------- dashboard ----------
async function tDashboard() {
  const d = await api('/api/staff/dashboard'), t = d.totals;
  show($('#tab'), html`<div class="tiles" style="margin-bottom:22px">
    <div class="tile t1"><i>🏫</i><b>${t.colleges}</b><span>Colleges</span></div><div class="tile t4"><i>🙌</i><b>${n(t.volunteers)}</b><span>Volunteers</span></div>
    <div class="tile t3"><i>📣</i><b>${n(t.addressed)}</b><span>Addressed</span></div><div class="tile t2"><i>📝</i><b>${n(t.registered)}</b><span>Registered</span></div>
    <div class="tile t5"><i>✍️</i><b>${t.villages_ack}<small style="font-size:1.1rem">/${t.villages}</small></b><span>Villages acknowledged</span></div></div>
    <div class="grid g3" style="margin-bottom:22px">
      <button class="card" style="text-align:left;cursor:pointer" data-act="tab" data-k="requests"><b style="font-size:2rem;font-family:var(--display)">${t.pending_requests}</b><div>change requests waiting</div></button>
      <button class="card" style="text-align:left;cursor:pointer" data-act="tab" data-k="acks"><b style="font-size:2rem;font-family:var(--display)">${t.awaiting_ack}</b><div>villages awaiting officer acknowledgement</div></button>
      <button class="card" style="text-align:left;cursor:pointer" data-act="tab" data-k="colleges"><b style="font-size:2rem;font-family:var(--display)">${t.passcode_pending}</b><div>colleges without a passcode yet</div></button></div>
    <h3 style="font-size:1.4rem;text-transform:uppercase;margin-bottom:10px">Club standings</h3>
    ${d.colleges.length ? table(['#', 'College', '#Villages ✔/total', '#Days held', '#Volunteers', '#Attendance', '#Addressed', '#Registered', '#Score'], d.colleges.map(c => html`<tr><td class="num"><b>${c.rank}</b></td><td><b>${c.name}</b></td>
      <td class="num">${c.villages_ack}/${c.villages}</td><td class="num">${c.days_done}/${c.days_planned}</td><td class="num">${c.volunteers}</td><td class="num">${pct(c.attendance_pct)}</td><td class="num">${n(c.addressed)}</td><td class="num">${n(c.registered)}</td><td class="num"><b>${n(c.score)}</b></td></tr>`)) : empty('No colleges in your scope yet.')}`);
}

// ---------- colleges ----------
async function tColleges() {
  const list = await api('/api/staff/colleges');
  show($('#tab'), html`<div class="row between" style="margin-bottom:14px">${searchBox('q', '🔍 Search colleges')}
    <div class="row">${isOps() ? html`<button class="btn" data-act="addCollege">＋ Add ELC college</button>` : ''}<button class="btn violet" data-act="bulkPass">✉️ Push passcodes to all unsent</button></div></div>
    ${ME.smtp ? '' : html`<div class="note" style="margin-bottom:14px">📭 Email (SMTP) isn't configured on the server, so passcode emails are saved in the <b>Outbox</b> tab instead of being delivered. See README to switch real email on.</div>`}
    ${list.length ? table(['College', 'Address & contact', 'Coordinator', 'Passcode', 'Last login', '#Registered', ''], list.map(c => html`<tr class="rowq ${c.active ? '' : 'muted'}"><td><b>${c.name}</b>${c.active ? '' : html` <span class="chip grey">inactive</span>`}<div class="small muted">${c.short_name || ''}</div></td>
      <td>${c.address}${c.lsgi ? html`<div class="small muted">${c.lsgi}</div>` : ''}<div class="small">📞 ${c.phone} · ✉️ ${c.email}</div></td><td>${c.coordinator || '—'}</td>
      <td>${c.passcode_sent_at ? html`<span class="chip ok">sent ${fdt(c.passcode_sent_at)}</span>` : html`<span class="chip warn">not sent</span>`}</td><td>${fdt(c.last_login_at)}</td><td class="num">${n(c.stats?.registered ?? 0)}</td>
      <td class="act"><div class="row" style="flex-wrap:wrap"><button class="btn sm violet" data-act="pushPass" data-id="${c.id}" title="Generate a new passcode and email it${c.passcode_sent_at ? ' (the old one stops working)' : ''}">🔑 ${c.passcode_sent_at ? 'Reset passcode' : 'Send passcode'}</button><button class="btn sm white" data-act="editCollege" data-id="${c.id}">Edit</button>
        ${isOps() ? html`<button class="btn sm white" data-act="toggleCollege" data-id="${c.id}" data-on="${c.active ? 0 : 1}">${c.active ? 'Deactivate' : 'Activate'}</button>` : ''}${isSuper() ? html`<button class="btn sm danger" data-act="delCollege" data-id="${c.id}">🗑</button>` : ''}</div></td></tr>`), 'colleges') : empty('No colleges yet. Add the first ELC college.')}`);
  wireSearch('q', '.rowq'); window.__colleges = list;
}
const collegeForm = c => html`<form data-form="college" data-id="${c?.id || ''}" class="stack"><div class="formgrid">
  <label class="f"><span>College name *</span><input type="text" name="name" value="${c?.name || ''}" required maxlength="160"></label>
  <label class="f"><span>Short name (for leaderboard)</span><input type="text" name="short_name" value="${c?.short_name || ''}" maxlength="40"></label></div>
  <label class="f"><span>Address *</span><textarea name="address" required maxlength="300">${c?.address || ''}</textarea></label>
  <div class="formgrid"><label class="f"><span>Contact number *</span><input type="tel" name="phone" value="${c?.phone || ''}" required></label>
  <label class="f"><span>Email (passcode goes here) *</span><input type="email" name="email" value="${c?.email || ''}" required></label></div>
  <div class="formgrid"><label class="f"><span>ELC coordinator / nodal teacher</span><input type="text" name="coordinator" value="${c?.coordinator || ''}" maxlength="100"></label>
  <label class="f"><span>Located LSGI</span><input type="text" name="lsgi" value="${c?.lsgi || ''}" maxlength="120" placeholder="e.g. Chelannur Grama Panchayath"></label></div>
  <div class="formgrid"><label class="f"><span>Latitude (for distance)</span><input type="text" inputmode="decimal" name="lat" value="${c?.lat ?? ''}" placeholder="11.2588"></label>
  <label class="f"><span>Longitude</span><input type="text" inputmode="decimal" name="lng" value="${c?.lng ?? ''}" placeholder="75.7804"></label></div>
  <p class="small muted">Tip: right-click the campus on Google Maps and click the coordinates to copy them. Distances shown are straight-line estimates.</p>${mfoot(c ? 'Save changes' : 'Add college')}</form>`;
actions.addCollege = () => modal(html`<h3>Add ELC college</h3>${collegeForm()}`, { wide: true });
actions.editCollege = el => modal(html`<h3>Edit college</h3>${collegeForm(window.__colleges.find(c => c.id === Number(el.dataset.id)))}`, { wide: true });
forms.college = async f => {
  const id = f.dataset.id; await api(id ? '/api/staff/colleges/' + id : '/api/staff/colleges', id ? 'PUT' : 'POST', fd(f));
  closeM(f); toast(id ? 'College updated' : 'College added. Now push its passcode 🔑'); refresh();
};
actions.toggleCollege = async el => {
  const on = el.dataset.on === '1';
  if (!on && !await confirmBox('Deactivate this college? It will disappear from the leaderboard and be signed out. Data is kept.', 'Deactivate')) return;
  await api(`/api/staff/colleges/${el.dataset.id}/active`, 'POST', { active: on }); refresh();
};
actions.delCollege = async el => {
  if (!await confirmBox('Permanently delete this college and ALL its schedule, attendance and allotments? This cannot be undone. (Use Deactivate to keep the data.)', 'Delete forever')) return;
  await api('/api/staff/colleges/' + el.dataset.id, 'DELETE'); toast('College deleted'); refresh();
};
const SITE = 'ELC Kozhikode portal';
function credsModal(title, text) {
  modal(html`<h3>${title}</h3><p class="small muted">Copy and share these details privately. The password / passcode can't be viewed again later (you can reset it any time).</p>
    <textarea readonly rows="8" style="width:100%;font-family:monospace" data-creds>${text}</textarea>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn white" data-act="closeModal">Close</button><button type="button" class="btn" data-act="copyCreds">📋 Copy to clipboard</button></div>`);
}
actions.copyCreds = async el => {
  const t = $('[data-creds]', el.closest('.modal'));
  try { await navigator.clipboard.writeText(t.value); toast('Copied ✔'); } catch { t.select(); document.execCommand('copy'); toast('Copied ✔'); }
};
const collegeCreds = r => `${SITE}\nCollege login\n\nCollege: ${r.college}\nWebsite: ${location.origin}/\nPasscode: ${r.code}\n\nOpen the website, choose your college, tap "College login" and enter the passcode. Keep it private.`;
function passToast(r) {
  if (r.code) credsModal(`Passcode for ${r.college}`, collegeCreds(r));
  if (r.status === 'sent') toast(`Passcode emailed to ${r.email} ✔`);
  else if (r.status === 'saved') toast(`Passcode saved to Outbox for ${r.college} (SMTP not configured)`);
  else toast(`Could not email ${r.college}: ${r.error}`, true);
}
actions.pushPass = async el => {
  const c = window.__colleges.find(x => x.id === Number(el.dataset.id));
  if (c.passcode_sent_at && !await confirmBox(`Generate a NEW passcode for ${c.name}? The old one stops working.`, 'Generate & send')) return;
  passToast(await api(`/api/staff/colleges/${c.id}/passcode`, 'POST')); refresh();
};
actions.bulkPass = async () => {
  if (!await confirmBox('Generate and email passcodes to every college that has not received one yet?', 'Push to all')) return;
  const { results } = await api('/api/staff/passcodes/bulk', 'POST');
  toast(results.length ? `${results.filter(r => r.status !== 'failed').length}/${results.length} passcodes pushed` : 'Everyone already has a passcode'); refresh();
  if (results.length) credsModal(`${results.length} new passcodes`, results.map(collegeCreds).join('\n\n----------\n\n'));
};

// ---------- villages ----------
async function tVillages() {
  const list = await api('/api/staff/villages');
  window.__villages = list;
  show($('#tab'), html`<div class="row between" style="margin-bottom:14px">${searchBox('q', '🔍 Search villages')}${isOps() ? html`<button class="btn" data-act="addVillage">＋ Add village</button>` : ''}</div>
    ${list.length ? table(['Village', 'Taluk / LSGI', 'Village office & officer', 'Contact', '#Clubs', ''], list.map(v => html`<tr class="rowq"><td><b>${v.name}</b><div class="small muted">${v.lat != null ? `${v.lat}, ${v.lng}` : 'no coordinates'}</div></td><td>${v.taluk || ''}<div class="small muted">${v.lsgi || ''}</div></td>
      <td>${v.office_address ? html`<div class="small">${v.office_address}</div>` : ''}${v.officer_name ? html`<b>${v.officer_name}</b>` : html`<span class="muted small">officer not set</span>`}</td><td class="small">${v.office_phone || ''}${v.officer_phone ? html`<br>${v.officer_phone}` : ''}<br>${v.officer_email || ''}</td><td class="num">${v.colleges}</td>
      <td><div class="row" style="flex-wrap:nowrap"><button class="btn sm white" data-act="editVillage" data-id="${v.id}">Edit</button>${isSuper() ? html`<button class="btn sm danger" data-act="delVillage" data-id="${v.id}">🗑</button>` : ''}</div></td></tr>`)) : empty('No villages in your scope.')}`);
  wireSearch('q', '.rowq');
}
const villageForm = v => html`<form data-form="village" data-id="${v?.id || ''}" class="stack"><div class="formgrid">
  <label class="f"><span>Village *</span><input type="text" name="name" value="${v?.name || ''}" required maxlength="80"></label>
  <label class="f"><span>Taluk</span><select name="taluk">${['Kozhikode', 'Koyilandy', 'Vadakara', 'Thamarassery'].map(t => html`<option ${v?.taluk === t ? 'selected' : ''}>${t}</option>`)}</select></label></div>
  <div class="formgrid"><label class="f"><span>LSGI (Panchayath / Municipality / Corporation)</span><input type="text" name="lsgi" value="${v?.lsgi || ''}" maxlength="120"></label>
  <label class="f"><span>Village office phone</span><input type="text" name="office_phone" value="${v?.office_phone || ''}" maxlength="80"></label></div>
  <label class="f"><span>Village office address</span><textarea name="office_address" maxlength="300">${v?.office_address || ''}</textarea></label>
  <div class="formgrid"><label class="f"><span>Latitude</span><input type="text" name="lat" value="${v?.lat ?? ''}"></label><label class="f"><span>Longitude</span><input type="text" name="lng" value="${v?.lng ?? ''}"></label></div>
  <div class="note">Village officer: the acknowledgement link is emailed here when a college submits this village.</div>
  <div class="formgrid"><label class="f"><span>Officer name</span><input type="text" name="officer_name" value="${v?.officer_name || ''}"></label><label class="f"><span>Officer phone</span><input type="tel" name="officer_phone" value="${v?.officer_phone || ''}"></label>
  <label class="f"><span>Officer email</span><input type="email" name="officer_email" value="${v?.officer_email || ''}"></label></div>${mfoot(v ? 'Save changes' : 'Add village')}</form>`;
actions.addVillage = () => modal(html`<h3>Add village</h3>${villageForm()}`, { wide: true });
actions.editVillage = el => modal(html`<h3>Edit village</h3>${villageForm(window.__villages.find(v => v.id === Number(el.dataset.id)))}`, { wide: true });
forms.village = async f => { const id = f.dataset.id; await api(id ? '/api/staff/villages/' + id : '/api/staff/villages', id ? 'PUT' : 'POST', fd(f)); closeM(f); toast('Saved ✔'); refresh(); };
actions.delVillage = async el => { if (!await confirmBox('Delete this village from the master list?', 'Delete')) return; await api('/api/staff/villages/' + el.dataset.id, 'DELETE'); refresh(); };

// ---------- allotments ----------
let allotCollege = null;
async function tAllot() {
  const [colleges, asg] = await Promise.all([api('/api/staff/colleges'), api('/api/staff/assignments')]);
  window.__colleges = colleges;
  if (!allotCollege || !colleges.some(c => c.id === allotCollege)) allotCollege = colleges[0]?.id || null;
  const sel = colleges.find(c => c.id === allotCollege);
  const vs = sel ? await api(`/api/staff/colleges/${sel.id}/villages`) : [];
  show($('#tab'), html`<div class="card" style="margin-bottom:22px"><h3>Allot villages</h3>
    ${colleges.length ? html`<div class="grid g2"><div class="stack"><label class="f"><span>College</span><select id="ac">${colleges.map(c => html`<option value="${c.id}" ${c.id === allotCollege ? 'selected' : ''}>${c.name}</option>`)}</select></label>
      <div class="note"><b>${sel.name}</b><br>${sel.address}<br>📞 ${sel.phone} · ✉️ ${sel.email}<br>👤 ${sel.coordinator || '—'}<br>${sel.lat == null ? '⚠️ No coordinates, so distances can\'t be shown. Edit the college to add them.' : `📍 ${sel.lat}, ${sel.lng}`}</div></div>
      <div><b>Villages nearest first</b> <span class="small muted">(straight-line km)</span><div style="max-height:360px;overflow:auto;margin-top:8px;border:3px solid var(--ink);border-radius:12px">${vs.length ? table(['Village', '#km', ''], vs.map(v => html`<tr><td><b>${v.name}</b><div class="small muted">${v.taluk || ''}${v.holder ? html` · <b>held by ${v.holder}</b>` : ''}</div></td><td class="num">${v.distance_km ?? '—'}</td>
        <td>${v.allotted ? html`<button class="btn sm danger" data-act="unassignVillage" data-v="${v.id}">Remove</button>` : v.holder ? html`<span class="chip grey">taken</span>` : html`<button class="btn sm" data-act="assign" data-v="${v.id}">＋ Allot</button>`}</td></tr>`)) : empty('No villages in your scope.')}</div></div></div>` : empty('Add a college first.')}</div>
    <div class="row between" style="margin-bottom:10px"><h3 style="font-size:1.4rem;text-transform:uppercase">All allotments</h3>${searchBox('q', '🔍 Filter')}</div>
    ${asg.length ? table(['College', 'College address', 'College contact', 'Village', '#Distance', 'Status', ''], asg.map(a => html`<tr class="rowq"><td><b>${a.college}</b></td><td class="small">${a.college_address}</td><td class="small">📞 ${a.college_phone}<br>✉️ ${a.college_email}${a.coordinator ? html`<br>👤 ${a.coordinator}` : ''}</td>
      <td><b>${a.village}</b><div class="small muted">${a.taluk || ''}</div></td><td class="num">${km(a.distance_km)}${a.distance_note ? html`<div class="small muted">${a.distance_note}</div>` : a.distance_road ? html`<div class="small muted">by road</div>` : ''}</td><td>${statusChip(a.ack_status)}</td>
      <td><button class="btn sm danger" data-act="unassign" data-id="${a.id}">Remove</button></td></tr>`)) : empty('Nothing allotted yet.')}`);
  const s = $('#ac'); if (s) s.addEventListener('change', () => { allotCollege = Number(s.value); tAllot(); });
  wireSearch('q', '.rowq');
}
actions.assign = async el => { await api('/api/staff/assignments', 'POST', { college_id: allotCollege, village_id: Number(el.dataset.v) }); toast('Village allotted ✔'); tAllot(); };
actions.unassign = async el => {
  if (!await confirmBox('Remove this allotment? Any schedule and attendance the college entered for the village is deleted too.', 'Remove')) return;
  await api('/api/staff/assignments/' + el.dataset.id, 'DELETE'); toast('Removed'); tAllot();
};
actions.unassignVillage = async el => {
  const a = (await api('/api/staff/assignments')).find(x => x.college_id === allotCollege && x.village_id === Number(el.dataset.v));
  if (a) actions.unassign({ dataset: { id: a.id } });
};

// ---------- requests ----------
async function tRequests() {
  const rs = await api('/api/staff/requests');
  show($('#tab'), rs.length ? html`<div class="grid g2">${rs.map(r => html`<div class="card"><div class="row between"><h3 style="margin:0">${r.college}</h3><span class="chip ${r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'pink' : 'warn'}">${r.status}</span></div>
    <p style="font-size:1.15rem;margin:10px 0">${r.from_village ? html`<b>${r.from_village}</b> → <b>${r.to_village}</b>` : html`＋ extra village <b>${r.to_village}</b>`}</p>
    <dl class="kv"><dt>Reason</dt><dd>${r.reason}</dd><dt>Distance</dt><dd>${km(r.distance_km)} to requested village</dd><dt>Contact</dt><dd>${r.college_phone}</dd><dt>Asked</dt><dd>${fdt(r.created_at)}</dd>
      ${r.status !== 'pending' ? html`<dt>Decision</dt><dd>${r.decided_by} · ${fdt(r.decided_at)} ${r.admin_note ? `· ${r.admin_note}` : ''}</dd>` : ''}</dl>
    ${r.status === 'pending' ? html`<div class="row" style="margin-top:14px"><button class="btn" data-act="decide" data-id="${r.id}" data-d="approve">✔ Approve</button><button class="btn danger" data-act="decide" data-id="${r.id}" data-d="reject">✕ Reject</button></div>` : ''}</div>`)}</div>` : empty('No change requests. 🎉'));
}
actions.decide = el => {
  const ap = el.dataset.d === 'approve';
  modal(html`<h3>${ap ? 'Approve' : 'Reject'} request</h3><form data-form="decide" data-id="${el.dataset.id}" data-d="${el.dataset.d}" class="stack">
    <label class="f"><span>Note to the college (optional)</span><textarea name="note" maxlength="300"></textarea></label>${mfoot(ap ? 'Approve & swap village' : 'Reject', ap ? 'btn' : 'btn danger')}</form>`);
};
forms.decide = async f => { await api(`/api/staff/requests/${f.dataset.id}/decide`, 'POST', { decision: f.dataset.d, note: fd(f).note }); closeM(f); toast('Decision recorded'); refresh(); };

// ---------- acknowledgements ----------
async function tAcks() {
  const as = await api('/api/staff/acks');
  window.__acks = as;
  show($('#tab'), html`<p class="muted">Colleges submit a village once its days are complete. The village officer reviews the report from an emailed link; acknowledged villages count towards the college's certificate.</p>
    ${as.length ? table(['College', 'Village', 'Officer', 'Report', 'Status', ''], as.map(a => html`<tr><td><b>${a.college}</b></td><td>${a.village}<div class="small muted">${a.taluk || ''}</div></td>
      <td>${a.officer_name || html`<span class="muted">not set</span>`}<div class="small">${a.officer_phone || ''}<br>${a.officer_email || html`<span style="color:var(--bad)">no email: share link manually</span>`}</div></td>
      <td class="small">${a.totals.days} days · ${a.totals.attended} vol-days<br>${n(a.totals.addressed)} addressed · <b>${n(a.totals.registered)} reg.</b></td>
      <td>${statusChip(a.ack_status)}${a.ack_status === 'acknowledged' ? html`<div class="small">${a.ack_name}${a.ack_designation ? `, ${a.ack_designation}` : ''}<br>${fdt(a.ack_at)}</div>` : ''}${a.query_note ? html`<div class="small" style="color:var(--bad)">${a.query_note}</div>` : ''}</td>
      <td><div class="row">${a.ack_status === 'submitted' ? html`<button class="btn sm" data-act="copyLink" data-l="${a.link}">🔗 Copy link</button><button class="btn sm white" data-act="resend" data-id="${a.id}">Resend</button><button class="btn sm violet" data-act="ackBehalf" data-id="${a.id}">Record on behalf</button>` : ''}
        ${a.ack_status !== 'none' ? html`<button class="btn sm danger" data-act="unlock" data-id="${a.id}">Reopen</button>` : ''}</div></td></tr>`)) : empty('No villages have been submitted yet.')}`);
}
actions.copyLink = async el => { try { await navigator.clipboard.writeText(el.dataset.l); toast('Link copied'); } catch { prompt('Copy this link', el.dataset.l); } };
actions.resend = async el => { const r = await api(`/api/staff/acks/${el.dataset.id}/resend`, 'POST'); toast(r.status === 'failed' ? 'No email on record: ' + (r.error || '') : r.status === 'sent' ? 'Reminder emailed ✔' : 'Reminder saved to Outbox', r.status === 'failed'); };
actions.ackBehalf = el => modal(html`<h3>Record acknowledgement</h3><p class="muted">Use when the officer confirmed by phone or in person. This is logged under your name.</p>
  <form data-form="ackBehalf" data-id="${el.dataset.id}" class="stack"><div class="formgrid"><label class="f"><span>Officer name *</span><input type="text" name="officer_name" required></label><label class="f"><span>Designation</span><input type="text" name="designation"></label></div>
  <label class="f"><span>Remarks</span><textarea name="remarks" maxlength="300"></textarea></label>${mfoot('Record')}</form>`);
forms.ackBehalf = async f => { await api(`/api/staff/acks/${f.dataset.id}/override`, 'POST', { mode: 'acknowledge', ...fd(f) }); closeM(f); toast('Recorded'); refresh(); };
actions.unlock = el => modal(html`<h3>Reopen for corrections</h3><p class="muted">The college can edit this village again. Any issued certificate for the college is withdrawn.</p>
  <form data-form="unlock" data-id="${el.dataset.id}" class="stack"><label class="f"><span>Reason (shown to the college)</span><input type="text" name="note" maxlength="300" required></label>${mfoot('Reopen', 'btn danger')}</form>`);
forms.unlock = async f => { await api(`/api/staff/acks/${f.dataset.id}/override`, 'POST', { mode: 'unlock', ...fd(f) }); closeM(f); refresh(); };

// ---------- reports ----------
let repType = 'colleges';
async function tReports() {
  const r = await api('/api/staff/reports/' + repType);
  const names = { colleges: 'Colleges', volunteers: 'Volunteers', villages: 'Villages & acknowledgement', days: 'Day-by-day log' };
  show($('#tab'), html`<div class="row between" style="margin-bottom:14px"><div class="tabs" style="margin:0">${Object.entries(names).map(([k, l]) => html`<button class="tab ${k === repType ? 'on' : ''}" data-act="repType" data-k="${k}">${l}</button>`)}</div>
    <a class="btn" href="/api/staff/reports/${repType}?format=csv">⬇ Download CSV</a></div>
    ${r.rows.length ? html`<div class="tablewrap" style="max-height:70vh"><table><thead><tr>${r.cols.map(([, l]) => html`<th>${l}</th>`)}</tr></thead><tbody>
      ${r.rows.map(row => html`<tr>${r.cols.map(([k]) => html`<td class="${typeof row[k] === 'number' ? 'num' : ''}">${row[k] ?? ''}</td>`)}</tr>`)}</tbody></table></div>` : empty('Nothing to report yet.')}`);
}
actions.repType = el => { repType = el.dataset.k; tReports(); };

// ---------- certificates ----------
async function tCerts() {
  const { ready, waiting } = await api('/api/staff/certificates');
  show($('#tab'), html`<p class="muted">A college becomes certificate-ready once <b>every</b> allotted village is acknowledged by its village officer. ${isSuper() ? 'Issue the certificate number once the District Collector approves.' : 'The Super Admin records issue on the Collector\'s behalf.'}</p>
    <h3 style="font-size:1.4rem;text-transform:uppercase;margin-bottom:10px">Ready for certification (${ready.length})</h3>
    ${ready.length ? table(['College', '#Villages', '#Vol-days', '#Addressed', '#Registered', 'Certificate', ''], ready.map(c => html`<tr><td><b>${c.name}</b></td><td class="num">${c.villages_ack}/${c.villages}</td><td class="num">${c.vdays_attended}</td><td class="num">${n(c.addressed)}</td><td class="num">${n(c.registered)}</td>
      <td>${c.certificate ? html`<span class="chip ok">${c.certificate.number}</span>` : html`<span class="chip warn">not issued</span>`}</td>
      <td><div class="row">${c.certificate ? html`<button class="btn sm" data-act="printCert" data-id="${c.id}">🖨 View / print</button>` : isSuper() ? html`<button class="btn sm violet" data-act="issueCert" data-id="${c.id}">Issue number</button>` : ''}</div></td></tr>`)) : empty('No college is fully acknowledged yet.')}
    <h3 style="font-size:1.4rem;text-transform:uppercase;margin:24px 0 10px">Still in progress (${waiting.length})</h3>
    ${waiting.length ? table(['College', '#Villages acknowledged', '#Awaiting officer'], waiting.map(c => html`<tr><td>${c.name}</td><td class="num">${c.villages_ack}/${c.villages}</td><td class="num">${c.villages_submitted}</td></tr>`)) : empty('All done!')}`);
}
actions.issueCert = async el => {
  if (!await confirmBox('Issue a certificate number for this college? Do this once the Collector has approved.', 'Issue')) return;
  const r = await api(`/api/staff/certificates/${el.dataset.id}/issue`, 'POST'); toast('Issued ' + r.number); refresh();
};
actions.printCert = async el => {
  const d = await api('/api/staff/certificates/' + el.dataset.id), c = d.college, s = d.stats;
  const year = new Date(d.certificate.issued_at).getFullYear();
  const m = modal(html`<div class="row noprint" style="justify-content:flex-end;margin-bottom:10px"><button class="btn" data-act="doPrint">🖨 Print all (${1 + d.volunteers.length} pages)</button><button class="btn white" data-act="closeModal">Close</button></div>
    <div class="cert"><div style="letter-spacing:.3em;font-size:.8rem">DISTRICT ELECTION OFFICE · KOZHIKODE</div><h1>Certificate of Appreciation</h1><p>This is to certify that the Electoral Literacy Club of</p>
      <div class="nm">${c.name}</div><p>has completed voter-enrolment and electoral-literacy outreach in <b>${d.villages.length}</b> villages (${d.villages.map(v => v.name).join(', ')}), with <b>${s.vdays_attended}</b> volunteer-days of field work, addressing <b>${n(s.addressed)}</b> people and helping <b>${n(s.registered)}</b> citizens register as voters. Each village's activity was acknowledged by its Village Officer.</p>
      <p class="small">Certificate No. ${d.certificate.number} · ${year}</p><div class="sig"><div>Nodal Officer, ELC</div><div>District Collector &amp; District Election Officer</div></div></div>
    ${d.volunteers.map(v => html`<div class="cert" style="margin-top:20px"><div style="letter-spacing:.3em;font-size:.8rem">DISTRICT ELECTION OFFICE · KOZHIKODE</div><h1>Certificate of Participation</h1><p>This is to certify that</p><div class="nm">${v.name}</div>
      <p>of <b>${c.name}</b> volunteered in the Electoral Literacy Club voter-enrolment drive for <b>${v.days_attended}</b> field day(s), addressing <b>${n(v.addressed)}</b> people and helping <b>${n(v.registered)}</b> register to vote.</p>
      <p class="small">Ref. ${d.certificate.number} · ${year}</p><div class="sig"><div>College ELC Coordinator</div><div>District Collector &amp; District Election Officer</div></div></div>`)}`, { wide: true });
  m.querySelector('.modal').style.width = 'min(980px,100%)';
};
actions.doPrint = () => { document.body.classList.add('pc'); window.print(); setTimeout(() => document.body.classList.remove('pc'), 500); };

// ---------- outbox ----------
async function tOutbox() {
  const { smtp, rows } = await api('/api/staff/outbox');
  window.__outbox = rows;
  show($('#tab'), html`<div class="note" style="margin-bottom:14px">${smtp ? '📡 SMTP is on: emails below were handed to your mail server.' : '📭 SMTP is off: emails are only stored here (not delivered). Passcodes in these messages are live, so treat this tab as confidential.'}</div>
    ${rows.length ? table(['When', 'To', 'Subject', 'Status', ''], rows.map(r => html`<tr><td>${fdt(r.ts)}</td><td>${r.to_addr || '—'}</td><td>${r.subject}</td>
      <td><span class="chip ${r.status === 'sent' ? 'ok' : r.status === 'saved' ? 'warn' : 'pink'}">${r.status}</span>${r.error ? html`<div class="small">${r.error}</div>` : ''}</td><td><button class="btn sm white" data-act="viewMail" data-id="${r.id}">Open</button></td></tr>`)) : empty('No emails yet.')}`);
}
actions.viewMail = el => { const r = window.__outbox.find(x => x.id === Number(el.dataset.id)); modal(html`<h3>${r.subject}</h3><p class="small muted">To ${r.to_addr || '—'} · ${fdt(r.ts)}</p><pre style="white-space:pre-wrap;font-family:var(--body);background:var(--paper);padding:14px;border-radius:12px;border:2px solid var(--ink)">${r.body}</pre><div class="row" style="justify-content:flex-end"><button class="btn white" data-act="closeModal">Close</button></div>`); };

// ---------- team ----------
async function tTeam() {
  const [team, colleges, villages] = await Promise.all([api('/api/staff/team'), api('/api/staff/colleges'), api('/api/staff/villages')]);
  window.__team = team; window.__cl = colleges; window.__vl = villages;
  show($('#tab'), html`<div class="row between" style="margin-bottom:14px"><p class="muted" style="margin:0;max-width:640px"><b>Super admin</b>: everything, including team and logs. <b>Admin</b>: all college, village, allotment, request and report work. <b>Intern</b>: only the colleges and villages you assign to them.</p><button class="btn" data-act="addStaff">＋ Add staff</button></div>
    ${table(['Name', 'Username', 'Role', 'Scope', 'Last sign-in', 'Status', ''], team.map(u => html`<tr><td><b>${u.name}</b><div class="small muted">${u.email || ''}</div></td><td>${u.username}</td><td><span class="chip ${u.role === 'super_admin' ? 'pink' : u.role === 'admin' ? 'violet' : 'warn'}">${ROLE[u.role]}</span></td>
      <td class="small">${u.role === 'intern' ? `${u.colleges.length} colleges · ${u.villages.length} villages` : 'All'}</td><td>${fdt(u.last_login_at)}</td><td>${u.active ? html`<span class="chip ok">active</span>` : html`<span class="chip grey">off</span>`}</td>
      <td><button class="btn sm white" data-act="editStaff" data-id="${u.id}">Edit</button></td></tr>`))}`);
}
const checkList = (name, items, sel) => html`<div style="max-height:190px;overflow:auto;border:2.5px solid var(--ink);border-radius:12px;padding:8px 12px;background:#fff">${items.map(i => html`<label class="chk" style="padding:3px 0"><input type="checkbox" name="${name}" value="${i.id}" ${sel.includes(i.id) ? 'checked' : ''}> ${i.name}</label>`)}</div>`;
function staffForm(u) {
  return html`<form data-form="staff" data-id="${u?.id || ''}" class="stack"><div class="formgrid"><label class="f"><span>Full name *</span><input type="text" name="name" value="${u?.name || ''}" required></label>
    <label class="f"><span>Username *</span><input type="text" name="username" value="${u?.username || ''}" ${u ? 'disabled' : 'required'} autocapitalize="none"></label>
    <label class="f"><span>Email</span><input type="email" name="email" value="${u?.email || ''}"></label>
    <label class="f"><span>Role *</span><select name="role" id="role">${Object.entries(ROLE).map(([k, l]) => html`<option value="${k}" ${u?.role === k ? 'selected' : ''}>${l}</option>`)}</select></label></div>
    <label class="f"><span>${u ? 'New password (leave blank to keep)' : 'Password * (min 8)'}</span><input type="password" name="password" minlength="8" ${u ? '' : 'required'} autocomplete="new-password"></label>
    ${u ? html`<label class="chk"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}> Account active</label>` : ''}
    <div id="scope"><div class="note">Interns see and manage only these. They can edit details and handle requests/acknowledgements for them, but can't create or delete colleges or villages.</div>
      <div class="formgrid" style="margin-top:10px"><div><b>Colleges</b>${checkList('colleges', window.__cl.map(c => ({ id: c.id, name: c.name })), u?.colleges || [])}</div><div><b>Villages</b>${checkList('villages', window.__vl.map(v => ({ id: v.id, name: `${v.name} (${v.taluk || ''})` })), u?.villages || [])}</div></div></div>${mfoot(u ? 'Save' : 'Create account')}</form>`;
}
function wireRole(m) { const r = $('#role', m), sc = $('#scope', m), f = () => sc.classList.toggle('hide', r.value !== 'intern'); r.addEventListener('change', f); f(); }
actions.addStaff = () => wireRole(modal(html`<h3>Add staff</h3>${staffForm()}`, { wide: true }));
actions.editStaff = el => wireRole(modal(html`<h3>Edit staff</h3>${staffForm(window.__team.find(u => u.id === Number(el.dataset.id)))}`, { wide: true }));
forms.staff = async f => {
  const id = f.dataset.id, v = fd(f), body = { ...v, active: !id || !!v.active, colleges: $$('input[name=colleges]:checked', f).map(x => Number(x.value)), villages: $$('input[name=villages]:checked', f).map(x => Number(x.value)) };
  const sid = id || (await api('/api/staff/team', 'POST', body)).id;
  if (id || body.role === 'intern') await api('/api/staff/team/' + sid, 'PUT', body);
  closeM(f); toast('Saved ✔'); refresh();
  if (!id) credsModal(`Login for ${v.name}`, `${SITE}\nStaff login (${ROLE[v.role] || v.role})\n\nName: ${v.name}\nWebsite: ${location.origin}/admin\nUsername: ${String(v.username).toLowerCase()}\nPassword: ${v.password}\n\nPlease change your password after signing in.`);
};

// ---------- activity log ----------
let logKind = '';
async function tLogs() {
  const rows = await api('/api/staff/logs' + (logKind ? '?kind=' + logKind : ''));
  show($('#tab'), html`<div class="tabs">${[['', 'Everything'], ['signin', '🔐 Sign-ins'], ['manage', '🛠 Management actions']].map(([k, l]) => html`<button class="tab ${k === logKind ? 'on' : ''}" data-act="logKind" data-k="${k}">${l}</button>`)}</div>
    <p class="small muted">Latest 500 events. Covers staff, college and village-officer activity.</p>
    ${rows.length ? table(['When', 'Who', 'Role', 'Action', 'Detail', 'IP'], rows.map(r => html`<tr><td style="white-space:nowrap">${fdt(r.ts)}</td><td><b>${r.actor || '—'}</b><div class="small muted">${r.actor_type}</div></td><td>${r.role ? ROLE[r.role] : ''}</td>
      <td><span class="chip ${r.action === 'login' ? 'ok' : r.action === 'login_failed' ? 'pink' : r.action === 'logout' ? 'grey' : 'cyan'}">${r.action}</span></td><td>${r.detail || ''}</td><td class="small">${r.ip || ''}</td></tr>`)) : empty('No events.')}`);
}
actions.logKind = el => { logKind = el.dataset.k; tLogs(); };

boot();
