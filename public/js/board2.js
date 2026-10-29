'use strict';
// ---- Campus to booth ranking and display board (used on the home page and the full display board) ----
const CSORTS = { pct: 'Coverage', registered: 'Students registered', desk_regs: 'Help desk registrations', desk_vols: 'Volunteer-days', photos: 'Photos shared' };
let csort = 'pct', cquery = '';
const cStatus = s => (s === 'active' ? badge('Active', 'ok') : s === 'quiet' ? badge('Quiet this week', 'warn') : badge('Not started', 'grey'));

function rankCampus(list, key, q) {
  const text = (q || '').toLowerCase();
  return list.filter(i => !text || i.name.toLowerCase().includes(text))
    .sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1) || (b.pct ?? -1) - (a.pct ?? -1) || b.registered - a.registered || a.name.localeCompare(b.name));
}
function paintCampus() {
  const box = $('#cboard'); if (!box || !BOARD?.campus) return;
  const limit = Number(box.dataset.limit || 0), C = BOARD.campus;
  show($('#ctabs'), html`${Object.entries(CSORTS).map(([k, l]) => html`<button class="tab" role="tab" aria-selected="${k === csort}" data-act="cSort" data-k="${k}">${l}</button>`)}`);
  let list = rankCampus(C.institutions, csort, cquery); const total = list.length;
  if (!cquery) list = list.filter(i => i.status !== 'new' || limit === 0);
  if (limit) list = list.slice(0, limit);
  const val = i => (csort === 'pct' ? (i.pct == null ? '—' : i.pct + '%') : n(i[csort]));
  show(box, list.length ? html`${list.map((c, i) => html`<div class="lbrow rv ${i < 3 && !cquery ? 'r' + (i + 1) : ''}" style="grid-template-columns:44px minmax(160px,2.4fr) minmax(130px,1.8fr) minmax(110px,1fr) minmax(110px,1fr)"><div class="rank">${i + 1}</div>
      <div class="nm">${c.name}<small>${c.kind === 'school' ? 'School' : 'College'} · ${c.status === 'active' ? 'active this week' : c.status === 'quiet' ? 'quiet this week' : 'not started'}</small></div>
      <div>${progress(c.pct || 0, c.pct >= 100 ? 'green' : 'saffron')}<small class="muted">${c.pct == null ? 'no numbers yet' : c.pct + '% covered'}</small></div>
      <div class="c"><b>${n(c.registered)}</b><small style="display:block">of ${n(c.eligible)} eligible</small></div>
      <div class="c"><b>${csort === 'pct' ? n(c.desk_regs) : val(c)}</b><small style="display:block">${csort === 'pct' ? 'help desk regs' : CSORTS[csort].toLowerCase()}</small></div></div>`)}
    ${limit && total > list.length ? html`<p class="center" style="margin-top:12px"><a class="btn secondary" href="#/board">Full ranking of all ${total} ${icon('arrow-right')}</a></p>` : ''}` : empty('No match', 'Try another name.', 'search'));
}
actions.cSort = el => { csort = el.dataset.k; paintCampus(); };

// ---------- the full display board ----------
async function renderCampusBoard() {
  const C = BOARD.campus, T = C.totals, A = C.awards;
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">
    ${pageHead('Display board', 'Campus to booth: live progress of every college and school toward 100% enrolment. Refreshes automatically.', html`<button class="btn secondary" data-act="tv">${icon('eye')} Full screen</button><a class="btn secondary" href="#/">${icon('home')} Home</a>`, 'Electoral Literacy Clubs')}
    <div class="card rv campus-top"><div class="row between" style="align-items:flex-end;gap:16px"><div><div class="campus-big">${T.pct == null ? '—' : T.pct + '%'}</div><div class="muted">total coverage: eligible students registered across ${n(T.institutions)} colleges and schools</div></div>
      <div class="campus-facts"><div><b>${n(T.registered)}</b><span>registered</span></div><div><b>${n(T.balance)}</b><span>still to cover</span></div><div><b>${n(T.ineligible)}</b><span>under 17</span></div><div><b>${T.reporting}/${T.institutions}</b><span>institutions reporting</span></div></div></div>${progress(T.pct || 0, 'green')}</div>
    <div class="kpis" style="margin-top:16px">${kpi('Registrations at help desks', T.desk_regs, { ic: 'user-check', tone: 'green' })}${kpi('Volunteer-days at help desks', T.desk_vols, { ic: 'users', tone: 'saffron' })}${kpi('Volunteer-days in other activities', T.activity, { ic: 'megaphone' })}
      ${kpi('Active colleges and schools', `${T.active}/${T.institutions}`, { ic: 'building', tone: 'info', count: false })}${kpi('Photos shared', T.photos, { ic: 'camera' })}${kpi('Departments reported', T.depts, { ic: 'list' })}</div>
    <div class="grid g2" style="margin-top:16px"><div class="card rv"><div class="card-head"><h3>Help desk registrations per day</h3><span class="small muted">last ${C.trend.length} reported days</span></div><div id="ctrend"></div></div>
      <div class="card rv"><div class="card-head"><h3>Hall of fame</h3></div><div class="stack-s" id="cawards"></div></div></div>
    <div class="section-head" style="margin-top:34px"><div><h2>College and school ranking</h2><p>Ranked by ${CSORTS[csort].toLowerCase()}. Coverage is the share of eligible students (not under 17) who are registered.</p></div>
      <label class="f" style="margin:0;min-width:240px"><span class="sr">Search</span><input type="search" id="cq2" placeholder="Search a college or school…" value="${esc(cquery)}"></label></div>
    <div class="tabs" role="tablist" aria-label="Rank by" id="ctabs" style="margin-bottom:14px"></div><div class="board" id="cboard" data-limit="0"></div></div>`, 'board'));
  paintTrend('#ctrend', C.trend); paintCampus();
  const items = [['target', 'Highest coverage', A.coverage, '%'], ['user-check', 'Most students registered', A.registered, 'registered'], ['megaphone', 'Most help desk registrations', A.desk_regs, 'registrations'], ['users', 'Most volunteer-days', A.desk_vols, 'volunteer-days'], ['trophy', 'Most activity volunteers', A.activity, 'volunteer-days'], ['camera', 'Most photos shared', A.photos, 'photos']];
  show($('#cawards'), html`${items.map(([ic, tt, w, u]) => html`<div class="res rv"><span class="ico">${icon(ic)}</span><div class="grow"><h3>${tt}</h3><p>${w ? html`<b>${w.name}</b> · ${n(w.value)} ${u}` : 'Up for grabs'}</p></div></div>`)}`);
  $('#cq2').addEventListener('input', e => { cquery = e.target.value; paintCampus(); });
  clearInterval(boardTimer); boardTimer = setInterval(async () => { if (location.hash !== '#/board') return clearInterval(boardTimer); try { BOARD = await api('/api/public/board'); paintCampus(); } catch {} }, 30000);
}
