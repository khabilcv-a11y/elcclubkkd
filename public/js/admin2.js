'use strict';
// ---- staff console: Campus to booth pages (enrolment drive), schools, access control ----

const pgSchools = el => pgColleges(el, 'school');

// ---------- Enrolment drive ----------
let ENKIND = '', ENQ = '';
async function apEnrol(el) {
  const d = await api('/api/staff/enrol' + (ENKIND ? '?kind=' + ENKIND : '')); window.__en = d;
  const t = d.totals;
  show(el, html`${pageHead('Enrolment drive', 'Campus to booth: the target is 100% of eligible students registered. Each college and school enters its own total numbers.', html`<button class="btn secondary" data-act="enReport">${icon('printer')} Report and print</button>`, 'Campus to booth')}
    <div class="card" style="margin-bottom:16px"><b>${t.pct == null ? 'No numbers yet' : t.pct + '% of eligible students registered'}</b><div class="small muted">${n(t.registered)} of ${n(t.eligible)} eligible · ${d.reporting} of ${d.institutions.length} institutions have entered their numbers</div>${progress(t.pct || 0, t.pct >= 100 ? 'green' : 'saffron')}</div>
    <div class="kpis">${kpi('Total students', t.strength, { ic: 'users' })}${kpi('Registered', t.registered, { ic: 'user-check', tone: 'green' })}${kpi('Not eligible yet', t.ineligible, { ic: 'clock' })}${kpi('Balance to cover', t.balance, { ic: 'target', tone: 'saffron' })}</div>
    <div class="card pad0" style="margin-top:16px"><div class="filterbar"><div class="chips">${[['', 'All'], ['college', 'Colleges'], ['school', 'Schools']].map(([k, l]) => html`<button class="chip ${ENKIND === k ? 'on' : ''}" data-act="enKind" data-k="${k}">${l}</button>`)}</div>${searchBox('enq', 'Search institutions…')}</div>
      <div class="tablewrap"><table><caption class="sr">Enrolment by institution</caption><thead><tr><th>Institution</th><th>Type</th><th class="num">Students</th><th class="num">Registered</th><th class="num">Not eligible yet</th><th class="num">Balance</th><th style="min-width:150px">Covered</th><th>Updated</th></tr></thead><tbody>
      ${d.institutions.map(i => html`<tr class="enrow-i" data-q="${i.name.toLowerCase()}"><td><div class="nmav">${avatar(i.id, i.logo_v, i.name, 32)}<span><b>${i.name}</b><div class="xs muted">${i.coordinator || ''}${i.phone ? ' · ' + i.phone : ''}</div></span></div></td><td>${badge(i.kind === 'school' ? 'School' : 'College', i.kind === 'school' ? 'info' : '')}</td>
        <td class="num">${n(i.totals.strength)}</td><td class="num">${n(i.totals.registered)}</td><td class="num">${n(i.totals.ineligible)}</td><td class="num"><b>${n(i.totals.balance)}</b></td>
        <td>${i.totals.pct == null ? html`<span class="muted small">not entered</span>` : html`<div class="row nowrap" style="gap:8px"><div style="flex:1;min-width:80px">${progress(i.totals.pct, i.totals.pct >= 100 ? 'green' : 'saffron')}</div><b class="small">${i.totals.pct}%</b></div>`}</td><td class="small">${i.updated_at ? fdate(i.updated_at.slice(0, 10)) : '—'}</td></tr>`)}
      <tr class="total"><td colspan="2"><b>Total</b></td><td class="num"><b>${n(t.strength)}</b></td><td class="num"><b>${n(t.registered)}</b></td><td class="num"><b>${n(t.ineligible)}</b></td><td class="num"><b>${n(t.balance)}</b></td><td colspan="2"><b>${pct(t.pct)}</b></td></tr></tbody></table></div></div>`);
  const apply = () => { const v = ($('#enq').value || '').toLowerCase(); ENQ = v; $$('.enrow-i').forEach(r => r.classList.toggle('hide', !!v && !r.dataset.q.includes(v))); };
  $('#enq').value = ENQ; $('#enq').addEventListener('input', apply); apply();
}
actions.enKind = el => { ENKIND = el.dataset.k; apEnrol($('#pg')); };
actions.enReport = () => { REP = { type: 'enrol_inst', filters: {}, sort: '', dir: 'asc', cols: null }; location.hash = '#/reports'; };

// ---------- Access control (super admin) ----------
async function apFeatures(el) {
  const groups = await api('/api/staff/features');
  show(el, html`${pageHead('Access control', 'Switch sections on or off for each kind of user. A switched-off section disappears from the menu and its actions stop working. Changes apply the next time someone opens or refreshes the page.', '', 'Administration')}
    <div class="grid g2">${groups.map(g => html`<div class="card"><div class="card-head"><h3>${g.title}</h3></div><div class="switches">${g.items.map(i => html`<label class="fswitch"><span>${i.label}</span><input type="checkbox" role="switch" data-act="toggleFeat" data-k="${g.audience}.${i.id}" ${i.enabled ? 'checked' : ''}><i aria-hidden="true"></i></label>`)}</div></div>`)}</div>`);
}
document.addEventListener('change', async e => {
  const el = e.target.closest?.('[data-act=toggleFeat]'); if (!el) return;
  try { await api('/api/staff/features', 'PUT', { key: el.dataset.k, enabled: el.checked }); toast(el.checked ? 'Switched on' : 'Switched off'); await loadFeatures(); }
  catch (err) { el.checked = !el.checked; toast(err.message, true); }
});

// ---------- Help desk daily reports (district view) ----------
let DKKIND = '';
async function apDesk(el) {
  const r = await api('/api/staff/reports/desk_inst' + (DKKIND ? '?kind=' + DKKIND : '')), rows = r.rows;
  const tot = rows.reduce((t, x) => ({ regs: t.regs + x.registrations, days: t.days + x.days, vols: t.vols + x.volunteers, acts: t.acts + x.activity, rep: t.rep + (x.days ? 1 : 0) }), { regs: 0, days: 0, vols: 0, acts: 0, rep: 0 });
  show(el, html`${pageHead('Help desk daily reports', 'Registrations made and volunteers present at the help desks, reported each day by colleges and schools.', html`<button class="btn secondary" data-act="deskRep" data-t="desk">${icon('printer')} Day by day</button><button class="btn secondary" data-act="deskRep" data-t="activities">Other activities</button><button class="btn secondary" data-act="deskRep" data-t="activity_summary">Activities summary</button>`, 'Campus to booth')}
    <div class="kpis">${kpi('Registrations at help desks', tot.regs, { ic: 'user-check', tone: 'green' })}${kpi('Institutions reporting', tot.rep + ' of ' + rows.length, { ic: 'building', count: false })}${kpi('Volunteer-days at help desks', tot.vols, { ic: 'users', tone: 'saffron' })}${kpi('Volunteer-days in other activities', tot.acts, { ic: 'megaphone' })}</div>
    <div class="card pad0" style="margin-top:16px"><div class="filterbar"><div class="chips">${[['', 'All'], ['college', 'Colleges'], ['school', 'Schools']].map(([k, l]) => html`<button class="chip ${DKKIND === k ? 'on' : ''}" data-act="dkKind" data-k="${k}">${l}</button>`)}</div></div>
      <div class="tablewrap"><table><caption class="sr">Help desk totals</caption><thead><tr><th>Institution</th><th>Type</th><th class="num">Days reported</th><th class="num">Registrations</th><th class="num">Per day</th><th class="num">Volunteer-days</th><th class="num">Other activities</th><th>Last report</th></tr></thead><tbody>
      ${rows.map(x => html`<tr><td><b>${x.college}</b></td><td>${badge(x.type, x.type === 'School' ? 'info' : '')}</td><td class="num">${x.days}</td><td class="num"><b>${n(x.registrations)}</b></td><td class="num">${x.avg ?? '—'}</td><td class="num">${n(x.volunteers)}</td><td class="num">${x.activity}</td><td>${x.last ? fdate(x.last) : html`<span class="muted small">no report yet</span>`}</td></tr>`)}</tbody></table></div></div>`);
}
actions.dkKind = el => { DKKIND = el.dataset.k; apDesk($('#pg')); };
actions.deskRep = el => { REP = { type: el.dataset.t, filters: {}, sort: '', dir: 'asc', cols: null }; location.hash = '#/reports'; };

// ---------- Gallery moderation ----------
async function apGallery(el) {
  const items = await api('/api/staff/gallery'); window.__gal = items;
  show(el, html`${pageHead('Gallery', 'Photos made by colleges and schools. Hide a photo to take it off the public home page, or delete it.', '', 'Campus to booth')}
    ${items.length ? html`<div class="galgrid">${items.map(g => html`<article class="galcard ${g.visible ? '' : 'dim'}"><img src="/api/staff/gallery/${g.id}/image" alt="${g.title}" loading="lazy"><div class="galbody"><h3>${g.title}</h3><div class="small muted"><b>${g.college}</b> · ${g.activity} · ${fdate(g.event_date)}</div>${g.description ? html`<p class="small">${g.description}</p>` : ''}
      <div class="row gap-s" style="margin-top:10px">${isOps() ? html`<button class="btn sm secondary" data-act="galVis" data-id="${g.id}" data-v="${g.visible ? 0 : 1}">${g.visible ? 'Hide from home page' : 'Show on home page'}</button><button class="btn sm danger" data-act="galDel" data-id="${g.id}" aria-label="Delete ${g.title}">${icon('trash')}</button>` : ''}${g.visible ? badge('Public', 'ok') : badge('Hidden', 'grey')}</div></div></article>`)}</div>` : html`<div class="card">${empty('No photos yet', 'Photos appear here once colleges and schools save framed photos to their galleries.', 'image')}</div>`}`);
}
actions.galVis = async el => { await api(`/api/staff/gallery/${el.dataset.id}/visible`, 'POST', { visible: el.dataset.v === '1' }); apGallery($('#pg')); };
actions.galDel = async el => { if (!await confirmBox('Delete this photo for good?', 'Delete', true)) return; await api('/api/staff/gallery/' + el.dataset.id, 'DELETE'); toast('Deleted'); apGallery($('#pg')); };

// ---------- Dashboard: total coverage, and every college's input and performance ----------
let DBKIND = '', DBSORT = 'low';
const DBSORTS = { low: 'Needs attention first', high: 'Highest coverage', desk: 'Most help desk registrations', vols: 'Most volunteer-days', name: 'Name' };
const sortInst = list => [...list].sort((a, b) => {
  if (DBSORT === 'name') return a.name.localeCompare(b.name);
  if (DBSORT === 'high') return (b.pct ?? -1) - (a.pct ?? -1) || b.registered - a.registered;
  if (DBSORT === 'desk') return b.desk_regs - a.desk_regs;
  if (DBSORT === 'vols') return b.desk_vols - a.desk_vols;
  const rank = x => (x.status === 'new' ? 0 : x.status === 'quiet' ? 1 : 2);
  return rank(a) - rank(b) || (a.pct ?? -1) - (b.pct ?? -1) || a.name.localeCompare(b.name);
});
const stBadge = s => (s === 'active' ? badge('Active', 'ok') : s === 'quiet' ? badge('Quiet', 'warn') : badge('Not started', 'grey'));
async function apDashboard(el) {
  const d = await api('/api/staff/campus' + (DBKIND ? '?kind=' + DBKIND : '')); window.__cd = d;
  const t = d.totals, list = sortInst(d.institutions), attn = d.institutions.filter(i => i.status !== 'active'), mx = Math.max(1, ...d.trend.map(x => x.registered));
  show(el, html`${pageHead(`Welcome, ${SU.user.name}`, isIntern() ? `You are viewing the ${SU.scope.colleges.length} college(s) and school(s) assigned to you.` : 'Campus to booth: coverage, input and performance of every college and school.', html`<button class="btn secondary" data-act="deskRep" data-t="performance">${icon('printer')} Performance report</button>`, ROLE[SU.user.role])}
    <div class="card campus-top rv"><div class="row between" style="align-items:flex-end;gap:16px"><div><div class="campus-big">${t.pct == null ? '—' : t.pct + '%'}</div><div class="muted">total coverage: eligible students registered across ${n(t.institutions)} colleges and schools</div></div>
      <div class="campus-facts"><div><b>${n(t.registered)}</b><span>registered</span></div><div><b>${n(t.eligible)}</b><span>eligible</span></div><div><b>${n(t.balance)}</b><span>still to cover</span></div><div><b>${n(t.ineligible)}</b><span>under 17</span></div><div><b>${t.reporting}/${t.institutions}</b><span>reported numbers</span></div></div></div>${progress(t.pct || 0, t.pct >= 100 ? 'green' : 'saffron')}</div>
    <div class="kpis" style="margin-top:16px">${kpi('Registrations at help desks', t.desk_regs, { ic: 'user-check', tone: 'green' })}${kpi('Volunteer-days at help desks', t.desk_vols, { ic: 'users', tone: 'saffron', sub: '1 volunteer present for 1 day = 1 volunteer-day' })}${kpi('Volunteer-days in other activities', t.activity, { ic: 'megaphone', sub: 'Flash mobs, class campaigns, game zones' })}
      ${kpi('Active this week', `${t.active}/${t.institutions}`, { ic: 'building', tone: 'info', count: false })}${kpi('Photos shared', t.photos, { ic: 'camera' })}</div>
    <div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-head"><h3>${icon('alert')} Needs attention</h3><span class="small muted">${attn.length} of ${t.institutions}</span></div>
        ${attn.length ? html`<p class="small muted" style="margin-bottom:8px">${attn.filter(i => i.status === 'new').length} not started · ${attn.filter(i => i.status === 'quiet').length} quiet this week</p><div class="pillrow">${sortInst(attn).slice(0, 14).map(i => html`<span class="badge ${i.status === 'new' ? 'grey' : 'warn'}">${i.short_name || i.name}</span>`)}${attn.length > 14 ? html`<span class="muted small">+${attn.length - 14} more in the table below</span>` : ''}</div>` : html`<p class="muted">Every institution has been active this week.</p>`}</div>
      <div class="card"><div class="card-head"><h3>Help desk registrations per day</h3></div>${d.trend.length ? html`<div class="chart" role="img" aria-label="Help desk registrations per day">${d.trend.map(x => html`<div class="col" tabindex="0" data-tip="${fdate(x.date)}: ${x.registered} registrations"><i data-h="${Math.round(x.registered * 100 / mx)}" style="height:${Math.round(x.registered * 100 / mx)}%"></i></div>`)}</div>` : html`<p class="muted">The first daily report will draw this chart.</p>`}</div></div>
    <div class="card pad0" style="margin-top:16px"><div class="card-head pad"><h3>Coverage, input and performance by college and school</h3></div>
      <div class="filterbar"><div class="chips">${[['', 'All'], ['college', 'Colleges'], ['school', 'Schools']].map(([k, l]) => html`<button class="chip ${DBKIND === k ? 'on' : ''}" data-act="dbKind" data-k="${k}">${l}</button>`)}</div><div class="chips">${Object.entries(DBSORTS).map(([k, l]) => html`<button class="chip ${DBSORT === k ? 'on' : ''}" data-act="dbSort" data-k="${k}">${l}</button>`)}</div></div>
      <div class="tablewrap"><table><caption class="sr">Coverage, input and performance</caption><thead><tr><th>Institution</th><th style="min-width:150px">Coverage</th><th class="num">Registered</th><th class="num">Eligible</th><th class="num">Balance</th><th class="num">Help desk regs</th><th class="num">Volunteer-days</th><th class="num">Other activities</th><th class="num">Photos</th><th>Last active</th><th>Status</th></tr></thead><tbody>
      ${list.map(i => html`<tr><td><div class="nmav">${avatar(i.id, i.logo_v, i.name, 32)}<span><b>${i.name}</b><div class="xs muted">${i.kind === 'school' ? 'School' : 'College'}${i.coordinator ? ' · ' + i.coordinator : ''}${i.phone ? ' · ' + i.phone : ''}</div></span></div></td>
        <td>${i.pct == null ? html`<span class="muted small">no numbers yet</span>` : html`<div class="row nowrap" style="gap:8px"><div style="flex:1;min-width:80px">${progress(i.pct, i.pct >= 100 ? 'green' : 'saffron')}</div><b class="small">${i.pct}%</b></div>`}</td>
        <td class="num">${n(i.registered)}</td><td class="num">${n(i.eligible)}</td><td class="num"><b>${n(i.balance)}</b></td><td class="num">${n(i.desk_regs)}</td><td class="num">${n(i.desk_vols)}</td><td class="num">${n(i.activity)}</td><td class="num">${n(i.photos)}</td><td>${i.last_active ? fdate(i.last_active) : '—'}</td><td>${stBadge(i.status)}</td></tr>`)}
      <tr class="total"><td><b>Total</b></td><td><b>${pct(t.pct)}</b></td><td class="num"><b>${n(t.registered)}</b></td><td class="num"><b>${n(t.eligible)}</b></td><td class="num"><b>${n(t.balance)}</b></td><td class="num"><b>${n(t.desk_regs)}</b></td><td class="num"><b>${n(t.desk_vols)}</b></td><td class="num"><b>${n(t.activity)}</b></td><td class="num"><b>${n(t.photos)}</b></td><td colspan="2"></td></tr></tbody></table></div></div>
    <div id="villdash" style="margin-top:24px"></div>`);
  if (feat('staff', 'villages') && typeof pgDashboard === 'function') pgDashboard($('#villdash'));
}
actions.dbKind = el => { DBKIND = el.dataset.k; apDashboard($('#pg')); };
actions.dbSort = el => { DBSORT = el.dataset.k; apDashboard($('#pg')); };
