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
// badges earned: Epic of Kozhikode (100%), milestones on the way, steady reporting and photos
const BADGE = { epic: ['Epic of Kozhikode', 'gold'], p75: ['75% club', 'ok'], p50: ['Halfway there', 'info'], p25: ['First quarter', 'grey'], reporter: ['Daily reporter', 'saffron'], lens: ['Photo champion', 'info'] };
const badgeChips = (list, max = 3) => html`${(list || []).slice(0, max).map(b => BADGE[b] ? html`<span class="badge ${BADGE[b][1]}">${BADGE[b][0]}</span>` : '')}`;
const raceNote = k => html`<div class="card rv racenote" style="margin-top:24px">${icon('trophy')}<div><b>The ranking opens soon</b><p>${k ? `${k} college${k === 1 ? ' has' : 's and schools have'} entered numbers so far. ` : ''}The leaderboard appears once more than 5 colleges and schools are in the race. Every registration counts, so keep your daily report up to date.</p></div></div>`;
// 100% covered: the Epic of Kozhikode
function epicSection(C) {
  const epics = C.institutions.filter(i => i.epic); if (!epics.length) return '';
  return html`<div class="epic rv"><div class="epic-head"><span class="epic-ic">${icon('award')}</span><div><span class="epic-eyebrow">100% covered</span><h3>Epic of Kozhikode</h3><p>These colleges and schools have brought every eligible student onto the electoral roll.</p></div></div>
    <div class="epic-grid">${epics.map(c => html`<div class="epic-card">${avatar(c.id, c.logo_v, c.name, 52)}<b>${c.name}</b><small>${kindLabel(c)} · ${n(c.registered)} students registered</small><span class="badge gold">Epic of Kozhikode</span></div>`)}</div></div>`;
}

function podiumHtml(top) {
  if (!top.length) return '';
  const order = top.length >= 3 ? [1, 0, 2] : top.map((_, k) => k);
  return html`<div class="podium cpod" style="grid-template-columns:repeat(${top.length},1fr);max-width:${top.length * 380}px;margin-inline:auto">${order.map(k => { const c = top[k]; return html`<div class="pod p${k + 1} rv"><div class="m">${k + 1}</div>${avatar(c.id, c.logo_v, c.name, 56)}<h3>${c.name}</h3><small>${kindLabel(c)}</small><div class="chiprow">${badgeChips(c.badges, 1)}</div>
      <div class="sc">${c.pct}%</div><div class="pbar">${progress(c.pct, c.pct >= 100 ? 'green' : 'saffron')}</div><div class="small muted"><b>${n(c.registered)}</b> registered</div></div>`; })}</div>`;
}
function rankRows(list, from) {
  return html`${list.map((c, i) => html`<div class="lbrow rv" style="grid-template-columns:44px minmax(160px,2.4fr) minmax(130px,2fr) minmax(100px,1fr)"><div class="rank">${from + i + 1}</div>
    <div class="nm nmav">${avatar(c.id, c.logo_v, c.name, 38)}<span>${c.name}<small>${kindLabel(c)}${c.status === 'active' ? ' · active this week' : ''}</small><span class="chiprow">${badgeChips(c.badges, 2)}</span></span></div>
    <div>${progress(c.pct, c.pct >= 100 ? 'green' : 'saffron')}<small class="muted">${c.pct}% covered</small></div>
    <div class="c"><b>${n(c.registered)}</b><small style="display:block">registered</small></div></div>`)}`;
}
let cquery = '';
function paintCampus() {
  const box = $('#cboard'); if (!box || !BOARD?.campus) return;
  const limit = Number(box.dataset.limit || 0), all = rankedCampus(BOARD.campus.institutions), q = cquery.toLowerCase();
  if (all.length <= 5) { show($('#cpodium'), ''); return show(box, raceNote(all.length)); }
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
    ${epicSection(C)}
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

// ---------- the gallery page: the running campaign (highlighted) and the albums of previous works ----------
let GALQ = '', GALACT = '', GALSHOW = 24, GALDATA = null;
const photoCard = g => html`<button class="pcard rv" data-act="viewPhoto" data-id="${g.id}" aria-label="Open photo: ${g.title}, ${g.college}"><img src="/api/public/album/${g.id}/thumb" alt="${g.title}, ${g.college}" loading="lazy" decoding="async"><span class="cap">${albumName(g, 24)}<span>${g.title}</span>${albumMeta(g) ? html`<small>${albumMeta(g)}</small>` : ''}</span></button>`;
async function renderPublicGallery(albumId) {
  if (!feat('public', 'album')) { location.hash = '#/'; return; }
  show($('#app'), publicShell(html`<div class="wrap section"><div class="loading"><div class="spin"></div>Loading the photos…</div></div>`, 'gallery'));
  try {
    if (albumId) return renderAlbumPage(await api('/api/public/gallery/album/' + encodeURIComponent(albumId)));
    GALDATA = await api('/api/public/gallery');
  } catch (e) { return show($('#app'), publicShell(html`<div class="wrap section"><div class="alert err">${e.message}</div><p style="margin-top:12px"><a class="btn secondary" href="#/gallery">Back to the gallery</a></p></div>`, 'gallery')); }
  const G = GALDATA;
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">${pageHead('Gallery', 'Moments from our campaigns: what is happening now, and the work we have done before.', html`<a class="btn secondary" href="#/">${icon('home')} Home</a>`, 'Electoral Literacy Clubs')}
    <section class="gnow rv" aria-labelledby="gnowh"><div class="gnow-top"><div><span class="eyebrow"><span class="live"></span> Happening now</span><h2 id="gnowh">Campus to booth</h2><p>Photos from the help desks, flash mobs, class campaigns and events of colleges and schools across Kozhikode, as they happen.</p></div>
      <div class="gnow-stats"><div><b>${n(G.stats.photos)}</b><span>photos</span></div><div><b>${n(G.stats.institutions)}</b><span>colleges and schools</span></div></div></div>
      <div class="gnow-tools"><div class="chips" id="gactchips" role="group" aria-label="Filter by activity"></div><label class="f" style="margin:0;min-width:240px"><span class="sr">Search photos and albums</span><input type="search" id="gq" placeholder="Search photos, colleges, albums…" value="${esc(GALQ)}"></label></div>
      <div id="gnowgrid"></div><p class="center" id="gmore" style="margin-top:14px"></p></section>
    <section class="gprev" style="margin-top:44px" aria-labelledby="gprevh"><div class="section-head"><div><h2 id="gprevh">Previous works</h2><p>Albums of earlier campaigns and events. Open an album to see all its photos.</p></div></div><div id="galbums"></div></section></div>`, 'gallery'));
  paintGallery();
  $('#gq').addEventListener('input', e => { GALQ = e.target.value; GALSHOW = 24; paintGallery(); });
}
function paintGallery() {
  const G = GALDATA, q = GALQ.toLowerCase().trim();
  const acts = [...G.current.reduce((m, g) => { if (g.activity) m.set(g.activity, (m.get(g.activity) || 0) + 1); return m; }, new Map())].sort((a, b) => b[1] - a[1]).slice(0, 7);
  if (GALACT && !acts.some(a => a[0] === GALACT)) GALACT = '';
  show($('#gactchips'), acts.length > 1 ? html`<button class="chip ${GALACT ? '' : 'on'}" data-act="galAct" data-k="">All (${G.current.length})</button>${acts.map(([a, c]) => html`<button class="chip ${GALACT === a ? 'on' : ''}" data-act="galAct" data-k="${a}">${a} (${c})</button>`)}` : '');
  const list = G.current.filter(g => (!GALACT || g.activity === GALACT) && (!q || [g.college, g.title, g.activity, g.album].some(x => String(x || '').toLowerCase().includes(q))));
  window.__pubgalList = list;
  show($('#gnowgrid'), list.length ? html`<div class="pgrid">${list.slice(0, GALSHOW).map(photoCard)}</div>` : empty(q || GALACT ? 'No photos match' : 'No photos yet', q || GALACT ? 'Try another search.' : 'Photos appear here as colleges and schools share them.', 'image'));
  show($('#gmore'), list.length > GALSHOW ? html`<button class="btn secondary" data-act="galMore">Show more photos (${list.length - GALSHOW} more) ${icon('chevron-down')}</button>` : '');
  const albums = G.albums.filter(a => !q || [a.title, a.description].some(x => String(x || '').toLowerCase().includes(q)));
  show($('#galbums'), albums.length ? html`<div class="albgrid">${albums.map(a => html`<a class="albcard rv" href="#/gallery/${a.id}" aria-label="Open album: ${a.title}, ${a.count} photos"><span class="albstack"><i></i><i></i><img src="/api/public/album/${a.cover}/thumb" alt="" loading="lazy" decoding="async"></span><span class="albinfo"><b>${a.title}</b><small>${a.count} photo${a.count === 1 ? '' : 's'}${a.last ? ' · ' + new Date(a.last + 'T00:00:00').getFullYear() : ''}</small>${a.description ? html`<em>${a.description}</em>` : ''}</span></a>`)}</div>`
    : empty(G.albums.length ? 'No album matches' : 'Albums are coming soon', G.albums.length ? 'Try another search.' : 'Our earlier campaigns will be shown here as albums.', 'folder'));
}
actions.galAct = el => { GALACT = el.dataset.k; GALSHOW = 24; paintGallery(); };
actions.galMore = () => { GALSHOW += 24; paintGallery(); };
function renderAlbumPage(d) {
  const a = d.album; window.__pubgalList = d.photos;
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">${pageHead(a.title, a.description || `${d.photos.length} photo${d.photos.length === 1 ? '' : 's'}`, html`<a class="btn secondary" href="#/gallery">${icon('arrow-left')} All albums</a>`, a.current ? 'Happening now' : 'Previous works')}
    ${d.photos.length ? html`<div class="pgrid">${d.photos.map(photoCard)}</div>` : empty('No photos in this album yet', '', 'image')}</div>`, 'gallery'));
}
actions.viewPhoto = el => { const list = window.__pubgalList || []; openLightbox(list, Math.max(0, list.findIndex(x => x.id === Number(el.dataset.id)))); };

// ---------- a shared resource: preview, download, and a link that can be passed on ----------
async function renderResource(id) {
  show($('#app'), publicShell(html`<div class="wrap section"><div class="loading"><div class="spin"></div>Opening the file…</div></div>`, ''));
  let r;
  try { r = await api('/api/resources/' + encodeURIComponent(id)); }
  catch (e) { return show($('#app'), publicShell(html`<div class="wrap section"><div class="card" style="max-width:640px;margin:0 auto">${empty(e.status === 403 ? 'Sign in to open this file' : 'File not found', e.message, 'lock')}<div class="row" style="justify-content:center;margin-top:12px"><a class="btn primary" href="#/login/college">${icon('building')} College sign-in</a><a class="btn secondary" href="#/login/school">${icon('book')} School sign-in</a><a class="btn secondary" href="/admin">${icon('shield')} Staff sign-in</a></div></div></div>`, '')); }
  const pic = r.kind === 'link' ? html`<div class="rv-tile">${fileTile('', '', true)}<p>This resource is a web link.</p></div>`
    : r.mime === 'application/pdf' ? html`<iframe class="pdfview" src="/api/resources/${r.id}/view" title="${r.title}"></iframe>`
    : /^image\//.test(r.mime || '') ? html`<img class="resview" src="/api/resources/${r.id}/view" alt="${r.title}">`
    : html`<div class="rv-tile">${r.has_thumb ? html`<img class="resview" src="/api/resources/${r.id}/thumb" alt="">` : fileTile(r.filename, r.mime)}<p>A preview is not available for this type of file. Download it to open it.</p></div>`;
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">${pageHead(r.title, r.description || r.category, html`<a class="btn secondary" href="#/">${icon('home')} Home</a>`, r.category || 'Resource')}
    <div class="card" style="margin-bottom:16px"><div class="row between"><div class="small muted"><b>${r.filename || r.title}</b> · Share link: <code>${resLink(r)}</code><br>${r.kind === 'file' ? html`${r.size ? (r.size > 1048576 ? (r.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(r.size / 1024)) + ' KB') : ''}` : 'Web link'}</div>
      <div class="row gap-s">${r.kind === 'link' ? html`<a class="btn primary" href="${r.url}" target="_blank" rel="noopener">${icon('external')} Open link</a>` : html`<a class="btn primary" href="/api/resources/${r.id}/download">${icon('download')} Download</a>`}<button class="btn secondary" data-act="copyRes" data-s="${resSlug(r)}">${icon('copy')} Copy link</button></div></div></div>
    <div class="card resprev">${pic}</div></div>`, ''));
}
