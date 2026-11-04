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
