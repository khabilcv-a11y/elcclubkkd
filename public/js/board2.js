'use strict';
// ---- Campus to booth on the public site: ranking (podium + cards), display board, photo gallery page ----
const rankedCampus = list => list.filter(i => i.strength > 0 && i.pct != null).sort((a, b) => b.pct - a.pct || b.registered - a.registered || a.name.localeCompare(b.name));
// "Help desk" is shown once: the category is only added when it says something different from the title
const albumMeta = g => [g.activity && String(g.activity).toLowerCase() !== String(g.title || '').toLowerCase() ? g.activity : '', g.event_date ? fdate(g.event_date) : ''].filter(Boolean).join(' · ');
const albumName = (g, size = 30) => html`<b class="withav">${g.logo_v ? avatar(g.college_id, g.logo_v, g.college, size) : ''}${g.college}</b>`;
// The full-screen photo viewer: swipe or use the arrows, a filmstrip of neighbouring photos, slideshow, a link to this photo and the original.
// list: photos in order; opts.more(): loads the next page into the same list and says whether it added any; opts.total: how many photos exist.
function openLightbox(list, start, opts = {}) {
  let at = Math.max(0, start), timer = 0, playing = false, busy = false; const prev = document.activeElement;
  const o = document.createElement('div'); o.className = 'lbx2'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Photo viewer'); document.body.append(o); document.body.classList.add('noscroll');
  const big = p => gUrl(p, 'xlarge', `/api/public/album/${p.id}/image`), small = p => gUrl(p, 'small', `/api/public/album/${p.id}/thumb`);
  const paint = () => {
    const p = list[at]; if (!p) return close();
    const from = Math.max(0, at - 7), to = Math.min(list.length, at + 8);
    o.innerHTML = html`<div class="lb-top"><span class="lb-count">${at + 1} of ${opts.total || list.length}</span><span class="grow"></span>
        <button type="button" data-lb="play" aria-label="${playing ? 'Pause the slideshow' : 'Play a slideshow'}" title="${playing ? 'Pause' : 'Slideshow'}">${icon(playing ? 'pause' : 'play')}</button>
        <button type="button" data-lb="share" aria-label="Copy a link to this photo" title="Copy link to this photo">${icon('link')}</button>
        <a href="${gUrl(p, 'xxlarge', `/api/public/album/${p.id}/image`)}" target="_blank" rel="noopener" aria-label="Open the original photo" title="Open the original">${icon('external')}</a>
        <button type="button" data-lb="close" aria-label="Close the viewer" title="Close">${icon('x')}</button></div>
      <div class="lb-stage" id="lbstage"><button type="button" class="lb-nav prev" data-lb="prev" aria-label="Previous photo">${icon('arrow-left')}</button><img src="${big(p)}" alt="${p.title}, ${p.college}" draggable="false"><button type="button" class="lb-nav next" data-lb="next" aria-label="Next photo">${icon('arrow-right')}</button></div>
      <div class="lb-cap"><b>${p.title}</b><span class="lb-by">${p.logo_v ? avatar(p.college_id, p.logo_v, p.college, 22) : ''}${p.college}${p.event_date ? ' · ' + fdateLong(p.event_date) : ''}</span>${p.description ? html`<span class="lb-desc">${p.description}</span>` : ''}${p.album_id ? html`<a class="lb-album" href="#/gallery/${p.album_id}">More from ${p.album} ${icon('arrow-right')}</a>` : ''}</div>
      <div class="lb-strip" role="tablist" aria-label="Nearby photos">${list.slice(from, to).map((q, i) => html`<button type="button" role="tab" class="${from + i === at ? 'on' : ''}" data-lb="at" data-i="${from + i}" aria-label="Photo ${from + i + 1}: ${q.title}"><img src="${small(q)}" alt="" loading="lazy"></button>`)}</div>`.s;
    for (const n of [list[at + 1], list[at - 1]]) if (n) { const im = new Image(); im.src = big(n); }
    $('.lb-strip .on', o)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  };
  const go = async d => {
    if (busy) return; busy = true;
    let n = at + d;
    if (n >= list.length) { if (opts.more && await opts.more()) n = at + 1; else n = 0; }
    if (n < 0) n = list.length - 1;
    at = n; busy = false; paint();
  };
  const stop = () => { playing = false; clearInterval(timer); };
  const close = () => { stop(); document.removeEventListener('keydown', key); o.remove(); document.body.classList.remove('noscroll'); prev?.focus?.(); };
  const key = e => { if (!document.body.contains(o)) return document.removeEventListener('keydown', key); if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') { stop(); go(1); } else if (e.key === 'ArrowLeft') { stop(); go(-1); } else if (e.key === ' ' && !e.target.closest('button,a')) { e.preventDefault(); o.querySelector('[data-lb=play]')?.click(); } };
  o.addEventListener('click', e => {
    const b = e.target.closest('[data-lb]'); if (!b) { if (e.target.classList.contains('lb-stage')) close(); return; }
    const k = b.dataset.lb;
    if (k === 'close') close(); else if (k === 'next') { stop(); go(1); } else if (k === 'prev') { stop(); go(-1); }
    else if (k === 'at') { stop(); at = Number(b.dataset.i); paint(); }
    else if (k === 'share') copyText(`${location.origin}/#/gallery/photo/${list[at].id}`, 'Link to this photo copied');
    else if (k === 'play') { if (playing) { stop(); paint(); } else { playing = true; timer = setInterval(() => go(1), 4200); paint(); } }
  });
  let x0 = null; o.addEventListener('pointerdown', e => { if (e.target.closest('.lb-stage img')) x0 = e.clientX; }); o.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 50) { stop(); go(e.clientX < x0 ? 1 : -1); } x0 = null; });
  document.addEventListener('keydown', key); paint(); o.querySelector('[data-lb=close]')?.focus();
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
    <div style="margin-top:34px">${hallOfFame(A)}</div></div>`, 'board'));
  paintCampus();
  $('#cq2').addEventListener('input', e => { cquery = e.target.value; paintCampus(); });
  clearInterval(boardTimer); boardTimer = setInterval(async () => { if (location.hash !== '#/board') return clearInterval(boardTimer); try { BOARD = await api('/api/public/board'); paintCampus(); } catch {} }, 30000);
}

// ---------- the gallery: one endless wall of photos ----------
// No clusters and no headings to dig through: everything is on one wall that keeps loading as you scroll. Search finds a college, an event or an album;
// "Featured" puts the district administration's photos first; Newest, Oldest and Shuffle change the order. Opening a photo gives a full-screen viewer
// (swipe, filmstrip, slideshow, link to the photo). Albums stay available as an optional page for anyone who prefers them.
let WALL = null;
const SORT_LABEL = { featured: 'Featured', newest: 'Newest first', oldest: 'Oldest first', shuffle: 'Shuffle' };
const wallTile = g => html`<button class="wtile ${g.orientation === 'portrait' ? 'tall' : ''}" data-act="viewPhoto" data-id="${g.id}" aria-label="Open photo: ${g.title}, ${g.college}"><img src="${gUrl(g, g.orientation === 'portrait' ? 'xlarge' : 'large', `/api/public/album/${g.id}/thumb`)}" alt="" loading="lazy" decoding="async"><span class="wcap"><b>${g.title}</b><small>${g.college}</small></span></button>`;
async function wallLoad(reset) {
  const W = WALL; if (!W || W.loading || (W.done && !reset)) return false;
  if (reset) { W.items.length = 0; W.done = false; const g = $('#wgrid'); if (g) g.innerHTML = ''; }
  W.loading = true; $('#wspin')?.classList.remove('hide');
  try {
    const r = await api(`/api/public/gallery/wall?${new URLSearchParams({ sort: W.sort, q: W.q, seed: W.seed, offset: W.items.length, limit: 60 })}`);
    if (W !== WALL) return false;
    W.total = r.total; const fresh = r.photos.filter(p => !W.items.some(x => x.id === p.id)); W.items.push(...fresh);
    $('#wgrid')?.insertAdjacentHTML('beforeend', fresh.map(g => wallTile(g).s).join(''));
    W.done = !r.photos.length || W.items.length >= r.total;
    $('#wcount').textContent = r.total ? `${n(r.total)} photo${r.total === 1 ? '' : 's'}${W.q ? ` for “${W.q}”` : ''}` : '';
    $('#wempty').classList.toggle('hide', r.total > 0); $('#wend').classList.toggle('hide', !(W.done && r.total > 12));
    return fresh.length > 0;
  } catch (e) { toast(e.message, true); return false; }
  finally { W.loading = false; $('#wspin')?.classList.add('hide'); if (!W.done && W === WALL) setTimeout(wallFill, 50); }
}
// keep loading while the end of the wall is still on screen (tall screens, zoomed-out pages)
const wallFill = () => { const s = $('#wsent'); if (s && WALL && !WALL.done && !WALL.loading && s.getBoundingClientRect().top < innerHeight + 700) wallLoad(); };
async function renderPublicGallery(a, b) {
  if (!feat('public', 'album')) { location.hash = '#/'; return; }
  if (!a || a === 'albums') return renderAlbumIndex();
  show($('#app'), publicShell(html`<div class="wrap section"><div class="loading"><div class="spin"></div>Loading the photos…</div></div>`, 'gallery'));
  if (a === 'current') {
    try { const G = await api('/api/public/gallery'); return renderAlbumPage({ album: { title: 'Current campaign', description: 'Photos from colleges, schools and the district office.', current: 1 }, photos: G.current }); }
    catch (e) { return show($('#app'), publicShell(html`<div class="wrap section"><div class="alert err">${e.message}</div></div>`, 'gallery')); }
  }
  if (a && a !== 'photo' && a !== 'all') {
    try { return renderAlbumPage(await api('/api/public/gallery/album/' + encodeURIComponent(a))); }
    catch (e) { return show($('#app'), publicShell(html`<div class="wrap section"><div class="alert err">${e.message}</div><p style="margin-top:12px"><a class="btn secondary" href="#/gallery">Back to the gallery</a></p></div>`, 'gallery')); }
  }
  const keep = WALL;
  WALL = { sort: keep?.sort || 'featured', q: keep?.q || '', seed: 1 + Math.floor(Math.random() * 90000), items: [], total: 0, loading: false, done: false };
  const W = WALL;
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px"><div class="wall-head"><div><div class="crumb">Electoral Literacy Clubs</div><h1>Gallery</h1><p>Photos from the district administration, colleges and schools. Scroll to explore, or search for a place, an event or a college.</p></div><a class="btn secondary" href="#/gallery">${icon('folder')} Back to albums</a></div>
    <div class="wall-bar"><label class="f wall-search"><span class="sr">Search photos</span>${icon('search')}<input type="search" id="wq" placeholder="Search a college, event or album…" value="${esc(W.q)}"></label>
      <label class="f wall-sort"><span class="sr">Order</span><select id="wsort" aria-label="Order of photos">${Object.entries(SORT_LABEL).map(([k, l]) => html`<option value="${k}" ${W.sort === k ? 'selected' : ''}>${l}</option>`)}</select></label>
      <button class="btn secondary" id="wshuf" type="button">${icon('refresh')} Shuffle</button><span class="wall-count" id="wcount" aria-live="polite"></span></div>
    <div class="wgrid" id="wgrid"></div><div id="wempty" class="hide">${empty('No photos found', 'Try another word, or clear the search.', 'search')}</div>
    <div class="center" id="wspin" style="padding:22px"><div class="spin"></div></div><div id="wsent" style="height:1px"></div><p class="center muted small hide" id="wend" style="padding:18px">You have reached the end of the gallery.</p></div>`, 'gallery'));
  window.__pubgalList = W.items; window.__pubgalOpts = { more: () => wallLoad(), get total() { return W.total; } };
  let t = 0; $('#wq').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { W.q = e.target.value.trim(); wallLoad(true); }, 320); });
  $('#wsort').addEventListener('change', e => { W.sort = e.target.value; W.seed = 1 + Math.floor(Math.random() * 90000); wallLoad(true); });
  $('#wshuf').addEventListener('click', () => { W.sort = 'shuffle'; W.seed = 1 + Math.floor(Math.random() * 90000); $('#wsort').value = 'shuffle'; wallLoad(true); window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }); });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { if (es[0].isIntersecting) wallLoad(); }, { rootMargin: '900px' }).observe($('#wsent')); else addEventListener('scroll', wallFill);
  await wallLoad();
  if (a === 'photo' && b) {                       // a shared link to one photo opens it straight away
    let list = W.items, i = list.findIndex(x => x.id === Number(b));
    if (i < 0) { try { const p = await api('/api/public/gallery/photo/' + encodeURIComponent(b)); list = [p, ...W.items]; i = 0; window.__pubgalList = list; } catch { toast('That photo is not available any more', true); return; } }
    openLightbox(list, i, window.__pubgalOpts);
  }
}
// albums: an optional page, a plain grid of covers
async function renderAlbumIndex() {
  show($('#app'), publicShell(html`<div class="wrap section"><div class="loading"><div class="spin"></div>Loading the albums…</div></div>`, 'gallery'));
  let G; try { G = await api('/api/public/gallery'); } catch (e) { return show($('#app'), publicShell(html`<div class="wrap section"><div class="alert err">${e.message}</div></div>`, 'gallery')); }
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">${pageHead('Gallery', 'Photos gathered by campaign and event. Open an album to look through it, or see every photo at once.', html`<a class="btn secondary" href="#/gallery/all">${icon('image')} See all photos once</a>`, 'Electoral Literacy Clubs')}
    <div class="wall-bar"><label class="f wall-search"><span class="sr">Search albums</span>${icon('search')}<input type="search" id="alq" placeholder="Search albums…"></label><span class="wall-count" id="alc"></span></div><div id="galbums"></div></div>`, 'gallery'));
  const paint = () => {
    const q = $('#alq').value.toLowerCase().trim(), list = G.albums.filter(a => !q || [a.title, a.description].some(x => String(x || '').toLowerCase().includes(q)));
    $('#alc').textContent = `${list.length + (G.current?.length && !q ? 1 : 0)} album${list.length === 1 && !(G.current?.length && !q) ? '' : 's'}`;
    const cur = G.current && G.current.length && !q ? html`<a class="albtile" href="#/gallery/current" aria-label="Open album: Current campaign"><span class="albpic"><i></i><img src="${gUrl(G.current[0], 'large', `/api/public/album/${G.current[0].id}/thumb`)}" alt="" loading="lazy" decoding="async"><span class="albn">${G.current.length}</span></span><b>Current campaign</b><small>Colleges, schools and the district office</small></a>` : '';
    show($('#galbums'), list.length || cur ? html`<div class="albgrid2">${cur}${list.map(a => html`<a class="albtile" href="#/gallery/${a.id}" aria-label="Open album: ${a.title}, ${a.count} photos"><span class="albpic"><i></i><img src="${a.cover_ext ? a.cover_ext.replace('{s}', 'large') : `/api/public/album/${a.cover}/thumb`}" alt="" loading="lazy" decoding="async"><span class="albn">${a.count}</span></span><b>${a.title}</b><small>${a.last ? new Date(a.last + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}</small></a>`)}</div>` : empty('No album matches', 'Try another word.', 'folder'));
  };
  $('#alq').addEventListener('input', paint); paint();
}
function renderAlbumPage(d) {
  const a = d.album; window.__pubgalList = d.photos; window.__pubgalOpts = {};
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">${pageHead(a.title, a.description || `${d.photos.length} photo${d.photos.length === 1 ? '' : 's'}`, html`<a class="btn secondary" href="#/gallery">${icon('arrow-left')} All albums</a><a class="btn secondary" href="#/gallery/all">${icon('image')} All photos</a>`, a.current ? 'Happening now' : 'Album')}
    ${d.photos.length ? html`<p class="small muted" style="margin:-4px 0 14px">${d.photos.length} photo${d.photos.length === 1 ? '' : 's'}. Tap a photo to open it.</p><div class="wgrid">${d.photos.map(wallTile)}</div>` : empty('No photos in this album yet', '', 'image')}</div>`, 'gallery'));
}
actions.viewPhoto = el => { const list = window.__pubgalList || []; openLightbox(list, Math.max(0, list.findIndex(x => x.id === Number(el.dataset.id))), window.__pubgalOpts || {}); };

// ---------- a shared resource: preview, download, and a link that can be passed on ----------
async function renderResource(id) {
  show($('#app'), publicShell(html`<div class="wrap section"><div class="loading"><div class="spin"></div>Opening the file…</div></div>`, ''));
  let r;
  try { r = await api('/api/resources/' + encodeURIComponent(id)); }
  catch (e) { return show($('#app'), publicShell(html`<div class="wrap section"><div class="card" style="max-width:640px;margin:0 auto">${empty(e.status === 403 ? 'Sign in to open this file' : 'File not found', e.message, 'lock')}<div class="row" style="justify-content:center;margin-top:12px"><a class="btn primary" href="#/login/college">${icon('building')} College sign-in</a><a class="btn secondary" href="#/login/school">${icon('book')} School sign-in</a><a class="btn secondary" href="/admin">${icon('shield')} Staff sign-in</a></div></div></div>`, '')); }
  const pic = r.kind === 'link' ? html`<div class="rv-tile">${r.has_thumb ? html`<img class="resview" src="/api/resources/${r.id}/thumb" alt="">` : fileTile('', '', true)}<p>This resource is a web link.</p></div>`
    : r.mime === 'application/pdf' ? html`<iframe class="pdfview" src="/api/resources/${r.id}/view" title="${r.title}"></iframe>`
    : /^image\//.test(r.mime || '') ? html`<img class="resview" src="/api/resources/${r.id}/view" alt="${r.title}">`
    : html`<div class="rv-tile">${r.has_thumb ? html`<img class="resview" src="/api/resources/${r.id}/thumb" alt="">` : fileTile(r.filename, r.mime)}<p>A preview is not available for this type of file. Download it to open it.</p></div>`;
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">${pageHead(r.title, r.description || r.category, html`<a class="btn secondary" href="#/">${icon('home')} Home</a>`, r.category || 'Resource')}
    <div class="card" style="margin-bottom:16px"><div class="row between"><div class="small muted"><b>${r.filename || r.title}</b> · Share link: <code>${resLink(r)}</code><br>${r.kind === 'file' ? html`${r.size ? (r.size > 1048576 ? (r.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(r.size / 1024)) + ' KB') : ''}` : 'Web link'}</div>
      <div class="row gap-s">${r.kind === 'link' ? html`<a class="btn primary" href="${r.url}" target="_blank" rel="noopener">${icon('external')} Open link</a>` : html`<a class="btn primary" href="/api/resources/${r.id}/download">${icon('download')} Download</a>`}<button class="btn secondary" data-act="copyRes" data-s="${resSlug(r)}">${icon('copy')} Copy link</button></div></div></div>
    <div class="card resprev">${pic}</div></div>`, ''));
}
