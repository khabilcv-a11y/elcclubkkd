'use strict';
// ---------- Vote Unbound (college or school workspace): the call desk for the areas allotted to this institution ----------
// Only the people of the allotted local bodies and wards are ever sent here. People who share one phone number are shown together, so a family is one call.
const ubPct = (a, b) => (b ? Math.round(a / b * 100) : 0);
let UBC = { d: null, f: { status: 'open', ward: '', lsgd: '', q: '' }, items: [], numbers: [], total: 0, loading: false };
const ubTel = m => 'tel:+91' + String(m || '').replace(/\D/g, '').slice(-10);
const ubOutBadge = p => (p.last_outcome ? badge({ reached_ok: 'Reached', needs_help: 'Needs help', callback: 'Call again', not_reachable: 'Not reachable', wrong_number: 'Wrong number', refused: 'Declined' }[p.last_outcome], p.last_outcome === 'needs_help' ? 'warn' : p.last_outcome === 'reached_ok' ? 'ok' : 'grey') : '');
// Vote Unbound has up to two parts here, each with its own switch: the welfare institutions allotted to visit, and the call campaign
const ubParts = () => { const aud = COL?.college?.kind === 'school' ? 'school' : 'college'; return { inst: feat(aud, 'unbound_inst'), calls: feat(aud, 'unbound') }; };
const ubcSwitch = cur => { const p = ubParts(); return p.inst && p.calls ? html`<div class="chips ubpart" role="tablist" aria-label="Vote Unbound">${[['inst', 'Welfare institutions'], ['calls', 'Call campaign']].map(([k, l]) => html`<button class="chip ${cur === k ? 'on' : ''}" role="tab" aria-selected="${cur === k}" data-act="ubcPart" data-k="${k}">${l}</button>`)}</div>` : ''; };
actions.ubcPart = el => { UBC.part = el.dataset.k; pgUnbound($('#pg')); };
async function pgUnbound(el) {
  const p = ubParts(), part = p.inst && p.calls ? (UBC.part || 'inst') : p.inst ? 'inst' : 'calls';
  if (part === 'inst') return pgDrive(el, 'unbound');
  return pgUnboundCalls(el);
}
async function pgUnboundCalls(el) {
  const d = await api('/api/college/pwd'); UBC.d = d;
  const head = html`${ubcSwitch('calls')}<div class="ub-head"><img src="/img/drives/vote-unbound.webp" alt="Vote Unbound" class="ub-logo"><div><h1>Vote Unbound</h1><p>Call persons with disabilities in your allotted area, tell them about voting facilities, and note what each person needs. Please be patient, polite and brief.</p></div></div>`;
  if (!d.allotted) return show(el, html`${head}<div class="card">${empty('No area has been allotted to you yet', 'The district team will allot the local bodies or wards you will call. Please check again soon.', 'map-pin')}</div>`);
  const s = d.stats;
  show(el, html`${head}
    <div class="kpis ub-kpis">${kpi('People in your area', s.people, { ic: 'users' })}${kpi('Phone numbers', s.numbers, { ic: 'help', count: false, sub: 'a shared number is one call' })}${kpi('Called', ubPct(s.called, s.people) + '%', { ic: 'check-circle', tone: 'green', count: false, sub: s.called + ' of ' + s.people })}${kpi('Need help', s.needs_help, { ic: 'target', tone: 'saffron' })}</div>
    <div class="card" style="margin-top:14px"><div class="card-head"><h3>${icon('map-pin')} Your area</h3></div><div class="ub-chips">${d.areas.map(a => html`<span class="ub-chip">${a.lsgd} <i>${a.wards.length > 8 ? a.wards.length + ' wards' : 'ward' + (a.wards.length === 1 ? ' ' : 's ') + a.wards.map(w => w.ward).join(', ')} · ${n(a.n)} people</i></span>`)}</div></div>
    <div class="card" style="margin-top:14px"><div class="ub-filters"><div class="chips" role="group" aria-label="Show">${[['open', 'To call'], ['help', 'Needs help'], ['done', 'Done'], ['bed', 'Bedridden'], ['', 'Everyone']].map(([k, l]) => html`<button class="chip ${UBC.f.status === k ? 'on' : ''}" data-act="ubcStatus" data-k="${k}">${l}</button>`)}</div>
      <div class="row gap-s ub-sel">${d.areas.length > 1 ? html`<label class="f" style="margin:0"><span class="sr">Local body</span><select id="ubclsgd" aria-label="Local body"><option value="">All local bodies</option>${d.areas.map(a => html`<option value="${esc(a.lsgd_key)}" ${UBC.f.lsgd === a.lsgd_key ? 'selected' : ''}>${a.lsgd}</option>`)}</select></label>` : ''}
        <label class="f" style="margin:0"><span class="sr">Ward</span><select id="ubcward" aria-label="Ward"><option value="">All wards</option>${[...new Set(d.areas.filter(a => !UBC.f.lsgd || a.lsgd_key === UBC.f.lsgd).flatMap(a => a.wards.map(w => w.ward)))].sort((a, b) => Number(a) - Number(b)).map(w => html`<option ${UBC.f.ward === w ? 'selected' : ''}>${w}</option>`)}</select></label>
        <label class="f" style="margin:0;min-width:180px;flex:1"><span class="sr">Search</span><input type="search" id="ubcq" placeholder="Search a name or number…" value="${esc(UBC.f.q)}"></label></div></div></div>
    <div id="ublist" style="margin-top:14px"></div><p class="center" id="ubmore" style="margin:16px 0"></p>`);
  $('#ubclsgd')?.addEventListener('change', e => { UBC.f.lsgd = e.target.value; UBC.f.ward = ''; pgUnbound($('#pg')); });
  $('#ubcward')?.addEventListener('change', e => { UBC.f.ward = e.target.value; ubLoad(true); });
  const q = $('#ubcq'); q?.addEventListener('input', () => { clearTimeout(UBC.t); UBC.t = setTimeout(() => { UBC.f.q = q.value.trim(); ubLoad(true); }, 350); });
  ubLoad(true);
}
actions.ubcStatus = el => { UBC.f.status = el.dataset.k; $$('[data-act=ubcStatus]').forEach(b => b.classList.toggle('on', b === el)); ubLoad(true); };
async function ubLoad(reset) {
  if (UBC.loading) return; UBC.loading = true;
  if (reset) { UBC.items = []; UBC.numbers = []; }
  try {
    const f = UBC.f, r = await api('/api/college/pwd/list?' + new URLSearchParams({ status: f.status, ward: f.ward, lsgd: f.lsgd, q: f.q, offset: UBC.numbers.length }));
    UBC.total = r.total; UBC.numbers.push(...r.numbers); UBC.items.push(...r.people); ubPaintList();
  } catch (e) { toast(e.message, true); } finally { UBC.loading = false; }
}
function ubPaintList() {
  const by = new Map(); for (const m of UBC.numbers) by.set(m, UBC.items.filter(p => p.mobile === m));
  show($('#ublist'), UBC.numbers.length ? html`<div class="ub-grid">${UBC.numbers.map(m => ubCard(m, by.get(m)))}</div>` : html`<div class="card">${empty(UBC.f.status === 'open' ? 'Nobody left to call here' : 'No one matches', UBC.f.status === 'open' ? 'Everyone in this view has been called. Well done!' : 'Try another filter.', 'check-circle')}</div>`);
  $('#ubmore').innerHTML = UBC.numbers.length < UBC.total ? `<button class="btn secondary" data-act="ubMore">Show more (${(UBC.total - UBC.numbers.length).toLocaleString('en-IN')} to go)</button>` : (UBC.total ? `<span class="muted small">${UBC.total.toLocaleString('en-IN')} number${UBC.total === 1 ? '' : 's'} in this view</span>` : '');
}
const ubCard = (m, ps) => html`<article class="ub-card ${ps.some(p => p.bedridden) ? 'bed' : ''}"><div class="ub-top"><a class="btn ${m ? 'primary' : 'secondary'}" ${m ? 'href="' + ubTel(m) + '"' : ''}>${icon('call')} ${m || 'No number'}</a>${ps.length > 1 ? html`<span class="badge info">${ps.length} people on this number</span>` : ''}</div>
  <ul class="ub-people">${ps.map(p => html`<li><label class="chk"><input type="checkbox" data-ubp="${p.pid}" ${ps.length === 1 ? 'checked' : ''} aria-label="${esc(p.name)}"><span class="ub-name"><button class="linkbtn" data-act="ubPerson" data-pid="${p.pid}">${p.name}</button><small class="muted">${[p.age ? p.age + ' yrs' : '', p.gender, p.disability ? p.disability + (p.pct ? ' ' + p.pct + '%' : '') : '', 'ward ' + p.ward].filter(Boolean).join(' · ')}</small></span></label>
    <span class="ub-tags">${p.bedridden ? badge('Bedridden', 'warn') : ''}${p.udid && p.udid !== 'Issued' ? badge('UDID: ' + p.udid.toLowerCase(), 'grey') : ''}${ubOutBadge(p)}</span></li>`)}</ul>
  <div class="ub-act"><button class="btn secondary sm" data-act="ubLog" data-m="${m}">${icon('edit')} Note the call</button></div></article>`;
actions.ubMore = () => ubLoad(false);
actions.ubPerson = async el => {
  const p = await api('/api/college/pwd/person/' + el.dataset.pid), o = UBC.d.outcomes, h = UBC.d.help;
  modal(html`<h2>${p.name}</h2><p class="muted small">${[p.age ? p.age + ' years' : '', p.gender, 'ward ' + p.ward, p.lsgd].filter(Boolean).join(' · ')}</p>
    <dl class="sf-meta" style="margin:10px 0"><div><dt>Mobile</dt><dd><a href="${ubTel(p.mobile)}">${p.mobile || '–'}</a></dd></div><div><dt>Disability</dt><dd>${p.disability || 'Not stated'}${p.pct ? ' · ' + p.pct + '%' : ''}</dd></div><div><dt>UDID</dt><dd>${p.udid}</dd></div><div><dt>Bedridden</dt><dd>${p.bedridden ? 'Yes' : 'No'}</dd></div><div style="grid-column:1/-1"><dt>Address</dt><dd>${p.address || '–'}</dd></div></dl>
    <h4>Calls so far</h4>${p.history.length ? html`<ul class="ub-hist">${p.history.map(c => html`<li><b>${o[c.outcome]}</b>${c.help ? html` · ${h[c.help]}` : ''}<span class="muted small"> ${fdt(c.at)} · ${c.by_name}</span>${c.note ? html`<div class="small">${c.note}</div>` : ''}</li>`)}</ul>` : html`<p class="muted small">Not called yet.</p>`}
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" data-act="closeModal">Close</button></div>`);
};
// note how a call went, for the ticked people on that number
actions.ubLog = el => {
  const m = el.dataset.m, card = el.closest('.ub-card'), pids = [...card.querySelectorAll('[data-ubp]:checked')].map(c => c.dataset.ubp);
  if (!pids.length) return toast('Tick the people you spoke to first', true);
  const o = UBC.d.outcomes, h = UBC.d.help;
  modal(html`<h2>Note the call</h2><p class="muted small">${pids.length} ${pids.length === 1 ? 'person' : 'people'} on ${m}</p>
    <form data-form="ubLogF" data-m="${m}" data-pids="${pids.join(',')}" class="stack-s"><div class="ub-outs" role="radiogroup" aria-label="How did the call go">${Object.entries(o).map(([k, l]) => html`<label class="ub-out"><input type="radio" name="outcome" value="${k}" required><span>${l}</span></label>`)}</div>
      <label class="f hide" id="ubhelp"><span>What help is needed?</span><select name="help">${Object.entries(h).map(([k, l]) => html`<option value="${k}">${l}</option>`)}</select></label>
      <label class="f"><span>Note (optional)</span><input name="note" maxlength="300" placeholder="Anything the district office should know"></label>${mfoot('Save the call')}</form>`, { wide: true });
  document.querySelectorAll('input[name=outcome]').forEach(r => r.addEventListener('change', () => $('#ubhelp').classList.toggle('hide', r.value !== 'needs_help')));
};
forms.ubLogF = async f => {
  const v = fd(f), pids = f.dataset.pids.split(','), r = await api('/api/college/pwd/call', 'POST', { pids, outcome: v.outcome, help: v.help, note: v.note });
  f.closest('.overlay').close(); toast(`Saved for ${r.n} ${r.n === 1 ? 'person' : 'people'}`);
  const open = ['not_reachable', 'callback'].includes(v.outcome);
  for (const p of UBC.items) if (pids.includes(p.pid)) { p.last_outcome = v.outcome; p.calls++; }
  if (UBC.f.status === 'open' && !open) { const gone = UBC.numbers.filter(m => UBC.items.filter(p => p.mobile === m).every(p => !(p.last_outcome === null || ['not_reachable', 'callback'].includes(p.last_outcome)))); UBC.numbers = UBC.numbers.filter(m => !gone.includes(m)); UBC.items = UBC.items.filter(p => UBC.numbers.includes(p.mobile)); UBC.total -= gone.length; }
  ubPaintList();
  UBC.d = await api('/api/college/pwd');      // the figures at the top are refreshed on the next visit
};
