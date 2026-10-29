'use strict';
// ---- Campus to booth on the public site: ranking (podium + cards), display board, photo gallery page ----
const rankedCampus = list => list.filter(i => i.strength > 0 && i.pct != null).sort((a, b) => b.pct - a.pct || b.registered - a.registered || a.name.localeCompare(b.name));
// "Help desk" is shown once: the category is only added when it says something different from the title
const albumMeta = g => [g.activity && String(g.activity).toLowerCase() !== String(g.title || '').toLowerCase() ? g.activity : '', g.event_date ? fdate(g.event_date) : ''].filter(Boolean).join(' · ');
const albumName = (g, size = 30) => html`<b class="withav">${g.logo_v ? avatar(g.college_id, g.logo_v, g.college, size) : ''}${g.college}</b>`;
function openLightbox(list, start) {
  const m = modal(html`<div id="lbx"></div>`, { wide: true }); let at = start;
  const paintBox = () => {
    const g = list[at];
    show($('#lbx', m), html`<figure class="lightbox"><img src="/api/public/album/${g.id}/image" alt="${g.title}, ${g.college}"><figcaption>${albumName(g, 36)}<span>${g.title}</span>${albumMeta(g) ? html`<small>${albumMeta(g)}</small>` : ''}</figcaption></figure>
      <div class="row between lbnav"><button class="btn secondary" data-lb="-1" aria-label="Previous photo">${icon('arrow-left')} Previous</button><span class="small muted">${at + 1} of ${list.length}</span><button class="btn secondary" data-lb="1" aria-label="Next photo">Next ${icon('arrow-right')}</button><button class="btn primary" data-act="closeModal">Close</button></div>`);
  };
  const go = d => { at = (at + d + list.length) % list.length; paintBox(); };
  m.addEventListener('click', e => { const b = e.target.closest('[data-lb]'); if (b) go(Number(b.dataset.lb)); });
  const key = e => { if (!document.body.contains(m)) return document.removeEventListener('keydown', key); if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
  document.addEventListener('keydown', key); paintBox();
}
const kindLabel = i => (i.kind === 'school' ? 'School' : 'College');

function podiumHtml(top) {
  if (!top.length) return '';
  const order = top.length >= 3 ? [1, 0, 2] : top.map((_, k) => k);
  return html`<div class="podium cpod" style="grid-template-columns:repeat(${top.length},1fr);max-width:${top.length * 380}px;margin-inline:auto">${order.map(k => { const c = top[k]; return html`<div class="pod p${k + 1} rv"><div class="m">${k + 1}</div>${avatar(c.id, c.logo_v, c.name, 56)}<h3>${c.name}</h3><small>${kindLabel(c)}</small>
      <div class="sc">${c.pct}%</div><div class="pbar">${progress(c.pct, c.pct >= 100 ? 'green' : 'saffron')}</div><div class="small muted"><b>${n(c.registered)}</b> registered</div></div>`; })}</div>`;
}
function rankRows(list, from) {
  return html`${list.map((c, i) => html`<div class="lbrow rv" style="grid-template-columns:44px minmax(160px,2.4fr) minmax(130px,2fr) minmax(100px,1fr)"><div class="rank">${from + i + 1}</div>
    <div class="nm nmav">${avatar(c.id, c.logo_v, c.name, 38)}<span>${c.name}<small>${kindLabel(c)}${c.status === 'active' ? ' · active this week' : ''}</small></span></div>
    <div>${progress(c.pct, c.pct >= 100 ? 'green' : 'saffron')}<small class="muted">${c.pct}% covered</small></div>
    <div class="c"><b>${n(c.registered)}</b><small style="display:block">registered</small></div></div>`)}`;
}
let cquery = '';
function paintCampus() {
  const box = $('#cboard'); if (!box || !BOARD?.campus) return;
  const limit = Number(box.dataset.limit || 0), all = rankedCampus(BOARD.campus.institutions), q = cquery.toLowerCase();
  if (!all.length) { show($('#cpodium'), ''); return show(box, empty('Rankings appear as colleges and schools enter their numbers', 'Enter your totals on the Enrolment drive page to join the ranking.', 'chart')); }
  if (q) { show($('#cpodium'), ''); const hit = all.map((c, i) => ({ c, i })).filter(x => x.c.name.toLowerCase().includes(q)); return show(box, hit.length ? html`${hit.map(x => rankRows([x.c], x.i))}` : empty('No match', 'Try another name.', 'search')); }
  show($('#cpodium'), podiumHtml(all.slice(0, 3)));
  const rest = all.slice(3, limit || undefined);
  show(box, html`${rankRows(rest, 3)}${limit && all.length > limit ? html`<p class="center" style="margin-top:12px"><a class="btn secondary" href="#/board">Full ranking of ${all.length} ${icon('arrow-right')}</a></p>` : ''}`);
}

// ---------- the full display board ----------
async function renderCampusBoard() {
  const C = BOARD.campus, T = C.totals, A = C.awards;
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">
    ${pageHead('Display board', 'Campus to booth: live progress of every college and school toward 100% enrolment. Refreshes automatically.', html`<button class="btn secondary" data-act="tv">${icon('eye')} Full screen</button><a class="btn secondary" href="#/">${icon('home')} Home</a>`, 'Electoral Literacy Clubs')}
    <div class="card rv campus-top"><div class="row between" style="align-items:flex-end;gap:16px"><div><div class="campus-big">${T.pct == null ? '—' : T.pct + '%'}</div><div class="muted">total coverage of eligible students</div></div>
      <div class="campus-facts"><div><b>${n(T.registered)}</b><span>students registered</span></div><div><b>${T.active}/${T.institutions}</b><span>active this week</span></div></div></div>${progress(T.pct || 0, 'green')}</div>
    <div class="kpis" style="margin-top:16px">${kpi('Volunteer-days at help desks', T.desk_vols, { ic: 'users', tone: 'saffron', sub: '1 volunteer present for 1 day = 1 volunteer-day' })}${kpi('Volunteer-days in other activities', T.activity, { ic: 'megaphone', sub: 'Flash mobs, class campaigns, game zones' })}${kpi('Photos shared', T.photos, { ic: 'camera' })}</div>
    <div class="section-head" style="margin-top:34px"><div><h2>College and school ranking</h2><p>Ranked by coverage: the share of eligible students who are registered.</p></div>
      <label class="f" style="margin:0;min-width:240px"><span class="sr">Search</span><input type="search" id="cq2" placeholder="Search a college or school…" value="${esc(cquery)}"></label></div>
    <div id="cpodium"></div><div class="board" id="cboard" data-limit="0"></div>
    <div class="section-head" style="margin-top:34px"><h2>Hall of fame</h2></div><div class="grid g3" id="cawards"></div></div>`, 'board'));
  paintCampus();
  const items = [['target', 'Highest coverage', A.coverage, '%'], ['user-check', 'Most students registered', A.registered, 'registered'], ['users', 'Most volunteer-days at help desks', A.desk_vols, 'volunteer-days'], ['trophy', 'Most activity volunteers', A.activity, 'volunteer-days'], ['camera', 'Most photos shared', A.photos, 'photos']];
  show($('#cawards'), html`${items.map(([ic, tt, w, u]) => html`<div class="res rv"><span class="ico">${icon(ic)}</span><div class="grow"><h3>${tt}</h3><p>${w ? html`<b>${w.name}</b> · ${n(w.value)} ${u}` : 'Up for grabs'}</p></div></div>`)}`);
  $('#cq2').addEventListener('input', e => { cquery = e.target.value; paintCampus(); });
  clearInterval(boardTimer); boardTimer = setInterval(async () => { if (location.hash !== '#/board') return clearInterval(boardTimer); try { BOARD = await api('/api/public/board'); paintCampus(); } catch {} }, 30000);
}

// ---------- the photo gallery page ----------
let GALQ = '';
async function renderPublicGallery() {
  if (!feat('public', 'album')) { location.hash = '#/'; return; }
  show($('#app'), publicShell(html`<div class="wrap section"><div class="loading"><div class="spin"></div>Loading the photos…</div></div>`, 'gallery'));
  let items = []; try { items = await api('/api/public/album?all=1'); } catch (e) { return show($('#app'), publicShell(html`<div class="wrap section"><div class="alert err">${e.message}</div></div>`, 'gallery')); }
  window.__pubgal = items; window.__pubgalList = items;
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">${pageHead('Photo gallery', 'Moments from the Campus to booth drive, shared by colleges and schools.', html`<a class="btn secondary" href="#/">${icon('home')} Home</a>`, 'Electoral Literacy Clubs')}
    <div class="row between" style="margin-bottom:14px"><span class="small muted">${items.length} photo${items.length === 1 ? '' : 's'}</span><label class="f" style="margin:0;min-width:240px"><span class="sr">Search photos</span><input type="search" id="gq" placeholder="Search by college or activity…" value="${esc(GALQ)}"></label></div>
    <div id="pgrid"></div></div>`, 'gallery'));
  const paint = () => { const q = GALQ.toLowerCase(), list = items.filter(g => !q || [g.college, g.title, g.activity].some(x => String(x || '').toLowerCase().includes(q))); window.__pubgalList = list;
    show($('#pgrid'), list.length ? html`<div class="pgrid">${list.map(g => html`<button class="pcard rv" data-act="viewPhoto" data-id="${g.id}" aria-label="Open photo: ${g.title}, ${g.college}"><img src="/api/public/album/${g.id}/thumb" alt="${g.title}, ${g.college}" loading="lazy" decoding="async"><span class="cap">${albumName(g, 24)}<span>${g.title}</span>${albumMeta(g) ? html`<small>${albumMeta(g)}</small>` : ''}</span></button>`)}</div>` : empty('No photos yet', 'Photos appear here as colleges and schools share them.', 'image')); };
  paint(); $('#gq').addEventListener('input', e => { GALQ = e.target.value; paint(); });
}
actions.viewPhoto = el => { const list = window.__pubgalList || window.__pubgal; openLightbox(list, Math.max(0, list.findIndex(x => x.id === Number(el.dataset.id)))); };
