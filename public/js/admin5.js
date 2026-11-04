'use strict';
// ---------- Selfie contest: entries sent in by students; the office picks the best three of the district for the CEO, Kerala ----------
let SFS = { d: null, f: 'all', q: '' };
const SF_ST = { new: ['New', 'grey'], shortlisted: ['Shortlisted', 'info'], top3: ['Best three', 'ok'], rejected: ['Not selected', 'bad'] };
async function apSelfie(el) {
  const d = await api('/api/staff/selfie'); SFS.d = d; window.__sfe = d.entries;
  const E = d.entries, ops = isOps(), cnt = s => E.filter(e => e.status === s).length, shown = sfFiltered();
  show(el, html`${pageHead('Selfie contest', 'Entries sent in by students of colleges and schools. Look through them, shortlist the good ones and mark the best three of the district to send to the Chief Electoral Officer, Kerala.', html`<a class="btn secondary" href="/#/selfie" target="_blank" rel="noopener">${icon('external')} Open the public page</a><button class="btn secondary" data-act="sfCsv">${icon('download')} Download the list</button>`, 'Campus to booth')}
    ${d.open ? '' : html`<div class="alert warn" style="margin-bottom:14px">${icon('alert')}<div>Entries are switched off. Students cannot send selfies until the super admin switches <b>Selfie contest entries</b> on under Access control.</div></div>`}
    <div class="kpis">${kpi('Entries', E.length, { ic: 'users' })}${kpi('Pictures', E.reduce((n, e) => n + e.photos.length, 0), { ic: 'image', tone: 'saffron' })}${kpi('Institutions', new Set(E.map(e => e.institution)).size, { ic: 'building', tone: 'green' })}${kpi('Best three', cnt('top3') + ' of 3', { ic: 'trophy', count: false })}</div>
    <div class="card pad0" style="margin-top:16px"><div class="filterbar"><div class="chips">${[['all', 'All (' + E.length + ')'], ['new', 'New (' + cnt('new') + ')'], ['shortlisted', 'Shortlisted (' + cnt('shortlisted') + ')'], ['top3', 'Best three (' + cnt('top3') + ')'], ['rejected', 'Not selected (' + cnt('rejected') + ')']].map(([k, l]) => html`<button class="chip ${SFS.f === k ? 'on' : ''}" data-act="sfFilter" data-k="${k}">${l}</button>`)}</div>
      <label class="f" style="margin:0;min-width:220px"><span class="sr">Search entries</span><input type="search" id="sfq" placeholder="Search name, institution or phone…" value="${esc(SFS.q)}"></label></div></div>
    ${shown.length ? html`<div class="sfgrid">${shown.map(e => { const st = SF_ST[e.status] || SF_ST.new; return html`<article class="sfcard"><button class="sfthumb" data-act="sfOpen" data-id="${e.id}" aria-label="Open the entry of ${esc(e.name)}"><img src="/api/staff/selfie/photo/${e.photos[0].id}/thumb" alt="" loading="lazy" decoding="async">${e.photos.length > 1 ? html`<span class="sfn">${icon('image')} ${e.photos.length}</span>` : ''}<span class="sfst ${st[1]}">${st[0]}</span></button>
        <div class="sfbody"><b>${e.name}</b><span class="small muted">${e.institution}${e.course ? ' · ' + e.course : ''}</span><span class="xs muted">${fdt(e.created_at)}</span></div></article>`; })}</div>` : html`<div class="card" style="margin-top:16px">${empty(E.length ? 'No entry matches' : 'No entries yet', E.length ? 'Try another word or filter.' : 'Entries appear here as students send their selfies from the public Selfie contest page.', 'camera')}</div>`}`);
  const q = $('#sfq', el); q?.addEventListener('input', () => { SFS.q = q.value; clearTimeout(SFS.t); SFS.t = setTimeout(() => apSelfie($('#pg')).then(() => { const n = $('#sfq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }), 350); });
}
function sfFiltered() {
  const q = SFS.q.trim().toLowerCase();
  return SFS.d.entries.filter(e => (SFS.f === 'all' || e.status === SFS.f) && (!q || [e.name, e.institution, e.phone, e.course].some(x => String(x || '').toLowerCase().includes(q))));
}
actions.sfFilter = el => { SFS.f = el.dataset.k; apSelfie($('#pg')); };
actions.sfOpen = el => {
  const e = SFS.d.entries.find(x => x.id === Number(el.dataset.id)); if (!e) return; const ops = isOps(), st = SF_ST[e.status] || SF_ST.new;
  modal(html`<h2>${e.name} ${badge(st[0], st[1])}</h2>
    <p class="muted small">${e.institution}${e.course ? ' · ' + e.course : ''} · sent ${fdt(e.created_at)}</p>
    <div class="sfview">${e.photos.map((p, i) => html`<figure><a href="/api/staff/selfie/photo/${p.id}/image" target="_blank" rel="noopener" aria-label="Open picture ${i + 1} full size"><img src="/api/staff/selfie/photo/${p.id}/image" alt="Selfie ${i + 1} by ${esc(e.name)}" loading="lazy"></a><a class="btn sm secondary" href="/api/staff/selfie/photo/${p.id}/image" download="selfie-${slug(e.name)}-${i + 1}.jpg">${icon('download')} Download</a></figure>`)}</div>
    ${e.caption ? html`<p class="sfcap">“${e.caption}”</p>` : ''}
    <dl class="sf-meta" style="margin:10px 0">${e.phone ? html`<div><dt>Mobile</dt><dd><a href="tel:${e.phone}">${e.phone}</a></dd></div>` : ''}${e.email ? html`<div><dt>Email</dt><dd><a href="mailto:${e.email}">${e.email}</a></dd></div>` : ''}<div><dt>Entry no.</dt><dd>${e.id}</dd></div></dl>
    ${ops ? html`<form data-form="sfStatus" data-id="${e.id}" class="stack-s"><div class="formgrid"><label class="f"><span>Decision</span><select name="status">${Object.entries(SF_ST).map(([k, [l]]) => html`<option value="${k}" ${e.status === k ? 'selected' : ''}>${l}</option>`)}</select></label>
      <label class="f"><span>Note for the office (optional)</span><input type="text" name="note" maxlength="300" value="${esc(e.note || '')}"></label></div>
      <div data-err></div><div class="row between"><button type="button" class="btn danger" data-act="sfDel" data-id="${e.id}">${icon('trash')} Delete the entry</button><div class="row"><button type="button" class="btn secondary" data-act="closeModal">Close</button><button class="btn primary" type="submit">Save</button></div></div></form>` : html`<div class="row" style="justify-content:flex-end"><button class="btn secondary" data-act="closeModal">Close</button></div>`}`, { wide: true });
};
forms.sfStatus = async f => {
  const v = fd(f);
  if (v.status === 'top3' && SFS.d.entries.filter(e => e.status === 'top3' && e.id !== Number(f.dataset.id)).length >= 3) throw new Error('Three entries are already marked as the best three. Change one of them first.');
  await api('/api/staff/selfie/' + f.dataset.id, 'POST', { status: v.status, note: v.note });
  f.closest('.overlay').close(); toast('Saved'); apSelfie($('#pg'));
};
actions.sfDel = async el => {
  if (!await confirmBox('Delete this entry and its pictures for good?', 'Delete', true)) return;
  await api('/api/staff/selfie/' + el.dataset.id, 'DELETE'); el.closest('.overlay')?.close(); toast('Deleted'); apSelfie($('#pg'));
};
actions.sfCsv = () => download('selfie-contest-entries.csv', toCsv(['Entry no.', 'Name', 'Institution', 'Class or course', 'Mobile', 'Email', 'Pictures', 'Decision', 'Note', 'Sent'], sfFiltered().map(e => [e.id, e.name, e.institution, e.course, e.phone, e.email, e.photos.length, (SF_ST[e.status] || SF_ST.new)[0], e.note || '', e.created_at])));

// ---------- Assembly Constituency of each institution: flagged on the dashboard until every college and school has one ----------
async function apDashboard(el) {
  await apDashboardBase(el);
  if (!isOps()) return;
  const box = document.createElement('div'); box.id = 'acnote'; box.style.marginBottom = '16px';
  el.querySelector('.page-head')?.insertAdjacentElement('afterend', box);
  try { await acNotice(box); } catch { /* the notice is only a reminder; the dashboard works without it */ }
}
async function acNotice(box) {
  const d = await api('/api/staff/ac-status'); window.__ac = d; const u = d.unassigned;
  if (!u.length) return show(box, html`<div class="alert ok">${icon('check-circle')}<div>All ${d.total} active colleges and schools have an Assembly Constituency.${d.multi ? ` ${d.multi} work in more than one; the first is taken as their own.` : ''} <button class="btn sm secondary" style="margin-left:8px" data-act="acManage">Review</button></div></div>`);
  show(box, html`<div class="alert warn" role="alert">${icon('alert')}<div><b>${u.length} of ${d.total} active colleges and schools have no Assembly Constituency yet.</b> The AC round of the quiz and essay competitions needs it.
    <div class="small" style="margin-top:4px">${u.slice(0, 6).map(x => x.name).join(' · ')}${u.length > 6 ? ` · and ${u.length - 6} more` : ''}</div>
    <div class="row gap-s" style="margin-top:8px"><button class="btn sm primary" data-act="acApply">${icon('check-circle')} Apply the district office's list</button><button class="btn sm secondary" data-act="acManage">Set them one by one</button></div></div></div>`);
}
actions.acApply = async el => {
  el.disabled = true;
  try {
    const r = await api('/api/staff/ac-import', 'POST', {});
    modal(html`<h2>District list applied</h2><p><b>${r.applied}</b> institutions now have their Assembly Constituency${r.skipped ? html`; ${r.skipped} already had one and were left as they are` : ''}.</p>
      ${r.unmatched.length ? html`<div class="alert warn">${icon('alert')}<div><b>${r.unmatched.length} names in the list were not found among the registered institutions</b>: they have not registered on the portal yet, or are spelled very differently.<div class="small" style="margin-top:6px;max-height:180px;overflow:auto">${r.unmatched.map(x => html`${x}<br>`)}</div></div></div>` : ''}
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" data-act="closeModal">Done</button></div>`);
    apDashboard($('#pg'));
  } finally { el.disabled = false; }
};
actions.acManage = async () => {
  const d = window.__ac || await api('/api/staff/ac-status'); window.__ac = d;
  modal(html`<h2>Assembly Constituency of each institution</h2><p class="muted small">An institution that works in several constituencies has the first one as its own; choose the one it belongs to if that is wrong. Changes are saved as you choose.</p>
    <div class="tablewrap" style="max-height:60vh"><table data-nosort><thead><tr><th>Institution</th><th>Type</th><th>Constituency</th></tr></thead><tbody>${[...d.institutions].sort((a, b) => (a.ac ? 1 : 0) - (b.ac ? 1 : 0) || a.name.localeCompare(b.name)).map(x => html`<tr><td>${x.name}${x.ac_all.includes(',') ? html`<div class="xs muted">Works in: ${x.ac_all}</div>` : ''}</td><td>${x.kind === 'school' ? 'School' : 'College'}</td><td><select data-acset="${x.id}" aria-label="Constituency of ${esc(x.name)}"><option value="">Not set</option>${d.acs.map(a => html`<option ${x.ac === a ? 'selected' : ''}>${a}</option>`)}</select></td></tr>`)}</tbody></table></div>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" data-act="closeModal">Done</button></div>`, { wide: true });
};
document.addEventListener('change', async e => {
  const id = e.target.dataset?.acset; if (!id) return;
  const x = window.__ac.institutions.find(i => String(i.id) === id), keep = x.ac_all ? x.ac_all.split(', ') : [];
  try { await api(`/api/staff/colleges/${id}/ac`, 'POST', { ac: e.target.value, ac_all: keep }); x.ac = e.target.value; if (!x.ac_all.split(', ').includes(x.ac) && x.ac) x.ac_all = [x.ac, ...keep].join(', '); toast('Saved'); } catch (er) { toast(er.message, true); }
});
