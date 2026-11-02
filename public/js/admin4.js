'use strict';
// ---- staff console: certificate campaigns, every institution's progress, regeneration access, import from a sheet ----
let CRA = { id: null, kind: '', q: '', f: '' };
const craDay = d => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

async function apCerts(el) {
  const d = await api('/api/staff/certs/campaigns'); window.__camps = d.campaigns; window.__ctpls = d.templates;
  if (!d.campaigns.some(c => c.id === CRA.id)) CRA.id = d.campaigns[0]?.id || null;
  const ops = isOps();
  show(el, html`${pageHead('Certificates', 'Open a campaign, choose its certificate design, and follow every college and school from the list of students to the generated certificates.', ops ? html`<button class="btn secondary" data-act="certImport" ${CRA.id ? '' : 'disabled'}>${icon('upload')} Import participants</button><button class="btn primary" data-act="campAdd">${icon('plus')} New campaign</button>` : '', 'Campus to booth')}
    ${d.campaigns.length ? html`<div class="campgrid">${d.campaigns.map(c => html`<div class="campcard ${c.id === CRA.id ? 'on' : ''}"><button class="camppick" data-act="campPick" data-id="${c.id}" aria-label="Show ${esc(c.title)}"><b>${c.title}</b><div class="small muted">${c.description || ''}${c.start_date || c.end_date ? ` ${c.description ? '· ' : ''}${craDay(c.start_date) || ''} to ${craDay(c.end_date) || 'now'}` : ''}</div>
        <div class="pillrow" style="margin-top:6px">${c.live ? badge('Open for colleges', 'ok') : badge('Switched off', 'grey')}${c.template ? badge('Design: ' + c.template.title, c.template.active ? 'info' : 'warn') : badge('No design chosen', 'warn')}</div>
        <div class="xs muted" style="margin-top:6px">${n(c.totals.colleges)} institutions · ${n(c.totals.people)} students · ${n(c.totals.ok)} certificates made</div></button>
        ${ops ? html`<div class="row gap-s campact"><button class="ib" data-act="campLive" data-id="${c.id}" title="${c.live ? 'Switch off for colleges' : 'Open for colleges'}" aria-label="${c.live ? 'Switch off' : 'Open'}">${c.live ? '⏸️' : '▶️'}</button><button class="ib" data-act="campEdit" data-id="${c.id}" title="Edit" aria-label="Edit">✏️</button><button class="ib danger" data-act="campDel" data-id="${c.id}" title="Delete" aria-label="Delete">🗑️</button></div>` : ''}</div>`)}</div>`
      : html`<div class="card">${empty('No certificate campaign yet', 'Create a campaign, upload a certificate design under Frames and posters, and choose it for the campaign.', 'certificate')}</div>`}
    <div id="certstatus" style="margin-top:20px"></div>`);
  if (CRA.id) paintCertStatus();
}
actions.campPick = el => { CRA.id = Number(el.dataset.id); apCerts($('#pg')); };
const campForm = c => { const tpls = window.__ctpls || []; return html`<form data-form="camp" data-id="${c?.id || ''}" class="stack-s"><label class="f"><span>Campaign title *</span><input type="text" name="title" maxlength="100" required value="${c?.title || ''}" placeholder="e.g. Campus to Booth 2026"></label>
  <label class="f"><span>Short description</span><input type="text" name="description" maxlength="300" value="${c?.description || ''}"></label>
  <div class="formgrid"><label class="f"><span>Participation from</span><input type="date" name="start_date" value="${c?.start_date || ''}"></label><label class="f"><span>Participation until</span><input type="date" name="end_date" value="${c?.end_date || ''}"></label>
    <label class="f"><span>Certificate design</span><select name="template_id"><option value="">Choose a design…</option>${tpls.map(t => html`<option value="${t.id}" ${c?.template_id === t.id ? 'selected' : ''}>${t.title}${t.active ? '' : ' (hidden)'}</option>`)}</select><span class="hint">Upload designs under Frames and posters, with type "Certificate".</span></label>
    <label class="f"><span>Certificate number prefix</span><input type="text" name="prefix" maxlength="10" value="${c?.prefix || 'ELC'}"></label>
    <label class="f"><span>Suggested minimum days to qualify</span><input type="number" name="min_days" min="1" max="60" value="${c?.min_days || 1}"></label></div>
  <label class="chk"><input type="checkbox" name="live" ${c?.live ? 'checked' : ''}> Open for colleges and schools now (they can verify lists; generation also needs a design that is switched on)</label>${mfoot(c ? 'Save' : 'Create campaign')}</form>`; };
actions.campAdd = () => modal(html`<h2>New certificate campaign</h2>${campForm()}`, { wide: true });
actions.campEdit = el => modal(html`<h2>Edit campaign</h2>${campForm(window.__camps.find(c => c.id === Number(el.dataset.id)))}`, { wide: true });
forms.camp = async f => { const id = f.dataset.id, v = fd(f); await api(id ? '/api/staff/certs/campaigns/' + id : '/api/staff/certs/campaigns', id ? 'PUT' : 'POST', { ...v, live: !!v.live }); f.closest('.overlay').close(); toast('Saved'); apCerts($('#pg')); };
actions.campLive = async el => { const c = window.__camps.find(x => x.id === Number(el.dataset.id)); await api('/api/staff/certs/campaigns/' + c.id, 'PUT', { ...c, live: !c.live }); toast(c.live ? 'Switched off for colleges' : 'Open for colleges'); apCerts($('#pg')); };
actions.campDel = async el => { if (!await confirmBox('Delete this campaign and the lists colleges prepared for it? This is only possible while no certificate has been generated.', 'Delete', true)) return; await api('/api/staff/certs/campaigns/' + el.dataset.id, 'DELETE'); toast('Deleted'); CRA.id = null; apCerts($('#pg')); };

// ---------- progress of every institution ----------
async function paintCertStatus() {
  const box = $('#certstatus'); if (!box) return;
  let r; try { r = await api('/api/staff/certs/status?campaign=' + CRA.id); } catch (e) { return show(box, html`<div class="alert err">${e.message}</div>`); }
  window.__cst = r;
  const rows = r.rows, tot = rows.reduce((t, x) => ({ inst: t.inst + (x.people ? 1 : 0), people: t.people + x.people, sel: t.sel + x.eligible, issued: t.issued + x.issued, ok: t.ok + x.ok, rem: t.rem + x.remaining, sub: t.sub + (x.batch === 'submitted' ? 1 : 0) }), { inst: 0, people: 0, sel: 0, issued: 0, ok: 0, rem: 0, sub: 0 });
  show(box, html`<div class="kpis">${kpi('Institutions with a list', `${tot.inst}/${rows.length}`, { ic: 'building', count: false, sub: `${tot.sub} submitted the final list` })}${kpi('Students listed', tot.people, { ic: 'users' })}${kpi('Selected for certificates', tot.sel, { ic: 'user-check', tone: 'green' })}${kpi('Certificates generated', tot.issued, { ic: 'certificate', tone: 'saffron' })}${kpi('Successful', tot.ok, { ic: 'check-circle', tone: 'green', sub: `${tot.issued - tot.ok} awaiting confirmation` })}${kpi('Remaining to generate', tot.rem, { ic: 'clock', tone: 'info' })}</div>
    <div class="card pad0" style="margin-top:16px"><div class="filterbar"><div class="chips">${[['', 'All'], ['college', 'Colleges'], ['school', 'Schools'], ['submitted', 'Submitted'], ['open', 'Not submitted']].map(([k, l]) => html`<button class="chip ${CRA.f === k ? 'on' : ''}" data-act="craFilter" data-k="${k}">${l}</button>`)}</div>${searchBox('craq', 'Search institutions…')}<button class="btn secondary sm" data-act="craCsv">${icon('download')} Download status (CSV)</button></div>
      <div class="tablewrap ctable"><table><caption class="sr">Certificate progress</caption><thead><tr><th>Institution</th><th>Coordinator</th><th class="num">Listed</th><th class="num">Selected</th><th>Final list</th><th class="num">Generated</th><th class="num">Successful</th><th class="num">Remaining</th><th class="ia">Actions</th></tr></thead><tbody>
      ${rows.map(x => html`<tr class="crow" data-q="${esc((x.name + ' ' + (x.coordinator || '')).toLowerCase())}" data-kind="${x.kind}" data-b="${x.batch}"><td class="wide"><b>${x.name}</b> <span class="xs muted">${x.kind === 'school' ? 'School' : 'College'}</span></td><td class="small">${x.coordinator || '—'}${x.phone ? html`<div>📞 ${x.phone}</div>` : ''}</td>
        <td class="num">${x.people}</td><td class="num">${x.eligible}</td><td>${x.batch === 'submitted' ? html`${badge('Submitted', 'ok')}<div class="xs muted">${x.submitted_at ? craDay(x.submitted_at.slice(0, 10)) : ''}</div>` : x.people ? badge('In progress', 'warn') : badge('Not started', 'grey')}</td>
        <td class="num">${x.issued}</td><td class="num">${x.ok}</td><td class="num"><b>${x.remaining}</b>${x.allowed ? html`<div class="xs muted">${x.allowed} may redo</div>` : ''}</td>
        <td class="ia"><div class="row gap-s nowrap"><button class="ib" data-act="craView" data-id="${x.id}" title="See the students" aria-label="See the students">👁️</button>${isOps() ? html`<button class="ib" data-act="craAllow" data-id="${x.id}" title="Allow this institution to generate again for everyone" aria-label="Allow generating again" ${x.issued ? '' : 'disabled'}>🔓</button><button class="ib" data-act="craReopen" data-id="${x.id}" title="Reopen the list for changes" aria-label="Reopen the list" ${x.batch === 'submitted' ? '' : 'disabled'}>↩️</button>` : ''}</div></td></tr>`)}</tbody></table></div></div>`);
  const apply = () => { const v = ($('#craq')?.value || '').toLowerCase(), f = CRA.f; $$('.crow').forEach(rw => rw.classList.toggle('hide', !((!v || rw.dataset.q.includes(v)) && (!f || (f === 'college' || f === 'school' ? rw.dataset.kind === f : f === 'submitted' ? rw.dataset.b === 'submitted' : rw.dataset.b !== 'submitted'))))); };
  $('#craq')?.addEventListener('input', apply); apply();
}
actions.craFilter = el => { CRA.f = el.dataset.k; paintCertStatus(); };
actions.craCsv = () => {
  const r = window.__cst, q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', cols = [['name', 'Institution'], ['kind', 'Type'], ['coordinator', 'Coordinator'], ['phone', 'Phone'], ['people', 'Listed'], ['eligible', 'Selected'], ['batch', 'Final list'], ['issued', 'Generated'], ['ok', 'Successful'], ['remaining', 'Remaining']];
  saveBlob(new Blob(['﻿' + [cols.map(c => q(c[1])).join(','), ...r.rows.map(x => cols.map(([k]) => q(x[k])).join(','))].join('\r\n')], { type: 'text/csv;charset=utf-8' }), `certificate-status-${slug(r.campaign.title)}.csv`);
};
actions.craView = async el => {
  const id = Number(el.dataset.id), x = window.__cst.rows.find(r => r.id === id), people = await api(`/api/staff/certs/people?campaign=${CRA.id}&college=${id}`);
  window.__cpeople = people; window.__cinst = id;
  modal(html`<h2>${x.name}</h2><p class="small muted">${people.length} student${people.length === 1 ? '' : 's'} listed · ${x.eligible} selected · ${x.issued} generated</p>
    ${people.length ? html`<div class="tablewrap" style="max-height:52vh"><table><thead><tr>${isOps() ? html`<th></th>` : ''}<th>Student</th><th>Activities</th><th class="num">Days</th><th>Selected</th><th>Certificate</th></tr></thead><tbody>${people.map(p => html`<tr>${isOps() ? html`<td>${p.status !== 'none' ? html`<input type="checkbox" data-allow="${p.id}" aria-label="Select ${esc(p.name)}">` : ''}</td>` : ''}<td><b>${p.name}</b></td><td class="small">${p.activities.join(', ')}</td><td class="num">${p.days}</td><td>${p.eligible ? '✔️' : '—'}</td>
      <td>${p.status === 'ok' ? badge('Ready', 'ok') : p.status === 'issued' ? badge('Not confirmed', 'warn') : badge('Not generated', 'grey')}${p.allow_regen ? html` ${badge('may redo', 'info')}` : ''}<div class="xs muted">${p.cert_no}</div></td></tr>`)}</tbody></table></div>
      ${isOps() ? html`<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn secondary" data-act="craAllowPicked" data-on="0">Do not allow again</button><button class="btn primary" data-act="craAllowPicked" data-on="1">Allow the ticked students to be generated again</button></div>` : ''}` : empty('No students yet', '', 'users')}
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn secondary" data-act="closeModal">Close</button></div>`, { wide: true });
};
actions.craAllowPicked = async el => {
  const ids = $$('[data-allow]:checked').map(i => Number(i.dataset.allow)); if (!ids.length) return toast('Tick the students first', true);
  await api('/api/staff/certs/allow', 'POST', { campaign_id: CRA.id, college_id: window.__cinst, ids, allow: el.dataset.on === '1' });
  el.closest('.overlay').close(); toast(el.dataset.on === '1' ? 'They can generate again' : 'Done'); paintCertStatus();
};
actions.craAllow = async el => { const x = window.__cst.rows.find(r => r.id === Number(el.dataset.id)); if (!await confirmBox(`Allow ${x.name} to generate certificates again for all ${x.issued} students already generated? Use this only when something needs correcting.`, 'Allow')) return; await api('/api/staff/certs/allow', 'POST', { campaign_id: CRA.id, college_id: x.id, all: true, allow: true }); toast('Allowed'); paintCertStatus(); };
actions.craReopen = async el => { const x = window.__cst.rows.find(r => r.id === Number(el.dataset.id)); if (!await confirmBox(`Reopen the list of ${x.name} so the coordinator can change it?`, 'Reopen')) return; await api('/api/staff/certs/reopen', 'POST', { campaign_id: CRA.id, college_id: x.id }); toast('Reopened'); paintCertStatus(); };

// ---------- bring in participants from a Google Sheet link or a CSV file ----------
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x.trim())) rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function parseDay(s) {
  s = String(s || '').trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return iso(m[1], m[2], m[3]);
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/))) return iso(m[3].length === 2 ? '20' + m[3] : m[3], m[2], m[1]);
  if ((m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})/))) return iso(m[3], MONTHS[m[2].toLowerCase()], m[1]);
  return '';
}
const iso = (y, mo, d) => (Number(mo) >= 1 && Number(mo) <= 12 && Number(d) >= 1 && Number(d) <= 31 ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '');
let IMP = null;
actions.certImport = () => {
  const camp = window.__camps.find(c => c.id === CRA.id); IMP = { camp, rows: [], head: [], map: {} };
  modal(html`<h2>Import participants</h2><p class="muted small">Campaign: <b>${camp.title}</b>. Bring in a list of students from a Google Sheet or a CSV file. Each college then finds its students in its Certificates tab to verify.</p>
    <div class="stack-s" id="impstep1"><label class="f"><span>Link of the Google Sheet</span><input type="url" id="impurl" placeholder="https://docs.google.com/spreadsheets/d/…"><span class="hint">In the sheet choose <b>Share</b> and set <b>Anyone with the link: Viewer</b>. Only the first tab (or the tab in the link) is read.</span></label>
      <div class="row"><button class="btn primary" data-act="impFetch">${icon('refresh')} Read the sheet</button><span class="muted">or</span><label class="btn secondary"><input type="file" id="impfile" accept=".csv,text/csv" hidden>${icon('upload')} Upload a CSV file</label></div><div id="imperr"></div></div>
    <div id="impstep2" class="hide"></div>`, { wide: true });
  $('#impfile').addEventListener('change', async e => { const f = e.target.files[0]; if (f) impLoad(await f.text()); });
};
actions.impFetch = async () => {
  const url = $('#impurl').value.trim(); if (!url) return toast('Paste the sheet link first', true);
  $('#imperr').innerHTML = '<div class="alert info">Reading the sheet…</div>';
  try { const r = await api('/api/staff/certs/fetch-sheet', 'POST', { url }); impLoad(r.csv); } catch (e) { $('#imperr').innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
};
function impLoad(text) {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  if (rows.length < 2) { $('#imperr').innerHTML = '<div class="alert err">The sheet has no rows below its heading row.</div>'; return; }
  IMP.head = rows[0].map(h => h.trim()); IMP.rows = rows.slice(1);
  const find = re => { const i = IMP.head.findIndex(h => re.test(h)); return i < 0 ? '' : String(i); };
  IMP.map = { college: find(/college|school|institution/i), name: find(/student|volunteer|participant|name/i), date: find(/date|day/i), activity: find(/activity|event|programme|program/i) };
  $('#impstep1').classList.add('hide'); const s2 = $('#impstep2'); s2.classList.remove('hide');
  const sel = (k, req) => html`<label class="f"><span>${{ college: 'College or school column', name: 'Student name column *', date: 'Date column', activity: 'Event / activity column' }[k]}</span><select data-imp="${k}"><option value="">${req ? 'Choose…' : '— none —'}</option>${IMP.head.map((h, i) => html`<option value="${i}" ${IMP.map[k] === String(i) ? 'selected' : ''}>${h || 'Column ' + (i + 1)}</option>`)}</select></label>`;
  show(s2, html`<p><b>${IMP.rows.length}</b> rows found. Tell us which column holds what:</p><div class="formgrid">${sel('college')}${sel('name', true)}${sel('date')}${sel('activity')}</div>
    <p class="hint">No college column? Then every row is read as belonging to one institution, chosen below. No date column? The campaign's start date is used. No activity column? "Participation" is used.</p>
    <label class="f" id="impone"><span>All rows belong to</span><select id="impcol"><option value="">— use the college column —</option></select></label>
    <div class="tablewrap" style="max-height:200px"><table><thead><tr>${IMP.head.map(h => html`<th>${h}</th>`)}</tr></thead><tbody>${IMP.rows.slice(0, 5).map(r => html`<tr>${IMP.head.map((_, i) => html`<td>${r[i] || ''}</td>`)}</tr>`)}</tbody></table></div><div id="imperr2"></div>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" data-act="impGo">${icon('upload')} Import ${IMP.rows.length} rows</button></div>`);
  api('/api/staff/colleges').then(cs => { const s = $('#impcol'); if (s) s.innerHTML += cs.filter(c => c.active).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join(''); window.__impcs = cs; }).catch(() => {});
  $$('[data-imp]', s2).forEach(x => x.addEventListener('change', () => { IMP.map[x.dataset.imp] = x.value; }));
}
actions.impGo = async el => {
  const m = IMP.map, one = $('#impcol')?.value, camp = IMP.camp, today = todayISO();
  if (m.name === '') return toast('Choose the student name column', true);
  if (m.college === '' && !one) return toast('Choose the college column, or the institution all rows belong to', true);
  const fb = camp.start_date || camp.end_date || today, oneName = one ? window.__impcs?.find(c => String(c.id) === one)?.name : '';
  const rows = IMP.rows.map(r => ({ college: one ? oneName : (r[Number(m.college)] || '').trim(), name: (r[Number(m.name)] || '').trim(), date: (m.date !== '' ? parseDay(r[Number(m.date)]) : '') || (fb > today ? today : fb), activity: (m.activity !== '' ? (r[Number(m.activity)] || '').trim() : '') || 'Participation' })).filter(r => r.name);
  el.disabled = true; $('#imperr2').innerHTML = '<div class="alert info">Importing…</div>';
  try {
    let tot = { people: 0, merged: 0, entries: 0, institutions: 0, unmatched: new Map() };
    for (let i = 0; i < rows.length; i += 1500) { const r = await api('/api/staff/certs/import', 'POST', { campaign_id: camp.id, rows: rows.slice(i, i + 1500) }); tot.people += r.people; tot.merged += r.merged; tot.entries += r.entries; tot.institutions = Math.max(tot.institutions, r.institutions); r.unmatched.forEach(u => tot.unmatched.set(u.name, (tot.unmatched.get(u.name) || 0) + u.rows)); }
    show($('#impstep2'), html`<div class="alert ok">${icon('check-circle')}<div><b>Imported.</b> ${tot.people} new student${tot.people === 1 ? '' : 's'}, ${tot.merged} updated, ${tot.entries} dates, for ${tot.institutions} institution${tot.institutions === 1 ? '' : 's'}.</div></div>
      ${tot.unmatched.size ? html`<div class="alert warn" style="margin-top:10px">${icon('alert')}<div><b>${tot.unmatched.size} institution name${tot.unmatched.size === 1 ? '' : 's'} could not be matched</b> to a registered college or school, so those rows were skipped. Fix the spelling in the sheet, or choose the institution above, and import again:<div class="small" style="margin-top:6px">${[...tot.unmatched].slice(0, 25).map(([n, c]) => html`<div>${n} <span class="muted">(${c} rows)</span></div>`)}${tot.unmatched.size > 25 ? '…' : ''}</div></div></div>` : ''}
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" data-act="closeModal">Done</button></div>`);
    paintCertStatus();
  } catch (e) { $('#imperr2').innerHTML = `<div class="alert err">${esc(e.message)}</div>`; el.disabled = false; }
};
