'use strict';
// ---- staff console: Campus to booth pages (enrolment drive), schools, access control ----

const pgSchools = el => pgColleges(el, 'school');

// ---------- Enrolment drive ----------
let ENKIND = '', ENQ = '';
async function apEnrol(el) {
  const d = await api('/api/staff/enrol' + (ENKIND ? '?kind=' + ENKIND : '')); window.__en = d;
  const t = d.totals;
  show(el, html`${pageHead('Enrolment drive', 'Campus to booth: the target is 100% of eligible students registered. Pick an institution to see its departments and classes.', html`<button class="btn secondary" data-act="enReport">${icon('printer')} Report and print</button>`, 'Campus to booth')}
    <div class="card" style="margin-bottom:16px"><div class="row between"><div><b>${t.pct == null ? 'No numbers yet' : t.pct + '% of eligible students registered'}</b><div class="small muted">${n(t.registered)} of ${n(t.eligible)} eligible · ${d.reporting} of ${d.institutions.length} institutions have reported</div></div></div>${progress(t.pct || 0, t.pct >= 100 ? 'green' : 'saffron')}</div>
    <div class="kpis">${kpi('Total students', t.strength, { ic: 'users' })}${kpi('Registered', t.registered, { ic: 'user-check', tone: 'green' })}${kpi('Not eligible (under 17)', t.ineligible, { ic: 'clock' })}${kpi('Balance to cover', t.balance, { ic: 'target', tone: 'saffron' })}</div>
    <div class="card pad0" style="margin-top:16px"><div class="filterbar"><div class="chips">${[['', 'All'], ['college', 'Colleges'], ['school', 'Schools']].map(([k, l]) => html`<button class="chip ${ENKIND === k ? 'on' : ''}" data-act="enKind" data-k="${k}">${l}</button>`)}</div>${searchBox('enq', 'Search institutions…')}</div>
      <div class="tablewrap"><table><caption class="sr">Enrolment by institution</caption><thead><tr><th>Institution</th><th>Type</th><th class="num">Departments</th><th class="num">Students</th><th class="num">Registered</th><th class="num">Under 17</th><th class="num">Balance</th><th style="min-width:140px">Covered</th></tr></thead><tbody>
      ${d.institutions.map((i, k) => html`<tr class="enrow-i" data-q="${i.name.toLowerCase()}"><td><button class="linkbtn strong" data-act="enOpen" data-i="${k}" aria-expanded="false">${icon('chevron-down')} ${i.name}</button></td><td>${badge(i.kind === 'school' ? 'School' : 'College', i.kind === 'school' ? 'info' : '')}</td>
        <td class="num">${i.depts.length || '—'}</td><td class="num">${n(i.totals.strength)}</td><td class="num">${n(i.totals.registered)}</td><td class="num">${n(i.totals.ineligible)}</td><td class="num"><b>${n(i.totals.balance)}</b></td><td>${i.totals.pct == null ? html`<span class="muted small">not reported</span>` : html`<div class="row nowrap" style="gap:8px">${progress(i.totals.pct, i.totals.pct >= 100 ? 'green' : 'saffron')}<b class="small">${i.totals.pct}%</b></div>`}</td></tr>
        <tr class="detail" id="eni-${k}" hidden><td colspan="8">${i.depts.length ? i.depts.map(x => html`<details class="endept"><summary><b>${x.dept}</b> <span class="muted small">· ${x.coordinator || ''}${x.phone ? ' · ' + x.phone : ''} · ${x.classes.length} classes · ${n(x.totals.registered)} of ${n(x.totals.eligible)} registered (${pct(x.totals.pct)})</span></summary>
          <table class="mini"><thead><tr><th>Class</th><th class="num">Students</th><th class="num">Registered</th><th class="num">Under 17</th><th class="num">Balance</th></tr></thead><tbody>${x.classes.map(c => html`<tr><td>${c.name}</td><td class="num">${c.strength}</td><td class="num">${c.registered}</td><td class="num">${c.ineligible}</td><td class="num">${Math.max(0, c.strength - c.ineligible - c.registered)}</td></tr>`)}</tbody></table></details>`) : html`<span class="muted small">No department has reported yet.${i.coordinator ? ` Coordinator: ${i.coordinator}${i.phone ? ' · ' + i.phone : ''}` : ''}</span>`}</td></tr>`)}
      <tr class="total"><td colspan="3"><b>Total</b></td><td class="num"><b>${n(t.strength)}</b></td><td class="num"><b>${n(t.registered)}</b></td><td class="num"><b>${n(t.ineligible)}</b></td><td class="num"><b>${n(t.balance)}</b></td><td><b>${pct(t.pct)}</b></td></tr></tbody></table></div></div>`);
  const apply = () => { const v = ($('#enq').value || '').toLowerCase(); ENQ = v; $$('.enrow-i').forEach(r => { const hide = v && !r.dataset.q.includes(v); r.classList.toggle('hide', hide); const dtl = r.nextElementSibling; if (hide && dtl) dtl.hidden = true; }); };
  $('#enq').value = ENQ; $('#enq').addEventListener('input', apply); apply();
}
actions.enKind = el => { ENKIND = el.dataset.k; apEnrol($('#pg')); };
actions.enOpen = el => { const row = $('#eni-' + el.dataset.i), open = row.hidden; row.hidden = !open; el.setAttribute('aria-expanded', open); };
actions.enReport = () => { REP = { type: 'enrol_inst', filters: {}, sort: '', dir: 'asc', cols: null }; location.hash = '#/reports'; };

// ---------- Access control (super admin) ----------
async function apFeatures(el) {
  const groups = await api('/api/staff/features');
  show(el, html`${pageHead('Access control', 'Switch sections on or off for each kind of user. A switched-off section disappears from the menu and its actions stop working. Changes apply the next time someone opens or refreshes the page.', '', 'Administration')}
    <div class="grid g2">${groups.map(g => html`<div class="card"><div class="card-head"><h3>${g.title}</h3></div><div class="switches">${g.items.map(i => html`<label class="switch"><span>${i.label}</span><input type="checkbox" role="switch" data-act="toggleFeat" data-k="${g.audience}.${i.id}" ${i.enabled ? 'checked' : ''}><i aria-hidden="true"></i></label>`)}</div></div>`)}</div>`);
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
