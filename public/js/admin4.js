'use strict';
// ---- staff console: certificate campaigns, every institution's progress, regeneration access, import from a sheet ----
let CRA = { id: null, kind: '', q: '', f: '' };
const craDay = d => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

async function apCerts(el) {
  const d = await api('/api/staff/certs/campaigns'); window.__camps = d.campaigns; window.__ctpls = d.templates;
  if (!d.campaigns.some(c => c.id === CRA.id)) CRA.id = d.campaigns[0]?.id || null;
  const ops = isOps();
  show(el, html`${pageHead('Certificates', 'Open a campaign, choose its certificate design, and follow every college and school from the list of students to the generated certificates.', ops ? html`<button class="btn secondary" data-act="certImport">${icon('upload')} Import participants</button><button class="btn primary" data-act="campAdd">${icon('plus')} New campaign</button>` : '', 'Campus to booth')}
    ${d.campaigns.length ? html`<div class="campgrid">${d.campaigns.map(c => html`<div class="campcard ${c.id === CRA.id ? 'on' : ''}"><button class="camppick" data-act="campPick" data-id="${c.id}" aria-label="Show ${esc(c.title)}"><b>${c.title}</b><div class="small muted">${c.description || ''}${c.start_date || c.end_date ? ` ${c.description ? '· ' : ''}${craDay(c.start_date) || ''} to ${craDay(c.end_date) || 'now'}` : ''}</div>
        <div class="pillrow" style="margin-top:6px">${c.live ? badge('Open for colleges', 'ok') : badge('Switched off', 'grey')}${c.template ? badge('Design: ' + c.template.title, c.template.active ? 'info' : 'warn') : badge('No design chosen', 'warn')}</div>
        <div class="xs muted" style="margin-top:6px">${n(c.totals.colleges)} institutions · ${n(c.totals.people)} students · ${n(c.totals.ok)} certificates made</div></button>
        ${ops ? html`<div class="row gap-s campact"><button class="ib" data-act="campLive" data-id="${c.id}" title="${c.live ? 'Switch off for colleges' : 'Open for colleges'}" aria-label="${c.live ? 'Switch off' : 'Open'}">${icon(c.live ? 'pause' : 'play')}</button><button class="ib" data-act="campEdit" data-id="${c.id}" title="Edit" aria-label="Edit">${icon('edit')}</button><button class="ib danger" data-act="campDel" data-id="${c.id}" title="Delete" aria-label="Delete">${icon('trash')}</button></div>` : ''}</div>`)}</div>`
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
  const rows = r.rows, tot = rows.reduce((t, x) => ({ inst: t.inst + (x.people ? 1 : 0), people: t.people + x.people, sel: t.sel + x.eligible, issued: t.issued + x.issued, ok: t.ok + x.ok, rem: t.rem + x.remaining, sub: t.sub + (x.batch === 'submitted' ? 1 : 0), appr: t.appr + (x.batch === 'approved' ? 1 : 0) }), { appr: 0, inst: 0, people: 0, sel: 0, issued: 0, ok: 0, rem: 0, sub: 0 });
  show(box, html`<div class="kpis">${kpi('Institutions with a list', `${tot.inst}/${rows.length}`, { ic: 'building', count: false, sub: `${tot.sub} awaiting your approval · ${tot.appr} approved` })}${kpi('Students listed', tot.people, { ic: 'users' })}${kpi('Selected for certificates', tot.sel, { ic: 'user-check', tone: 'green' })}${kpi('Certificates generated', tot.issued, { ic: 'certificate', tone: 'saffron' })}${kpi('Successful', tot.ok, { ic: 'check-circle', tone: 'green', sub: `${tot.issued - tot.ok} awaiting confirmation` })}${kpi('Remaining to generate', tot.rem, { ic: 'clock', tone: 'info' })}</div>
    <div class="card pad0" style="margin-top:16px"><div class="filterbar"><div class="chips">${[['', 'All'], ['college', 'Colleges'], ['school', 'Schools'], ['submitted', 'Awaiting approval'], ['approved', 'Approved'], ['open', 'Not sent']].map(([k, l]) => html`<button class="chip ${CRA.f === k ? 'on' : ''}" data-act="craFilter" data-k="${k}">${l}</button>`)}</div>${searchBox('craq', 'Search institutions…')}<button class="btn secondary sm" data-act="craCsv">${icon('download')} Download status (CSV)</button></div>
      <div class="tablewrap ctable"><table><caption class="sr">Certificate progress</caption><thead><tr><th>Institution</th><th>Coordinator</th><th class="num">Listed</th><th class="num">Selected</th><th>Final list</th><th class="num">Generated</th><th class="num">Successful</th><th class="num">Remaining</th><th class="ia">Actions</th></tr></thead><tbody>
      ${rows.map(x => html`<tr class="crow" data-q="${esc((x.name + ' ' + (x.coordinator || '')).toLowerCase())}" data-kind="${x.kind}" data-b="${x.batch}"><td class="wide"><b>${x.name}</b> <span class="xs muted">${x.kind === 'school' ? 'School' : 'College'}</span></td><td class="small">${x.coordinator || '—'}${x.phone ? html`<div>${icon('phone')} ${x.phone}</div>` : ''}</td>
        <td class="num">${x.people}</td><td class="num">${x.eligible}</td><td>${x.batch === 'submitted' ? html`${badge('Awaiting approval', 'warn')}<div class="xs muted">${x.submitted_at ? craDay(x.submitted_at.slice(0, 10)) : ''}</div>` : x.batch === 'approved' ? html`${badge('Approved', 'ok')}<div class="xs muted">${x.approved_by || ''}</div>` : x.people ? badge('In progress', 'warn') : badge('Not started', 'grey')}</td>
        <td class="num">${x.issued}</td><td class="num">${x.ok}</td><td class="num"><b>${x.remaining}</b>${x.allowed ? html`<div class="xs muted">${x.allowed} may redo</div>` : ''}</td>
        <td class="ia"><div class="row gap-s nowrap"><button class="ib" data-act="craView" data-id="${x.id}" title="See the students" aria-label="See the students">${icon('eye')}</button>${isOps() ? html`<button class="ib" data-act="craApprove" data-id="${x.id}" title="Approve the request" aria-label="Approve" ${x.batch === 'submitted' ? '' : 'disabled'}>${icon('check-circle')}</button><button class="ib danger" data-act="craReject" data-id="${x.id}" title="Send back with a reason" aria-label="Send back" ${x.batch === 'submitted' ? '' : 'disabled'}>${icon('x')}</button><button class="ib" data-act="craAllow" data-id="${x.id}" title="Allow this institution to generate again for everyone" aria-label="Allow generating again" ${x.issued ? '' : 'disabled'}>${icon('unlock')}</button><button class="ib" data-act="craReopen" data-id="${x.id}" title="Reopen the list for changes" aria-label="Reopen the list" ${['submitted', 'approved'].includes(x.batch) ? '' : 'disabled'}>${icon('undo')}</button>` : ''}</div></td></tr>`)}</tbody></table></div></div>`);
  const apply = () => { const v = ($('#craq')?.value || '').toLowerCase(), f = CRA.f; $$('.crow').forEach(rw => rw.classList.toggle('hide', !((!v || rw.dataset.q.includes(v)) && (!f || (f === 'college' || f === 'school' ? rw.dataset.kind === f : f === 'submitted' || f === 'approved' ? rw.dataset.b === f : !['submitted', 'approved'].includes(rw.dataset.b)))))); };
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
    ${people.length ? html`<div class="tablewrap" style="max-height:52vh"><table><thead><tr>${isOps() ? html`<th></th>` : ''}<th>Student</th><th>Activities</th><th class="num">Days</th><th>Selected</th><th>Certificate</th></tr></thead><tbody>${people.map(p => html`<tr>${isOps() ? html`<td>${p.status !== 'none' ? html`<input type="checkbox" data-allow="${p.id}" aria-label="Select ${esc(p.name)}">` : ''}</td>` : ''}<td><b>${p.name}</b></td><td class="small">${p.activities.join(', ')}</td><td class="num">${p.days}</td><td>${p.eligible ? icon('check') : '—'}</td>
      <td>${p.status === 'ok' ? badge('Ready', 'ok') : p.status === 'issued' ? badge('Not confirmed', 'warn') : badge('Not generated', 'grey')}${p.allow_regen ? html` ${badge('may redo', 'info')}` : ''}<div class="xs muted">${p.cert_no}</div></td></tr>`)}</tbody></table></div>
      ${isOps() ? html`<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn secondary" data-act="craAllowPicked" data-on="0">Do not allow again</button><button class="btn primary" data-act="craAllowPicked" data-on="1">Allow the ticked students to be generated again</button></div>` : ''}` : empty('No students yet', '', 'users')}
    <div class="row" style="justify-content:flex-end;margin-top:12px">${isOps() && x.batch === 'submitted' ? html`<button class="btn ghost danger" data-act="craReject" data-id="${id}">Send back</button><button class="btn primary" data-act="craApprove" data-id="${id}">${icon('check-circle')} Approve</button>` : ''}<button class="btn secondary" data-act="closeModal">Close</button></div>`, { wide: true });
};
actions.craAllowPicked = async el => {
  const ids = $$('[data-allow]:checked').map(i => Number(i.dataset.allow)); if (!ids.length) return toast('Tick the students first', true);
  await api('/api/staff/certs/allow', 'POST', { campaign_id: CRA.id, college_id: window.__cinst, ids, allow: el.dataset.on === '1' });
  el.closest('.overlay').close(); toast(el.dataset.on === '1' ? 'They can generate again' : 'Done'); paintCertStatus();
};
actions.craAllow = async el => { const x = window.__cst.rows.find(r => r.id === Number(el.dataset.id)); if (!await confirmBox(`Allow ${x.name} to generate certificates again for all ${x.issued} students already generated? Use this only when something needs correcting.`, 'Allow')) return; await api('/api/staff/certs/allow', 'POST', { campaign_id: CRA.id, college_id: x.id, all: true, allow: true }); toast('Allowed'); paintCertStatus(); };
actions.craApprove = async el => {
  const x = window.__cst.rows.find(r => r.id === Number(el.dataset.id));
  if (!await confirmBox(`Approve the request of ${x.name}? It can then generate certificates for its ${x.eligible} selected student${x.eligible === 1 ? '' : 's'}.`, 'Approve')) return;
  await api('/api/staff/certs/approve', 'POST', { campaign_id: CRA.id, college_id: x.id }); document.querySelector('.overlay')?.close?.(); toast('Approved: the institution can now generate its certificates'); paintCertStatus();
};
actions.craReject = el => {
  const x = window.__cst.rows.find(r => r.id === Number(el.dataset.id)); document.querySelector('.overlay')?.close?.();
  modal(html`<h2>Send the list back</h2><p class="muted small">${x.name}. The coordinator sees your reason and can correct the list and send it again.</p><form data-form="craRejectF" data-id="${x.id}" class="stack-s"><label class="f"><span>Reason *</span><textarea name="note" required maxlength="300" rows="3" placeholder="For example: three names are spelt differently from the college records"></textarea></label>${mfoot('Send back')}</form>`);
};
forms.craRejectF = async f => { await api('/api/staff/certs/reject', 'POST', { campaign_id: CRA.id, college_id: Number(f.dataset.id), note: fd(f).note }); f.closest('.overlay').close(); toast('Sent back to the institution'); paintCertStatus(); };
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
// Reads the many ways a day is typed: 2026-10-30, 30/10/2026, 30-10-26, 30 Oct 2026, 30 Oct, 30th October, Oct 30, an Excel day number.
// When the year is missing, `yr` is used; a day that would then fall in the future is taken to be from the year before.
function parseDay(s, yr) {
  s = String(s || '').trim(); let m;
  const mon = x => MONTHS[String(x).slice(0, 3).toLowerCase()], full = y => (String(y).length === 2 ? '20' + y : String(y));
  const noYear = (mo, d) => { const y = Number(yr) || new Date().getFullYear(); let r = iso(y, mo, d); if (r && r > todayISO()) r = iso(y - 1, mo, d); return r; };
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return iso(m[1], m[2], m[3]);
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/))) return iso(full(m[3]), m[2], m[1]);
  if (/^\d{5}$/.test(s)) { const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 864e5); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-\/.,]*([A-Za-z]{3,9})\.?(?:[\s,.\-\/]+(\d{2,4}))?\s*$/)) && mon(m[2])) return m[3] ? iso(full(m[3]), mon(m[2]), m[1]) : noYear(mon(m[2]), m[1]);
  if ((m = s.match(/^([A-Za-z]{3,9})\.?[\s\-\/.]*(\d{1,2})(?:st|nd|rd|th)?(?:[\s,.\-\/]+(\d{2,4}))?\s*$/)) && mon(m[1])) return m[3] ? iso(full(m[3]), mon(m[1]), m[2]) : noYear(mon(m[1]), m[2]);
  return '';
}
const iso = (y, mo, d) => (Number(mo) >= 1 && Number(mo) <= 12 && Number(d) >= 1 && Number(d) <= 31 ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '');
// The wizard: read a Google Sheet link, an Excel file or a CSV; match the columns; check every institution name against the portal; then add the
// students to a campaign's certificate list, to the institutions' own volunteer records (their Daily report page and the reports), or both.
let IMP = null;
const nrmName = s => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/\b(the|of)\b/g, ' ').replace(/[^a-z0-9]+/g, '');
const wordsOf = s => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'college', 'school', 'arts', 'science'].includes(w)));
// Closest portal institution for a typed name ("DIGNITY COLLAGE OF ART'S AND SCIENCE PERAMBRA"): compares the distinctive words (spelling slips of one letter
// allowed). A suggestion is made only when one institution is clearly the best.
const fixWord = w => ({ collage: 'college', colleges: 'college', govt: 'government', gov: 'government', sci: 'science', scnce: 'science' })[w] || w;
const keyWords = s => [...new Set(String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).map(fixWord).filter(w => w && !['the', 'of', 'and', 'for', 'college', 'school', 'arts', 'art', 's', 'science', 'sc', 'autonomous', 'higher', 'secondary', 'hss', 'vhse', 'hs', 'ghss', 'women', 'womens', 'kozhikode', 'calicut'].includes(w)))];
const sameWord = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && Math.abs(a.length - b.length) <= 1 && editOne(a, b));
function editOne(a, b) { if (a.length < b.length) [a, b] = [b, a]; let i = 0; while (i < b.length && a[i] === b[i]) i++; return a.length === b.length ? a.slice(i + 1) === b.slice(i + 1) : a.slice(i + 1) === b.slice(i); }
function impSuggest(name) {
  const w = keyWords(name); if (!w.length) return null;
  const scored = IMP.cs.map(c => { const cw = keyWords(c.name); if (!cw.length) return { c, s: 0 }; const hit = w.filter(x => cw.some(y => sameWord(x, y))).length; return { c, s: hit / Math.max(w.length, cw.length) * 0.5 + hit / Math.min(w.length, cw.length) * 0.5, hit }; }).sort((a, b) => b.s - a.s);
  const a = scored[0], b = scored[1];
  return a && a.hit >= 1 && a.s >= 0.75 && (!b || a.s - b.s >= 0.15) ? a.c.name : null;
}
async function openImport(campId) {
  let camps = [], cs = [];
  try { [camps, cs] = await Promise.all([api('/api/staff/certs/campaigns').then(d => d.campaigns), api('/api/staff/colleges')]); } catch (e) { return toast(e.message, true); }
  IMP = { camps, cs: cs.filter(c => c.active), head: [], rows: [], map: {}, fix: {}, wb: null, sheet: '' };
  modal(html`<h2>Import participating students</h2>
    <p class="muted small">Bring in a list of students from a Google Sheet or an Excel file. Each row should name the institution exactly as it is in the portal. Then choose where the students go, and each college and school will see its own students.</p>
    <div class="stack-s" id="impstep1"><label class="f"><span>Link of a Google Sheet</span><input type="url" id="impurl" placeholder="https://docs.google.com/spreadsheets/d/…"><span class="hint">In the sheet choose <b>Share</b> and set <b>Anyone with the link: Viewer</b>. The first tab (or the tab in the link) is read.</span></label>
      <div class="row"><button class="btn primary" data-act="impFetch">${icon('refresh')} Read the sheet</button><span class="muted">or</span><label class="btn secondary"><input type="file" id="impfile" accept=".xlsx,.xls,.csv,text/csv" hidden>${icon('upload')} Upload an Excel or CSV file</label></div><div id="imperr"></div></div>
    <div id="impstep2" class="hide"></div>`, { wide: true });
  IMP.campId = campId ? String(campId) : '';
  $('#impfile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    $('#imperr').innerHTML = '<div class="alert info">Reading the file…</div>';
    try {
      if (/\.(xlsx|xls)$/i.test(f.name)) {
        await loadXlsx(); IMP.wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
        const names = IMP.wb.SheetNames; IMP.sheet = names.find(n => { const ws = IMP.wb.Sheets[n]; return ws && ws['!ref']; }) || names[0]; impSheet();
      } else impLoad(parseCsv((await f.text()).replace(/^﻿/, '')));
    } catch (err) { $('#imperr').innerHTML = `<div class="alert err">${esc(err.message || 'That file could not be read')}</div>`; }
  });
}
let xlsxLib = null;
const loadXlsx = () => (xlsxLib ||= loadScript('/vendor/xlsx/xlsx.full.min.js'));
function impSheet() {
  const ws = IMP.wb.Sheets[IMP.sheet];
  for (const k in ws) { const c = ws[k]; if (c && c.t === 'd') { c.z = 'yyyy-mm-dd'; delete c.w; } }   // dates always read as year-month-day
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd', blankrows: false, defval: '' }).map(r => r.map(c => String(c ?? '').trim()));
  impLoad(rows.filter(r => r.some(c => c)));
}
actions.impFetch = async () => {
  const url = $('#impurl').value.trim(); if (!url) return toast('Paste the sheet link first', true);
  $('#imperr').innerHTML = '<div class="alert info">Reading the sheet…</div>';
  try { const r = await api('/api/staff/certs/fetch-sheet', 'POST', { url }); impLoad(parseCsv(r.csv.replace(/^﻿/, ''))); } catch (e) { $('#imperr').innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
};
function impLoad(rows) {
  if (rows.length < 2) { $('#imperr').innerHTML = '<div class="alert err">The file has no rows below its heading row.</div>'; return; }
  const width = Math.max(...rows.slice(0, 50).map(r => r.length));
  IMP.head = Array.from({ length: width }, (_, i) => String(rows[0][i] || '').trim()); IMP.rows = rows.slice(1).map(r => Array.from({ length: width }, (_, i) => String(r[i] || '').trim()));
  const find = re => { const i = IMP.head.findIndex(h => re.test(h)); return i < 0 ? '' : String(i); };
  IMP.map = { college: find(/college|school|institution/i), name: find(/(student|volunteer|participant).*name|name.*(student|volunteer|participant)/i) || find(/student|volunteer|participant|name/i), date: find(/^(date|day)\b|\b(date|day)$/i) || find(/date|day/i), activity: find(/activity|event|programme|program/i) };
  if (IMP.map.name === IMP.map.college) IMP.map.name = '';
  $('#impstep1').classList.add('hide'); $('#impstep2').classList.remove('hide'); impPaint();
}
function impPaint() {
  const s2 = $('#impstep2'), sel = (k, req) => html`<label class="f"><span>${{ college: 'Institution column', name: 'Student name column *', date: 'Date column', activity: 'Event / activity column' }[k]}</span><select data-imp="${k}"><option value="">${req ? 'Choose…' : '— none —'}</option>${IMP.head.map((h, i) => html`<option value="${i}" ${IMP.map[k] === String(i) ? 'selected' : ''}>${h || 'Column ' + (i + 1)}</option>`)}</select></label>`;
  const old = { one: $('#impcol')?.value || '', camp: $('#impcamp')?.value ?? IMP.campId, vols: $('#impvols') ? $('#impvols').checked : true, year: $('#impyear')?.value || String(new Date().getFullYear()) };
  show(s2, html`<p><b>${IMP.rows.length}</b> rows found${IMP.wb && IMP.wb.SheetNames.length > 1 ? html`. Sheet: <select id="impsheet" aria-label="Sheet">${IMP.wb.SheetNames.map(n => html`<option ${n === IMP.sheet ? 'selected' : ''}>${n}</option>`)}</select>` : ''}. Tell us which column holds what:</p>
    <div class="formgrid">${sel('college')}${sel('name', true)}${sel('date')}${sel('activity')}<label class="f"><span>Year, for dates typed without one</span><input type="number" id="impyear" min="2000" max="2100" value="${esc(old.year)}"></label></div>
    <div id="impdates"></div>
    <p class="hint">No institution column? Choose the one institution all rows belong to. No date column: the campaign's start date is used for the certificate list, and the volunteer records skip rows without a date. No activity column: "Participation" is used.</p>
    <label class="f"><span>All rows belong to (leave empty if the file has an institution column)</span><select id="impcol"><option value="">— use the institution column —</option>${IMP.cs.map(c => html`<option value="${c.id}" ${String(c.id) === old.one ? 'selected' : ''}>${c.name}</option>`)}</select></label>
    <div class="card" style="background:#fafbff"><b>Add the students to</b>
      <label class="chk" style="margin-top:8px"><input type="checkbox" id="impvols" ${old.vols ? 'checked' : ''}> Each college's and school's own volunteer records (shown on its Daily report page and in the reports)</label>
      <label class="f" style="margin-top:8px"><span>Certificate list of a campaign (optional)</span><select id="impcamp"><option value="">— not now —</option>${IMP.camps.map(c => html`<option value="${c.id}" ${String(c.id) === String(old.camp) ? 'selected' : ''}>${c.title}</option>`)}</select></label></div>
    <div class="tablewrap" style="max-height:170px;margin-top:10px"><table data-nosort><thead><tr>${IMP.head.map((h, i) => html`<th>${h || 'Column ' + (i + 1)}</th>`)}</tr></thead><tbody>${IMP.rows.slice(0, 4).map(r => html`<tr>${r.map(c => html`<td>${c}</td>`)}</tr>`)}</tbody></table></div>
    <div id="impmatch" style="margin-top:12px"></div><div id="imperr2"></div>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" data-act="impGo">${icon('upload')} Import</button></div>`);
  $$('[data-imp]', s2).forEach(x => x.addEventListener('change', () => { IMP.map[x.dataset.imp] = x.value; impMatch(); }));
  $('#impcol', s2).addEventListener('change', impMatch); $('#impyear', s2).addEventListener('input', impDates);
  $('#impsheet', s2)?.addEventListener('change', e => { IMP.sheet = e.target.value; IMP.fix = {}; impSheet(); });
  impMatch();
}
// every institution name in the file is checked against the portal; names that do not match are shown so the right one can be chosen
function impNames() {
  const m = IMP.map, one = $('#impcol')?.value; if (one || m.college === '') return null;
  const by = new Map(); for (const r of IMP.rows) { const n = (r[Number(m.college)] || '').trim(); if (n) by.set(n, (by.get(n) || 0) + 1); } return by;
}
const impYear = () => Number($('#impyear')?.value) || new Date().getFullYear();
// how many dates in the file can be read, and how they will be read
function impDates() {
  const box = $('#impdates'); if (!box) return; const c = IMP.map.date;
  if (c === '') { box.innerHTML = ''; return; }
  const seen = new Map(); let bad = 0, blank = 0;
  for (const r of IMP.rows) { const v = (r[Number(c)] || '').trim(); if (!v) { blank++; continue; } const d = parseDay(v, impYear()); if (d) seen.set(v, d); else bad++; }
  const sample = [...seen].slice(0, 6).map(([v, d]) => `${v} → ${d}`).join(', ');
  show(box, html`<div class="alert ${bad || blank ? 'warn' : 'ok'}">${icon(bad || blank ? 'alert' : 'check-circle')}<div>${seen.size ? html`Dates are read like this: <b>${sample}</b>${seen.size > 6 ? ', …' : ''}.` : 'No date could be read in this column.'}${bad ? html` <b>${bad}</b> row${bad === 1 ? ' has' : 's have'} a date that cannot be read.` : ''}${blank ? html` <b>${blank}</b> row${blank === 1 ? ' has' : 's have'} no date.` : ''}${bad || blank ? ' Those rows are not added to the volunteer records (they are listed in the file you can download after the import).' : ''}</div></div>`);
}
function impMatch() {
  const box = $('#impmatch'); if (!box) return; impDates();
  const by = impNames(); if (!by) { show(box, $('#impcol')?.value ? html`<div class="alert info">${icon('check-circle')}<div>All rows will be added to <b>${IMP.cs.find(c => String(c.id) === $('#impcol').value)?.name}</b>.</div></div>` : html`<p class="muted small">Choose the institution column to check the names.</p>`); return; }
  const exact = new Map(IMP.cs.map(c => [nrmName(c.name), c])); let ok = 0, okRows = 0; const bad = [];
  for (const [n, k] of by) { if (exact.has(nrmName(n))) { ok++; okRows += k; } else bad.push([n, k]); }
  let auto = 0; for (const [n] of bad) { if (IMP.fix[n] === undefined) { const g = impSuggest(n); if (g) IMP.fix[n] = g; } if (IMP.fix[n] && IMP.fix[n] !== '') auto++; }
  bad.sort((a, b) => (IMP.fix[a[0]] ? 1 : 0) - (IMP.fix[b[0]] ? 1 : 0) || b[1] - a[1]);
  const options =n => { const w = wordsOf(n), scored = IMP.cs.map(c => { const cw = wordsOf(c.name); let hit = 0; w.forEach(x => { if (cw.has(x)) hit++; }); return { c, hit }; }).sort((a, b) => b.hit - a.hit || a.c.name.localeCompare(b.c.name)); return scored; };
  show(box, html`<div class="alert ${bad.length ? 'warn' : 'ok'}">${icon(bad.length ? 'alert' : 'check-circle')}<div><b>${ok} of ${by.size} institution names match the portal</b> (${okRows} rows).${bad.length ? ` ${bad.length} name${bad.length === 1 ? ' is' : 's are'} spelled differently${auto ? `; for ${auto} of them the closest institution is already chosen below` : ''}. Please check them, and choose the right institution for the rest (or skip those rows).` : ''}</div></div>
    ${bad.length ? html`<div class="tablewrap" style="max-height:230px;margin-top:8px"><table data-nosort><thead><tr><th>Name in the file</th><th class="num">Rows</th><th>Portal institution</th></tr></thead><tbody>${bad.slice(0, 60).map(([n, k]) => html`<tr><td>${n}</td><td class="num">${k}</td><td><select data-fix="${esc(n)}" aria-label="Institution for ${esc(n)}"><option value="">Skip these rows</option>${options(n).slice(0, 400).map(({ c, hit }, i) => html`<option value="${esc(c.name)}" ${IMP.fix[n] === c.name ? 'selected' : ''}>${hit && i < 3 && IMP.fix[n] !== c.name ? 'Similar: ' : ''}${c.name}</option>`)}</select></td></tr>`)}</tbody></table></div>${bad.length > 60 ? html`<p class="hint">${bad.length - 60} more names are not shown. Fix the spelling in the file for those and import again.</p>` : ''}` : ''}`);
  $$('[data-fix]', box).forEach(s => s.addEventListener('change', () => { IMP.fix[s.dataset.fix] = s.value; }));
}
actions.impGo = async el => {
  const m = IMP.map, one = $('#impcol')?.value, campId = $('#impcamp')?.value || '', vols = $('#impvols')?.checked, camp = IMP.camps.find(c => String(c.id) === campId), today = todayISO();
  if (m.name === '') return toast('Choose the student name column', true);
  if (m.college === '' && !one) return toast('Choose the institution column, or the institution all rows belong to', true);
  if (!camp && !vols) return toast('Choose where to add the students', true);
  const fb = camp?.start_date || camp?.end_date || today, oneName = one ? IMP.cs.find(c => String(c.id) === one)?.name : '';
  const exact = new Map(IMP.cs.map(c => [nrmName(c.name), c.name]));
  IMP.rej = [];
  const rows = IMP.rows.map(r => {
    const raw = one ? oneName : (r[Number(m.college)] || '').trim(), college = one ? oneName : (exact.get(nrmName(raw)) || IMP.fix[raw] || '');
    const d = m.date !== '' ? parseDay(r[Number(m.date)], impYear()) : '';
    const o = { college, name: (r[Number(m.name)] || '').trim(), date: d || (camp && !vols ? (fb > today ? today : fb) : (camp && m.date === '' ? (fb > today ? today : fb) : '')), activity: (m.activity !== '' ? (r[Number(m.activity)] || '').trim() : '') || 'Participation' };
    const why = !o.name ? 'No student name' : !college ? (raw ? 'Institution not matched to the portal' : 'No institution') : (vols && !o.date ? 'Date missing or not readable (not added to volunteer records)' : '');
    if (why) IMP.rej.push([why, ...r]);
    return o;
  }).filter(r => r.name && r.college);
  const skipped = IMP.rows.length - rows.length;
  if (!rows.length) return toast('No rows could be matched to an institution', true);
  el.disabled = true; $('#imperr2').innerHTML = '<div class="alert info">Importing… please keep this window open.</div>';
  try {
    const tot = { people: 0, merged: 0, entries: 0, recorded: 0, no_date: 0, institutions: new Set(), unmatched: new Map() };
    for (let i = 0; i < rows.length; i += 1200) {
      $('#imperr2').innerHTML = `<div class="alert info">Importing… ${Math.min(i + 1200, rows.length)} of ${rows.length}</div>`;
      const r = await api('/api/staff/certs/import', 'POST', { campaign_id: camp ? camp.id : null, volunteers: !!vols, rows: rows.slice(i, i + 1200) });
      tot.people += r.people; tot.merged += r.merged; tot.entries += r.entries; tot.recorded += r.recorded; tot.no_date += r.no_date; tot.instN = Math.max(tot.instN || 0, r.institutions); r.unmatched.forEach(u => tot.unmatched.set(u.name, (tot.unmatched.get(u.name) || 0) + u.rows));
    }
    show($('#impstep2'), html`<div class="alert ok">${icon('check-circle')}<div><b>Imported</b> for ${tot.instN || 0} institution${tot.instN === 1 ? '' : 's'}.<ul style="margin:6px 0 0 18px">${vols ? html`<li>${tot.recorded} volunteer record${tot.recorded === 1 ? '' : 's'} added to the colleges' and schools' Daily report pages and reports${tot.no_date ? ` (${tot.no_date} student${tot.no_date === 1 ? '' : 's'} had no valid date and were not recorded)` : ''}.</li>` : ''}${camp ? html`<li>Certificate list of <b>${camp.title}</b>: ${tot.people} new student${tot.people === 1 ? '' : 's'}, ${tot.merged} updated.</li>` : ''}</ul></div></div>
      ${skipped ? html`<div class="alert warn" style="margin-top:10px">${icon('alert')}<div>${skipped} row${skipped === 1 ? ' was' : 's were'} skipped (no student name, or the institution did not match the portal).</div></div>` : ''}
      <div class="row" style="justify-content:flex-end;margin-top:12px">${IMP.rej.length ? html`<button class="btn secondary" data-act="impRej">${icon('download')} Download the ${IMP.rej.length} rows that were not added</button>` : ''}<button class="btn primary" data-act="closeModal">Done</button></div>`);
    if ($('#certstatus')) paintCertStatus();
  } catch (e) { $('#imperr2').innerHTML = `<div class="alert err">${esc(e.message)}</div>`; el.disabled = false; }
};
actions.impRej = () => download('rows-not-added.csv', toCsv(['Reason', ...IMP.head.map((h, i) => h || 'Column ' + (i + 1))], IMP.rej));
actions.certImport =() => openImport(CRA.id);
actions.partImport = () => openImport(null);
