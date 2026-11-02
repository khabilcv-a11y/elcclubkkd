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
    <div class="kpis">${kpi('Total students', t.strength, { ic: 'users' })}${kpi('Registered', t.registered, { ic: 'user-check', tone: 'green' })}${kpi('Not eligible yet', t.ineligible, { ic: 'clock' })}${kpi('Yet to register', t.balance, { ic: 'target', tone: 'saffron' })}</div>
    <div class="card pad0" style="margin-top:16px"><div class="filterbar"><div class="chips">${[['', 'All'], ['college', 'Colleges'], ['school', 'Schools']].map(([k, l]) => html`<button class="chip ${ENKIND === k ? 'on' : ''}" data-act="enKind" data-k="${k}">${l}</button>`)}</div>${searchBox('enq', 'Search institutions…')}</div>
      <div class="tablewrap"><table><caption class="sr">Enrolment by institution</caption><thead><tr><th>Institution</th><th>Type</th><th class="num">Students</th><th class="num">Registered</th><th class="num">Not eligible yet</th><th class="num">Yet to register</th><th style="min-width:150px">Covered</th><th>Updated</th></tr></thead><tbody>
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
  show(el, html`${pageHead('Help desk daily reports', 'Registrations made and volunteers present at the help desks, reported each day by colleges and schools.', html`${isOps() ? html`<button class="btn primary" data-act="partImport">${icon('upload')} Import participants</button>` : ''}<button class="btn secondary" data-act="deskRep" data-t="desk">${icon('printer')} Day by day</button><button class="btn secondary" data-act="deskRep" data-t="activities">Other activities</button><button class="btn secondary" data-act="deskRep" data-t="activity_summary">Activities summary</button>`, 'Campus to booth')}
    <div class="kpis">${kpi('Registrations at help desks', tot.regs, { ic: 'user-check', tone: 'green' })}${kpi('Institutions reporting', tot.rep + ' of ' + rows.length, { ic: 'building', count: false })}${kpi('Volunteer-days at help desks', tot.vols, { ic: 'users', tone: 'saffron' })}${kpi('Volunteer-days in other activities', tot.acts, { ic: 'megaphone' })}</div>
    <div class="card pad0" style="margin-top:16px"><div class="filterbar"><div class="chips">${[['', 'All'], ['college', 'Colleges'], ['school', 'Schools']].map(([k, l]) => html`<button class="chip ${DKKIND === k ? 'on' : ''}" data-act="dkKind" data-k="${k}">${l}</button>`)}</div></div>
      <div class="tablewrap"><table><caption class="sr">Help desk totals</caption><thead><tr><th>Institution</th><th>Type</th><th class="num">Days reported</th><th class="num">Registrations</th><th class="num">Per day</th><th class="num">Volunteer-days</th><th class="num">Other activities</th><th>Last report</th></tr></thead><tbody>
      ${rows.map(x => html`<tr><td><b>${x.college}</b></td><td>${badge(x.type, x.type === 'School' ? 'info' : '')}</td><td class="num">${x.days}</td><td class="num"><b>${n(x.registrations)}</b></td><td class="num">${x.avg ?? '—'}</td><td class="num">${n(x.volunteers)}</td><td class="num">${x.activity}</td><td>${x.last ? fdate(x.last) : html`<span class="muted small">no report yet</span>`}</td></tr>`)}</tbody></table></div></div>`);
}
actions.dkKind = el => { DKKIND = el.dataset.k; apDesk($('#pg')); };
actions.deskRep = el => { REP = { type: el.dataset.t, filters: {}, sort: '', dir: 'asc', cols: null }; location.hash = '#/reports'; };

// ---------- Gallery: photos from colleges and schools, photos added by the office, and the albums that sort the public gallery ----------
let GALF = 'all';
async function apGallery(el) {
  const [items, albums] = await Promise.all([api('/api/staff/gallery'), api('/api/staff/gallery-albums').catch(() => [])]);
  window.__gal = items; window.__albums = albums;
  const ops = isOps(), albumOf = id => albums.find(a => a.id === id);
  const shown = items.filter(g => GALF === 'all' || (GALF === 'inst' && g.college_id) || (GALF === 'office' && !g.college_id) || (GALF === 'cur' && !g.album_id) || String(g.album_id) === GALF);
  const chips = [['all', `All (${items.length})`], ['inst', 'From colleges and schools'], ['office', 'Added by the office'], ['cur', 'Current campaign'], ...albums.map(a => [String(a.id), `${a.title} (${a.count})`])];
  show(el, html`${pageHead('Gallery', 'Photos from colleges and schools, and photos you add yourself. Create albums with titles to sort the public gallery: the current campaign is highlighted, earlier work is shown as albums.', ops ? html`<button class="btn secondary" data-act="pxImport">${icon('image')} Import from Pixieset</button><button class="btn secondary" data-act="albAdd">${icon('plus')} New album</button><button class="btn primary" data-act="galAdd">${icon('upload')} Add photos</button>` : '', 'Campus to booth')}
    ${ops ? html`<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${icon('folder')} Albums</h3><a class="btn ghost sm" href="/#/gallery" target="_blank" rel="noopener">${icon('external')} See the public gallery</a></div>
      ${albums.length ? html`<div class="albrows" style="max-height:320px;overflow:auto">${albums.map(a => html`<div class="albrow"><div><b>${a.title}</b> ${a.current ? badge('Current campaign', 'ok') : badge('Previous works', 'grey')}<div class="small muted">${a.count} photo${a.count === 1 ? '' : 's'}${a.description ? ' · ' + a.description : ''}</div></div><div class="row gap-s nowrap">${rowBtn('albEdit', 'Edit', 'edit', `data-id="${a.id}"`)}${rowBtn('albDel', '', 'trash', `data-id="${a.id}" aria-label="Delete album ${esc(a.title)}"`, 'danger')}</div></div>`)}</div>` : html`<p class="muted small">No albums yet. Photos from colleges and schools appear under "Current campaign" automatically. Create an album to add earlier work such as a previous election drive.</p>`}</div>` : ''}
    <div class="chips" style="margin-bottom:14px" role="group" aria-label="Show">${chips.map(([k, l]) => html`<button class="chip ${GALF === k ? 'on' : ''}" data-act="galFilter" data-k="${k}">${l}</button>`)}</div>
    ${shown.length ? html`<div class="galgrid">${shown.map(g => html`<article class="galcard ${g.visible ? '' : 'dim'}"><img src="${gUrl(g, 'medium', `/api/staff/gallery/${g.id}/thumb`)}" alt="${g.title}" loading="lazy" decoding="async"><div class="galbody"><h3>${g.title}</h3><div class="small muted"><b>${g.college}</b>${g.activity ? ' · ' + g.activity : ''} · ${fdate(g.event_date)}</div>${g.description ? html`<p class="small">${g.description}</p>` : ''}
      <div class="pillrow" style="margin-top:6px">${g.album_id && albumOf(g.album_id) ? badge(albumOf(g.album_id).title, 'info') : badge('Current campaign', 'ok')}${g.visible ? badge('Public', 'ok') : badge('Hidden', 'grey')}${g.home ? badge('On home page', 'info') : ''}</div>
      ${ops ? html`<div class="row gap-s" style="margin-top:10px"><button class="btn sm secondary" data-act="galVis" data-id="${g.id}" data-v="${g.visible ? 0 : 1}">${g.visible ? 'Hide' : 'Show'}</button><button class="btn sm secondary" data-act="galMove" data-id="${g.id}">${icon('folder')} Album</button><button class="btn sm danger" data-act="galDel" data-id="${g.id}" aria-label="Delete ${g.title}">${icon('trash')}</button></div>` : ''}</div></article>`)}</div>` : html`<div class="card">${empty('No photos here yet', 'Photos appear as colleges and schools save framed photos. You can also add photos yourself.', 'image')}</div>`}`);
}
actions.galFilter = el => { GALF = el.dataset.k; apGallery($('#pg')); };
actions.galVis = async el => { await api(`/api/staff/gallery/${el.dataset.id}/visible`, 'POST', { visible: el.dataset.v === '1' }); apGallery($('#pg')); };
actions.galDel = async el => { if (!await confirmBox('Delete this photo for good?', 'Delete', true)) return; await api('/api/staff/gallery/' + el.dataset.id, 'DELETE'); toast('Deleted'); apGallery($('#pg')); };

const albumOptions = (sel = '') => html`<option value="">Current campaign (highlighted at the top)</option>${window.__albums.map(a => html`<option value="${a.id}" ${String(sel) === String(a.id) ? 'selected' : ''}>${a.title}${a.current ? ' (current)' : ''}</option>`)}`;
actions.galAdd = () => modal(html`<h2>Add photos</h2><form data-form="galAdd" class="stack-s">
  <label class="f"><span>Photos (you can choose several) *</span><input type="file" name="files" accept="image/*" multiple required></label>
  <label class="f"><span>Title *</span><input type="text" name="title" maxlength="100" required placeholder="e.g. Voter awareness rally, Nadapuram"></label>
  <div class="formgrid"><label class="f"><span>Album</span><select name="album" id="galalb">${albumOptions()}${isOps() ? html`<option value="new">+ New album…</option>` : ''}</select></label>
    <label class="f hide" id="galnew"><span>New album title</span><input type="text" name="new_album" maxlength="80" placeholder="e.g. Assembly election 2024"></label>
    <label class="f"><span>Date</span><input type="date" name="event_date" max="${todayISO()}" value="${todayISO()}"></label></div>
  <label class="f"><span>Activity or place (optional)</span><input type="text" name="activity" maxlength="60" placeholder="e.g. Rally"></label>
  <label class="f"><span>Short description (optional)</span><textarea name="description" rows="2" maxlength="500"></textarea></label>
  <label class="chk"><input type="checkbox" name="home" checked> Also show on the home page</label>
  <p class="hint">With several photos, the same title is used for all of them. Pictures are resized automatically.</p>${mfoot('Upload')}</form>`, { wide: true });
document.addEventListener('change', e => { if (e.target.id === 'galalb') $('#galnew')?.classList.toggle('hide', e.target.value !== 'new'); });
forms.galAdd = async f => {
  const v = fd(f), files = [...$('input[type=file]', f).files]; if (!files.length) throw new Error('Choose at least one photo');
  const box = $('[data-err]', f);
  let album = v.album || null;
  if (album === 'new') { const t = String(v.new_album || '').trim(); if (!t) throw new Error('Type the new album title'); album = (await api('/api/staff/gallery-albums', 'POST', { title: t, current: false })).id; }
  let done = 0;
  for (const file of files) {
    box.innerHTML = `<div class="alert info">Uploading photo ${done + 1} of ${files.length}… please keep this window open.</div>`;
    const cv = await readPhoto(file, 2200), blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.86));
    await api('/api/staff/gallery', 'POST', { title: v.title, description: v.description, activity: v.activity, event_date: v.event_date, album_id: album, home: !!v.home, orientation: cv.height > cv.width ? 'portrait' : 'landscape', mime: 'image/jpeg', thumb: await thumbB64(cv), data: await toB64(blob) });
    done++;
  }
  f.closest('.overlay').close(); toast(done === 1 ? 'Photo added' : `${done} photos added`); apGallery($('#pg'));
};
actions.galMove = el => {
  const g = window.__gal.find(x => x.id === Number(el.dataset.id));
  modal(html`<h2>Move to an album</h2><form data-form="galMove" data-id="${g.id}" class="stack-s"><p class="muted small">${g.title}</p>
    <label class="f"><span>Album</span><select name="album">${albumOptions(g.album_id)}</select></label>
    <label class="chk"><input type="checkbox" name="home" ${g.home ? 'checked' : ''}> Also show on the home page</label>${mfoot('Save')}</form>`);
};
forms.galMove = async f => { const v = fd(f); await api(`/api/staff/gallery/${f.dataset.id}/album`, 'POST', { album_id: v.album || null, home: !!v.home }); f.closest('.overlay').close(); toast('Saved'); apGallery($('#pg')); };
const albumForm = a => html`<form data-form="album" data-id="${a?.id || ''}" class="stack-s"><label class="f"><span>Album title *</span><input type="text" name="title" maxlength="80" required value="${a?.title || ''}" placeholder="e.g. Assembly election 2024"></label>
  <label class="f"><span>Short description (optional)</span><input type="text" name="description" maxlength="300" value="${a?.description || ''}"></label>
  <label class="chk"><input type="checkbox" name="current" ${a?.current ? 'checked' : ''}> This is part of the current campaign (shown in the highlighted section and on the home page). Leave off for earlier work.</label>${mfoot(a ? 'Save' : 'Create album')}</form>`;
actions.albAdd = () => { window.__albums ||= []; modal(html`<h2>New album</h2>${albumForm()}`); };
actions.albEdit = el => modal(html`<h2>Edit album</h2>${albumForm(window.__albums.find(a => a.id === Number(el.dataset.id)))}`);
forms.album = async f => { const id = f.dataset.id, v = fd(f); await api(id ? '/api/staff/gallery-albums/' + id : '/api/staff/gallery-albums', id ? 'PUT' : 'POST', { title: v.title, description: v.description, current: !!v.current }); f.closest('.overlay').close(); toast('Saved'); apGallery($('#pg')); };
actions.albDel = async el => { const a = window.__albums.find(x => x.id === Number(el.dataset.id)); if (!await confirmBox(a.count ? `Delete this album and its ${a.count} photos? This works only for albums of photos linked from another site; uploaded photos must be moved or deleted first.` : 'Delete this empty album?', 'Delete', true)) return; await api('/api/staff/gallery-albums/' + el.dataset.id + (a.count ? '?force=1' : ''), 'DELETE'); toast('Deleted'); apGallery($('#pg')); };

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
      <div class="campus-facts"><div><b>${n(t.registered)}</b><span>registered</span></div><div><b>${n(t.eligible)}</b><span>eligible</span></div><div><b>${n(t.balance)}</b><span>yet to register</span></div><div><b>${n(t.ineligible)}</b><span>under 17</span></div><div><b>${t.reporting}/${t.institutions}</b><span>reported numbers</span></div></div></div>${progress(t.pct || 0, t.pct >= 100 ? 'green' : 'saffron')}</div>
    <div class="kpis" style="margin-top:16px">${kpi('Registrations at help desks', t.desk_regs, { ic: 'user-check', tone: 'green' })}${kpi('Volunteer-days at help desks', t.desk_vols, { ic: 'users', tone: 'saffron', sub: '1 volunteer present for 1 day = 1 volunteer-day' })}${kpi('Volunteer-days in other activities', t.activity, { ic: 'megaphone', sub: 'Flash mobs, class campaigns, game zones' })}
      ${kpi('Active this week', `${t.active}/${t.institutions}`, { ic: 'building', tone: 'info', count: false })}${kpi('Photos shared', t.photos, { ic: 'camera' })}</div>
    <div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-head"><h3>${icon('alert')} Needs attention</h3><span class="small muted">${attn.length} of ${t.institutions}</span></div>
        ${attn.length ? html`<p class="small muted" style="margin-bottom:8px">${attn.filter(i => i.status === 'new').length} not started · ${attn.filter(i => i.status === 'quiet').length} quiet this week</p><div class="pillrow">${sortInst(attn).slice(0, 14).map(i => html`<span class="badge ${i.status === 'new' ? 'grey' : 'warn'}">${i.short_name || i.name}</span>`)}${attn.length > 14 ? html`<span class="muted small">+${attn.length - 14} more in the table below</span>` : ''}</div>` : html`<p class="muted">Every institution has been active this week.</p>`}</div>
      <div class="card"><div class="card-head"><h3>Help desk registrations per day</h3></div>${d.trend.length ? html`<div class="chart" role="img" aria-label="Help desk registrations per day">${d.trend.map(x => html`<div class="col" tabindex="0" data-tip="${fdate(x.date)}: ${x.registered} registrations"><i data-h="${Math.round(x.registered * 100 / mx)}" style="height:${Math.round(x.registered * 100 / mx)}%"></i></div>`)}</div>` : html`<p class="muted">The first daily report will draw this chart.</p>`}</div></div>
    <div class="card pad0" style="margin-top:16px"><div class="card-head pad"><h3>Coverage, input and performance by college and school</h3></div>
      <div class="filterbar"><div class="chips">${[['', 'All'], ['college', 'Colleges'], ['school', 'Schools']].map(([k, l]) => html`<button class="chip ${DBKIND === k ? 'on' : ''}" data-act="dbKind" data-k="${k}">${l}</button>`)}</div><div class="chips">${Object.entries(DBSORTS).map(([k, l]) => html`<button class="chip ${DBSORT === k ? 'on' : ''}" data-act="dbSort" data-k="${k}">${l}</button>`)}</div></div>
      <div class="tablewrap"><table><caption class="sr">Coverage, input and performance</caption><thead><tr><th>Institution</th><th style="min-width:150px">Coverage</th><th class="num">Registered</th><th class="num">Eligible</th><th class="num">Yet to register</th><th class="num">Help desk regs</th><th class="num">Volunteer-days</th><th class="num">Other activities</th><th class="num">Photos</th><th>Last active</th><th>Status</th></tr></thead><tbody>
      ${list.map(i => html`<tr><td><div class="nmav">${avatar(i.id, i.logo_v, i.name, 32)}<span><b>${i.name}</b><div class="xs muted">${i.kind === 'school' ? 'School' : 'College'}${i.coordinator ? ' · ' + i.coordinator : ''}${i.phone ? ' · ' + i.phone : ''}</div></span></div></td>
        <td>${i.pct == null ? html`<span class="muted small">no numbers yet</span>` : html`<div class="row nowrap" style="gap:8px"><div style="flex:1;min-width:80px">${progress(i.pct, i.pct >= 100 ? 'green' : 'saffron')}</div><b class="small">${i.pct}%</b></div>`}</td>
        <td class="num">${n(i.registered)}</td><td class="num">${n(i.eligible)}</td><td class="num"><b>${n(i.balance)}</b></td><td class="num">${n(i.desk_regs)}</td><td class="num">${n(i.desk_vols)}</td><td class="num">${n(i.activity)}</td><td class="num">${n(i.photos)}</td><td>${i.last_active ? fdate(i.last_active) : '—'}</td><td>${stBadge(i.status)}</td></tr>`)}
      <tr class="total"><td><b>Total</b></td><td><b>${pct(t.pct)}</b></td><td class="num"><b>${n(t.registered)}</b></td><td class="num"><b>${n(t.eligible)}</b></td><td class="num"><b>${n(t.balance)}</b></td><td class="num"><b>${n(t.desk_regs)}</b></td><td class="num"><b>${n(t.desk_vols)}</b></td><td class="num"><b>${n(t.activity)}</b></td><td class="num"><b>${n(t.photos)}</b></td><td colspan="2"></td></tr></tbody></table></div></div>
    <div id="villdash" style="margin-top:24px"></div>`);
  if (feat('staff', 'villages') && typeof pgDashboard === 'function') pgDashboard($('#villdash'));
}
actions.dbKind = el => { DBKIND = el.dataset.k; apDashboard($('#pg')); };
actions.dbSort = el => { DBSORT = el.dataset.k; apDashboard($('#pg')); };

// ---------- link the photos of the district's Pixieset galleries into albums (one album per set; report screenshots and clippings are left out) ----------
actions.pxImport = async () => {
  let M; try { M = await (await fetch('/pixieset-import.json')).json(); } catch { return toast('The photo list could not be loaded', true); }
  window.__px = M; const total = M.galleries.reduce((n, g) => n + g.sets.filter(x => !x.report).reduce((m, x) => m + x.photos.length, 0), 0);
  const mdl = modal(html`<h2>Import photos from Pixieset</h2><p class="muted small">Each set becomes an album in <b>Previous works</b>, with the photos shown straight from the Pixieset gallery (nothing is copied to the portal's storage, so it costs nothing). Sets that hold press clippings and social media statistics are left unticked. Running this again skips photos already imported.</p>
    <div class="tablewrap" style="max-height:48vh"><table data-nosort><thead><tr><th style="width:36px"><input type="checkbox" id="pxall" checked aria-label="Select all sets"></th><th>Set</th><th class="num">Photos</th></tr></thead><tbody>
    ${M.galleries.map(g => html`<tr class="total"><td colspan="3"><b>${g.album}</b> <span class="xs muted">${g.host}</span></td></tr>${g.sets.map(x => html`<tr><td><input type="checkbox" data-px="${g.key}|${x.slug}" ${x.report ? '' : 'checked'} aria-label="${esc(x.title)}"></td><td>${x.title}${x.report ? html` <span class="badge grey">press / social media reports</span>` : ''}</td><td class="num">${x.photos.length}</td></tr>`)}`)}</tbody></table></div>
    <div id="pxinfo" class="small muted" style="margin:10px 0"></div><div id="pxbar" class="progress hide"><i style="width:0%"></i></div>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn secondary" data-act="closeModal">Close</button><button class="btn primary" id="pxgo" data-act="pxRun">${icon('upload')} Import the ticked sets</button></div>`, { wide: true });
  const upd = () => { const sel = $$('[data-px]:checked').map(i => i.dataset.px), n = M.galleries.flatMap(g => g.sets.filter(x => sel.includes(g.key + '|' + x.slug))).reduce((m, x) => m + x.photos.length, 0); $('#pxinfo').textContent = `${sel.length} set${sel.length === 1 ? '' : 's'} ticked, ${n.toLocaleString('en-IN')} photos (of ${total.toLocaleString('en-IN')} activity photos).`; };
  mdl.addEventListener('change', e => { if (e.target.id === 'pxall') { $$('[data-px]').forEach(i => { i.checked = e.target.checked; }); } if (e.target.id === 'pxall' || e.target.dataset?.px) upd(); }); upd();
};
actions.pxRun = async el => {
  const M = window.__px, sel = $$('[data-px]:checked').map(i => i.dataset.px); if (!sel.length) return toast('Tick at least one set', true);
  el.disabled = true; const bar = $('#pxbar'); bar.classList.remove('hide');
  const jobs = M.galleries.flatMap(g => g.sets.filter(x => sel.includes(g.key + '|' + x.slug)).map(x => ({ g, x }))), all = jobs.reduce((n, j) => n + j.x.photos.length, 0); let done = 0, added = 0, skipped = 0, albums = 0;
  try {
    for (const { g, x } of jobs) {
      const title = g.album + ': ' + x.title;
      for (let i = 0; i < x.photos.length; i += 300) {
        $('#pxinfo').textContent = `Importing ${title}… (${done.toLocaleString('en-IN')} of ${all.toLocaleString('en-IN')})`; $('i', bar).style.width = Math.round(done * 100 / all) + '%';
        const r = await api('/api/staff/gallery/import-external', 'POST', { album_title: title, album_description: g.about, photo_title: x.title,
          photos: x.photos.slice(i, i + 300).map(p => ({ k: g.key + ':' + p[0], u: `https://images.pixieset.com/${p[1]}-{s}.${p[2]}`, w: p[3], h: p[4], d: p[5] })) });
        added += r.added; skipped += r.skipped; if (r.created && i === 0) albums++; done += Math.min(300, x.photos.length - i);
      }
    }
    $('i', bar).style.width = '100%'; $('#pxinfo').innerHTML = `<b>Done.</b> ${added.toLocaleString('en-IN')} photos added in ${albums} new album${albums === 1 ? '' : 's'}${skipped ? `; ${skipped} were already there` : ''}.`;
    toast(`${added} photos added`); el.textContent = 'Done'; apGallery($('#pg'));
  } catch (e) { $('#pxinfo').innerHTML = `<span style="color:var(--danger)">${esc(e.message)}</span> Press the button again to continue: photos already added are skipped.`; el.disabled = false; }
};

// ---------- Social media: the Instagram posts shown on the home page ----------
async function apSocial(el) {
  const d = await api('/api/staff/social'), ops = isOps(); window.__social = d;
  show(el, html`${pageHead('Social media', `The posts of @${d.handle} shown on the home page, newest first. Instagram does not offer a public feed, so the posts to show are chosen here by pasting their links.`, html`<a class="btn secondary" href="https://www.instagram.com/${d.handle}/" target="_blank" rel="noopener">${icon('external')} Open the Instagram page</a>`, 'Home page')}
    ${ops ? html`<div class="card" style="margin-bottom:16px"><form data-form="socialAdd" class="stack-s"><label class="f"><span>Post links (one on each line)</span><textarea name="urls" rows="4" placeholder="https://www.instagram.com/p/AbC123xyz/&#10;https://www.instagram.com/reel/DeF456uvw/" required></textarea><span class="hint">Open a post on Instagram, copy its address from the browser, and paste it here. The first link appears first on the home page, so paste the newest post first.</span></label><div data-err></div><div class="row"><button class="btn primary" type="submit">${icon('plus')} Add the posts</button></div></form></div>` : ''}
    ${d.suggested.length ? html`<div class="alert info" style="margin-bottom:16px">${icon('info' in ICONS ? 'info' : 'help')}<div><b>Showing the latest ${d.suggested.length} posts of the page until you choose your own.</b> The home page already shows them. ${ops ? html`<button class="btn sm secondary" data-act="socialAdopt" style="margin-left:8px">Keep these and edit the list</button>` : ''}</div></div>` : ''}
    ${d.posts.length ? html`<div class="card pad0"><div class="tablewrap"><table data-nosort><thead><tr><th>#</th><th>Post</th>${ops ? html`<th class="ia">Order and remove</th>` : ''}</tr></thead><tbody>${d.posts.map((p, i) => html`<tr><td>${i + 1}</td><td><a href="${p.url}" target="_blank" rel="noopener">${p.url}</a></td>${ops ? html`<td class="ia"><div class="row gap-s nowrap"><button class="ib" data-act="socialMove" data-id="${p.id}" data-dir="up" title="Move up" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('arrow-left').s.replace('<svg', '<svg style="transform:rotate(90deg)"')}</button><button class="ib" data-act="socialMove" data-id="${p.id}" data-dir="down" title="Move down" aria-label="Move down" ${i === d.posts.length - 1 ? 'disabled' : ''}>${icon('arrow-right').s.replace('<svg', '<svg style="transform:rotate(90deg)"')}</button><button class="ib danger" data-act="socialDel" data-id="${p.id}" title="Remove from the home page" aria-label="Remove">${icon('trash')}</button></div></td>` : ''}</tr>`)}</tbody></table></div></div>` : (d.suggested.length ? '' : html`<div class="card">${empty('No posts chosen', 'Paste Instagram post links above to show them on the home page.', 'camera')}</div>`)}`);
}
forms.socialAdd = async f => { const r = await api('/api/staff/social', 'POST', { urls: fd(f).urls }); toast(r.added ? `${r.added} post${r.added === 1 ? '' : 's'} added` : 'Those posts were already in the list'); apSocial($('#pg')); };
actions.socialAdopt = async () => { await api('/api/staff/social', 'POST', { urls: window.__social.suggested.map(p => p.url).join('\n') }); toast('Posts kept'); apSocial($('#pg')); };
actions.socialMove = async el => { await api(`/api/staff/social/${el.dataset.id}/move`, 'POST', { dir: el.dataset.dir }); apSocial($('#pg')); };
actions.socialDel = async el => { if (!await confirmBox('Remove this post from the home page? It stays on Instagram.', 'Remove', true)) return; await api('/api/staff/social/' + el.dataset.id, 'DELETE'); apSocial($('#pg')); };
