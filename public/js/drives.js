'use strict';
// ---------- Vote Unnathi and Sea Your Vote (college or school workspace): the places allotted to this institution, and the visits it records ----------
let DVC = { k: 'unnathi', d: null, f: 'all' };
const dvcTel = m => 'tel:+91' + String(m || '').replace(/\D/g, '').slice(-10);
const dvcToday = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
const pgUnnathi = el => pgDrive(el, 'unnathi'), pgSea = el => pgDrive(el, 'sea');
async function pgDrive(el, k) {
  if (DVC.k !== k) DVC = { k, d: null, f: 'all' };
  const d = await api(`/api/college/drives/${k}`); DVC.d = d; const c = d.cfg, s = d.stats;
  const head = html`<div class="ub-head"><img src="${c.logo}" alt="${esc(c.name)}" class="ub-logo"><div><h1>${c.name}</h1><p>${c.blurb} Record each visit so the district can see the progress.</p></div></div>`;
  if (!d.allotted) return show(el, html`${head}<div class="card">${empty(`No ${c.unit} has been allotted to you yet`, `The district team will allot the ${c.units} you will visit. Please check again soon.`, 'map-pin')}</div>`);
  show(el, html`${head}
    <div class="kpis ub-kpis">${kpi(c.units[0].toUpperCase() + c.units.slice(1), s.units, { ic: 'map-pin' })}${kpi('Completed', s.done + ' of ' + s.units, { ic: 'check-circle', tone: 'green', count: false, sub: s.started + ' started' })}${kpi('People reached', s.people, { ic: 'users' })}${kpi('Registrations helped', s.registered, { ic: 'target', tone: 'saffron' })}</div>
    <div class="chips" style="margin:14px 0" role="group" aria-label="Show">${[['all', 'All'], ['todo', 'Not started'], ['doing', 'In progress'], ['done', 'Completed']].map(([x, l]) => html`<button class="chip ${DVC.f === x ? 'on' : ''}" data-act="dvcFilter" data-k="${x}">${l}</button>`)}</div>
    <div id="dvlist"></div>`);
  dvcPaint();
}
actions.dvcFilter = el => { DVC.f = el.dataset.k; $$('[data-act=dvcFilter]').forEach(b => b.classList.toggle('on', b === el)); dvcPaint(); };
function dvcPaint() {
  const d = DVC.d, c = d.cfg, list = d.units.filter(u => DVC.f === 'all' || u.status === DVC.f);
  show($('#dvlist'), list.length ? html`<div class="ub-grid">${list.map(u => html`<article class="ub-card"><div class="ub-top"><h3 style="margin:0;font-size:1.05rem">${u.name}</h3>${badge(d.status[u.status], u.status === 'done' ? 'ok' : u.status === 'doing' ? 'info' : 'grey')}</div>
      <p class="muted small" style="margin:6px 0 0">${[u.kind, u.village, u.lsgd, u.ward ? 'ward ' + u.ward : ''].filter(Boolean).join(' · ')}</p>
      ${u.address ? html`<p class="small" style="margin:4px 0 0">${u.address}</p>` : ''}
      <p class="small" style="margin:8px 0 0">${u.population ? html`<b>${n(u.population)}</b> people` : ''}${u.population && u.households ? ' · ' : ''}${u.households ? html`<b>${n(u.households)}</b> households` : ''}</p>
      ${u.note ? html`<p class="muted small" style="margin:4px 0 0">${u.note}</p>` : ''}
      ${u.contact_phone ? html`<p style="margin:10px 0 0"><a class="btn secondary sm" href="${dvcTel(u.contact_phone)}">${icon('call')} ${u.contact_name || 'Contact'} · ${u.contact_phone}</a></p>` : (u.contact_name ? html`<p class="small" style="margin:8px 0 0">Contact: ${u.contact_name}</p>` : '')}
      <p class="small" style="margin:10px 0 0"><b>${u.visits}</b> visit${u.visits === 1 ? '' : 's'} · <b>${n(u.people)}</b> reached · <b>${n(u.registered)}</b> registrations helped${u.last ? html` · last ${u.last}` : ''}</p>
      <div class="ub-act row gap-s" style="flex-wrap:wrap"><button class="btn primary sm" data-act="dvcVisit" data-id="${u.id}">${icon('edit')} Record a visit</button><button class="btn secondary sm" data-act="dvcHistory" data-id="${u.id}">History</button>
        ${u.status === 'done' ? html`<button class="btn ghost sm" data-act="dvcStatus" data-id="${u.id}" data-s="doing">Reopen</button>` : html`<button class="btn secondary sm" data-act="dvcStatus" data-id="${u.id}" data-s="done">${icon('check')} Mark completed</button>`}</div></article>`)}</div>`
    : html`<div class="card">${empty('Nothing here', 'No ' + c.unit + ' matches this filter.', 'map-pin')}</div>`);
}
actions.dvcVisit = el => {
  const d = DVC.d, u = d.units.find(x => x.id === Number(el.dataset.id));
  modal(html`<h2>Record a visit</h2><p class="muted small">${u.name}</p><form data-form="dvcVisitF" data-id="${u.id}" class="stack-s"><div class="grid g2"><label class="f"><span>Date *</span><input type="date" name="on_date" required max="${dvcToday()}" value="${dvcToday()}"></label>
    <label class="f"><span>What was done *</span><select name="type" required>${Object.entries(d.cfg.types).map(([k, l]) => html`<option value="${k}">${l}</option>`)}</select></label>
    <label class="f"><span>People reached</span><input type="number" name="people" min="0" inputmode="numeric" value=""></label><label class="f"><span>New registrations helped</span><input type="number" name="registered" min="0" inputmode="numeric" value=""></label></div>
    <label class="f"><span>Note (optional)</span><input name="note" maxlength="400" placeholder="Anything the district office should know"></label>${mfoot('Save the visit')}</form>`, { wide: true });
};
forms.dvcVisitF = async f => { const v = fd(f); await api(`/api/college/drives/${DVC.k}/visit`, 'POST', { unit_id: f.dataset.id, on_date: v.on_date, type: v.type, people: v.people, registered: v.registered, note: v.note }); f.closest('.overlay').close(); toast('Visit saved'); pgDrive($('#pg'), DVC.k); };
actions.dvcHistory = async el => {
  const u = DVC.d.units.find(x => x.id === Number(el.dataset.id)), r = await api(`/api/college/drives/${DVC.k}/unit/${u.id}`), t = DVC.d.cfg.types;
  modal(html`<h2>${u.name}</h2>${r.visits.length ? html`<ul class="ub-hist">${r.visits.map(v => html`<li><b>${t[v.type] || v.type}</b><span class="muted small"> ${v.on_date} · ${v.by_name}</span><div class="small">${n(v.people)} reached${v.registered ? ' · ' + n(v.registered) + ' registrations helped' : ''}</div>${v.note ? html`<div class="small muted">${v.note}</div>` : ''}</li>`)}</ul>` : html`<p class="muted">No visit recorded yet.</p>`}<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" data-act="closeModal">Close</button></div>`);
};
actions.dvcStatus = async el => { await api(`/api/college/drives/${DVC.k}/status`, 'POST', { unit_id: el.dataset.id, status: el.dataset.s }); toast(el.dataset.s === 'done' ? 'Marked as completed' : 'Reopened'); pgDrive($('#pg'), DVC.k); };
