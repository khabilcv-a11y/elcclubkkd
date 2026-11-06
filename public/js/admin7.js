'use strict';
// ---------- Vote Unbound (staff): the PwD register, the allotment of areas to institutions, and the progress of the call campaign ----------
// The people are kept in a private register, not in the Google Sheet. Aadhaar and UDID numbers are never read from the file.
let UB = { d: null, tab: 'areas', q: '' };
const ubPct = (a, b) => (b ? Math.round(a / b * 100) : 0);
async function apUnbound(el) {
  const d = await api('/api/staff/pwd/overview'); UB.d = d; const ops = isOps();
  const head = pageHead('Vote Unbound', 'Call campaign for persons with disabilities, from the district UDID data. Each institution is allotted local bodies or wards and calls only the people there.', html`${ops && d.total ? html`<button class="btn secondary" data-act="ubImportOpen">${icon('upload')} Import again</button>` : ''}${isSuper() && d.total ? html`<button class="btn ghost danger" data-act="ubClear">${icon('trash')} Delete the whole list</button>` : ''}`, 'Special drives');
  if (!d.total) { show(el, html`${head}<div class="card ub-empty"><img src="/img/drives/vote-unbound.webp" alt="Vote Unbound" class="ub-logo">${ops ? html`<h3>Import the district's PwD list</h3><p class="muted">Choose the CSV file (the columns: Name, DOB, Age, Gender, Mobile, Address, Ward, Anganwadi, ICDS, LSGD, Bedridden, Disability, Disability%, UDID Status). It is kept in a private register, separate from the Google Sheet. Aadhaar and UDID numbers in the file are ignored and never stored.</p><label class="btn primary lg">${icon('upload')} Choose the file<input type="file" id="ubfile" accept=".csv,text/csv" hidden></label><div id="uberr" style="margin-top:12px"></div>` : html`<p class="muted">The register has not been imported yet.</p>`}</div>`); $('#ubfile')?.addEventListener('change', e => e.target.files[0] && ubImport(e.target.files[0])); return; }
  const tabs = [['areas', 'Local bodies and allotment'], ['villages', 'Villages'], ['colleges', 'Institutions'], ['data', 'The data']];
  show(el, html`${head}
    <div class="kpis">${kpi('People in the register', d.total, { ic: 'users' })}${kpi('Bedridden', d.bedridden, { ic: 'alert', tone: 'saffron', sub: 'may need home voting' })}${kpi('Phone numbers to call', d.numbers, { ic: 'help', count: false, sub: 'some numbers are shared by a family' })}${kpi('Called so far', ubPct(d.called, d.total) + '%', { ic: 'check-circle', tone: 'green', count: false, sub: d.called + ' people' })}${kpi('Need help', d.needs_help, { ic: 'target' })}</div>
    <div class="chips" style="margin:16px 0 14px" role="tablist">${tabs.map(([k, l]) => html`<button class="chip ${UB.tab === k ? 'on' : ''}" role="tab" aria-selected="${UB.tab === k}" data-act="ubTab" data-k="${k}">${l}</button>`)}</div><div id="ubbody"></div>`);
  ubBody();
}
actions.ubTab = el => { UB.tab = el.dataset.k; apUnbound($('#pg')); };
function ubBody() {
  const d = UB.d, b = $('#ubbody'), ops = isOps();
  if (UB.tab === 'areas') {
    const q = UB.q.trim().toLowerCase(), list = d.areas.filter(a => !q || a.lsgd.toLowerCase().includes(q));
    show(b, html`<div class="card pad0"><div class="filterbar"><div class="row gap-s">${ops ? html`<button class="btn secondary sm" data-act="ubSuggest">${icon('check-circle')} Allot each college's own local body</button>` : ''}<span class="small muted">${d.areas.length} local bodies · ${d.areas.filter(a => a.allotted.length).length} allotted</span></div>
        <label class="f" style="margin:0;min-width:220px"><span class="sr">Search</span><input type="search" id="ubq" placeholder="Search a local body…" value="${esc(UB.q)}"></label></div>
      <div class="tablewrap"><table data-nosort><thead><tr><th>Local body</th><th class="num">People</th><th class="num">Wards</th><th class="num">Bedridden</th><th>Allotted to</th><th class="num">Called</th>${ops ? html`<th class="ia"></th>` : ''}</tr></thead><tbody>
      ${list.map(a => html`<tr><td><b>${a.lsgd}</b></td><td class="num">${n(a.n)}</td><td class="num">${a.wards}</td><td class="num">${a.bed}</td>
        <td>${a.allotted.length ? html`<div class="ub-chips">${a.allotted.map(x => html`<span class="ub-chip">${x.college}${x.ward ? html` <i>ward ${x.ward}</i>` : ''}${ops ? html`<button class="x" data-act="ubUnalloc" data-id="${x.id}" aria-label="Remove ${esc(x.college)}">×</button>` : ''}</span>`)}</div>` : html`<span class="muted small">not allotted</span>`}</td>
        <td class="num">${ubPct(a.called, a.n)}%</td>${ops ? html`<td class="ia"><button class="btn sm secondary" data-act="ubAllot" data-key="${esc(a.lsgd_key)}">Allot</button></td>` : ''}</tr>`)}</tbody></table></div></div>`);
    const qi = $('#ubq', b); qi?.addEventListener('input', () => { UB.q = qi.value; clearTimeout(UB.t); UB.t = setTimeout(() => { ubBody(); const x = $('#ubq'); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 250); });
  } else if (UB.tab === 'villages') { ubVillages(b);
  } else if (UB.tab === 'colleges') {
    show(b, d.progress.length ? html`<div class="card pad0"><div class="tablewrap"><table><thead><tr><th>Institution</th><th class="num">Areas</th><th class="num">People allotted</th><th class="num">People called</th><th class="num">Reached</th><th class="num">Need help</th><th>Last call</th></tr></thead><tbody>
      ${d.progress.map(c => html`<tr><td><b>${c.name}</b></td><td class="num">${c.areas}</td><td class="num">${n(c.people)}</td><td class="num">${n(c.called)} <span class="muted small">(${ubPct(c.called, c.people)}%)</span></td><td class="num">${n(c.reached)}</td><td class="num">${c.help}</td><td class="small">${c.last ? fdt(c.last) : html`<span class="muted">no calls yet</span>`}</td></tr>`)}</tbody></table></div></div>`
      : html`<div class="card">${empty('No institution has been allotted an area yet', 'Allot local bodies or wards under Local bodies and allotment.', 'building')}</div>`);
  } else {
    const bar = (rows, total) => html`<div class="ub-bars">${rows.map(r => html`<div class="ub-bar"><span>${r.k}</span><div><i style="width:${Math.max(2, ubPct(r.n, total))}%"></i></div><b>${n(r.n)}</b></div>`)}</div>`;
    show(b, html`<div class="grid g2"><div class="card"><div class="card-head"><h3>UDID status</h3></div>${bar(d.udid, d.total)}</div><div class="card"><div class="card-head"><h3>Type of disability</h3></div>${bar(d.disability, d.total)}</div></div>
      <div class="card" style="margin-top:16px"><div class="card-head"><h3>${icon('shield')} Privacy and records</h3></div><ul class="small muted" style="margin:0 0 12px 18px"><li>The people are kept in a private register, not in the Google Sheet. Aadhaar and UDID numbers are never imported.</li><li>An institution sees only the people in the local bodies and wards allotted to it, and every time it opens the list or a person the portal records it.</li><li>Calls are saved against the institution that made them. Download the call log from time to time as a backup.</li></ul>
        ${ops ? html`<button class="btn secondary" data-act="ubExport">${icon('download')} Download the call log (CSV)</button>` : ''}
        ${isSuper() ? html`<button class="btn ghost danger" data-act="ubClear" style="margin-left:8px">${icon('trash')} Empty the register</button>` : ''}
        <h4 style="margin:16px 0 6px">Recent access</h4>${d.views.length ? html`<div class="tablewrap"><table data-nosort><thead><tr><th>When</th><th>Institution</th><th>What</th><th class="num">People shown</th></tr></thead><tbody>${d.views.map(v => html`<tr><td class="small">${fdt(v.at)}</td><td>${v.who}</td><td>${{ open: 'Opened the page', list: 'Opened the list', person: 'Opened a person' }[v.action] || v.action}</td><td class="num">${v.n}</td></tr>`)}</tbody></table></div>` : html`<p class="muted small">No access yet.</p>`}</div>`);
  }
}
// ---- importing the district's file ----
actions.ubImportOpen = () => { modal(html`<h2>Import the PwD list again</h2><p class="muted small">People already in the register are updated, and their call history is kept. Aadhaar and UDID numbers in the file are ignored.</p><label class="btn primary lg">${icon('upload')} Choose the file<input type="file" id="ubfile2" accept=".csv,text/csv" hidden></label>${isSuper() ? html`<label class="chk" style="margin-top:12px"><input type="checkbox" id="ubreplace"> Replace the whole list: remove everyone in the register first, then import this file (call history is kept)</label>` : ''}<div id="uberr" style="margin-top:12px"></div>`); $('#ubfile2').addEventListener('change', e => e.target.files[0] && ubImport(e.target.files[0])); };
const UB_COLS = { name: /^name$/i, dob: /^(dob|date of birth)/i, age: /^age$/i, gender: /^gender|^sex$/i, mobile: /mobile|phone/i, address: /^address/i, ward: /^ward/i, anganwadi: /anganwadi/i, icds: /icds/i, lsgd: /lsgd|local\s*body|lsgi/i, bedridden: /bedridden/i, disability: /^disability$/i, pct: /disability\s*%|percent/i, udid_status: /udid\s*status/i };
async function ubImport(file) {
  const box = $('#uberr'), say = (t, c = 'info') => { box.innerHTML = `<div class="alert ${c}">${esc(t)}</div>`; };
  try {
    say('Reading the file…'); const rows = parseCsv((await file.text()).replace(/^﻿/, '')); if (rows.length < 2) throw new Error('The file has no rows');
    const head = rows[0].map(h => String(h).trim()), at = {}; for (const [k, re] of Object.entries(UB_COLS)) { const i = head.findIndex(h => re.test(h)); at[k] = i; }
    for (const need of ['name', 'lsgd', 'mobile']) if (at[need] < 0) throw new Error(`The file has no "${need === 'lsgd' ? 'LSGD' : need}" column`);
    const data = rows.slice(1); let done = 0, skipped = 0, total = 0;
    if ($('#ubreplace')?.checked) { if (!await confirmBox('Remove everyone now in the register, then import this file? Call history is kept.', 'Replace', true)) return say('Nothing changed.'); await api('/api/staff/pwd/clear', 'POST', { confirm: 'DELETE' }); }
    for (let i = 0; i < data.length; i += 1500) {
      say(`Importing… ${Math.min(i + 1500, data.length).toLocaleString('en-IN')} of ${data.length.toLocaleString('en-IN')}`);
      const part = data.slice(i, i + 1500).map(r => Object.fromEntries(Object.entries(at).map(([k, ix]) => [k, ix < 0 ? '' : r[ix]])));
      const r = await api('/api/staff/pwd/import', 'POST', { rows: part, first: i === 0 }); done += r.n; skipped += r.skipped || 0; total = r.total;
    }
    say(`Done: ${done.toLocaleString('en-IN')} people imported${skipped ? `, ${skipped} rows skipped (no name or local body)` : ''}. The register now holds ${total.toLocaleString('en-IN')}.`, 'ok');
    setTimeout(() => { document.querySelector('.overlay')?.close?.(); apUnbound($('#pg')); }, 1200);
  } catch (e) { say(e.message, 'err'); }
}
// ---- allotment ----
actions.ubAllot = async el => {
  const a = UB.d.areas.find(x => x.lsgd_key === el.dataset.key), { wards } = await api('/api/staff/pwd/wards/' + encodeURIComponent(a.lsgd_key));
  modal(html`<h2>Allot ${a.lsgd}</h2><p class="muted small">${n(a.n)} people in ${wards.length} ward${wards.length === 1 ? '' : 's'}. Give the whole local body, or tick only some wards (useful where several colleges share a town).</p>
    <form data-form="ubAllotF" data-key="${esc(a.lsgd_key)}" class="stack-s"><label class="f"><span>Institution *</span><select name="college_id" required><option value="">Choose…</option>${UB.d.colleges.map(c => html`<option value="${c.id}">${c.name}</option>`)}</select></label>
      <label class="chk"><input type="checkbox" name="all" id="uball" checked> All wards of ${a.lsgd}</label>
      <div class="ub-wards" id="ubwards">${wards.map(w => html`<label class="chk"><input type="checkbox" data-w="${esc(w.ward)}"> Ward ${w.ward} <span class="muted xs">${w.n}</span></label>`)}</div>${mfoot('Allot')}</form>`, { wide: true });
  const all = $('#uball'); document.querySelectorAll('#ubwards [data-w]').forEach(c => c.addEventListener('change', () => { if (c.checked) all.checked = false; })); all.addEventListener('change', () => { if (all.checked) document.querySelectorAll('#ubwards [data-w]').forEach(c => { c.checked = false; }); });
};
forms.ubAllotF = async f => {
  const v = fd(f), wards = [...f.querySelectorAll('[data-w]:checked')].map(c => c.dataset.w);
  if (!v.all && !wards.length) throw new Error('Choose all wards or at least one ward');
  await api('/api/staff/pwd/alloc', 'POST', { college_id: v.college_id, lsgd_key: f.dataset.key, wards: v.all ? [] : wards }); f.closest('.overlay').close(); toast('Allotted'); apUnbound($('#pg'));
};
actions.ubUnalloc = async el => { if (!await confirmBox('Remove this allotment? The institution will no longer see these people.', 'Remove', true)) return; await api('/api/staff/pwd/alloc/' + el.dataset.id, 'DELETE'); toast('Removed'); apUnbound($('#pg')); };
actions.ubSuggest = async () => {
  if (!await confirmBox('Allot every local body that exactly one institution is based in to that institution? Shared towns are left for you to share out by ward.', 'Allot', false)) return;
  const r = await api('/api/staff/pwd/suggest', 'POST', {});
  modal(html`<h2>Allotment done</h2><p><b>${r.made.length}</b> local bodies allotted.</p>${r.made.length ? html`<div class="tablewrap" style="max-height:200px"><table data-nosort><tbody>${r.made.map(m => html`<tr><td>${m.college}</td><td>${m.area}</td><td class="num">${n(m.people)}</td></tr>`)}</tbody></table></div>` : ''}
    ${r.shared.length ? html`<div class="alert warn" style="margin-top:10px">${icon('alert')}<div><b>Shared, to be split by ward:</b>${r.shared.map(s => html`<div class="small">${s.area} (${n(s.people)} people): ${s.colleges.join(', ')}</div>`)}</div></div>` : ''}
    ${r.none.length ? html`<div class="alert info" style="margin-top:10px">${icon('info')}<div><b>No matching local body:</b> ${r.none.join(', ')}</div></div>` : ''}<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" data-act="closeModal">Done</button></div>`);
  apUnbound($('#pg'));
};
actions.ubExport = () => { window.location.href = '/api/staff/pwd/export-calls'; };
actions.ubClear = async () => { if (!await confirmBox('Delete the whole list? Every person is removed from the register so you can import a fresh file. Allotments and call history are kept. This cannot be undone.', 'Delete the list', true)) return; await api('/api/staff/pwd/clear', 'POST', { confirm: 'DELETE' }); toast('The register is empty'); apUnbound($('#pg')); };

// ---- villages: the register knows only local body and ward, so a village is a set of wards ----
async function ubVillages(b) {
  show(b, html`<div class="loading"><div class="spin"></div></div>`); const ops = isOps(); let v; try { v = await api('/api/staff/pwd/villages'); } catch (e) { return show(b, html`<div class="alert err">${e.message}</div>`); }
  UB.v = v;
  show(b, html`<div class="card pad0"><div class="filterbar"><div class="row gap-s">${ops ? html`<button class="btn primary sm" data-act="ubvAdd">${icon('map-pin')} Link a village to wards</button><button class="btn secondary sm" data-act="ubvImportOpen">${icon('upload')} Import a sheet</button>` : ''}<span class="small muted">${v.villages.length} village${v.villages.length === 1 ? '' : 's'} linked</span></div></div>
    ${v.villages.length ? html`<div class="tablewrap"><table data-nosort><thead><tr><th>Village</th><th>Wards it covers</th><th class="num">People</th><th>Allotted to</th>${ops ? html`<th class="ia"></th>` : ''}</tr></thead><tbody>
      ${v.villages.map(g => html`<tr><td><b>${g.village}</b></td><td class="small">${g.links.map(l => html`<span class="ub-chip">${l.lsgd.replace(/ (Grama )?Panchayat$/i, '')} <i>${l.ward ? 'ward ' + l.ward : 'all wards'}</i>${ops ? html`<button class="x" data-act="ubvLink" data-id="${l.id}" aria-label="Remove this ward from ${esc(g.village)}">×</button>` : ''}</span> `)}</td><td class="num">${n(g.n)}</td>
        <td>${g.allotted.length ? g.allotted.map(c => html`<div class="small">${c}</div>`) : html`<span class="muted small">not allotted</span>`}</td>${ops ? html`<td class="ia"><div class="row gap-s nowrap"><button class="btn sm secondary" data-act="ubvAllot" data-v="${esc(g.village)}">Allot</button><button class="ib danger" data-act="ubvDel" data-v="${esc(g.village)}" aria-label="Remove ${esc(g.village)}">${icon('trash')}</button></div></td>` : ''}</tr>`)}</tbody></table></div>`
      : html`<div class="pad">${empty('No village is linked yet', 'The register knows each person by local body and ward only. Tell the portal which wards each village covers, then give a village to an institution in one step. A sheet with the columns Village, Local body and Ward (several wards can be written together, like 3, 4, 5) can be imported.', 'map-pin')}</div>`}</div>`);
}
actions.ubvAdd = () => {
  const v = UB.v; modal(html`<h2>Link a village to wards</h2><p class="muted small">Choose the local body the village is in, then the wards it covers. A village can cover wards in more than one local body: add it again for the next one.</p>
    <form data-form="ubvAddF" class="stack-s"><label class="f"><span>Village *</span><input name="village" required maxlength="80" list="ubvnames" autocomplete="off"><datalist id="ubvnames">${[...new Set([...v.names, ...v.villages.map(g => g.village)])].map(x => html`<option value="${esc(x)}">`)}</datalist></label>
      <label class="f"><span>Local body *</span><select name="lsgd_key" id="ubvlsgd" required><option value="">Choose…</option>${v.areas.map(a => html`<option value="${esc(a.lsgd_key)}">${a.lsgd}</option>`)}</select></label>
      <label class="chk"><input type="checkbox" name="all" id="ubvall" checked> All wards of this local body</label><div class="ub-wards" id="ubvwards"></div>${mfoot('Link')}</form>`, { wide: true });
  const all = $('#ubvall'), box = $('#ubvwards');
  $('#ubvlsgd').addEventListener('change', async e => { box.innerHTML = ''; if (!e.target.value) return; const { wards } = await api('/api/staff/pwd/wards/' + encodeURIComponent(e.target.value)); box.innerHTML = wards.map(w => `<label class="chk"><input type="checkbox" data-w="${esc(w.ward)}"> Ward ${esc(w.ward)} <span class="muted xs">${w.n}</span></label>`).join(''); box.querySelectorAll('[data-w]').forEach(c => c.addEventListener('change', () => { if (c.checked) all.checked = false; })); });
  all.addEventListener('change', () => { if (all.checked) box.querySelectorAll('[data-w]').forEach(c => { c.checked = false; }); });
};
forms.ubvAddF = async f => {
  const v = fd(f), wards = [...f.querySelectorAll('[data-w]:checked')].map(c => c.dataset.w); if (!v.all && !wards.length) throw new Error('Choose all wards or at least one ward');
  await api('/api/staff/pwd/villages', 'POST', { village: v.village, lsgd_key: v.lsgd_key, wards: v.all ? [] : wards }); f.closest('.overlay').close(); toast('Linked'); ubVillages($('#ubbody'));
};
actions.ubvLink = async el => { await api('/api/staff/pwd/villages/link/' + el.dataset.id, 'DELETE'); ubVillages($('#ubbody')); };
actions.ubvDel = async el => { if (!await confirmBox('Remove this village and its ward links? Institutions keep any areas already allotted to them.', 'Remove', true)) return; await api('/api/staff/pwd/villages/remove', 'POST', { village: el.dataset.v }); toast('Removed'); ubVillages($('#ubbody')); };
actions.ubvAllot = el => {
  const g = UB.v.villages.find(x => x.village === el.dataset.v);
  modal(html`<h2>Allot ${g.village}</h2><p class="muted small">${n(g.n)} people in ${g.links.length} area${g.links.length === 1 ? '' : 's'}: ${g.links.map(l => l.lsgd.replace(/ (Grama )?Panchayat$/i, '') + (l.ward ? ' ward ' + l.ward : ' (all wards)')).join('; ')}.</p>
    <form data-form="ubvAllotF" data-v="${esc(g.village)}" class="stack-s"><label class="f"><span>Institution *</span><select name="college_id" required><option value="">Choose…</option>${UB.d.colleges.map(c => html`<option value="${c.id}">${c.name}</option>`)}</select></label>${mfoot('Allot')}</form>`);
};
forms.ubvAllotF = async f => { const v = fd(f), r = await api('/api/staff/pwd/alloc-village', 'POST', { college_id: v.college_id, village: f.dataset.v }); f.closest('.overlay').close(); toast(r.n ? 'Allotted' : 'Already allotted'); ubVillages($('#ubbody')); };
actions.ubvImportOpen = () => { modal(html`<h2>Import villages</h2><p class="muted small">A CSV with the columns <b>Village</b>, <b>Local body</b> and <b>Ward</b>. Several wards can go in one cell (3, 4, 5); leave Ward empty for the whole local body. A village can appear on several rows.</p><label class="btn primary lg">${icon('upload')} Choose the file<input type="file" id="ubvfile" accept=".csv,text/csv" hidden></label><div id="ubverr" style="margin-top:12px"></div>`); $('#ubvfile').addEventListener('change', e => e.target.files[0] && ubvImport(e.target.files[0])); };
async function ubvImport(file) {
  const box = $('#ubverr'), say = (t, c = 'info') => { box.innerHTML = `<div class="alert ${c}">${esc(t)}</div>`; };
  try {
    const rows = parseCsv((await file.text()).replace(/^\ufeff/, '')); if (rows.length < 2) throw new Error('The file has no rows');
    const head = rows[0].map(h => String(h).trim()), at = { village: head.findIndex(h => /village/i.test(h)), lsgd: head.findIndex(h => /lsgd|local\s*body|lsgi|panchayat|municipal/i.test(h)), ward: head.findIndex(h => /ward/i.test(h)) };
    if (at.village < 0 || at.lsgd < 0) throw new Error('The file needs a "Village" column and a "Local body" column');
    const data = rows.slice(1).filter(r => r.some(x => String(x).trim())); let added = 0; const un = new Set();
    for (let i = 0; i < data.length; i += 1000) { say('Importing…'); const r = await api('/api/staff/pwd/villages/import', 'POST', { first: i === 0, rows: data.slice(i, i + 1000).map(r => ({ village: r[at.village], lsgd: r[at.lsgd], ward: at.ward < 0 ? '' : r[at.ward] })) }); added += r.added; r.unmatched.forEach(x => un.add(x)); }
    say(`Done: ${added} village-ward link${added === 1 ? '' : 's'} added.${un.size ? ' Not found in the register (check the spelling): ' + [...un].join(', ') + '.' : ''}`, un.size ? 'warn' : 'ok'); ubVillages($('#ubbody'));
  } catch (e) { say(e.message, 'err'); }
}
