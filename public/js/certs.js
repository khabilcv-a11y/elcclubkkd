'use strict';
// ---- college / school workspace: participation certificates ----
// 1. the students taken from the daily reports are listed, 2. the coordinator verifies them (tick, edit dates and events, add, remove),
// 3. submits the final list, 4. generates the certificates once, 5. downloads them one by one or as a zip.
let CRT = { list: null, id: null, d: null, q: '', filter: '', sort: ['name', 1], pick: new Set(), blobs: new Map(), busy: false };
const certMon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const certDay = d => (d ? `${Number(d.slice(8, 10))} ${certMon[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` : '');
const certRange = (a, b) => (!a ? '' : a === b ? certDay(a) : `${certDay(a)} to ${certDay(b)}`);
const certStatus = p => (p.status === 'ok' ? badge('Ready', 'ok') : p.status === 'issued' ? badge('Issued, not confirmed', 'warn') : badge('Not generated', 'grey'));

async function pgCerts(el) {
  CRT.list = await api('/api/college/certs');
  if (!CRT.list.length) return show(el, html`${pageHead('Certificates', 'Participation certificates for your students.', '', 'Campus to booth')}<div class="card">${empty('No certificates open yet', 'When the district office opens a campaign for certificates, it appears here. You will then verify your students and generate their certificates.', 'certificate')}</div>`);
  if (!CRT.list.some(c => c.id === CRT.id)) CRT.id = CRT.list[0].id;
  await loadCert();
}
async function loadCert() {
  let d = await api('/api/college/certs/' + CRT.id);
  if (!d.batch.synced && d.batch.status !== 'submitted') { await api(`/api/college/certs/${CRT.id}/sync`, 'POST'); d = await api('/api/college/certs/' + CRT.id); }
  CRT.d = d; CRT.pick = new Set(); paintCert();
}
const certPeople = () => {
  const q = CRT.q.toLowerCase().trim(), [k, dir] = CRT.sort, sub = CRT.d.batch.status === 'submitted';
  let rows = CRT.d.people.filter(p => (!q || p.name.toLowerCase().includes(q) || p.activities.join(' ').toLowerCase().includes(q)) && (!sub || p.eligible) && (CRT.filter === 'on' ? p.eligible : CRT.filter === 'off' ? !p.eligible : true));
  rows = [...rows].sort((a, b) => (k === 'days' ? a.days - b.days : k === 'last' ? String(a.last).localeCompare(b.last) : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })) * dir || a.name.localeCompare(b.name));
  return rows;
};
const certActChips = p => html`<span class="pillrow tight">${p.activities.slice(0, 4).map(a => html`<span class="pill sm">${a}</span>`)}${p.activities.length > 4 ? html`<span class="muted small">+${p.activities.length - 4}</span>` : ''}</span>`;
function paintCert() {
  const el = $('#pg'), d = CRT.d, c = d.campaign, sub = d.batch.status === 'submitted', t = d.template, all = d.people, sel = all.filter(p => p.eligible);
  const cands = sel.filter(p => p.status === 'none' || p.allow_regen), done = sel.filter(p => p.status !== 'none').length;
  const rows = certPeople(), sortMark = k => (CRT.sort[0] === k ? (CRT.sort[1] === 1 ? ' ▲' : ' ▼') : '');
  const step = (n, label, on, ok) => html`<div class="cstep ${ok ? 'done' : on ? 'on' : ''}"><span>${ok ? icon('check') : n}</span>${label}</div>`;
  show(el, html`${pageHead('Certificates', 'Verify the students who took part, submit the final list, then generate their certificates.', CRT.list.length > 1 ? html`<label class="f" style="margin:0"><span class="sr">Campaign</span><select id="certcamp">${CRT.list.map(x => html`<option value="${x.id}" ${x.id === CRT.id ? 'selected' : ''}>${x.title}</option>`)}</select></label>` : '', 'Campus to booth')}
    <div class="card" style="margin-bottom:16px"><div class="row between"><div><h3 style="margin:0">${c.title}</h3><div class="small muted">${c.description || ''}${c.start_date || c.end_date ? html` ${c.description ? '· ' : ''}${certDay(c.start_date) || 'Start'} to ${certDay(c.end_date) || 'now'}` : ''}</div></div><div class="csteps">${step(1, 'Verify', !sub, sub)}${step(2, 'Submit', !sub, sub)}${step(3, 'Generate', sub, sub && done > 0 && !cands.length)}</div></div></div>
    ${sub ? html`<div class="alert info" style="margin-bottom:16px">${icon('check-circle')}<div><b>Final list submitted</b>${d.batch.submitted_at ? ' on ' + fdt(d.batch.submitted_at) : ''}. ${sel.length} student${sel.length === 1 ? '' : 's'} selected. ${t ? '' : 'The certificate design is not live yet; the Generate button appears when the district office switches it on.'}</div></div>` : ''}
    ${sub ? html`<div class="card" style="margin-bottom:16px"><div class="row between"><div><b>${done} of ${sel.length} certificates generated</b><div class="small muted">${cands.length ? `${cands.length} ready to generate${cands.some(p => p.allow_regen) ? ' (some re-generation allowed by the district office)' : ''}.` : done ? 'Each certificate is generated only once. You can download them as many times as you like. If one needs to be made again, ask the district office to allow it.' : ''}</div></div>
      <div class="row gap-s"><button class="btn primary" data-act="certGen" ${t && cands.length ? '' : 'disabled'}>${icon('certificate')} Generate ${cands.length ? `(${cands.length})` : ''}</button><button class="btn secondary" data-act="certZip" data-m="picked" ${done ? '' : 'disabled'}>${icon('download')} Download selected (ZIP)</button><button class="btn secondary" data-act="certZip" data-m="all" ${done ? '' : 'disabled'}>${icon('download')} Download all (ZIP)</button></div></div></div>` : ''}
    <div class="card pad0"><div class="filterbar"><label class="f" style="min-width:220px"><span class="sr">Search</span><input type="search" id="certq" placeholder="Search a student or activity…" value="${esc(CRT.q)}"></label>
      ${sub ? '' : html`<div class="chips" role="group" aria-label="Show">${[['', 'All'], ['on', 'Selected'], ['off', 'Not selected']].map(([k, l]) => html`<button class="chip ${CRT.filter === k ? 'on' : ''}" data-act="certFilter" data-k="${k}">${l}</button>`)}</div>
        <div class="row gap-s" style="margin-left:auto"><button class="btn secondary sm" data-act="certSel" data-m="all">Select all</button><button class="btn secondary sm" data-act="certSel" data-m="none">Select none</button><span class="row gap-s nowrap"><label class="f" style="margin:0"><span class="sr">At least this many days</span><input type="number" id="certmin" min="1" max="60" value="${c.min_days}" style="width:70px" aria-label="At least this many days"></label><button class="btn secondary sm" data-act="certSel" data-m="min">Select with ${c.min_days > 1 ? 'at least' : 'min.'} days</button></span></div>`}</div>
      ${sub ? '' : html`<div class="row gap-s" style="padding:10px 16px;border-bottom:1px solid var(--line);flex-wrap:wrap"><button class="btn secondary sm" data-act="certAdd">${icon('plus')} Add a student</button><button class="btn secondary sm" data-act="certResync">${icon('refresh')} Refresh from daily reports</button><button class="btn secondary sm" data-act="certPrint">${icon('printer')} Print the list</button><button class="btn secondary sm" data-act="certCsv">${icon('download')} Download list (CSV)</button></div>`}
      ${rows.length ? html`<div class="tablewrap ctable"><table><caption class="sr">Students</caption><thead><tr>${sub ? html`<th style="width:34px"><input type="checkbox" data-act="certPickAll" aria-label="Select all for download"></th>` : html`<th style="width:34px"></th>`}<th class="sortable" tabindex="0" data-act="certSort" data-k="name">Student${sortMark('name')}</th><th>Activities</th><th class="num sortable" tabindex="0" data-act="certSort" data-k="days">Days${sortMark('days')}</th><th class="sortable" tabindex="0" data-act="certSort" data-k="last">Dates${sortMark('last')}</th>${sub ? html`<th>Certificate</th><th class="ia"></th>` : html`<th class="ia">Edit</th>`}</tr></thead><tbody>
        ${rows.map(p => html`<tr>${sub ? html`<td>${p.status !== 'none' ? html`<input type="checkbox" data-pick="${p.id}" ${CRT.pick.has(p.id) ? 'checked' : ''} aria-label="Select ${p.name}">` : ''}</td>` : html`<td><input type="checkbox" data-tick="${p.id}" ${p.eligible ? 'checked' : ''} aria-label="Include ${p.name}"></td>`}
          <td><b>${p.name}</b>${p.source !== 'portal' ? html` <span class="xs muted">${p.source === 'sheet' ? '· from sheet' : '· added by hand'}</span>` : ''}</td><td>${certActChips(p)}</td><td class="num">${p.days}</td><td class="small">${certRange(p.first, p.last)}</td>
          ${sub ? html`<td>${certStatus(p)}${p.allow_regen ? html` <span class="badge info">can be made again</span>` : ''}${p.cert_no ? html`<div class="xs muted">${p.cert_no}</div>` : ''}</td><td class="ia">${p.status !== 'none' ? html`<button class="btn sm secondary" data-act="certOne" data-id="${p.id}">${icon('download')} PDF</button>` : ''}</td>`
            : html`<td class="ia"><div class="row gap-s nowrap"><button class="ib" data-act="certEdit" data-id="${p.id}" title="Edit dates and events" aria-label="Edit ${esc(p.name)}">✏️</button><button class="ib danger" data-act="certDel" data-id="${p.id}" title="Remove from the list" aria-label="Remove ${esc(p.name)}">🗑️</button></div></td>`}</tr>`)}</tbody></table></div>`
        : html`<div style="padding:20px">${empty(all.length ? 'No one matches' : 'No students yet', all.length ? 'Try another search.' : 'Students appear here from the volunteers in your daily reports. Add them by hand, or ask the district office to import a sheet.', 'users')}</div>`}
      ${sub ? '' : html`<div class="row between certfoot"><span><b>${sel.length}</b> of ${all.length} selected for certificates</span><button class="btn primary" data-act="certSubmit" ${sel.length ? '' : 'disabled'}>${icon('check')} Submit the final list</button></div>`}</div>`);
  $('#certcamp')?.addEventListener('change', e => { CRT.id = Number(e.target.value); loadCert(); });
  const q = $('#certq'); q?.addEventListener('input', () => { CRT.q = q.value; const pos = q.selectionStart; paintCert(); const n = $('#certq'); n.focus(); n.setSelectionRange(pos, pos); });
}
actions.certFilter = el => { CRT.filter = el.dataset.k; paintCert(); };
actions.certSort = el => { const k = el.dataset.k; CRT.sort = CRT.sort[0] === k ? [k, -CRT.sort[1]] : [k, 1]; paintCert(); };
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('th[data-act=certSort]')) { e.preventDefault(); e.target.click(); } });
actions.certPickAll = el => { CRT.d.people.filter(p => p.status !== 'none').forEach(p => (el.checked ? CRT.pick.add(p.id) : CRT.pick.delete(p.id))); paintCert(); };
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset?.pick) { const id = Number(t.dataset.pick); t.checked ? CRT.pick.add(id) : CRT.pick.delete(id); }
  if (t.dataset?.tick) {
    const p = CRT.d.people.find(x => x.id === Number(t.dataset.tick)); if (!p) return;
    try { await api('/api/college/certs/people/' + p.id, 'PUT', { eligible: t.checked }); p.eligible = t.checked ? 1 : 0; const n = CRT.d.people.filter(x => x.eligible).length; const f = $('.certfoot b'); if (f) f.textContent = n; $('[data-act=certSubmit]')?.toggleAttribute('disabled', !n); } catch (err) { t.checked = !t.checked; toast(err.message, true); }
  }
});
actions.certSel = async el => { const m = el.dataset.m; await api(`/api/college/certs/${CRT.id}/select`, 'POST', { mode: m, n: Number($('#certmin')?.value) || 1 }); await loadCert(); };
actions.certResync = async () => { const r = await api(`/api/college/certs/${CRT.id}/sync`, 'POST'); toast(r.added || r.updated ? `${r.added} new student${r.added === 1 ? '' : 's'}, ${r.updated} updated` : 'Nothing new in the daily reports'); await loadCert(); };
actions.certDel = async el => { const p = CRT.d.people.find(x => x.id === Number(el.dataset.id)); if (!await confirmBox(`Remove ${p.name} from the certificate list?`, 'Remove', true)) return; await api('/api/college/certs/people/' + p.id, 'DELETE'); await loadCert(); };

// ---------- edit a student: name, and the dates and events taken part in ----------
let CE = null;
const certEntryRows = () => html`${CE.entries.length ? CE.entries.map((e, i) => html`<div class="entryrow"><input type="date" data-ei="${i}" data-k="d" value="${e.d}" max="${CRT.d.today}" aria-label="Date"><input type="text" data-ei="${i}" data-k="a" list="certevents" value="${e.a}" maxlength="60" placeholder="Event" aria-label="Event"><button type="button" class="ib danger" data-act="certEntryDel" data-i="${i}" title="Remove this date" aria-label="Remove this date">🗑️</button></div>`) : html`<p class="muted small">No dates yet. Add the days this student took part.</p>`}`;
function openCertEdit(p) {
  CE = { id: p?.id || null, name: p?.name || '', entries: (p?.entries || []).map(e => ({ ...e })) };
  const m = modal(html`<h2>${p ? 'Edit ' + p.name : 'Add a student'}</h2><form data-form="certSave" class="stack-s"><label class="f"><span>Student name *</span><input type="text" name="name" maxlength="80" required value="${CE.name}"></label>
    <div><b>Dates and events</b><p class="hint" style="margin-bottom:8px">Choose the event from the list (or type a new one). The certificate lists these events and dates.</p><div id="entrylist" class="stack-s">${certEntryRows()}</div><datalist id="certevents">${CRT.d.events.map(x => html`<option value="${x}">`)}</datalist>
      <button type="button" class="btn secondary sm" data-act="certEntryAdd" style="margin-top:8px">${icon('plus')} Add a date</button></div><div data-err></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`, { wide: true });
  m.addEventListener('input', e => { const i = e.target.dataset?.ei; if (i !== undefined) CE.entries[Number(i)][e.target.dataset.k] = e.target.value; });
}
actions.certEdit = el => openCertEdit(CRT.d.people.find(x => x.id === Number(el.dataset.id)));
actions.certAdd = () => openCertEdit(null);
actions.certEntryAdd = () => { CE.entries.push({ d: CRT.d.today, a: CRT.d.events[0] || '' }); show($('#entrylist'), certEntryRows()); };
actions.certEntryDel = el => { CE.entries.splice(Number(el.dataset.i), 1); show($('#entrylist'), certEntryRows()); };
forms.certSave = async f => {
  const name = fd(f).name, entries = CE.entries.filter(e => e.d && e.a);
  if (CE.id) await api('/api/college/certs/people/' + CE.id, 'PUT', { name, entries }); else await api(`/api/college/certs/${CRT.id}/people`, 'POST', { name, entries });
  f.closest('.overlay').close(); toast('Saved'); await loadCert();
};

// ---------- the list on paper ----------
const certListRows = () => CRT.d.people.slice().sort((a, b) => a.name.localeCompare(b.name)).map((p, i) => ({ no: i + 1, name: p.name, selected: p.eligible ? 'Yes' : 'No', days: p.days,
  events: [...p.entries.reduce((m, e) => (m.get(e.a) || m.set(e.a, []).get(e.a)).push(certDay(e.d).slice(0, -5)) && m, new Map())].map(([a, ds]) => `${a}: ${ds.join(', ')}`).join('; ') }));
actions.certPrint = () => {
  const d = CRT.d, rows = certListRows(), now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>Certificate list</title><style>body{font:12px Arial,sans-serif;color:#111;margin:18mm 14mm}h1{font-size:18px;margin:0}p{margin:3px 0 10px;color:#444}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:5px 7px;text-align:left;vertical-align:top}th{background:#eee}.n{text-align:center;width:28px}.sig{margin-top:40px;display:flex;justify-content:space-between}.sig div{border-top:1px solid #333;padding-top:4px;width:40%}tr{page-break-inside:avoid}</style></head><body>
    <h1>${esc(d.institution)}</h1><p>Participation certificate list: <b>${esc(d.campaign.title)}</b> · printed ${now} · ${d.people.filter(p => p.eligible).length} of ${d.people.length} selected</p>
    <table><thead><tr><th class="n">#</th><th>Student</th><th class="n">Selected</th><th>Events and dates</th><th class="n">Days</th></tr></thead><tbody>${rows.map(r => `<tr><td class="n">${r.no}</td><td>${esc(r.name)}</td><td class="n">${r.selected}</td><td>${esc(r.events)}</td><td class="n">${r.days}</td></tr>`).join('')}</tbody></table>
    <div class="sig"><div>ELC coordinator (verified)</div><div>Head of the institution</div></div></body></html>`;
  const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.append(fr);
  fr.contentDocument.open(); fr.contentDocument.write(doc); fr.contentDocument.close();
  setTimeout(() => { fr.contentWindow.focus(); fr.contentWindow.print(); setTimeout(() => fr.remove(), 3000); }, 300);
};
actions.certCsv = () => {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', rows = certListRows();
  saveBlob(new Blob(['﻿' + [['No', 'Student', 'Selected', 'Events and dates', 'Days'].map(q).join(','), ...rows.map(r => [r.no, r.name, r.selected, r.events, r.days].map(q).join(','))].join('\r\n')], { type: 'text/csv;charset=utf-8' }), `certificate-list-${slug(CRT.d.campaign.title)}.csv`);
};

// ---------- submit, generate, download ----------
actions.certSubmit = async () => {
  const n = CRT.d.people.filter(p => p.eligible).length;
  if (!await confirmBox(`Submit the final list of ${n} student${n === 1 ? '' : 's'}? After this the list is locked and certificates can be generated. Only the district office can reopen it.`, 'Submit the final list')) return;
  await api(`/api/college/certs/${CRT.id}/submit`, 'POST'); toast('Final list submitted'); await loadCert();
};
const certImgLogo = async t => [await loadImg(`/api/templates/${t.id}/image`), COL.college.logo_v ? await loadImg(logoUrl(COL.college.id, COL.college.logo_v)) : null];
async function certBlob(t, img, logo, p) {
  if (!CRT.blobs.has(p.id)) CRT.blobs.set(p.id, await certPdf(t, img, p.snapshot, logo));
  return CRT.blobs.get(p.id);
}
const certProgress = (title, total) => {
  const m = modal(html`<h2>${title}</h2><p id="cprog" class="muted">Starting…</p><div class="progress"><i id="cbar" style="width:0%"></i></div><p class="hint">Please keep this window open.</p>`);
  return { step: (i, text) => { $('#cprog', m).textContent = text; $('#cbar', m).style.width = Math.round(i * 100 / total) + '%'; }, close: () => m.close() };
};
actions.certGen = async () => {
  if (CRT.busy) return; const d = CRT.d, t = d.template; if (!t) return;
  const cands = d.people.filter(p => p.eligible && (p.status === 'none' || p.allow_regen));
  const [img, logo] = await certImgLogo(t);
  // text that cannot fit its box on the certificate is flagged before anything is issued
  const preview = cands.map(p => { const st = { student: p.name, college: d.institution, activities: p.activities.join(', ').slice(0, 160), dates: certRange(p.first, p.last), days: String(p.days), campaign: d.campaign.title, serial: 'ELC-0000-0000', issued: certDay(d.today) }; return st; });
  const bad = certCheck(t, preview);
  if (bad.length && !await confirmBox(`The text for ${bad.length} student${bad.length === 1 ? '' : 's'} will not sit neatly on the certificate (for example a very long name): ${bad.slice(0, 5).map(b => b.name).join(', ')}${bad.length > 5 ? '…' : ''}. Shorten those names or events first with the pencil button, or generate anyway.`, 'Generate anyway')) return;
  if (!await confirmBox(`Generate ${cands.length} certificate${cands.length === 1 ? '' : 's'} now? Each student's certificate can be generated only once. After that you can download them as often as you like.`, 'Generate')) return;
  CRT.busy = true; const pr = certProgress('Generating certificates', cands.length);
  try {
    pr.step(0, 'Reserving certificate numbers…');
    const r = await api(`/api/college/certs/${CRT.id}/generate`, 'POST'), ok = []; let i = 0;
    for (const it of r.issued) {
      i++; pr.step(i - 1, `Making certificate ${i} of ${r.issued.length}…`);
      try { CRT.blobs.set(it.id, await certPdf(t, img, it.snapshot, logo)); ok.push(it.id); } catch {}
      await new Promise(res => setTimeout(res, 0));
    }
    await api(`/api/college/certs/${CRT.id}/ack`, 'POST', { ids: ok });
    pr.close(); toast(ok.length === r.issued.length ? `${ok.length} certificates ready` : `${ok.length} of ${r.issued.length} ready. Open the list and download the rest again.`, ok.length !== r.issued.length);
  } catch (e) { pr.close(); toast(e.message, true); }
  finally { CRT.busy = false; await loadCert(); }
};
actions.certOne = async el => {
  const d = CRT.d, p = d.people.find(x => x.id === Number(el.dataset.id)); if (!p?.snapshot) return;
  if (!d.template) return toast('The certificate design is not available right now. Please try again later.', true);
  try { const [img, logo] = await certImgLogo(d.template); const blob = await certBlob(d.template, img, logo, p); saveBlob(blob, `${slug(p.name)}-${p.cert_no}.pdf`); if (p.status === 'issued') api(`/api/college/certs/${CRT.id}/ack`, 'POST', { ids: [p.id] }).then(loadCert).catch(() => {}); }
  catch (e) { toast('The certificate could not be made: ' + e.message, true); }
};
actions.certZip = async el => {
  const d = CRT.d, t = d.template; if (!t || CRT.busy) return;
  const list = d.people.filter(p => p.status !== 'none' && p.snapshot && (el.dataset.m === 'all' || CRT.pick.has(p.id)));
  if (!list.length) return toast(el.dataset.m === 'all' ? 'Nothing to download yet' : 'Tick the students whose certificates you want first', true);
  CRT.busy = true; const pr = certProgress('Preparing the zip file', list.length);
  try {
    const [img, logo] = await certImgLogo(t), files = [], ids = [];
    for (let i = 0; i < list.length; i++) { pr.step(i, `Certificate ${i + 1} of ${list.length}…`); files.push({ name: `${slug(list[i].name)}-${list[i].cert_no}.pdf`, blob: await certBlob(t, img, logo, list[i]) }); if (list[i].status === 'issued') ids.push(list[i].id); await new Promise(res => setTimeout(res, 0)); }
    pr.step(list.length, 'Packing the zip…'); saveBlob(await zipStore(files), `certificates-${slug(d.institution)}-${slug(d.campaign.title)}.zip`);
    if (ids.length) await api(`/api/college/certs/${CRT.id}/ack`, 'POST', { ids }).catch(() => {});
    pr.close(); toast(`${list.length} certificate${list.length === 1 ? '' : 's'} downloaded`);
  } catch (e) { pr.close(); toast(e.message, true); }
  finally { CRT.busy = false; if (ids0(list)) await loadCert(); }
};
const ids0 = list => list.some(p => p.status === 'issued');
