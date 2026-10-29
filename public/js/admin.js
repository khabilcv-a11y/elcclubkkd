'use strict';
// ---- staff console: super admin / admin / intern ----
let SU = null;   // { user, scope, smtp, drive, sheet_url }
let DASH = null;
const ROLE = { super_admin: 'Super admin', admin: 'Admin', intern: 'Intern' };
const isSuper = () => SU.user.role === 'super_admin', isOps = () => SU.user.role !== 'intern', isIntern = () => SU.user.role === 'intern';
const app = $('#app');

setUnauth(() => { SU = null; renderLogin(); });

async function boot() {
  try { SU = await api('/api/staff/me'); } catch { SU = null; }
  await loadFeatures();
  window.addEventListener('hashchange', route);
  route();
}
const STAFF_FEATURED = ['colleges', 'schools', 'enrol', 'desk', 'gallery', 'issues', 'notices', 'resources', 'reports', 'villages', 'allot', 'officers', 'requests', 'cert'];
const PAGES = () => ({ dashboard: apDashboard, colleges: pgColleges, schools: pgSchools, enrol: apEnrol, ...(typeof apDesk === 'function' ? { desk: apDesk } : {}), ...(typeof apGallery === 'function' ? { gallery: apGallery } : {}), ...(isSuper() ? { features: apFeatures } : {}), villages: pgVillages, allot: pgAllot, ...(isOps() ? { officers: pgOfficers, notices: pgNotices, resources: pgResources } : {}),
  requests: pgRequests, cert: pgCert, issues: pgIssues, reports: pgReports, ...(isSuper() ? { team: pgTeam, logs: pgLogs } : {}) });
const TITLES = { dashboard: 'Dashboard', colleges: 'Colleges', villages: 'Villages', allot: 'Allotments', officers: 'Village officers', requests: 'Change requests', cert: 'Certification', issues: 'Help desk issues', notices: 'Announcements',
  resources: 'Resource centre', reports: 'Reports & exports', team: 'Team', logs: 'Activity log', schools: 'Schools', enrol: 'Enrolment drive', desk: 'Help desk reports', gallery: 'Gallery', features: 'Access control' };

async function route() {
  if (!SU) return renderLogin();
  let page = location.hash.replace(/^#\/?/, '').split('/')[0] || 'dashboard';
  if (!PAGES()[page] || (STAFF_FEATURED.includes(page) && !feat('staff', page))) page = 'dashboard';
  try { DASH = (await api('/api/staff/dashboard')); } catch (e) { if (e.status === 401) return; }
  const t = DASH?.totals || {};
  const navAll = [{ group: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: 'grid' }] },
    { group: 'Campus to booth', items: [{ id: 'enrol', label: 'Enrolment drive', icon: 'target' }, { id: 'desk', label: 'Help desk reports', icon: 'clipboard' }, { id: 'gallery', label: 'Gallery', icon: 'image' }] },
    { group: 'Manage', items: [{ id: 'colleges', label: 'Colleges', icon: 'building' }, { id: 'schools', label: 'Schools', icon: 'book' }, { id: 'villages', label: 'Villages', icon: 'map-pin' }, { id: 'allot', label: 'Allotments', icon: 'link' }, ...(isOps() ? [{ id: 'officers', label: 'Village officers', icon: 'landmark' }] : [])] },
    { group: 'Operations', items: [{ id: 'requests', label: 'Change requests', icon: 'refresh', count: t.pending_requests }, { id: 'cert', label: 'Certification', icon: 'certificate', count: t.awaiting_ack }, { id: 'issues', label: 'Help desk issues', icon: 'help', count: t.open_issues },
      ...(isOps() ? [{ id: 'notices', label: 'Announcements', icon: 'megaphone' }, { id: 'resources', label: 'Resources', icon: 'book' }] : [])] },
    { group: 'Insights', items: [{ id: 'reports', label: 'Reports & exports', icon: 'chart' }] },
    ...(isOps() ? [{ group: 'Administration', items: [...(isSuper() ? [{ id: 'team', label: 'Team', icon: 'users' }, { id: 'features', label: 'Access control', icon: 'settings' }, { id: 'logs', label: 'Activity log', icon: 'shield' }] : [])] }] : [])];
  const nav = navAll.map(g => ({ ...g, items: g.items.filter(i => (!STAFF_FEATURED.includes(i.id) || feat('staff', i.id)) && PAGES()[i.id]) })).filter(g => g.items.length);
  const extra = html`${isSuper() && SU.sheet_url ? html`<a class="btn secondary sm" href="${SU.sheet_url}" target="_blank" rel="noopener">${icon('external')}<span>Open Google Sheet</span></a>` : ''}<button class="btn ghost sm" data-act="pw" aria-label="Change password">${icon('key')}</button>`;
  show(app, consoleShell({ product: 'Staff console', who: SU.user.name, role: ROLE[SU.user.role], nav, active: page, base: '#', content: html`<div id="pg"><div class="loading"><div class="spin"></div></div></div>`, extra }));
  document.title = TITLES[page] + ' · Staff console';
  try { await PAGES()[page]($('#pg')); } catch (e) { handleErr(e); }
  announce(TITLES[page]);
}
const refresh = () => route();
actions.signout = async () => { await api('/api/auth/staff/logout', 'POST'); SU = null; renderLogin(); };

// ---------- sign-in ----------
function renderLogin() {
  show(app, html`<div class="loginpage" style="min-height:100vh"><div class="logincard"><div class="lg"><img src="${LOGO.district}" alt="District Administration Kozhikode"><img src="${LOGO.sweepDark}" alt="SWEEP Kozhikode"></div>
    <h1>Staff console</h1><p class="sub">Super admins, admins and interns sign in here. Every sign-in is logged.</p>
    <form data-form="login" class="stack-s"><label class="f"><span>Username</span><input type="text" name="username" autocomplete="username" autocapitalize="none" required autofocus></label>
    <label class="f"><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label><div data-err></div>
    <button class="btn primary lg" type="submit" style="width:100%">Sign in</button></form><p class="small center" style="margin-top:14px"><a href="/">← Back to the public site</a></p></div></div>`);
  document.title = 'Staff sign-in';
}
forms.login = async f => { await api('/api/auth/staff', 'POST', fd(f)); SU = await api('/api/staff/me'); location.hash = '#/dashboard'; route(); };
actions.pw = () => modal(html`<h2>Change password</h2><form data-form="pw" class="stack-s"><label class="f"><span>Current password</span><input type="password" name="current" required autocomplete="current-password"></label>
  <label class="f"><span>New password (at least 8 characters)</span><input type="password" name="next" minlength="8" required autocomplete="new-password"></label><div data-err></div>
  <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Update</button></div></form>`);
forms.pw = async f => { await api('/api/staff/password', 'POST', fd(f)); f.closest('.overlay').close(); toast('Password updated. Other sessions were signed out.'); };

// ---------- shared bits ----------
const mfoot = (label, cls = 'primary') => html`<div data-err></div><div class="row" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn ${cls}" type="submit">${label}</button></div>`;
const searchBox = (id, ph) => html`<label class="f" style="margin:0;min-width:240px"><span class="sr">${ph}</span><input type="search" id="${id}" placeholder="${ph}"></label>`;
function wireSearch(id, sel) { const q = $('#' + id); if (!q) return; q.addEventListener('input', () => { const v = q.value.toLowerCase(); $$(sel).forEach(r => r.classList.toggle('hide', !r.textContent.toLowerCase().includes(v))); }); }
const tbl = (head, rows, { cap = '' } = {}) => html`<div class="tablewrap"><table>${cap ? html`<caption class="sr">${cap}</caption>` : ''}<thead><tr>${head.map(h => html`<th class="${String(h).startsWith('#') ? 'num' : ''}">${String(h).replace(/^#/, '')}</th>`)}</tr></thead><tbody>${rows}</tbody></table></div>`;
const rowBtn = (act, label, ic, attrs = '', tone = 'secondary') => raw(`<button class="btn sm ${tone}" data-act="${act}" ${attrs}>${ICONS[ic] ? `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[ic]}</svg>` : ''}${esc(label)}</button>`);

// ---------- dashboard ----------
async function pgDashboard(el) {
  const t = DASH.totals, cs = DASH.colleges.slice(0, 15);
  const attention = [['refresh', t.pending_requests, 'change requests waiting', 'requests'], ['certificate', t.awaiting_ack, 'villages awaiting officer certification', 'cert'], ['help', t.open_issues, 'open help-desk issues', 'issues'], ['key', t.passcode_pending, 'colleges without a passcode', 'colleges']];
  show(el, html`${pageHead(`Welcome, ${SU.user.name}`, isIntern() ? `You are viewing the ${SU.scope.colleges.length} college(s) and ${SU.scope.villages.length} village(s) assigned to you.` : 'District overview of the Electoral Literacy Club programme.', '', ROLE[SU.user.role])}
    <div class="kpis" style="margin-bottom:16px">${kpi('Colleges', t.colleges, { ic: 'building' })}${kpi('Villages allotted', t.villages, { ic: 'map-pin', tone: 'info' })}${kpi('Student volunteers', t.volunteers, { ic: 'users' })}
      ${kpi('Voters enrolled', t.registered, { ic: 'user-check', tone: 'green' })}${kpi('People reached', t.addressed, { ic: 'megaphone', tone: 'saffron' })}${kpi('Villages certified', t.villages_ack, { ic: 'certificate', tone: 'green' })}</div>
    <div class="grid g4" style="margin-bottom:16px">${attention.map(([ic, v, l, go]) => html`<a class="card rv" href="#/${go}" style="text-decoration:none;color:inherit;display:flex;gap:14px;align-items:center"><span class="kpi" style="padding:0;border:0;box-shadow:none"><span class="ico" style="position:static;width:42px;height:42px">${icon(ic)}</span></span><div><div style="font-size:1.6rem;font-weight:800;color:${v ? 'var(--saffron)' : 'var(--ok)'};line-height:1">${v}</div><div class="small muted">${l}</div></div></a>`)}</div>
    <div class="card pad0"><div class="card-head pad"><h3>Club standings</h3><a class="btn ghost sm" href="#/reports">Full report ${icon('arrow-right')}</a></div>
      ${cs.length ? tbl(['#', 'College', '#Villages certified', '#Days held', '#Students', '#Attendance', '#Reached', '#Registered', '#Score'], cs.map(c => html`<tr><td class="num"><b>${c.rank}</b></td><td><b>${c.name}</b></td><td class="num">${c.villages_ack}/${c.villages}</td><td class="num">${c.days_done}/${c.days_planned}</td><td class="num">${c.volunteers}</td><td class="num">${pct(c.attendance_pct)}</td><td class="num">${n(c.addressed)}</td><td class="num">${n(c.registered)}</td><td class="num"><b>${n(c.score)}</b></td></tr>`)) : html`<div style="padding:20px">${empty('No colleges in your scope yet', '', 'building')}</div>`}</div>`);
}

// ---------- colleges ----------
async function pgColleges(el, kind = 'college') {
  const school = kind === 'school', W = school ? 'school' : 'college';
  const list = await api('/api/staff/colleges?kind=' + kind); window.__colleges = list; window.__ckind = kind;
  show(el, html`${pageHead(school ? 'Schools' : 'Colleges', school ? `${list.length} school${list.length === 1 ? '' : 's'} registered.` : `${list.length} Electoral Literacy Club${list.length === 1 ? '' : 's'}.`, html`${isOps() ? html`<button class="btn primary" data-act="addCollege">${icon('plus')} Add ${W}</button>` : ''}${school ? '' : html`<button class="btn secondary" data-act="bulkPass">${icon('key')} Set default for new colleges</button>`}${isSuper() && !school ? html`<button class="btn secondary" data-act="resetAll">${icon('refresh')} Reset ALL to default</button>` : ''}`, 'Manage')}
        <div class="card pad0"><div class="filterbar">${searchBox('q', 'Search ${W}s…')}<label class="f"><span class="sr">Filter</span><select id="cf"><option value="">All ${W}s</option><option value="nopass">No password yet</option><option value="inactive">Inactive</option></select></label></div>
    ${list.length ? tbl(['College', 'Contact', '#Villages', '#Students', '#Registered', 'Password', ''], list.map(c => html`<tr class="rowq" data-f="${!c.passcode_sent_at ? 'nopass' : ''} ${c.active ? '' : 'inactive'}"><td><b>${c.name}</b>${c.active ? '' : html` ${badge('inactive', 'grey')}`}<div class="small muted">${c.lsgi || ''}${c.address ? ` · ${c.address}` : ''}</div></td>
      <td class="small">${icon('phone')} ${c.phone}<br>${icon('mail')} ${c.email}${c.coordinator ? html`<br>${icon('user')} ${c.coordinator}` : ''}</td><td class="num">${c.stats?.villages ?? 0}</td><td class="num">${c.stats?.volunteers ?? 0}</td><td class="num">${n(c.stats?.registered ?? 0)}</td>
      <td>${c.passcode ? html`<div class="row gap-s nowrap"><code style="font-weight:800;letter-spacing:.06em">${c.passcode}</code><button class="btn ghost sm" data-act="copyPass" data-id="${c.id}" title="Copy passcode" aria-label="Copy passcode">${icon('clipboard')}</button><button class="btn ghost sm" data-act="copyMsg" data-id="${c.id}" title="Copy full login message (for WhatsApp)" aria-label="Copy login message">${icon('mail')}</button></div>` : c.passcode_sent_at ? badge('Changed by college', 'ok') : badge('Not set', 'warn')}${c.last_login_at ? html`<div class="xs muted">Last sign-in ${ago(c.last_login_at)}</div>` : ''}</td>
      <td><div class="row gap-s nowrap">${rowBtn('pushPass', c.passcode_sent_at ? 'Reset password' : 'Set password', 'key', `data-id="${c.id}"`, 'primary')}${rowBtn('editCollege', 'Edit', 'edit', `data-id="${c.id}"`)}${isOps() ? rowBtn('toggleCollege', c.active ? 'Deactivate' : 'Activate', 'lock', `data-id="${c.id}" data-on="${c.active ? 0 : 1}"`, 'ghost') : ''}${isSuper() ? rowBtn('delCollege', '', 'trash', `data-id="${c.id}" aria-label="Delete ${esc(c.name)}"`, 'danger') : ''}</div></td></tr>`)) : html`<div style="padding:20px">${empty('No colleges yet', 'Add the first Electoral Literacy Club.', 'building')}</div>`}</div>`);
  const apply = () => { const v = $('#q').value.toLowerCase(), f = $('#cf').value; $$('.rowq').forEach(r => r.classList.toggle('hide', !((!v || r.textContent.toLowerCase().includes(v)) && (!f || r.dataset.f.includes(f))))); };
  $('#q')?.addEventListener('input', apply); $('#cf')?.addEventListener('change', apply);
}
const collegeForm = c => html`<form data-form="college" data-id="${c?.id || ''}" class="stack-s"><input type="hidden" name="kind" value="${window.__ckind || 'college'}"><div class="formgrid"><label class="f"><span>College name *</span><input type="text" name="name" value="${c?.name || ''}" required maxlength="160"></label>
  <label class="f"><span>Short name (shown on the leaderboard)</span><input type="text" name="short_name" value="${c?.short_name || ''}" maxlength="40"></label></div>
  <label class="f"><span>Address *</span><textarea name="address" required maxlength="300">${c?.address || ''}</textarea></label>
  <div class="formgrid"><label class="f"><span>Contact number *</span><input type="tel" name="phone" value="${c?.phone || ''}" required></label><label class="f"><span>Email *</span><input type="email" name="email" value="${c?.email || ''}" required></label>
  <label class="f"><span>ELC coordinator</span><input type="text" name="coordinator" value="${c?.coordinator || ''}" maxlength="100"></label><label class="f"><span>Located LSGI</span><input type="text" name="lsgi" value="${c?.lsgi || ''}" maxlength="120" placeholder="e.g. Chelannur Grama Panchayath"></label>
  <label class="f"><span>Latitude (optional)</span><input type="text" inputmode="decimal" name="lat" value="${c?.lat ?? ''}"></label><label class="f"><span>Longitude (optional)</span><input type="text" inputmode="decimal" name="lng" value="${c?.lng ?? ''}"></label></div>
  ${mfoot(c ? 'Save changes' : 'Add college')}</form>`;
actions.addCollege = () => modal(html`<h2>Add college</h2>${collegeForm()}`, { wide: true });
actions.editCollege = el => modal(html`<h2>Edit college</h2>${collegeForm(window.__colleges.find(c => c.id === Number(el.dataset.id)))}`, { wide: true });
forms.college = async f => { const id = f.dataset.id, r = await api(id ? '/api/staff/colleges/' + id : '/api/staff/colleges', id ? 'PUT' : 'POST', fd(f)); f.closest('.overlay').close(); toast(id ? 'College updated' : `College added. Starting password: ${r.code}`); refresh(); };
actions.toggleCollege = async el => { const on = el.dataset.on === '1'; if (!on && !await confirmBox('Deactivate this college? It will leave the leaderboard and be signed out. Its data is kept.', 'Deactivate', true)) return; await api(`/api/staff/colleges/${el.dataset.id}/active`, 'POST', { active: on }); refresh(); };
actions.delCollege = async el => { if (!await confirmBox('Permanently delete this college and ALL its schedule, attendance and allotments? This cannot be undone. (Deactivate keeps the data.)', 'Delete forever', true)) return; await api('/api/staff/colleges/' + el.dataset.id, 'DELETE'); toast('College deleted'); refresh(); };
const SITE = 'ELC Kozhikode portal';
function credsModal(title, text) {
  modal(html`<h2>${title}</h2><p class="small muted">Copy and share these details privately. The password / passcode can't be viewed again later (you can reset it any time).</p>
    <textarea readonly rows="8" style="width:100%;font-family:monospace" data-creds>${text}</textarea>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn secondary" data-act="closeCreds">Close</button><button type="button" class="btn primary" data-act="copyCreds">${icon('clipboard')} Copy to clipboard</button></div>`);
}
actions.closeCreds = el => el.closest('.overlay').close();
actions.copyCreds = async el => { const t = $('[data-creds]', el.closest('.overlay')); try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); } toast('Copied'); };
const staffCreds = (name, role, username, pw) => `${SITE}\nStaff login (${ROLE[role] || role})\n\nName: ${name}\nWebsite: ${location.origin}/admin\nUsername: ${String(username).toLowerCase()}\nPassword: ${pw}\n\nPlease change your password after signing in.`;
const newPassword = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; let x = ''; for (const b of crypto.getRandomValues(new Uint8Array(12))) x += A[b % A.length]; return x; };
const collegeCreds = r => `${SITE}\nCollege login\n\nCollege: ${r.college}\nWebsite: ${location.origin}/\nPassword: ${r.code}\n\nOpen the website, choose your college, tap "College login" and enter the password. You can change it after signing in (Password button, top right). Keep it private.`;
function passToast(r) { credsModal(`Password reset for ${r.college}`, collegeCreds(r)); }
const copyText = async t => { try { await navigator.clipboard.writeText(t); } catch { prompt('Copy this', t); return; } toast('Copied'); };
actions.copyPass = el => copyText(window.__colleges.find(x => x.id === Number(el.dataset.id)).passcode);
actions.copyMsg = el => { const c = window.__colleges.find(x => x.id === Number(el.dataset.id)); copyText(collegeCreds({ college: c.name, code: c.passcode })); };
actions.pushPass = async el => { const c = window.__colleges.find(x => x.id === Number(el.dataset.id)); if (c.passcode_sent_at && !await confirmBox(`Reset the password of ${c.name} to the default? Their current password stops working and they are signed out.`, 'Reset password')) return; passToast(await api(`/api/staff/colleges/${c.id}/passcode`, 'POST')); refresh(); };
actions.bulkPass = async () => { if (!await confirmBox('Set the default password for every college that has none yet?', 'Set default')) return; const { results } = await api('/api/staff/passcodes/bulk', 'POST'); toast(results.length ? `${results.filter(r => r.status !== 'failed').length} of ${results.length} colleges set to the default password` : 'Every college already has a password'); refresh(); };

// ---------- villages ----------
async function pgVillages(el) {
  const list = await api('/api/staff/villages'); window.__villages = list;
  const taluks = [...new Set(list.map(v => v.taluk).filter(Boolean))].sort();
  show(el, html`${pageHead('Villages', `${list.length} village${list.length === 1 ? '' : 's'}. One village is held by one college.`, isOps() ? html`<button class="btn primary" data-act="addVillage">${icon('plus')} Add village</button>` : '', 'Manage')}
    <div class="card pad0"><div class="filterbar">${searchBox('q', 'Search villages, LSGI, colleges…')}<label class="f"><span class="sr">Taluk</span><select id="tf"><option value="">All taluks</option>${taluks.map(t => html`<option>${t}</option>`)}</select></label>
      <label class="f"><span class="sr">Status</span><select id="sf"><option value="">All</option><option value="free">Not allotted</option><option value="held">Allotted</option><option value="nooff">No officer assigned</option></select></label></div>
    ${list.length ? tbl(['Village', 'Taluk / LSGI', 'Allotted to', 'Village office', 'Officer', ''], list.map(v => html`<tr class="rowq" data-t="${v.taluk || ''}" data-s="${v.holder ? 'held' : 'free'} ${v.officer_id ? '' : 'nooff'}"><td><b>${v.name}</b><div class="xs muted">${v.lat != null ? `${v.lat}, ${v.lng}` : 'no map position'}</div></td>
      <td>${v.taluk || '—'}<div class="small muted">${v.lsgi || ''}</div></td><td>${v.holder ? html`${v.holder} ${ackBadge(v.ack_status)}` : badge('Not allotted', 'grey')}</td><td class="small">${v.office_address || ''}${v.office_phone ? html`<div>${icon('phone')} ${v.office_phone}</div>` : ''}</td>
      <td>${v.officer_name ? html`<b>${v.officer_name}</b>` : html`<span class="muted small">Not assigned</span>`}</td><td><div class="row gap-s nowrap">${rowBtn('editVillage', 'Edit', 'edit', `data-id="${v.id}"`)}${isSuper() ? rowBtn('delVillage', '', 'trash', `data-id="${v.id}" aria-label="Delete ${esc(v.name)}"`, 'danger') : ''}</div></td></tr>`)) : html`<div style="padding:20px">${empty('No villages in your scope', '', 'map-pin')}</div>`}</div>`);
  const apply = () => { const q = $('#q').value.toLowerCase(), t = $('#tf').value, s = $('#sf').value; $$('.rowq').forEach(r => r.classList.toggle('hide', !((!q || r.textContent.toLowerCase().includes(q)) && (!t || r.dataset.t === t) && (!s || r.dataset.s.includes(s))))); };
  ['#q', '#tf', '#sf'].forEach(s => $(s)?.addEventListener(s === '#q' ? 'input' : 'change', apply));
}
const villageForm = v => html`<form data-form="village" data-id="${v?.id || ''}" class="stack-s"><div class="formgrid"><label class="f"><span>Village *</span><input type="text" name="name" value="${v?.name || ''}" required maxlength="80"></label>
  <label class="f"><span>Taluk</span><select name="taluk">${['Kozhikode', 'Koyilandy', 'Vadakara', 'Thamarassery'].map(t => html`<option ${v?.taluk === t ? 'selected' : ''}>${t}</option>`)}</select></label>
  <label class="f"><span>LSGI (Panchayath / Municipality / Corporation)</span><input type="text" name="lsgi" value="${v?.lsgi || ''}" maxlength="120"></label><label class="f"><span>Village office phone</span><input type="text" name="office_phone" value="${v?.office_phone || ''}" maxlength="80"></label></div>
  <label class="f"><span>Village office address</span><textarea name="office_address" maxlength="300">${v?.office_address || ''}</textarea></label>
  <div class="formgrid"><label class="f"><span>Latitude</span><input type="text" name="lat" value="${v?.lat ?? ''}"></label><label class="f"><span>Longitude</span><input type="text" name="lng" value="${v?.lng ?? ''}"></label></div>
  <p class="hint">The village officer is assigned from the Village officers page. Map positions were found automatically and may be a little off: correct them here.</p>
  <input type="hidden" name="officer_name" value="${v?.officer_name || ''}"><input type="hidden" name="officer_phone" value="${v?.officer_phone || ''}"><input type="hidden" name="officer_email" value="${v?.officer_email || ''}">${mfoot(v ? 'Save changes' : 'Add village')}</form>`;
actions.addVillage = () => modal(html`<h2>Add village</h2>${villageForm()}`, { wide: true });
actions.editVillage = el => modal(html`<h2>Edit village</h2>${villageForm(window.__villages.find(v => v.id === Number(el.dataset.id)))}`, { wide: true });
forms.village = async f => { const id = f.dataset.id; await api(id ? '/api/staff/villages/' + id : '/api/staff/villages', id ? 'PUT' : 'POST', fd(f)); f.closest('.overlay').close(); toast('Saved'); refresh(); };
actions.delVillage = async el => { if (!await confirmBox('Delete this village from the master list?', 'Delete', true)) return; await api('/api/staff/villages/' + el.dataset.id, 'DELETE'); refresh(); };

// ---------- allotments ----------
let allotCollege = null;
async function pgAllot(el) {
  const [colleges, asg] = await Promise.all([api('/api/staff/colleges'), api('/api/staff/assignments')]);
  if (!allotCollege || !colleges.some(c => c.id === allotCollege)) allotCollege = colleges[0]?.id || null;
  const sel = colleges.find(c => c.id === allotCollege), vs = sel ? await api(`/api/staff/colleges/${sel.id}/villages`) : [];
  const mine = vs.filter(v => v.allotted);
  show(el, html`${pageHead('Allotments', 'Give each college its villages. A village can be held by only one college.', '', 'Manage')}
    ${colleges.length ? html`<div class="grid g2" style="margin-bottom:18px"><div class="card"><label class="f"><span>College</span><select id="ac">${colleges.map(c => html`<option value="${c.id}" ${c.id === allotCollege ? 'selected' : ''}>${c.name}</option>`)}</select></label>
        <dl class="kv"><dt>Address</dt><dd>${sel.address}</dd><dt>LSGI</dt><dd>${sel.lsgi || '—'}</dd><dt>Contact</dt><dd>${sel.phone} · ${sel.email}</dd><dt>Coordinator</dt><dd>${sel.coordinator || '—'}</dd></dl>
        <h3 style="margin:16px 0 8px">Holds ${mine.length} village${mine.length === 1 ? '' : 's'}</h3><div class="pillrow">${mine.length ? mine.map(v => html`<span class="badge">${v.name}</span>`) : html`<span class="muted small">None yet</span>`}</div></div>
      <div class="card pad0"><div class="filterbar">${searchBox('vq', 'Search villages to allot…')}</div><div style="max-height:360px;overflow:auto">${tbl(['Village', 'Status', ''], vs.map(v => html`<tr class="rowv"><td><b>${v.name}</b><div class="xs muted">${v.taluk || ''}${v.distance_km != null ? ` · ${v.distance_km} km` : ''}</div></td>
          <td>${v.allotted ? badge('This college', 'ok') : v.holder ? html`${badge('Taken', 'grey')}<div class="xs muted">${v.holder}</div>` : badge('Free', 'info')}</td>
          <td class="right">${v.allotted ? rowBtn('unassignVillage', 'Remove', 'x', `data-v="${v.id}"`, 'danger') : v.holder ? '' : rowBtn('assign', 'Allot', 'plus', `data-v="${v.id}"`, 'primary')}</td></tr>`))}</div></div></div>` : empty('Add a college first', '', 'building')}
    <div class="card pad0"><div class="card-head pad"><h3>All allotments (${asg.length})</h3><a class="btn secondary sm" href="#/reports">${icon('download')} Export master list</a></div><div class="filterbar">${searchBox('aq', 'Filter allotments…')}</div>
    ${asg.length ? tbl(['College', 'Village', 'LSGI', 'Village office', '#Distance', 'Certification', ''], asg.map(a => html`<tr class="rowa"><td><b>${a.college}</b><div class="xs muted">${a.college_phone}</div></td><td><b>${a.village}</b><div class="xs muted">${a.taluk || ''}</div></td><td class="small">${a.village_lsgi || ''}</td>
      <td class="small">${a.office_address || ''}${a.office_phone ? html`<div>${icon('phone')} ${a.office_phone}</div>` : ''}</td><td class="num">${km(a.distance_km)}${a.distance_note ? html`<div class="xs muted">${a.distance_note}</div>` : a.distance_road ? html`<div class="xs muted">by road</div>` : ''}</td>
      <td>${ackBadge(a.ack_status)}</td><td>${rowBtn('unassign', '', 'trash', `data-id="${a.id}" aria-label="Remove allotment"`, 'danger')}</td></tr>`)) : html`<div style="padding:20px">${empty('Nothing allotted yet', '', 'link')}</div>`}</div>`);
  const s = $('#ac'); if (s) s.addEventListener('change', () => { allotCollege = Number(s.value); pgAllot(el); });
  wireSearch('vq', '.rowv'); wireSearch('aq', '.rowa');
}
actions.assign = async el => { await api('/api/staff/assignments', 'POST', { college_id: allotCollege, village_id: Number(el.dataset.v) }); toast('Village allotted'); pgAllot($('#pg')); };
actions.unassign = async el => { if (!await confirmBox('Remove this allotment? Any schedule and attendance the college entered for the village is deleted too.', 'Remove', true)) return; await api('/api/staff/assignments/' + el.dataset.id, 'DELETE'); toast('Removed'); pgAllot($('#pg')); };
actions.unassignVillage = async el => { const a = (await api('/api/staff/assignments')).find(x => x.college_id === allotCollege && x.village_id === Number(el.dataset.v)); if (a) actions.unassign({ dataset: { id: a.id } }); };

// ---------- officers ----------
async function pgOfficers(el) {
  const [list, vs] = await Promise.all([api('/api/staff/officers'), api('/api/staff/villages')]); window.__officers = list; window.__allVillages = vs;
  show(el, html`${pageHead('Village officers', 'Officers verify attendance in their villages and certify the colleges\' data. Certificates are issued on their certification.', html`<button class="btn secondary" data-act="seedOfficers">${icon('users')} Create one for every village</button><button class="btn primary" data-act="addOfficer">${icon('plus')} Add officer</button>`, 'Manage')}
    ${list.length ? html`<div class="card pad0">${tbl(['Officer', 'Contact', 'Villages', 'Passcode', ''], list.map(o => html`<tr><td><b>${o.name}</b>${o.active ? '' : html` ${badge('inactive', 'grey')}`}<div class="small muted">${o.designation || ''}</div></td><td class="small">${o.phone ? html`${icon('phone')} ${o.phone}<br>` : ''}${o.email ? html`${icon('mail')} ${o.email}` : html`<span class="muted">no email</span>`}</td>
      <td><div class="pillrow">${o.villages.length ? o.villages.map(v => badge(v.name)) : html`<span class="muted small">none</span>`}</div></td><td>${o.passcode_sent_at ? html`${badge('Sent', 'ok')}<div class="xs muted">${fdt(o.passcode_sent_at)}</div>` : badge('Not sent', 'warn')}${o.last_login_at ? html`<div class="xs muted">Last sign-in ${ago(o.last_login_at)}</div>` : ''}</td>
      <td><div class="row gap-s nowrap">${rowBtn('officerPass', o.passcode_sent_at ? 'Reset passcode' : 'Create passcode', 'key', `data-id="${o.id}"`, 'primary')}${rowBtn('editOfficer', 'Edit', 'edit', `data-id="${o.id}"`)}${rowBtn('toggleOfficer', o.active ? 'Deactivate' : 'Activate', 'lock', `data-id="${o.id}" data-on="${o.active ? 0 : 1}"`, 'ghost')}${isSuper() ? rowBtn('delOfficer', '', 'trash', `data-id="${o.id}" aria-label="Delete ${esc(o.name)}"`, 'danger') : ''}</div></td></tr>`))}</div>`
      : empty('No village officers yet', 'Use "Create one for every village" to start with a placeholder officer per village, then edit names and contacts as they become known. Until then, you can copy a certification link for any submitted village from the Certification page and pass it on.', 'landmark')}`);
}
const officerForm = o => {
  const mine = new Set((o?.villages || []).map(v => v.id));
  return html`<form data-form="officer" data-id="${o?.id || ''}" class="stack-s"><div class="formgrid"><label class="f"><span>Officer name *</span><input type="text" name="name" value="${o?.name || ''}" required maxlength="100"></label>
    <label class="f"><span>Designation</span><input type="text" name="designation" value="${o?.designation || 'Village Officer'}" maxlength="100"></label><label class="f"><span>Phone</span><input type="tel" name="phone" value="${o?.phone || ''}"></label>
    <label class="f"><span>Email (optional)</span><input type="email" name="email" value="${o?.email || ''}"></label></div>
    <label class="f"><span>Villages this officer is responsible for</span><input type="search" id="ovq" placeholder="Search villages…" style="margin-bottom:6px"></label>
    <div style="max-height:220px;overflow:auto;border:1px solid var(--line-2);border-radius:var(--r-sm);padding:8px 12px">${window.__allVillages.map(v => html`<label class="chk ovrow" style="padding:4px 0"><input type="checkbox" name="villages" value="${v.id}" ${mine.has(v.id) ? 'checked' : ''}> <span>${v.name} <span class="muted small">${v.taluk || ''}${v.officer_name && !mine.has(v.id) ? ` · now: ${v.officer_name}` : ''}</span></span></label>`)}</div>${mfoot(o ? 'Save changes' : 'Add officer')}</form>`;
};
function wireOfficerModal(m) { $('#ovq', m)?.addEventListener('input', e => { const q = e.target.value.toLowerCase(); $$('.ovrow', m).forEach(r => r.classList.toggle('hide', !r.textContent.toLowerCase().includes(q))); }); }
actions.addOfficer = () => wireOfficerModal(modal(html`<h2>Add village officer</h2>${officerForm()}`, { wide: true }));
actions.editOfficer = el => wireOfficerModal(modal(html`<h2>Edit village officer</h2>${officerForm(window.__officers.find(o => o.id === Number(el.dataset.id)))}`, { wide: true }));
forms.officer = async f => {
  const id = f.dataset.id, v = fd(f), body = { name: v.name, designation: v.designation, phone: v.phone, email: v.email, villages: $$('input[name=villages]:checked', f).map(x => Number(x.value)) };
  await api(id ? '/api/staff/officers/' + id : '/api/staff/officers', id ? 'PUT' : 'POST', body); f.closest('.overlay').close(); toast('Saved'); refresh();
  if (!id) credsModal(`Login for ${v.name}`, staffCreds(v.name, v.role, v.username, v.password));
};

actions.toggleOfficer = async el => { await api(`/api/staff/officers/${el.dataset.id}/active`, 'POST', { active: el.dataset.on === '1' }); refresh(); };
actions.delOfficer = async el => { if (!await confirmBox('Delete this officer? Their villages become unassigned.', 'Delete', true)) return; await api('/api/staff/officers/' + el.dataset.id, 'DELETE'); refresh(); };

// ---------- change requests ----------
async function pgRequests(el) {
  const rs = await api('/api/staff/requests');
  show(el, html`${pageHead('Change requests', 'Colleges can ask for a different village, or an extra one. Approving swaps it in.', '', 'Operations')}
    ${rs.length ? html`<div class="grid g2">${rs.map(r => html`<div class="card rv"><div class="card-head"><h3>${r.college}</h3>${badge(r.status, r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'danger' : 'warn')}</div>
      <p style="font-size:1.05rem">${r.from_village ? html`<b>${r.from_village}</b> ${icon('arrow-right')} <b>${r.to_village}</b>` : html`Extra village: <b>${r.to_village}</b>`}</p>
      ${r.holder && r.status === 'pending' ? html`<div class="alert warn" style="margin-top:8px">${icon('alert')}<div>${r.to_village} is currently allotted to <b>${r.holder}</b>. To approve this, free it first under Allotments.</div></div>` : ''}<dl class="kv" style="margin-top:8px"><dt>Reason</dt><dd>${r.reason}</dd><dt>Contact</dt><dd>${r.college_phone}</dd><dt>Asked</dt><dd>${fdt(r.created_at)}</dd>${r.status !== 'pending' ? html`<dt>Decision</dt><dd>${r.decided_by} · ${fdt(r.decided_at)}${r.admin_note ? ` · ${r.admin_note}` : ''}</dd>` : ''}</dl>
      ${r.status === 'pending' ? html`<div class="row" style="margin-top:14px"><button class="btn green" data-act="decide" data-id="${r.id}" data-d="approve">${icon('check')} Approve</button><button class="btn danger" data-act="decide" data-id="${r.id}" data-d="reject">${icon('x')} Reject</button></div>` : ''}</div>`)}</div>` : empty('No change requests', 'You are all caught up.', 'check-circle')}`);
}
actions.decide = el => { const ap = el.dataset.d === 'approve';
  modal(html`<h2>${ap ? 'Approve' : 'Reject'} request</h2><form data-form="decide" data-id="${el.dataset.id}" data-d="${el.dataset.d}" class="stack-s"><label class="f"><span>Note to the college (optional)</span><textarea name="note" maxlength="300"></textarea></label>${mfoot(ap ? 'Approve and swap village' : 'Reject', ap ? 'green' : 'danger')}</form>`); };
forms.decide = async f => { await api(`/api/staff/requests/${f.dataset.id}/decide`, 'POST', { decision: f.dataset.d, note: fd(f).note }); f.closest('.overlay').close(); toast('Decision recorded'); refresh(); };

// ---------- certification ----------
let certTab = 'waiting';
async function pgCert(el) {
  const [acks, certs] = await Promise.all([api('/api/staff/acks'), api('/api/staff/certificates')]); window.__acks = acks;
  const waiting = acks.filter(a => a.ack_status === 'submitted'), done = acks.filter(a => a.ack_status === 'acknowledged');
  show(el, html`${pageHead('Certification', 'Colleges send a finished village to its village officer, who certifies the students\' participation. The students of a certified village are then eligible for certificates.', '', 'Operations')}
    <div class="tabs" role="tablist" style="margin-bottom:14px"><button class="tab" role="tab" aria-selected="${certTab === 'waiting'}" data-act="certTab" data-k="waiting">Awaiting officer (${waiting.length})</button><button class="tab" role="tab" aria-selected="${certTab === 'done'}" data-act="certTab" data-k="done">Certified (${done.length})</button><button class="tab" role="tab" aria-selected="${certTab === 'certs'}" data-act="certTab" data-k="certs">Student certificates (${certs.certified.length})</button></div>
    ${certTab === 'certs' ? certsView(certs) : ackTable(certTab === 'waiting' ? waiting : done, certTab === 'waiting')}`);
}
actions.certTab = el => { certTab = el.dataset.k; pgCert($('#pg')); };
const ackTable = (rows, waiting) => rows.length ? html`<div class="card pad0">${tbl(['College', 'Village', 'Officer', 'Report', 'Status', ''], rows.map(a => html`<tr><td><b>${a.college}</b></td><td>${a.village}<div class="xs muted">${a.taluk || ''}</div></td>
  <td>${a.officer_name ? html`<b>${a.officer_name}</b>` : html`<span class="muted small">no officer assigned</span>`}<div class="xs muted">${a.officer_phone || ''}${a.officer_email ? html`<br>${a.officer_email}` : ''}</div></td>
  <td class="small">${a.totals.days} days · ${a.totals.attended} shifts<br>${n(a.totals.addressed)} reached · <b>${n(a.totals.registered)} registered</b></td>
  <td>${ackBadge(a.ack_status)}${a.ack_status === 'acknowledged' ? html`<div class="xs muted">${a.ack_name}${a.ack_designation ? `, ${a.ack_designation}` : ''}<br>${fdt(a.ack_at)}</div>` : ''}${a.query_note ? html`<div class="xs" style="color:var(--danger)">${a.query_note}</div>` : ''}</td>
  <td><div class="row gap-s">${waiting ? html`${rowBtn('copyLink', 'Copy link', 'link', `data-l="${a.link}"`)}${rowBtn('ackBehalf', 'Certify for officer', 'check', `data-id="${a.id}"`, 'primary')}` : ''}${rowBtn('unlock', 'Reopen', 'refresh', `data-id="${a.id}"`, 'danger')}</div></td></tr>`))}</div>`
  : empty(waiting ? 'Nothing is waiting' : 'No village is certified yet', '', 'certificate');
const certsView = c => html`<div class="card pad0">${c.certified.length ? tbl(['Village', 'College', 'Certified by', 'Certificate no.', '#Eligible students', ''], c.certified.map(x => html`<tr><td><b>${x.village}</b><div class="xs muted">${x.taluk || ''}</div></td><td>${x.college}</td><td>${x.officer || '—'}<div class="xs muted">${x.designation || ''} ${x.certified_at ? '· ' + fdt(x.certified_at) : ''}</div></td>
  <td>${x.cert_no ? badge(x.cert_no, 'ok') : '—'}</td><td class="num">${x.students}</td><td>${rowBtn('printCert', 'View / print', 'printer', `data-id="${x.id}"`, 'primary')}</td></tr>`)) : html`<div style="padding:20px">${empty('No village is certified yet', 'Student certificates appear here as soon as a village officer certifies a village.', 'certificate')}</div>`}</div>`;
actions.copyLink = async el => { try { await navigator.clipboard.writeText(el.dataset.l); toast('Link copied'); } catch { prompt('Copy this link', el.dataset.l); } };

actions.officerPass = async el => {
  const o = window.__officers.find(x => x.id === Number(el.dataset.id));
  if (o.passcode_sent_at && !await confirmBox(`Create a NEW passcode for ${o.name}? The old one stops working.`, 'Create passcode')) return;
  const r = await api(`/api/staff/officers/${o.id}/passcode`, 'POST');
  credsModal(`Login for ${o.name}`, `${SITE}\nVillage officer login\n\nName: ${r.name}\nWebsite: ${location.origin}/#/officer-login\nPasscode: ${r.code}\n\nOpen the website, choose "Village officer", pick your name and enter the passcode. Keep it private.`); refresh();
};
actions.ackBehalf = el => modal(html`<h2>Certify on the officer's behalf</h2><p class="muted small" style="margin-bottom:10px">Use when the officer confirmed by phone or in person. This is logged under your name.</p><form data-form="ackBehalf" data-id="${el.dataset.id}" class="stack-s"><div class="formgrid"><label class="f"><span>Officer name *</span><input type="text" name="officer_name" required></label><label class="f"><span>Designation</span><input type="text" name="designation"></label></div>
  <label class="f"><span>Remarks</span><textarea name="remarks" maxlength="300"></textarea></label>${mfoot('Record certification', 'green')}</form>`);
forms.ackBehalf = async f => { await api(`/api/staff/acks/${f.dataset.id}/override`, 'POST', { mode: 'acknowledge', ...fd(f) }); f.closest('.overlay').close(); toast('Recorded'); refresh(); };
actions.unlock = el => modal(html`<h2>Reopen for corrections</h2><p class="muted small" style="margin-bottom:10px">The college can edit this village again. The village's certification and certificate number are withdrawn.</p><form data-form="unlock" data-id="${el.dataset.id}" class="stack-s"><label class="f"><span>Reason (shown to the college)</span><input type="text" name="note" maxlength="300" required></label>${mfoot('Reopen', 'danger')}</form>`);
forms.unlock = async f => { await api(`/api/staff/acks/${f.dataset.id}/override`, 'POST', { mode: 'unlock', ...fd(f) }); f.closest('.overlay').close(); refresh(); };
actions.printCert = async el => showCertificates(await api('/api/staff/certificates/' + el.dataset.id));

// ---------- help desk ----------
let issueFilter = 'open';
async function pgIssues(el) {
  const all = await api('/api/staff/issues'); window.__issues = all;
  const list = all.filter(i => issueFilter === 'all' || (issueFilter === 'open' ? i.status !== 'resolved' : i.status === 'resolved'));
  show(el, html`${pageHead('Help desk', 'Issues raised by colleges. Reply here and the college sees it in its workspace.', '', 'Operations')}
    <div class="chips" style="margin-bottom:14px">${[['open', `Open (${all.filter(i => i.status !== 'resolved').length})`], ['resolved', 'Resolved'], ['all', 'All']].map(([k, l]) => html`<button class="chip ${issueFilter === k ? 'on' : ''}" data-act="issueFilter" data-k="${k}">${l}</button>`)}</div>
    ${list.length ? html`<div class="stack-s">${list.map(i => html`<div class="card rv"><div class="row between"><div><b>${i.subject}</b><div class="small muted">${i.college} · ${i.category} · ${fdt(i.created_at)}</div></div>${badge(i.status.replace('_', ' '), i.status === 'resolved' ? 'ok' : i.status === 'in_progress' ? 'info' : 'warn')}</div>
      <p style="margin-top:8px">${i.message}</p>${i.staff_reply ? html`<div class="alert info" style="margin-top:10px">${icon('message')}<div><b>${i.replied_by}:</b> ${i.staff_reply}</div></div>` : ''}
      <div class="row" style="margin-top:12px"><button class="btn primary sm" data-act="replyIssue" data-id="${i.id}">${icon('message')} Reply / update</button><span class="small muted">${icon('phone')} ${i.college_phone} · ${i.college_email}</span></div></div>`)}</div>` : empty('No issues here', '', 'check-circle')}`);
}
actions.issueFilter = el => { issueFilter = el.dataset.k; pgIssues($('#pg')); };
actions.replyIssue = el => { const i = window.__issues.find(x => x.id === Number(el.dataset.id));
  modal(html`<h2>${i.subject}</h2><p class="small muted">${i.college}</p><p style="margin:10px 0">${i.message}</p><form data-form="issueReply" data-id="${i.id}" class="stack-s"><label class="f"><span>Status</span><select name="status"><option value="open" ${i.status === 'open' ? 'selected' : ''}>Open</option><option value="in_progress" ${i.status === 'in_progress' ? 'selected' : ''}>In progress</option><option value="resolved" ${i.status === 'resolved' ? 'selected' : ''}>Resolved</option></select></label>
  <label class="f"><span>Reply to the college</span><textarea name="reply" maxlength="2000">${i.staff_reply || ''}</textarea></label>${mfoot('Save')}</form>`, { wide: true }); };
forms.issueReply = async f => { await api('/api/staff/issues/' + f.dataset.id, 'POST', fd(f)); f.closest('.overlay').close(); toast('Updated'); refresh(); };

// ---------- announcements ----------
async function pgNotices(el) {
  const list = await api('/api/announcements'); window.__ann = list;
  const aud = { all: 'Everyone (public)', colleges: 'Colleges', officers: 'Village officers' };
  show(el, html`${pageHead('Announcements', 'Post notices for colleges, village officers, or the public home page.', html`<button class="btn primary" data-act="addNotice">${icon('plus')} New announcement</button>`, 'Operations')}
    ${list.length ? html`<div class="stack-s">${list.map(a => html`<div class="notice ${a.pinned ? 'pinned' : ''}"><div class="row between"><h3>${a.pinned ? html`${icon('pin')} ` : ''}${a.title}</h3><div class="row gap-s">${badge(aud[a.audience], 'info')}${a.expired ? badge('expired', 'grey') : ''}</div></div>${a.body ? html`<p>${a.body}</p>` : ''}
      <div class="when">${fdt(a.created_at)} · ${a.created_by}${a.expires_on ? ` · until ${fdate(a.expires_on)}` : ''}</div><div class="row gap-s" style="margin-top:8px">${rowBtn('editNotice', 'Edit', 'edit', `data-id="${a.id}"`)}${rowBtn('delNotice', 'Delete', 'trash', `data-id="${a.id}"`, 'danger')}</div></div>`)}</div>` : empty('No announcements yet', '', 'megaphone')}`);
}
const noticeForm = a => html`<form data-form="notice" data-id="${a?.id || ''}" class="stack-s"><label class="f"><span>Title *</span><input type="text" name="title" value="${a?.title || ''}" required maxlength="140"></label><label class="f"><span>Message</span><textarea name="body" rows="5" maxlength="2000">${a?.body || ''}</textarea></label>
  <div class="formgrid"><label class="f"><span>Who sees it</span><select name="audience"><option value="all" ${a?.audience === 'all' ? 'selected' : ''}>Everyone (public home page too)</option><option value="colleges" ${a?.audience === 'colleges' ? 'selected' : ''}>Colleges only</option><option value="officers" ${a?.audience === 'officers' ? 'selected' : ''}>Village officers only</option></select></label>
  <label class="f"><span>Show until (optional)</span><input type="date" name="expires_on" value="${a?.expires_on || ''}"></label></div><label class="chk"><input type="checkbox" name="pinned" ${a?.pinned ? 'checked' : ''}> Pin to the top</label>${mfoot(a ? 'Save' : 'Publish')}</form>`;
actions.addNotice = () => modal(html`<h2>New announcement</h2>${noticeForm()}`, { wide: true });
actions.editNotice = el => modal(html`<h2>Edit announcement</h2>${noticeForm(window.__ann.find(a => a.id === Number(el.dataset.id)))}`, { wide: true });
forms.notice = async f => { const id = f.dataset.id, v = fd(f); await api(id ? '/api/staff/announcements/' + id : '/api/staff/announcements', id ? 'PUT' : 'POST', { ...v, pinned: !!v.pinned }); f.closest('.overlay').close(); toast(id ? 'Saved' : 'Published'); refresh(); };
actions.delNotice = async el => { if (!await confirmBox('Delete this announcement?', 'Delete', true)) return; await api('/api/staff/announcements/' + el.dataset.id, 'DELETE'); refresh(); };

// ---------- resources ----------
async function pgResources(el) {
  const list = await api('/api/resources'); window.__res = list;
  const aud = { public: 'Public', colleges: 'Colleges', officers: 'Village officers', staff: 'Staff only' };
  show(el, html`${pageHead('Resource centre', 'Share manuals, forms and guides with colleges, officers or everyone.', html`<button class="btn primary" data-act="addRes">${icon('plus')} Add resource</button>`, 'Operations')}
    ${list.length ? html`<div class="card pad0">${tbl(['Title', 'Category', 'Visible to', 'Type', 'Added', ''], list.map(r => html`<tr><td><b>${r.title}</b><div class="small muted">${r.description || ''}</div></td><td>${r.category}</td><td>${badge(aud[r.audience], r.audience === 'public' ? 'ok' : 'info')}</td>
      <td>${r.kind === 'link' ? html`${icon('link')} Link` : html`${icon('file')} ${r.filename}${r.size ? html` <span class="xs muted">${Math.round(r.size / 1024)} KB</span>` : ''}`}</td><td class="small">${fdt(r.created_at)}</td>
      <td><div class="row gap-s nowrap">${r.kind === 'link' ? html`<a class="btn sm secondary" href="${r.url}" target="_blank" rel="noopener">${icon('external')} Open</a>` : html`<a class="btn sm secondary" href="/api/resources/${r.id}/download">${icon('download')} Download</a>`}${rowBtn('editRes', 'Edit', 'edit', `data-id="${r.id}"`)}${rowBtn('delRes', '', 'trash', `data-id="${r.id}" aria-label="Delete ${esc(r.title)}"`, 'danger')}</div></td></tr>`))}</div>` : empty('Nothing shared yet', 'Add manuals, circulars and forms here.', 'book')}`);
}
const CATS = ['Manual', 'Form', 'Circular', 'Template', 'Training', 'General'];
actions.addRes = () => modal(html`<h2>Add resource</h2><form data-form="res" class="stack-s"><label class="f"><span>Title *</span><input type="text" name="title" required maxlength="140"></label><label class="f"><span>Description</span><input type="text" name="description" maxlength="500"></label>
  <div class="formgrid"><label class="f"><span>Category</span><select name="category">${CATS.map(c => html`<option>${c}</option>`)}</select></label><label class="f"><span>Visible to</span><select name="audience"><option value="colleges">Colleges</option><option value="officers">Village officers</option><option value="public">Everyone (public)</option><option value="staff">Staff only</option></select></label></div>
  <div class="seg" role="radiogroup" aria-label="Type"><label><input type="radio" name="kind" value="file" checked><span class="na">${icon('upload')} Upload a file</span></label><label><input type="radio" name="kind" value="link"><span class="na">${icon('link')} Link</span></label></div>
  <label class="f" id="rf"><span>File (PDF, Word, Excel, PowerPoint, image, ZIP · up to 5 MB)</span><input type="file" name="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp,.zip"></label>
  <label class="f hide" id="rl"><span>Link (https://…)</span><input type="url" name="url" placeholder="https://"></label>${mfoot('Add resource')}</form>`, { wide: true });
document.addEventListener('change', e => { if (e.target.name === 'kind') { const link = e.target.value === 'link'; $('#rf')?.classList.toggle('hide', link); $('#rl')?.classList.toggle('hide', !link); } });
forms.res = async f => {
  const v = fd(f), body = { title: v.title, description: v.description, category: v.category, audience: v.audience, kind: v.kind };
  if (v.kind === 'link') body.url = v.url;
  else {
    const file = $('input[type=file]', f).files[0]; if (!file) throw new Error('Choose a file to upload'); if (file.size > 5 * 1024 * 1024) throw new Error('Files can be up to 5 MB');
    body.filename = file.name; body.mime = file.type; body.data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Could not read the file')); r.readAsDataURL(file); });
  }
  await api('/api/staff/resources', 'POST', body); f.closest('.overlay').close(); toast('Added'); refresh();
};
actions.editRes = el => { const r = window.__res.find(x => x.id === Number(el.dataset.id));
  modal(html`<h2>Edit resource</h2><form data-form="resEdit" data-id="${r.id}" class="stack-s"><label class="f"><span>Title *</span><input type="text" name="title" value="${r.title}" required maxlength="140"></label><label class="f"><span>Description</span><input type="text" name="description" value="${r.description || ''}" maxlength="500"></label>
  <div class="formgrid"><label class="f"><span>Category</span><select name="category">${[...new Set([...CATS, r.category])].map(c => html`<option ${c === r.category ? 'selected' : ''}>${c}</option>`)}</select></label>
  <label class="f"><span>Visible to</span><select name="audience">${[['colleges', 'Colleges'], ['officers', 'Village officers'], ['public', 'Everyone (public)'], ['staff', 'Staff only']].map(([k, l]) => html`<option value="${k}" ${r.audience === k ? 'selected' : ''}>${l}</option>`)}</select></label></div>${mfoot('Save')}</form>`); };
forms.resEdit = async f => { await api('/api/staff/resources/' + f.dataset.id, 'PUT', fd(f)); f.closest('.overlay').close(); toast('Saved'); refresh(); };
actions.delRes = async el => { if (!await confirmBox('Delete this resource? Anyone who had access loses it.', 'Delete', true)) return; await api('/api/staff/resources/' + el.dataset.id, 'DELETE'); refresh(); };

// ---------- reports & exports ----------
const RF = { daily: ['college', 'taluk', 'village', 'lsgi', 'dates', 'attendance', 'verified', 'ack', 'q'], students: ['college', 'taluk', 'village', 'dates', 'q'], colleges: ['college', 'taluk', 'dates', 'q'],
  villages: ['college', 'taluk', 'village', 'lsgi', 'dates', 'ack', 'q'], allotments: ['college', 'taluk', 'village', 'lsgi', 'ack', 'q'], issues: ['college', 'status', 'dates', 'q'], performance: ['college', 'kind', 'q'], enrol_inst: ['college', 'kind', 'q'], desk_inst: ['college', 'kind', 'dates', 'q'], desk: ['college', 'kind', 'dates', 'q'], activities: ['college', 'kind', 'dates', 'q'], activity_summary: ['college', 'kind', 'dates'], enrol_dept: ['college', 'kind', 'q'], enrol: ['college', 'kind', 'q'] };
let REP = { type: 'performance', filters: {}, sort: '', dir: 'asc', cols: null }, OPTS = null;
async function pgReports(el) {
  OPTS ||= await api('/api/staff/report-options');
  show(el, html`${pageHead('Reports & exports', 'Choose a report, narrow it with filters, sort it, pick the columns, then download as CSV (opens in Excel) or print.', '', 'Insights')}
    <div class="tabs" role="tablist" aria-label="Report" style="margin-bottom:14px">${OPTS.datasets.filter(d => feat('staff', 'villages') || !['daily', 'students', 'colleges', 'villages', 'allotments'].includes(d.key)).map(d => html`<button class="tab" role="tab" aria-selected="${REP.type === d.key}" data-act="repType" data-k="${d.key}">${d.title}</button>`)}</div>
    <div class="card pad0"><form class="filterbar" id="rfilters" data-form="repApply">${repFilters()}<button class="btn primary" type="submit">${icon('filter')} Apply</button><button class="btn ghost" type="button" data-act="repClear">Clear</button></form>
      <div class="row between" style="padding:12px 16px;border-bottom:1px solid var(--line)"><div id="repcount" class="small muted">Loading…</div><div class="row gap-s"><div class="dropdown"><button class="btn secondary sm" data-act="dropdown" aria-haspopup="true" aria-expanded="false">${icon('list')} Columns</button><div class="menu" id="colmenu" style="min-width:260px;max-height:320px;overflow:auto"></div></div>
        <button class="btn secondary sm" data-act="repPrint">${icon('printer')} Print</button><button class="btn primary sm" data-act="repCsv">${icon('download')} Download CSV</button></div></div><div id="repbody"></div></div>`);
  await loadReport();
}
function repFilters() {
  const f = REP.filters, want = RF[REP.type], sel = (k, label, opts, all = 'All') => html`<label class="f"><span>${label}</span><select name="${k}"><option value="">${all}</option>${opts.map(([v, l]) => html`<option value="${v}" ${String(f[k]) === String(v) ? 'selected' : ''}>${l}</option>`)}</select></label>`;
  return html`${want.includes('college') ? sel('college', 'College', OPTS.colleges.map(c => [c.id, c.name])) : ''}${want.includes('taluk') ? sel('taluk', 'Taluk', OPTS.taluks.map(t => [t, t])) : ''}${want.includes('village') ? sel('village', 'Village', OPTS.villages.map(v => [v.id, v.name])) : ''}
    ${want.includes('lsgi') ? html`<label class="f"><span>LSGI contains</span><input type="text" name="lsgi" value="${f.lsgi || ''}" placeholder="e.g. Chelannur"></label>` : ''}
    ${want.includes('dates') ? html`<label class="f"><span>From</span><input type="date" name="from" value="${f.from || ''}"></label><label class="f"><span>To</span><input type="date" name="to" value="${f.to || ''}"></label>` : ''}
    ${want.includes('attendance') ? sel('attendance', 'Attendance', [['present', 'Present'], ['absent', 'Absent'], ['not_marked', 'Not marked']]) : ''}${want.includes('verified') ? sel('verified', 'Officer check', [['yes', 'Verified'], ['no', 'Disputed'], ['pending', 'Not verified']]) : ''}
    ${want.includes('ack') ? sel('ack', 'Certification', [['acknowledged', 'Certified'], ['submitted', 'Awaiting officer'], ['none', 'In progress']]) : ''}${want.includes('status') ? sel('status', 'Status', [['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved']]) : ''}
    ${want.includes('kind') ? sel('kind', 'Type', [['college', 'Colleges'], ['school', 'Schools']]) : ''}${want.includes('q') ? html`<label class="f"><span>Search</span><input type="search" name="q" value="${f.q || ''}" placeholder="Any text"></label>` : ''}`;
}
const repQuery = (extra = {}) => { const p = new URLSearchParams(); Object.entries(REP.filters).forEach(([k, v]) => { if (v) p.set(k, v); }); if (REP.sort) { p.set('sort', REP.sort); p.set('dir', REP.dir); } if (REP.cols) p.set('cols', REP.cols.join(',')); Object.entries(extra).forEach(([k, v]) => p.set(k, v)); return p.toString(); };
async function loadReport() {
  const r = await api(`/api/staff/reports/${REP.type}?${repQuery()}`); window.__rep = r;
  REP.cols ||= r.cols.map(c => c.key);
  const shown = r.cols.filter(c => REP.cols.includes(c.key));
  show($('#colmenu'), html`${r.cols.map(c => html`<label class="chk" style="padding:6px 10px"><input type="checkbox" data-col="${c.key}" ${REP.cols.includes(c.key) ? 'checked' : ''}> ${c.label}</label>`)}`);
  $('#repcount').textContent = `${n(r.total)} row${r.total === 1 ? '' : 's'}${r.total > r.rows.length ? ` (showing the first ${n(r.rows.length)}: download for all)` : ''}`;
  show($('#repbody'), r.rows.length ? html`<div class="tablewrap" style="border:0;max-height:62vh"><table><caption class="sr">${r.title}</caption><thead><tr>${shown.map(c => html`<th class="sortable ${c.num ? 'num' : ''}" tabindex="0" data-act="repSort" data-k="${c.key}" aria-sort="${REP.sort === c.key ? (REP.dir === 'asc' ? 'ascending' : 'descending') : 'none'}">${c.label} ${REP.sort === c.key ? (REP.dir === 'asc' ? '▲' : '▼') : ''}</th>`)}</tr></thead>
    <tbody>${r.rows.map(row => html`<tr>${shown.map(c => html`<td class="${c.num ? 'num' : ''}">${row[c.key] ?? ''}</td>`)}</tr>`)}</tbody></table></div>` : html`<div style="padding:20px">${empty('No rows match these filters', 'Try clearing a filter.', 'search')}</div>`);
}
document.addEventListener('change', e => { const c = e.target.dataset?.col; if (!c) return; const set = new Set(REP.cols); e.target.checked ? set.add(c) : set.delete(c); if (!set.size) { e.target.checked = true; return; } REP.cols = window.__rep.cols.map(x => x.key).filter(k => set.has(k)); loadReport(); });
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('th[data-act=repSort]')) { e.preventDefault(); e.target.click(); } });
actions.repType = el => { REP = { type: el.dataset.k, filters: {}, sort: '', dir: 'asc', cols: null }; pgReports($('#pg')); };
forms.repApply = async f => { REP.filters = Object.fromEntries(Object.entries(fd(f)).filter(([, v]) => v)); await loadReport(); };
actions.repClear = () => { REP.filters = {}; pgReports($('#pg')); };
actions.repSort = el => { const k = el.dataset.k; REP.dir = REP.sort === k && REP.dir === 'asc' ? 'desc' : 'asc'; REP.sort = k; loadReport(); };
actions.repCsv = () => { const a = document.createElement('a'); a.href = `/api/staff/reports/${REP.type}?${repQuery({ format: 'csv' })}`; document.body.append(a); a.click(); a.remove(); };
actions.seedOfficers = async () => { if (!await confirmBox('Create a placeholder village officer for every village that has none? You can rename them later.', 'Create')) return; const r = await api('/api/staff/officers/seed', 'POST'); toast(`${r.created} village officers created`); refresh(); };

// A4 print-out: header with logos, applied filters, table with repeating headings, footer with page numbers
const FLABEL = { college: 'College', taluk: 'Taluk', village: 'Village', lsgi: 'LSGI', from: 'From', to: 'To', attendance: 'Attendance', verified: 'Officer check', ack: 'Certification', status: 'Status', q: 'Search' };
const VALUE_LABEL = { present: 'Present', absent: 'Absent', not_marked: 'Not marked', yes: 'Verified', no: 'Disputed', pending: 'Not verified', acknowledged: 'Certified', submitted: 'Awaiting officer', none: 'In progress', open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };
function filterSummary() {
  return Object.entries(REP.filters).filter(([, v]) => v).map(([k, v]) => {
    let val = VALUE_LABEL[v] || v;
    if (k === 'college') val = OPTS.colleges.find(c => String(c.id) === String(v))?.name || v;
    if (k === 'village') val = OPTS.villages.find(x => String(x.id) === String(v))?.name || v;
    if (/^\d{4}-\d\d-\d\d$/.test(v)) val = v.split('-').reverse().join('-');
    return [FLABEL[k] || k, val];
  });
}
actions.repPrint = () => {
  const r = window.__rep; if (!r) return;
  const cols = r.cols.filter(c => REP.cols.includes(c.key)), fl = filterSummary(), now = new Date();
  const stamp = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const by = SU?.user?.name || SU?.user?.username || 'Staff';
  const sorted = REP.sort ? (r.cols.find(c => c.key === REP.sort)?.label || '') + (REP.dir === 'desc' ? ' (descending)' : ' (ascending)') : '';
  let doc = document.getElementById('printdoc'); if (doc) doc.remove();
  doc = document.createElement('div'); doc.id = 'printdoc'; doc.className = 'printdoc';
  doc.innerHTML = html`<table class="pd"><thead><tr><td colspan="${cols.length}">
      <div class="pd-head"><div class="pd-logos"><img src="/img/district.png" alt=""><img src="/img/sweep-dark.webp" alt=""></div>
        <div class="pd-title"><div class="pd-org">District Administration, Kozhikode · SWEEP</div><h1>Electoral Literacy Clubs: ${r.title}</h1></div></div>
      <div class="pd-meta"><div><b>Filters applied:</b> ${fl.length ? fl.map(([k, v]) => html`<span class="pd-chip">${k}: <b>${v}</b></span>`) : 'None (all records)'}</div>
        <div><b>Records:</b> ${n(r.total)}${r.total > r.rows.length ? ` (first ${n(r.rows.length)} shown)` : ''}${sorted ? html` &nbsp;·&nbsp; <b>Sorted by:</b> ${sorted}` : ''} &nbsp;·&nbsp; <b>Generated:</b> ${stamp} by ${by}</div></div>
    </td></tr><tr class="pd-th">${cols.map(c => html`<th class="${c.num ? 'num' : ''}">${c.label}</th>`)}</tr></thead>
    <tbody>${r.rows.map((row, i) => html`<tr>${cols.map(c => html`<td class="${c.num ? 'num' : ''}">${row[c.key] ?? ''}</td>`)}</tr>`)}</tbody></table>
    <div class="pd-foot">ELC Kozhikode portal · ${r.title} · ${stamp} · Confidential: for official use</div>`.s;
  document.body.append(doc);
  const pg = document.createElement('style'); pg.id = 'printpage';
  pg.textContent = '@page{size:A4 ' + (cols.length > 6 ? 'landscape' : 'portrait') + ';margin:14mm 12mm 16mm;@bottom-right{content:"Page " counter(page) " of " counter(pages);font:9pt Inter,Arial,sans-serif;color:#555}@bottom-left{content:"ELC Kozhikode · ' + r.title.replace(/["\\]/g, '') + '";font:9pt Inter,Arial,sans-serif;color:#555}}';
  document.head.append(pg);
  document.body.classList.add('pr');
  const done = () => { document.body.classList.remove('pr'); doc.remove(); pg.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 150);
};

// ---------- team ----------
async function pgTeam(el) {
  const [team, colleges, villages] = await Promise.all([api('/api/staff/team'), api('/api/staff/colleges'), api('/api/staff/villages')]); window.__team = team; window.__cl = colleges; window.__vl = villages;
  show(el, html`${pageHead('Team', 'Super admin: everything. Admin: all college, village, officer and report work. Intern: only the colleges and villages you assign.', html`<button class="btn primary" data-act="addStaff">${icon('plus')} Add staff</button>`, 'Administration')}
    <div class="card pad0">${tbl(['Name', 'Username', 'Role', 'Scope', 'Last sign-in', 'Status', ''], team.map(u => html`<tr><td><b>${u.name}</b><div class="small muted">${u.email || ''}</div></td><td>${u.username}</td><td>${badge(ROLE[u.role], u.role === 'super_admin' ? 'solid' : u.role === 'admin' ? 'info' : 'saffron')}</td>
      <td class="small">${u.role === 'intern' ? `${u.colleges.length} colleges · ${u.villages.length} villages` : 'Everything'}</td><td>${fdt(u.last_login_at)}</td><td>${u.active ? badge('active', 'ok') : badge('off', 'grey')}</td><td><div class="row gap-s nowrap">${rowBtn('editStaff', 'Edit', 'edit', `data-id="${u.id}"`)}${rowBtn('shareStaff', 'Share login', 'key', `data-id="${u.id}" title="Set a new password and get a copy-ready login message"`, 'primary')}</div></td></tr>`))}</div>`);
}
const checkList = (name, items, sel, ph) => html`<input type="search" class="cl-q" data-for="${name}" placeholder="${ph}" style="margin-bottom:6px"><div style="max-height:190px;overflow:auto;border:1px solid var(--line-2);border-radius:var(--r-sm);padding:6px 12px">${items.map(i => html`<label class="chk cl-${name}" style="padding:3px 0"><input type="checkbox" name="${name}" value="${i.id}" ${sel.includes(i.id) ? 'checked' : ''}> ${i.name}</label>`)}</div>`;
function staffForm(u) {
  return html`<form data-form="staff" data-id="${u?.id || ''}" class="stack-s"><div class="formgrid"><label class="f"><span>Full name *</span><input type="text" name="name" value="${u?.name || ''}" required></label><label class="f"><span>Username *</span><input type="text" name="username" value="${u?.username || ''}" ${u ? 'disabled' : 'required'} autocapitalize="none"></label>
    <label class="f"><span>Email</span><input type="email" name="email" value="${u?.email || ''}"></label><label class="f"><span>Role *</span><select name="role" id="role">${Object.entries(ROLE).map(([k, l]) => html`<option value="${k}" ${u?.role === k ? 'selected' : ''}>${l}</option>`)}</select></label></div>
    <label class="f"><span>${u ? 'New password (leave blank to keep)' : 'Password * (generated for you; change if you like)'}</span><div class="row nowrap"><input type="${u ? 'password' : 'text'}" name="password" minlength="8" value="${u ? '' : newPassword()}" ${u ? '' : 'required'} autocomplete="new-password" style="flex:1"><button type="button" class="btn ghost sm" data-act="genPw" title="Generate another" aria-label="Generate another password">${icon('refresh')}</button><button type="button" class="btn ghost sm" data-act="copyPw" title="Copy password" aria-label="Copy password">${icon('clipboard')}</button></div></label>${u ? html`<label class="chk"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}> Account active</label>` : ''}
    <div id="scope"><div class="alert info">${icon('help')}<div>Interns see and manage only these colleges and villages. They can edit details and handle requests for them, but cannot create or delete colleges or villages.</div></div>
      <div class="formgrid" style="margin-top:10px"><div><b>Colleges</b>${checkList('colleges', window.__cl.map(c => ({ id: c.id, name: c.name })), u?.colleges || [], 'Search colleges…')}</div><div><b>Villages</b>${checkList('villages', window.__vl.map(v => ({ id: v.id, name: `${v.name} (${v.taluk || ''})` })), u?.villages || [], 'Search villages…')}</div></div></div>${mfoot(u ? 'Save' : 'Create account')}</form>`;
}
function wireStaff(m) {
  const r = $('#role', m), sc = $('#scope', m), f = () => sc.classList.toggle('hide', r.value !== 'intern'); r.addEventListener('change', f); f();
  $$('.cl-q', m).forEach(q => q.addEventListener('input', () => { const v = q.value.toLowerCase(); $$('.cl-' + q.dataset.for, m).forEach(l => l.classList.toggle('hide', !l.textContent.toLowerCase().includes(v))); }));
}
actions.addStaff = () => wireStaff(modal(html`<h2>Add staff</h2>${staffForm()}`, { wide: true }));
actions.shareStaff = async el => {
  const u = window.__team.find(x => x.id === Number(el.dataset.id));
  if (!await confirmBox(`Set a NEW password for ${u.name}? Their current password stops working and they are signed out.`, 'Reset and show login')) return;
  const pw = newPassword();
  await api('/api/staff/team/' + u.id, 'PUT', { name: u.name, email: u.email, role: u.role, active: !!u.active, password: pw, colleges: u.colleges, villages: u.villages });
  credsModal(`Login for ${u.name}`, staffCreds(u.name, u.role, u.username, pw)); refresh();
};
actions.genPw = el => { const i = $('input[name=password]', el.closest('form')); i.type = 'text'; i.value = newPassword(); };
actions.copyPw = el => copyText($('input[name=password]', el.closest('form')).value);
actions.editStaff = el => wireStaff(modal(html`<h2>Edit staff</h2>${staffForm(window.__team.find(u => u.id === Number(el.dataset.id)))}`, { wide: true }));
forms.staff = async f => {
  const id = f.dataset.id, v = fd(f), body = { ...v, active: !id || !!v.active, colleges: $$('input[name=colleges]:checked', f).map(x => Number(x.value)), villages: $$('input[name=villages]:checked', f).map(x => Number(x.value)) };
  const sid = id || (await api('/api/staff/team', 'POST', body)).id;
  if (id || body.role === 'intern') await api('/api/staff/team/' + sid, 'PUT', body);
  f.closest('.overlay').close(); toast('Saved'); refresh();
};

// ---------- activity log ----------
let logKind = '';
async function pgLogs(el) {
  const rows = await api('/api/staff/logs' + (logKind ? '?kind=' + logKind : ''));
  show(el, html`${pageHead('Activity log', 'Sign-ins and management actions by staff, colleges and village officers (latest 500).', '', 'Administration')}
    <div class="chips" style="margin-bottom:14px">${[['', 'Everything'], ['signin', 'Sign-ins'], ['manage', 'Actions']].map(([k, l]) => html`<button class="chip ${k === logKind ? 'on' : ''}" data-act="logKind" data-k="${k}">${l}</button>`)}</div>
    ${rows.length ? html`<div class="card pad0">${tbl(['When', 'Who', 'Role', 'Action', 'Detail', 'IP'], rows.map(r => html`<tr><td style="white-space:nowrap">${fdt(r.ts)}</td><td><b>${r.actor || '—'}</b><div class="xs muted">${r.actor_type}</div></td><td>${r.role ? ROLE[r.role] : ''}</td>
      <td>${badge(r.action, r.action === 'login' ? 'ok' : r.action === 'login_failed' ? 'danger' : r.action === 'logout' ? 'grey' : 'info')}</td><td>${r.detail || ''}</td><td class="small">${r.ip || ''}</td></tr>`))}</div>` : empty('No events', '', 'shield')}`);
}
actions.logKind = el => { logKind = el.dataset.k; pgLogs($('#pg')); };

boot();

actions.resetAll = async () => { if (!await confirmBox('Reset EVERY college to the default password? Any password a college set or was given earlier stops working and they are signed out.', 'Reset all', true)) return; const { results } = await api('/api/staff/passcodes/bulk', 'POST', { all: true }); toast(`${results.length} colleges reset to the default password`); refresh(); };
