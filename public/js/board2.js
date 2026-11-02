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
    show($('#lbx', m), html`<figure class="lightbox"><img src="${gUrl(g, 'xlarge', `/api/public/album/${g.id}/image`)}" alt="${g.title}, ${g.college}"><figcaption>${albumName(g, 36)}<span>${g.title}</span>${albumMeta(g) ? html`<small>${albumMeta(g)}</small>` : ''}</figcaption></figure>
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
// Photos are uniform thumbnail tiles (title on the tile, college and date on hover); filters are drop-downs, so they stay tidy however many colleges take part.
let GALQ = '', GALACT = '', GALCOL = '', GALSHOW = 40, GALDATA = null, ALBQ = '';
const photoCard = g => html`<button class="ptile rv" data-act="viewPhoto" data-id="${g.id}" aria-label="Open photo: ${g.title}, ${g.college}"><img src="${gUrl(g, 'large', `/api/public/album/${g.id}/thumb`)}" alt="${g.title}, ${g.college}" loading="lazy" decoding="async"><span class="pcap"><b>${g.title}</b><small>${g.college}${g.event_date ? ' · ' + fdate(g.event_date) : ''}</small></span></button>`;
async function renderPublicGallery(albumId) {
  if (!feat('public', 'album')) { location.hash = '#/'; return; }
  show($('#app'), publicShell(html`<div class="wrap section"><div class="loading"><div class="spin"></div>Loading the photos…</div></div>`, 'gallery'));
  try {
    if (albumId) return renderAlbumPage(await api('/api/public/gallery/album/' + encodeURIComponent(albumId)));
    GALDATA = await api('/api/public/gallery');
  } catch (e) { return show($('#app'), publicShell(html`<div class="wrap section"><div class="alert err">${e.message}</div><p style="margin-top:12px"><a class="btn secondary" href="#/gallery">Back to the gallery</a></p></div>`, 'gallery')); }
  const G = GALDATA;
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">${pageHead('Gallery', 'Moments from our campaigns: what is happening now, and the work we have done before.', html`<a class="btn secondary" href="#/">${icon('home')} Home</a>`, 'Electoral Literacy Clubs')}
    <section class="gnow rv" aria-labelledby="gnowh"><div class="gnow-top"><div><span class="eyebrow"><span class="live"></span> Happening now</span><h2 id="gnowh">Campus to booth</h2><p>Photos from help desks, flash mobs, class campaigns and events of colleges and schools across Kozhikode.</p></div>
      <div class="gnow-stats"><div><b>${n(G.stats.photos)}</b><span>photos</span></div><div><b>${n(G.stats.institutions)}</b><span>colleges and schools</span></div></div></div>
      <div class="gtools"><label class="f"><span class="sr">Search photos</span><input type="search" id="gq" placeholder="Search photos…" value="${esc(GALQ)}"></label><label class="f"><span class="sr">Activity</span><select id="gact" aria-label="Activity"></select></label><label class="f"><span class="sr">College or school</span><select id="gcol" aria-label="College or school"></select></label><span class="gcount" id="gcount" aria-live="polite"></span></div>
      <div id="gnowgrid"></div><p class="center" id="gmore" style="margin-top:14px"></p></section>
    <section class="gprev" style="margin-top:44px" aria-labelledby="gprevh"><div class="section-head"><div><h2 id="gprevh">Previous works</h2><p>Albums of earlier campaigns and events. Open an album to see all its photos.</p></div><label class="f" style="margin:0;min-width:230px"><span class="sr">Search albums</span><input type="search" id="alq" placeholder="Search albums…" value="${esc(ALBQ)}"></label></div><div id="galbums"></div></section></div>`, 'gallery'));
  paintGallery();
  $('#gq').addEventListener('input', e => { GALQ = e.target.value; GALSHOW = 40; paintGrid(); });
  $('#gact').addEventListener('change', e => { GALACT = e.target.value; GALSHOW = 40; paintGrid(); });
  $('#gcol').addEventListener('change', e => { GALCOL = e.target.value; GALSHOW = 40; paintGrid(); });
  $('#alq').addEventListener('input', e => { ALBQ = e.target.value; paintAlbums(); });
}
function paintGallery() {
  const G = GALDATA, cnt = key => [...G.current.reduce((m, g) => { if (g[key]) m.set(g[key], (m.get(g[key]) || 0) + 1); return m; }, new Map())];
  const acts = cnt('activity').filter(([a]) => a.length <= 32).sort((a, b) => b[1] - a[1]), cols = cnt('college').sort((a, b) => a[0].localeCompare(b[0]));
  if (!acts.some(a => a[0] === GALACT)) GALACT = ''; if (!cols.some(a => a[0] === GALCOL)) GALCOL = '';
  show($('#gact'), html`<option value="">All activities</option>${acts.map(([a, c]) => html`<option value="${a}" ${GALACT === a ? 'selected' : ''}>${a} (${c})</option>`)}`);
  show($('#gcol'), html`<option value="">All colleges and schools</option>${cols.map(([a, c]) => html`<option value="${a}" ${GALCOL === a ? 'selected' : ''}>${a} (${c})</option>`)}`);
  paintGrid(); paintAlbums();
}
function paintGrid() {
  const G = GALDATA, q = GALQ.toLowerCase().trim();
  const list = G.current.filter(g => (!GALACT || g.activity === GALACT) && (!GALCOL || g.college === GALCOL) && (!q || [g.college, g.title, g.activity, g.album].some(x => String(x || '').toLowerCase().includes(q))));
  window.__pubgalList = list;
  $('#gcount').textContent = `${list.length} photo${list.length === 1 ? '' : 's'}`;
  show($('#gnowgrid'), list.length ? html`<div class="pgrid2">${list.slice(0, GALSHOW).map(photoCard)}</div>` : empty(q || GALACT || GALCOL ? 'No photos match' : 'No photos yet', q || GALACT || GALCOL ? 'Try another search or filter.' : 'Photos appear here as colleges and schools share them.', 'image'));
  show($('#gmore'), list.length > GALSHOW ? html`<button class="btn secondary" data-act="galMore">Show more photos (${list.length - GALSHOW} more) ${icon('chevron-down')}</button>` : '');
}
// albums are grouped under the programme they belong to ("Vote Utsavam 2026: Football Tournament" sits under "Vote Utsavam 2026")
function paintAlbums() {
  const G = GALDATA, q = ALBQ.toLowerCase().trim(), albums = G.albums.filter(a => !q || [a.title, a.description].some(x => String(x || '').toLowerCase().includes(q)));
  if (!albums.length) return show($('#galbums'), empty(G.albums.length ? 'No album matches' : 'Albums are coming soon', G.albums.length ? 'Try another search.' : 'Our earlier campaigns will be shown here as albums.', 'folder'));
  const groups = new Map(); for (const a of albums) { const i = a.title.indexOf(': '), g = i > 0 ? a.title.slice(0, i) : 'More albums'; (groups.get(g) || groups.set(g, []).get(g)).push({ ...a, short: i > 0 ? a.title.slice(i + 2) : a.title }); }
  show($('#galbums'), html`${[...groups].map(([g, list]) => html`<div class="albgroup"><h3>${g} <span class="badge">${list.length}</span></h3><div class="albgrid2">${list.map(a => html`<a class="albtile rv" href="#/gallery/${a.id}" aria-label="Open album: ${a.title}, ${a.count} photos"><span class="albpic"><i></i><img src="${a.cover_ext ? a.cover_ext.replace('{s}', 'large') : `/api/public/album/${a.cover}/thumb`}" alt="" loading="lazy" decoding="async"><span class="albn">${a.count}</span></span><b>${a.short}</b><small>${a.last ? new Date(a.last + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}</small></a>`)}</div></div>`)}`);
}
actions.galMore = () => { GALSHOW += 40; paintGrid(); };
function renderAlbumPage(d) {
  const a = d.album; window.__pubgalList = d.photos;
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">${pageHead(a.title, a.description || `${d.photos.length} photo${d.photos.length === 1 ? '' : 's'}`, html`<a class="btn secondary" href="#/gallery">${icon('arrow-left')} All albums</a>`, a.current ? 'Happening now' : 'Previous works')}
    ${d.photos.length ? html`<p class="small muted" style="margin:-4px 0 14px">${d.photos.length} photo${d.photos.length === 1 ? '' : 's'}. Tap a photo to open it.</p><div class="pgrid2">${d.photos.map(photoCard)}</div>` : empty('No photos in this album yet', '', 'image')}</div>`, 'gallery'));
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
