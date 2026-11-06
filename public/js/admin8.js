'use strict';
// ---------- Vote Unnathi and Sea Your Vote (staff): the places of each drive, their allotment to institutions, and the visits recorded ----------
// No personal data here: only the settlements or landing centres, a figure for how many people live there, and a contact person for the place.
let DV = { k: 'unnathi', d: null, tab: 'units', q: '', only: '', sel: new Set() };
const dvPct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const dvStatusBadge = (d, s) => (s ? badge(d.status[s], s === 'done' ? 'ok' : s === 'doing' ? 'info' : 'grey') : '');
function apUnnathi(el) { return apDrive(el, 'unnathi'); }
function apSea(el) { return apDrive(el, 'sea'); }
async function apDrive(el, k) {
  if (DV.k !== k) { DV = { k, d: null, tab: 'units', q: '', only: '', sel: new Set() }; }
  const d = await api(`/api/staff/drives/${k}/overview`); DV.d = d; const ops = isOps(), c = d.cfg, t = d.totals;
  const head = pageHead(c.name, c.blurb, html`${ops ? html`<button class="btn secondary" data-act="dvAdd">${icon('map-pin')} Add a ${c.unit}</button><button class="btn secondary" data-act="dvImportOpen">${icon('upload')} Import a list</button>` : ''}`, 'Special drives');
  if (!t.units) {
    return show(el, html`${head}<div class="card ub-empty"><img src="${c.logo}" alt="${esc(c.name)}" class="ub-logo"><h3>Start the list of ${c.units}</h3><p class="muted">${ops ? html`Add the ${c.units} one by one, or import a sheet (CSV). The columns can be in any order; the ones the portal looks for are: <b>Name, Local body, Ward, Village, Population, Households, Contact person, Contact phone, Address, Note</b>. Only the name is needed. Then allot them to institutions, and each institution sees only its own.` : 'The list has not been added yet.'}</p>
      ${ops ? html`<div class="row gap-s" style="justify-content:center"><label class="btn primary lg">${icon('upload')} Choose a CSV file<input type="file" id="dvfile" accept=".csv,text/csv" hidden></label><button class="btn secondary lg" data-act="dvTemplate">${icon('download')} Blank sheet to fill in</button><button class="btn secondary lg" data-act="dvAdd">${icon('map-pin')} Add one by hand</button></div><div id="dverr" style="margin-top:12px"></div>` : ''}</div>`),
      $('#dvfile')?.addEventListener('change', e => e.target.files[0] && dvImport(e.target.files[0]));
  }
  const tabs = [['units', 'Places and allotment'], ['colleges', 'Institutions'], ['visits', 'Recent visits']];
  show(el, html`${head}
    <div class="kpis">${kpi(c.units[0].toUpperCase() + c.units.slice(1), t.units, { ic: 'map-pin' })}${kpi('Allotted', dvPct(t.allotted, t.units) + '%', { ic: 'link', count: false, sub: t.allotted + ' of ' + t.units })}${kpi('Work started', dvPct(t.started, t.units) + '%', { ic: 'check-circle', tone: 'green', count: false, sub: t.started + ' of ' + t.units + ' · ' + t.done + ' completed' })}${kpi('People reached', t.people, { ic: 'users', sub: t.population ? 'of about ' + n(t.population) + ' living there' : '' })}${kpi('New registrations helped', t.registered, { ic: 'target', tone: 'saffron' })}</div>
    <div class="chips" style="margin:16px 0 14px" role="tablist">${tabs.map(([x, l]) => html`<button class="chip ${DV.tab === x ? 'on' : ''}" role="tab" aria-selected="${DV.tab === x}" data-act="dvTab" data-k="${x}">${l}</button>`)}</div><div id="dvbody"></div>`);
  dvBody();
}
actions.dvTab = el => { DV.tab = el.dataset.k; apDrive($('#pg'), DV.k); };
function dvBody() {
  const d = DV.d, b = $('#dvbody'), ops = isOps(), c = d.cfg;
  if (DV.tab === 'units') {
    const q = DV.q.trim().toLowerCase(), list = d.units.filter(u => (!q || [u.name, u.lsgd, u.village, u.college].join(' ').toLowerCase().includes(q)) && (DV.only !== 'free' || !u.college_id));
    show(b, html`<div class="card pad0"><div class="filterbar"><div class="row gap-s">${ops ? html`<button class="btn primary sm" data-act="dvAllotSel">${icon('link')} Allot selected${DV.sel.size ? ' (' + DV.sel.size + ')' : ''}</button><button class="btn secondary sm" data-act="dvAllotArea">Allot a whole local body or village</button><button class="btn secondary sm" data-act="dvSuggest">${icon('check-circle')} Allot each college's own local body</button><button class="btn ghost danger sm" data-act="dvDeleteSel">${icon('trash')} Delete selected${DV.sel.size ? ' (' + DV.sel.size + ')' : ''}</button>${isSuper() ? html`<button class="btn ghost danger sm" data-act="dvClear">${icon('trash')} Empty the whole list</button>` : ''}` : ''}
          <button class="chip ${DV.only === 'free' ? 'on' : ''}" data-act="dvFree">Not allotted yet</button></div>
        <label class="f" style="margin:0;min-width:220px"><span class="sr">Search</span><input type="search" id="dvq" placeholder="Search a name, place or college…" value="${esc(DV.q)}"></label></div>
      <div class="tablewrap"><table data-nosort><thead><tr>${ops ? html`<th class="ia"><input type="checkbox" id="dvall" aria-label="Select all shown"></th>` : ''}<th>${c.unit[0].toUpperCase() + c.unit.slice(1)}</th><th>Local body · ward</th><th class="num">People</th><th>Allotted to</th><th>Status</th><th class="num">Reached</th>${ops ? html`<th class="ia"></th>` : ''}</tr></thead><tbody>
      ${list.map(u => html`<tr>${ops ? html`<td class="ia"><input type="checkbox" data-dvs="${u.id}" ${DV.sel.has(u.id) ? 'checked' : ''} aria-label="Select ${esc(u.name)}"></td>` : ''}<td><b>${u.name}</b><div class="muted small">${[u.kind, u.village].filter(Boolean).join(' · ')}</div></td><td class="small">${[u.lsgd, u.ward ? 'ward ' + u.ward : ''].filter(Boolean).join(' · ') || '–'}</td><td class="num">${u.population ? n(u.population) : '–'}</td>
        <td>${u.college ? html`<span class="ub-chip">${u.college}${ops ? html`<button class="x" data-act="dvUnalloc" data-id="${u.alloc_id}" aria-label="Remove ${esc(u.college)}">×</button>` : ''}</span>` : html`<span class="muted small">not allotted</span>`}</td>
        <td>${dvStatusBadge(d, u.status)}</td><td class="num">${u.people ? n(u.people) : '–'}</td>${ops ? html`<td class="ia"><div class="row gap-s nowrap"><button class="btn sm secondary" data-act="dvEdit" data-id="${u.id}">Edit</button><button class="ib danger" data-act="dvDelete" data-id="${u.id}" aria-label="Delete ${esc(u.name)}">${icon('trash')}</button></div></td>` : ''}</tr>`)}</tbody></table></div>
      ${list.length ? '' : html`<div class="pad">${empty('Nothing matches', 'Try another search.', 'map-pin')}</div>`}</div>`);
    const cnt = () => { const bt = b.querySelector('[data-act=dvAllotSel]'); if (bt) bt.lastChild.textContent = ' Allot selected' + (DV.sel.size ? ' (' + DV.sel.size + ')' : ''); const bd = b.querySelector('[data-act=dvDeleteSel]'); if (bd) bd.lastChild.textContent = ' Delete selected' + (DV.sel.size ? ' (' + DV.sel.size + ')' : ''); };
    b.querySelectorAll('[data-dvs]').forEach(x => x.addEventListener('change', () => { const id = Number(x.dataset.dvs); x.checked ? DV.sel.add(id) : DV.sel.delete(id); cnt(); }));
    $('#dvall', b)?.addEventListener('change', e => { b.querySelectorAll('[data-dvs]').forEach(x => { x.checked = e.target.checked; const id = Number(x.dataset.dvs); e.target.checked ? DV.sel.add(id) : DV.sel.delete(id); }); cnt(); });
    const qi = $('#dvq', b); qi?.addEventListener('input', () => { DV.q = qi.value; clearTimeout(DV.t); DV.t = setTimeout(() => { dvBody(); const x = $('#dvq'); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 250); });
  } else if (DV.tab === 'colleges') {
    show(b, d.progress.length ? html`<div class="card pad0"><div class="tablewrap"><table><thead><tr><th>Institution</th><th class="num">${c.units[0].toUpperCase() + c.units.slice(1)}</th><th class="num">In progress</th><th class="num">Completed</th><th class="num">Visits</th><th class="num">People reached</th><th class="num">Registrations helped</th><th>Last visit</th></tr></thead><tbody>
      ${d.progress.map(p => html`<tr><td><b>${p.name}</b></td><td class="num">${p.units}</td><td class="num">${p.doing}</td><td class="num">${p.done}</td><td class="num">${p.visits}</td><td class="num">${n(p.people)}</td><td class="num">${n(p.registered)}</td><td class="small">${p.last ? fdt(p.last + 'T00:00:00') : html`<span class="muted">none yet</span>`}</td></tr>`)}</tbody></table></div></div>`
      : html`<div class="card">${empty('No institution has been allotted a place yet', `Allot ${c.units} under Places and allotment.`, 'building')}</div>`);
  } else {
    show(b, html`<div class="card"><div class="card-head"><h3>Recent visits</h3>${ops ? html`<button class="btn secondary sm" data-act="dvExport">${icon('download')} Download all visits (CSV)</button>` : ''}</div>
      ${d.recent.length ? html`<div class="tablewrap"><table data-nosort><thead><tr><th>Date</th><th>Institution</th><th>${c.unit[0].toUpperCase() + c.unit.slice(1)}</th><th>Activity</th><th class="num">People</th><th class="num">Registered</th></tr></thead><tbody>${d.recent.map(v => html`<tr><td class="small">${v.on_date}</td><td>${v.college}</td><td>${v.unit || '–'}</td><td class="small">${c.types[v.type] || v.type}${v.note ? html`<div class="muted xs">${v.note}</div>` : ''}</td><td class="num">${v.people}</td><td class="num">${v.registered}</td></tr>`)}</tbody></table></div>` : html`<p class="muted small">No visit has been recorded yet.</p>`}
      ${isSuper() ? html`<div style="margin-top:14px"><button class="btn ghost danger" data-act="dvClear">${icon('trash')} Empty this list</button></div>` : ''}</div>`);
  }
}
actions.dvFree = () => { DV.only = DV.only ? '' : 'free'; dvBody(); };
// ---- adding and editing ----
const dvForm = (d, u = {}) => html`<form data-form="dvUnitF" data-id="${u.id || ''}" class="stack-s">
  <label class="f"><span>Name *</span><input name="name" required maxlength="120" value="${esc(u.name || '')}" placeholder="${d.cfg.unit === 'settlement' ? 'e.g. the name of the settlement' : 'e.g. the name of the landing centre'}"></label>
  <div class="grid g2"><label class="f"><span>Type</span><select name="kind">${d.cfg.kinds.map(k => html`<option ${u.kind === k ? 'selected' : ''}>${k}</option>`)}</select></label><label class="f"><span>Village</span><input name="village" maxlength="80" value="${esc(u.village || '')}"></label>
  <label class="f"><span>Local body (panchayat, municipality or corporation)</span><input name="lsgd" maxlength="100" value="${esc(u.lsgd || '')}"></label><label class="f"><span>Ward</span><input name="ward" maxlength="12" value="${esc(u.ward || '')}"></label>
  <label class="f"><span>People living there (approx.)</span><input name="population" type="number" min="0" value="${u.population || ''}"></label><label class="f"><span>Households</span><input name="households" type="number" min="0" value="${u.households || ''}"></label>
  <label class="f"><span>Contact person (promoter, ward member, president…)</span><input name="contact_name" maxlength="80" value="${esc(u.contact_name || '')}"></label><label class="f"><span>Contact phone</span><input name="contact_phone" inputmode="tel" maxlength="15" value="${esc(u.contact_phone || '')}"></label></div>
  <label class="f"><span>Address or landmark</span><input name="address" maxlength="200" value="${esc(u.address || '')}"></label><label class="f"><span>Note</span><input name="note" maxlength="300" value="${esc(u.note || '')}"></label>
  ${u.id ? html`<div class="row" style="justify-content:space-between"><button type="button" class="btn ghost danger" data-act="dvDelete" data-id="${u.id}">${icon('trash')} Delete</button><span></span></div>` : ''}${mfoot(u.id ? 'Save' : 'Add')}</form>`;
actions.dvAdd = () => modal(html`<h2>Add a ${DV.d.cfg.unit}</h2>${dvForm(DV.d)}`, { wide: true });
actions.dvEdit = el => { const u = DV.d.units.find(x => x.id === Number(el.dataset.id)); modal(html`<h2>${u.name}</h2>${dvForm(DV.d, u)}`, { wide: true }); };
forms.dvUnitF = async f => { const v = fd(f); await api(`/api/staff/drives/${DV.k}/unit`, 'POST', { ...v, id: f.dataset.id }); f.closest('.overlay').close(); toast('Saved'); apDrive($('#pg'), DV.k); };
actions.dvDelete = async el => { if (!await confirmBox('Delete this entry? Its allotment and any visits recorded for it are removed too.', 'Delete', true)) return; await api(`/api/staff/drives/${DV.k}/unit/${el.dataset.id}`, 'DELETE'); document.querySelector('.overlay')?.close?.(); toast('Deleted'); apDrive($('#pg'), DV.k); };
actions.dvDeleteSel = async () => {
  if (!DV.sel.size) return toast(`Tick the ${DV.d.cfg.units} first`, true);
  if (!await confirmBox(`Delete ${DV.sel.size} selected? Their allotments and any visits recorded for them are removed too.`, 'Delete', true)) return;
  const r = await api(`/api/staff/drives/${DV.k}/units/remove`, 'POST', { ids: [...DV.sel] }); DV.sel.clear(); toast(`${r.n} deleted`); apDrive($('#pg'), DV.k);
};
// ---- importing a sheet ----
actions.dvImportOpen = () => { modal(html`<h2>Import a list</h2><p class="muted small">${DV.d.cfg.units[0].toUpperCase() + DV.d.cfg.units.slice(1)} already in the list are updated, not repeated. Allotments and visits are kept.</p><div class="row gap-s"><label class="btn primary lg">${icon('upload')} Choose a CSV file<input type="file" id="dvfile2" accept=".csv,text/csv" hidden></label><button class="btn secondary" data-act="dvTemplate">${icon('download')} Blank sheet</button></div>${isSuper() ? html`<label class="chk" style="margin-top:12px"><input type="checkbox" id="dvreplace"> Replace the whole list: empty it first (allotments and visits too), then import</label>` : ''}<div id="dverr" style="margin-top:12px"></div>`); $('#dvfile2').addEventListener('change', e => e.target.files[0] && dvImport(e.target.files[0])); };
const DV_COLS = [['contact_phone', /phone|mobile|contact\s*(no|num)/i], ['contact_name', /contact|promoter|president|leader|member|head/i], ['population', /popul|people|persons|members|voters/i], ['households', /house\s*holds?|families|houses/i], ['ward', /^ward/i], ['village', /village/i],
  ['lsgd', /lsgd|local\s*body|lsgi|panchayat|municipal|corporation/i], ['address', /address|landmark|location/i], ['kind', /^(type|kind|category)/i], ['note', /note|remark/i], ['name', /name|settlement|colony|landing|centre|center|hamlet|oorukoottam|place/i]];
async function dvImport(file) {
  const box = $('#dverr'), say = (t, c = 'info') => { box.innerHTML = `<div class="alert ${c}">${esc(t)}</div>`; };
  try {
    say('Reading the file…'); const rows = parseCsv((await file.text()).replace(/^﻿/, '')); if (rows.length < 2) throw new Error('The file has no rows');
    const head = rows[0].map(h => String(h).trim()), at = {}, used = new Set();
    for (const [key, re] of DV_COLS) { const i = head.findIndex((h, ix) => !used.has(ix) && re.test(h)); if (i >= 0) { at[key] = i; used.add(i); } }
    if (at.name === undefined) throw new Error('The file has no column for the name (a heading such as "Name" or "Settlement")');
    const data = rows.slice(1).filter(r => r.some(x => String(x).trim())); let added = 0, updated = 0, skipped = 0;
    if ($('#dvreplace')?.checked) { if (!await confirmBox('Empty the current list first? Every place, allotment and visit of this drive is removed, then this file is imported.', 'Replace', true)) return say('Nothing changed.'); await api(`/api/staff/drives/${DV.k}/clear`, 'POST', { confirm: 'DELETE' }); }
    for (let i = 0; i < data.length; i += 700) {
      say(`Importing… ${Math.min(i + 700, data.length)} of ${data.length}`);
      const part = data.slice(i, i + 700).map(r => Object.fromEntries(Object.entries(at).map(([k, ix]) => [k, r[ix]])));
      const r = await api(`/api/staff/drives/${DV.k}/import`, 'POST', { rows: part, first: i === 0 }); added += r.added; updated += r.updated; skipped += r.skipped;
    }
    say(`Done: ${added} added, ${updated} updated${skipped ? `, ${skipped} rows skipped (no name)` : ''}.`, 'ok'); setTimeout(() => { document.querySelector('.overlay')?.close?.(); apDrive($('#pg'), DV.k); }, 1200);
  } catch (e) { say(e.message, 'err'); }
}
actions.dvTemplate = () => {
  const c = DV.d.cfg, text = '﻿' + 'Name,Type,Local body,Ward,Village,Population,Households,Contact person,Contact phone,Address,Note\r\n' + `"Example ${c.unit}","${c.kinds[0]}","Example Panchayat",5,"Example village",120,34,"Ward member",9XXXXXXXXX,"Near the school",""\r\n`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = (DV.k === 'sea' ? 'sea-your-vote' : 'vote-unnathi') + '-template.csv'; a.click();
};
// ---- allotment ----
const dvAllotModal = (ids, title) => {
  const d = DV.d, lsgds = [...new Set(d.units.map(u => u.lsgd).filter(Boolean))].sort(), villages = [...new Set(d.units.map(u => u.village).filter(Boolean))].sort();
  modal(html`<h2>${title}</h2><form data-form="dvAllotF" data-ids="${ids.join(',')}" class="stack-s"><label class="f"><span>Institution *</span><select name="college_id" required><option value="">Choose…</option>${d.colleges.map(c => html`<option value="${c.id}">${c.name}</option>`)}</select></label>
    ${ids.length ? '' : html`<label class="f"><span>Every ${d.cfg.unit} of this local body</span><select name="lsgd"><option value="">–</option>${lsgds.map(x => html`<option>${x}</option>`)}</select></label><label class="f"><span>or of this village</span><select name="village"><option value="">–</option>${villages.map(x => html`<option>${x}</option>`)}</select></label>`}
    <p class="muted xs">A ${d.cfg.unit} that is already allotted to another institution moves to this one.</p>${mfoot('Allot')}</form>`, { wide: true });
};
actions.dvAllotSel = () => { if (!DV.sel.size) return toast(`Tick the ${DV.d.cfg.units} first`, true); dvAllotModal([...DV.sel], `Allot ${DV.sel.size} ${DV.d.cfg.units}`); };
actions.dvAllotArea = () => dvAllotModal([], 'Allot a whole local body or village');
forms.dvAllotF = async f => {
  const v = fd(f), ids = f.dataset.ids ? f.dataset.ids.split(',').map(Number) : []; if (!ids.length && !v.lsgd && !v.village) throw new Error('Choose a local body or a village');
  const r = await api(`/api/staff/drives/${DV.k}/alloc`, 'POST', { college_id: v.college_id, unit_ids: ids, lsgd: v.lsgd, village: v.village }); f.closest('.overlay').close(); DV.sel.clear(); toast(`${r.n} allotted`); apDrive($('#pg'), DV.k);
};
actions.dvUnalloc = async el => { if (!await confirmBox('Remove this allotment? The institution will no longer see it.', 'Remove', true)) return; await api(`/api/staff/drives/${DV.k}/alloc/${el.dataset.id}`, 'DELETE'); toast('Removed'); apDrive($('#pg'), DV.k); };
actions.dvSuggest = async () => {
  if (!await confirmBox('Allot every unallotted place in a local body to the institution based there, where exactly one institution is based? Shared towns are left for you to share out.', 'Allot', false)) return;
  const r = await api(`/api/staff/drives/${DV.k}/suggest`, 'POST', {});
  modal(html`<h2>Allotment done</h2><p><b>${r.made.reduce((s, m) => s + m.n, 0)}</b> ${DV.d.cfg.units} allotted to ${r.made.length} institution${r.made.length === 1 ? '' : 's'}.</p>${r.shared.length ? html`<div class="alert warn" style="margin-top:10px">${icon('alert')}<div><b>Shared, to be split by hand:</b>${r.shared.map(s => html`<div class="small">${s.n} ${DV.d.cfg.units}: ${s.colleges.join(', ')}</div>`)}</div></div>` : ''}<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" data-act="closeModal">Done</button></div>`);
  apDrive($('#pg'), DV.k);
};
actions.dvExport = () => { window.location.href = `/api/staff/drives/${DV.k}/export`; };
actions.dvClear = async () => { if (!await confirmBox(`Empty the whole list? Every ${DV.d.cfg.unit}, allotment and visit of this drive is removed. This cannot be undone.`, 'Empty the list', true)) return; await api(`/api/staff/drives/${DV.k}/clear`, 'POST', { confirm: 'DELETE' }); toast('The list is empty'); apDrive($('#pg'), DV.k); };
