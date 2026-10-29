'use strict';
// ---- public pages: landing, display board, sign-in ----
let BOARD = null, ANN = [], RES = [], MAP = null, sortKey = 'score', query = '';
const SORTS = { score: 'Score', registered: 'Registered', addressed: 'Addressed', attendance_pct: 'Attendance', villages_ack: 'Villages certified', volunteers: 'Students' };
const ME = { kind: null, name: '' };   // who is signed in on this browser (set in boot.js)

// ---------- shared public frame ----------
function publicShell(inner, active = '') {
  const signed = ME.kind ? html`<a class="btn primary sm" href="#/${ME.kind === 'college' ? 'me' : 'officer'}">${icon('grid')} My workspace</a><button class="btn secondary sm" data-act="logoutAny">Sign out</button>`
    : html`<div class="dropdown"><button class="btn primary sm" data-act="dropdown" aria-haspopup="true" aria-expanded="false">Sign in ${icon('chevron-down')}</button>
      <div class="menu" role="menu"><a href="#/login/college" role="menuitem">${icon('building')}<span>College coordinator<small>Password from the district office</small></span></a>
        <a href="#/login/school" role="menuitem">${icon('book')}<span>School<small>Sign in or register your school</small></span></a>
        ${feat('public', 'officer_login') ? html`<a href="#/login/officer" role="menuitem">${icon('landmark')}<span>Village officer<small>Verify attendance and certify</small></span></a>` : ''}
        <a href="/admin" role="menuitem">${icon('shield')}<span>Staff console<small>Admins and interns</small></span></a></div></div>`;
  return html`<header class="pubbar"><div class="wrap">
      <a class="brand" href="#/" aria-label="SWEEP Kozhikode home"><img src="${LOGO.district}" alt="District Administration Kozhikode" style="height:38px"><span class="sep"></span><img src="${LOGO.sweepDark}" alt="SWEEP Kozhikode" style="height:34px"></a>
      <nav class="pubnav" aria-label="Main"><a class="l hide-m" href="#/" ${active === 'home' ? 'aria-current="page"' : ''}>Home</a><a class="l hide-m" href="#/board" ${active === 'board' ? 'aria-current="page"' : ''}>Display board</a>
        ${feat('public', 'map') ? html`<a class="l hide-m" href="#/" data-act="go" data-to="villagemap">Village map</a>` : html`<a class="l hide-m" href="#/" data-act="go" data-to="campus">Campus to booth</a>`}${feat('public', 'album') ? html`<a class="l hide-m" href="#/gallery" ${active === 'gallery' ? 'aria-current="page"' : ''}>Gallery</a>` : ''}<a class="l hide-m" href="#/" data-act="go" data-to="resources">Resources</a>${signed}</nav></div></header>
    <main id="main" tabindex="-1" class="page-in">${inner}</main>
    <footer class="foot"><div class="wrap"><div class="logos"><img src="${LOGO.district}" alt="District Administration Kozhikode"><span class="sep"></span><img src="${LOGO.sweepDark}" alt="SWEEP Kozhikode"><span class="sep"></span><img src="${LOGO.nvlb}" alt="No voter to be left behind" style="height:62px"></div>
      <div class="cols"><div><img src="${LOGO.sweepWhite}" alt="SWEEP Kozhikode" style="height:46px;margin-bottom:10px"><p class="small">Systematic Voters' Education and Electoral Participation, Kozhikode. Electoral Literacy Clubs enrolling every eligible young voter, village by village.</p></div>
        <div><h4>Explore</h4><p class="small"><a href="#/board">Display board</a><br>${feat('public', 'map') ? html`<a href="#/" data-act="go" data-to="villagemap">Village map</a><br>` : ''}<a href="#/" data-act="go" data-to="resources">Resource centre</a></p></div>
        <div><h4>For participants</h4><p class="small"><a href="#/login/college">College coordinators</a><br><a href="#/login/school">Schools</a><br>${feat('public', 'officer_login') ? html`<a href="#/login/officer">Village officers</a><br>` : ''}<a href="/admin">Staff console</a></p></div>
        <div><h4>Check your own enrolment</h4><p class="small">Not on the electoral roll yet? Apply with Form 6 on the Election Commission's <a href="https://voters.eci.gov.in" target="_blank" rel="noopener">Voters' Service Portal</a> or call <b>1950</b>.</p></div></div>
      <div class="legal"><span>© District Administration, Kozhikode</span><span>Built for the Electoral Literacy Club programme</span></div></div></footer>`;
}
actions.go = (el, e) => { const t = document.getElementById(el.dataset.to); if (location.hash && location.hash !== '#/' && location.hash !== '#') { location.hash = '#/'; setTimeout(() => document.getElementById(el.dataset.to)?.scrollIntoView({ behavior: 'smooth' }), 80); } else { e.preventDefault(); t?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); } };
actions.logoutAny = async () => { await api(ME.kind === 'college' ? '/api/auth/college/logout' : '/api/auth/officer/logout', 'POST'); ME.kind = null; location.hash = '#/'; toast('Signed out'); route(); };

// ---------- data ----------
async function loadPublic() {
  const [b, a, r] = await Promise.all([api('/api/public/board'), api('/api/announcements').catch(() => []), api('/api/resources').catch(() => [])]);
  BOARD = b; ANN = a; RES = r;
}

// ---------- landing ----------
async function renderHome() {
  if (!BOARD) show($('#app'), publicShell(html`<div class="loading"><div class="spin"></div>Loading the latest numbers…</div>`, 'home'));
  try { await loadPublic(); } catch (e) { return show($('#app'), publicShell(html`<div class="wrap section"><div class="alert err">Couldn't load the numbers: ${e.message}</div></div>`, 'home')); }
  const t = BOARD.totals, ins = BOARD.insights, C = BOARD.campus, vil = feat('public', 'map');
  ALBUM = feat('public', 'album') ? await api('/api/public/album').catch(() => []) : [];
  show($('#app'), publicShell(html`
  <section class="hero"><div class="wrap"><div>
      <span class="eyebrow"><span class="live"></span> Live from the field · updated every few seconds</span>
      <h1>No voter to be <em>left behind.</em></h1>
      <p class="lead">${vil ? 'Student volunteers from Electoral Literacy Clubs across Kozhikode are going village to village, helping every eligible young person join the electoral roll. Follow the movement live.' : 'From campus to booth: Electoral Literacy Clubs in colleges and schools across Kozhikode are getting every eligible student onto the electoral roll. Follow the progress live.'}</p>
      <div class="row"><a class="btn accent lg" href="#/board">${icon('chart')} Open display board</a>${vil ? html`<button class="btn outline-light lg" data-act="go" data-to="villagemap">${icon('map-pin')} See villages on the map</button>` : html`<a class="btn outline-light lg" href="#/login/school">${icon('book')} Schools: join the drive</a>`}</div></div>
    <div class="hero-card"><img src="${LOGO.nvlb}" alt="No voter to be left behind: two students checking a voting machine"></div></div></section>
  <div class="wrap"><div class="hero-stats rv" role="list" aria-label="Headline numbers">
    ${vil ? html`<div role="listitem"><div class="v" data-count="${t.registered}">0</div><div class="l">New voters enrolled</div></div>
    <div role="listitem"><div class="v" data-count="${t.volunteers}">0</div><div class="l">Student volunteers involved</div></div>
    <div role="listitem"><div class="v" data-count="${t.colleges}">0</div><div class="l">Participating colleges</div></div>
    <div role="listitem"><div class="v" data-count="${t.addressed}">0</div><div class="l">People reached</div></div>` : html`<div role="listitem"><div class="v" data-count="${C.totals.registered}">0</div><div class="l">Students registered</div></div>
    <div role="listitem"><div class="v">${C.totals.pct == null ? '—' : C.totals.pct + '%'}</div><div class="l">Coverage of eligible students</div></div>
    <div role="listitem"><div class="v">${C.totals.active}<span class="of">/${C.totals.institutions}</span></div><div class="l">Active colleges and schools</div></div>
    <div role="listitem"><div class="v" data-count="${C.totals.institutions}">0</div><div class="l">Colleges and schools joined</div></div></div></div>`}</div></div>

  ${ANN.length ? html`<section class="section" id="notices"><div class="wrap"><div class="section-head"><div><h2>Announcements</h2><p>Latest updates from the district election office.</p></div></div>
    <div class="grid g2">${ANN.slice(0, 4).map(a => html`<article class="notice rv ${a.pinned ? 'pinned' : ''}"><h3>${a.pinned ? html`${icon('pin')} ` : ''}${a.title}</h3>${a.body ? html`<p>${a.body}</p>` : ''}<div class="when">${fdt(a.created_at)}</div></article>`)}</div></div></section>` : ''}

  ${campusSection(C)}
  ${ALBUM.length ? albumSection() : ''}
  ${vil ? html`<section class="section" id="villagemap"><div class="wrap"><div class="section-head"><div><h2>Where our volunteers are working</h2><p>${t.villages_active} of ${t.villages_total} village offices have students present in the field, and ${t.villages_registered} have voters registered. Select a village to see its progress.</p></div>
    <div class="chips" id="mapfilter" role="group" aria-label="Filter villages"></div></div>
    <div class="map-wrap rv"><div id="map" role="application" aria-label="Map of Kozhikode villages with ELC activity"></div><div class="map-side"><label class="f"><span class="sr">Search villages</span><input type="search" id="vq" placeholder="Search a village or college…"></label><div id="vlist" role="list"></div></div></div>
    <div class="legend"><span><i style="background:#0a9f4c"></i>Voters registered</span><span><i style="background:#f7861d"></i>Students present</span><span><i style="background:#8b92b0"></i>Allotted</span><span><i style="background:#fff"></i>Not yet allotted</span></div></div></section>` : ''}

  ${vil ? html`<section class="section" id="insights"><div class="wrap"><div class="section-head"><div><h2>Insights</h2><p>What the numbers say about the drive so far.</p></div></div>
    <div class="insights">${insightCards(ins, t)}</div>
    <div class="grid g2" style="margin-top:16px"><div class="card rv"><div class="card-head"><h3>Enrolment by taluk</h3></div><div class="bars" id="taluks"></div></div>
      <div class="card rv"><div class="card-head"><h3>Voters enrolled per field day</h3><span class="small muted">last ${BOARD.trend.length} active days</span></div><div id="trend"></div></div></div></div></section>

  <section class="section" id="leaderboard"><div class="wrap"><div class="section-head"><div><h2>Leaderboard</h2><p>Points for every voter enrolled, person reached, volunteer-day worked and village certified.</p></div><a class="btn secondary" href="#/board">Full display board ${icon('arrow-right')}</a></div>
    <div id="podium"></div><div class="board" id="lb"></div></div></section>

` : ''}
  <section class="section" id="colleges"><div class="wrap"><div class="section-head"><div><h2>${vil ? 'Participating colleges' : 'Participating colleges and schools'} <span class="badge">${vil ? t.colleges : C.colleges + C.schools}</span></h2><p>Every institution on the programme.</p></div><label class="f" style="margin:0;min-width:240px"><span class="sr">Search colleges</span><input type="search" id="cq" placeholder="Search colleges…"></label></div><div class="collegegrid" id="cg"></div><div class="pager" id="cgpager"></div></div></section>

  <section class="section"><div class="wrap grid g2">
    ${vil ? html`<div><div class="section-head"><div><h2>Live activity</h2></div></div><div class="card rv"><ul class="feed" id="feed"></ul></div></div>` : ''}
    <div id="resources"><div class="section-head"><div><h2>Resource centre</h2></div></div><div class="stack-s" id="reslist"></div></div></div></section>`, 'home'));
  paintHome(); paintCampus(); wireMap(); startAlbum(); $('#main').focus({ preventScroll: true });
}

let ALBUM = [], albumTimer = null, albumAt = 0, albumList = [];
function albumSection() {
  return html`<section class="section" id="album"><div class="wrap"><div class="section-head"><div><h2>Moments from the campaign</h2><p>Photos from help desks, flash mobs, class-to-class campaigns and more, shared by colleges and schools.</p></div><a class="btn secondary" href="#/gallery">See all photos ${icon('arrow-right')}</a></div></div>
    <div class="cf" id="cf" role="region" aria-roledescription="carousel" aria-label="Campaign photo album" tabindex="0"><div class="cf-stage" id="cfstage"></div>
      <button class="cf-btn prev" data-act="albPrev" aria-label="Previous photo">${icon('arrow-left')}</button><button class="cf-btn next" data-act="albNext" aria-label="Next photo">${icon('arrow-right')}</button></div>
    <div class="cf-cap" id="cfcap" aria-live="polite"></div><div class="cf-dots" id="cfdots" aria-hidden="true"></div></section>`;
}
function startAlbum() {
  clearInterval(albumTimer); const st = $('#cfstage'); if (!st) return;
  albumList = ALBUM.slice(0, 12);
  st.innerHTML = albumList.map((g, i) => `<figure class="cf-card" data-i="${i}" data-act="cfGo" aria-label="${esc(g.college)}: ${esc(g.title)}"><div class="bg" data-src="/api/public/album/${g.id}/image"></div><img data-src="/api/public/album/${g.id}/image" alt="${esc(g.title)}, ${esc(g.college)}" draggable="false"></figure>`).join('');
  setAlbum(0);
  const box = $('#cf'); let paused = false, x0 = null;
  box.addEventListener('mouseenter', () => { paused = true; }); box.addEventListener('mouseleave', () => { paused = false; });
  box.addEventListener('focusin', () => { paused = true; }); box.addEventListener('focusout', () => { paused = false; });
  box.addEventListener('keydown', e => { if (e.key === 'ArrowRight') setAlbum(albumAt + 1); else if (e.key === 'ArrowLeft') setAlbum(albumAt - 1); });
  box.addEventListener('pointerdown', e => { x0 = e.clientX; }); box.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 45) { setAlbum(albumAt + (e.clientX < x0 ? 1 : -1)); box.dataset.swiped = '1'; setTimeout(() => { delete box.dataset.swiped; }, 50); } x0 = null; });
  if (!reduced() && albumList.length > 1) albumTimer = setInterval(() => { if (!paused && document.getElementById('cfstage')) setAlbum(albumAt + 1); }, 4800);
}
function setAlbum(i) {
  const cards = $$('#cfstage .cf-card'), N = cards.length; if (!N) return;
  albumAt = ((i % N) + N) % N;
  cards.forEach((c, k) => {
    let o = k - albumAt; if (o > N / 2) o -= N; if (o < -N / 2) o += N;
    c.dataset.o = Math.abs(o) > 1 ? (o < 0 ? 'xl' : 'xr') : String(o);
    if (Math.abs(o) <= 2) { const im = $('img', c), bg = $('.bg', c); if (im && im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; } if (bg && bg.dataset.src) { bg.style.backgroundImage = 'url(' + bg.dataset.src + ')'; delete bg.dataset.src; } }
    c.setAttribute('aria-hidden', o === 0 ? 'false' : 'true');
  });
  const g = albumList[albumAt], cap = $('#cfcap');
  cap.classList.remove('in'); void cap.offsetWidth;
  cap.innerHTML = `<b>${esc(g.college)}</b><span>${esc(g.title)}</span><small>${esc(g.activity)}${g.event_date ? ' · ' + fdate(g.event_date) : ''}</small>`; cap.classList.add('in');
  show($('#cfdots'), html`${albumList.map((_, k) => html`<i class="${k === albumAt ? 'on' : ''}"></i>`)}`);
}
actions.albNext = () => setAlbum(albumAt + 1);
actions.albPrev = () => setAlbum(albumAt - 1);
actions.cfGo = el => { if ($('#cf')?.dataset.swiped) return; const k = Number(el.dataset.i); if (k !== albumAt) setAlbum(k); };

function campusSection(C) {
  const T = C.totals;
  return html`<section class="section" id="campus"><div class="wrap"><div class="section-head"><div><h2>Campus to booth</h2><p>The target is 100%: every eligible student in every college and school on the electoral roll.</p></div><a class="btn secondary" href="#/board">Full display board ${icon('arrow-right')}</a></div>
    <div class="card rv campus-top"><div class="row between" style="align-items:flex-end;gap:16px"><div><div class="campus-big">${T.pct == null ? '—' : T.pct + '%'}</div><div class="muted">total coverage of eligible students</div></div>
      <div class="campus-facts"><div><b>${n(T.registered)}</b><span>students registered</span></div><div><b>${T.active}/${T.institutions}</b><span>active this week</span></div></div></div>
      ${progress(T.pct || 0, 'green')}</div>
    <h3 style="margin:26px 0 12px">Leading colleges and schools</h3><div id="cpodium"></div><div class="board" id="cboard" data-limit="10"></div></div></section>`;
}

function insightCards(i, t) {
  const arrow = i.week.change_pct == null ? '' : (i.week.change_pct >= 0 ? '▲ ' : '▼ ') + Math.abs(i.week.change_pct) + '% vs last week';
  const card = (v, l, p) => html`<div class="insight rv"><div class="v">${v}</div><div class="l">${l}</div><p>${p}</p></div>`;
  return html`${card(i.conversion_pct == null ? '—' : i.conversion_pct + '%', 'Conversion', 'of people reached went on to register')}
    ${card(i.attendance_pct == null ? '—' : i.attendance_pct + '%', 'Volunteer attendance', 'of scheduled student shifts were worked')}
    ${card(i.avg_per_field_day ?? '—', 'Voters per field day', `average across ${n(t.days_done)} field days`)}
    ${card(i.avg_per_volunteer_day ?? '—', 'Voters per volunteer-day', `from ${n(t.vdays_attended)} volunteer-days`)}
    ${card(i.coverage_pct == null ? '—' : i.coverage_pct + '%', 'Village coverage', `${t.villages_active} of ${t.villages_total} villages visited`)}
    ${card(n(t.colleges_submitted), 'Reports sent for certification', `of ${n(t.colleges)} colleges have sent their consolidated report to the village officer`)}
    ${card(n(i.week.this), 'Enrolled this week', arrow || 'last 7 days')}
    ${i.best_day ? card(n(i.best_day.registered), 'Best single day', fdateLong(i.best_day.date)) : ''}
    ${card(i.progress_pct == null ? '—' : i.progress_pct + '%', 'Programme progress', `${n(t.days_done)} of ${n(t.days_planned)} planned field days done`)}`;
}

function paintHome() {
  paintBoard('#podium', '#lb', 10);
  const tl = BOARD.taluks.filter(x => x.taluk && x.taluk !== 'Other'), mx = Math.max(1, ...tl.map(x => x.registered));
  show($('#taluks'), tl.length ? html`${tl.map(x => html`<div class="bar"><span>${x.taluk}</span><div class="t" title="${x.active} of ${x.villages} villages active"><i data-w="${Math.round(x.registered * 100 / mx)}"></i></div><b class="tnum">${n(x.registered)}</b></div>`)}` : empty('No data yet'));
  paintTrend('#trend');
  show($('#feed'), BOARD.feed.length ? html`${BOARD.feed.map(f => html`<li><span class="d">${icon('check-circle')}</span><div><b>${f.college}</b> worked in <b>${f.village}</b><div class="small muted">${f.present} volunteer${f.present > 1 ? 's' : ''} · ${f.addressed} reached · <b>${f.registered} enrolled</b> · ${fdate(f.date)}</div></div></li>`)}` : html`<li class="muted">Field activity will appear here.</li>`);
  paintColleges();
  show($('#reslist'), RES.length ? html`${RES.slice(0, 6).map(resCard)}` : empty('No resources yet', 'Manuals and forms will be shared here.', 'book'));
  $('#cq')?.addEventListener('input', paintColleges);
}
const resCard = r => html`<div class="res rv"><span class="ico">${icon(r.kind === 'link' ? 'link' : 'file')}</span><div class="grow"><h3>${r.title}</h3><p>${r.description || r.category}</p></div>
  ${r.kind === 'link' ? html`<a class="btn secondary sm" href="${r.url}" target="_blank" rel="noopener">${icon('external')} Open</a>` : html`<a class="btn secondary sm" href="/api/resources/${r.id}/download">${icon('download')} Download</a>`}</div>`;

function paintTrend(sel, data) {
  const tr = data || BOARD.trend, mx = Math.max(1, ...tr.map(x => x.registered));
  show($(sel), tr.length ? html`<div class="chart" role="img" aria-label="Bar chart of voters enrolled per field day">${tr.map(x => html`<div class="col" tabindex="0" data-tip="${fdate(x.date)}: ${x.registered} enrolled"><i data-h="${Math.max(3, Math.round(x.registered * 100 / mx))}"></i></div>`)}</div>
    <div class="row between small muted" style="margin-top:6px"><span>${fdate(tr[0].date)}</span><span>${fdate(tr.at(-1).date)}</span></div>` : empty('The first field day will light this up'));
}

function paintBoard(podSel, lbSel, limit) {
  const cs = BOARD.colleges, key = sortKey, mine = ME.kind === 'college' ? ME.name : null;
  const sorted = [...cs].sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1) || a.rank - b.rank);
  const mxS = Math.max(1, ...cs.map(c => c.score));
  const rows = sorted.filter(c => !query || c.name.toLowerCase().includes(query)).slice(0, limit || 999);
  if ($(podSel)) show($(podSel), sorted.length >= 3 && !query ? html`<div class="podium">${sorted.slice(0, 3).map((c, i) => html`<div class="pod p${i + 1} rv"><div class="m">${i + 1}</div><h3>${c.short_name}</h3><div class="sc tnum">${n(c[key] ?? 0)}</div><small>${SORTS[key].toLowerCase()}</small><div class="small muted" style="margin-top:6px">${n(c.registered)} enrolled · ${n(c.addressed)} reached</div></div>`)}</div>` : '');
  show($(lbSel), html`<div class="lbrow head"><div></div><div>College</div><div>Registered</div><div>Reached</div><div>Attendance</div><div>Certified</div><div>Score</div></div>
    ${rows.length ? rows.map(c => { const pos = sorted.indexOf(c) + 1; return html`<div class="lbrow rv r${pos <= 3 ? pos : ''} ${mine && c.name === mine ? 'me' : ''}"><div class="rank">${pos}</div>
      <div class="nm">${c.name}${mine && c.name === mine ? html` ${badge('You', 'saffron')}` : ''}<small>${c.volunteers} students · ${c.villages} village${c.villages === 1 ? '' : 's'} · ${c.days_done}/${c.days_planned} days</small></div>
      <div class="c"><small>Registered</small><b>${n(c.registered)}</b></div><div class="c"><small>Reached</small><b>${n(c.addressed)}</b></div><div class="c"><small>Attendance</small><b>${pct(c.attendance_pct)}</b></div>
      <div class="c"><small>Certified</small><b>${c.villages_ack}/${c.villages}</b></div><div class="c scorecol"><small>Score</small><b>${n(c.score)}</b>${progress(Math.round(c.score * 100 / mxS), 'saffron')}</div></div>`; })
      : empty('No college matches your search', '', 'search')}`);
}

// ---------- map ----------
let MAPMARK = new Map(), MAPFILTER = 'all';
const STATUS_LABEL = { registered: 'Voters registered', present: 'Students present', allotted: 'Allotted', open: 'Not yet allotted' };
function wireMap() {
  show($('#mapfilter'), html`${[['all', 'All'], ['registered', 'Registered'], ['present', 'Present'], ['allotted', 'Allotted'], ['open', 'Open']].map(([k, l]) => html`<button class="chip ${MAPFILTER === k ? 'on' : ''}" data-act="mapf" data-k="${k}" aria-pressed="${MAPFILTER === k}">${l}</button>`)}`);
  paintVillageList();
  $('#vq')?.addEventListener('input', paintVillageList);
  const el = $('#map'); if (!el) return;
  if (typeof L === 'undefined') { el.innerHTML = '<div class="loading">The map could not be loaded. The village list on the right still works.</div>'; return; }
  if (MAP) { MAP.remove(); MAP = null; }
  MAP = L.map(el, { scrollWheelZoom: false, zoomControl: true }).setView([11.45, 75.85], 9);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, referrerPolicy: 'strict-origin-when-cross-origin', attribution: '© OpenStreetMap contributors' }).addTo(MAP);
  MAPMARK = new Map(); const pts = [];
  for (const v of BOARD.villages) {
    if (v.lat == null || v.lng == null) continue;
    const m = L.marker([v.lat, v.lng], { icon: L.divIcon({ className: '', html: `<div class="pin ${v.status}"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] }), title: v.name, keyboard: true, alt: v.name }).addTo(MAP);
    m.bindPopup(`<b>${esc(v.name)}</b><br><span style="color:#5d6588">${esc(v.taluk)}${v.lsgi ? ' · ' + esc(v.lsgi) : ''}</span><br>${STATUS_LABEL[v.status]}${v.college ? `<br>${esc(v.college)}` : ''}${v.days ? `<br><b>${n(v.registered)}</b> enrolled · ${n(v.addressed)} reached · ${v.days} field days` : ''}`);
    MAPMARK.set(v.id, m); pts.push([v.lat, v.lng]);
  }
  if (pts.length > 1) MAP.fitBounds(pts, { padding: [24, 24] });
  MAP.on('focus', () => MAP.scrollWheelZoom.enable()); MAP.on('blur', () => MAP.scrollWheelZoom.disable());
}
actions.mapf = el => { MAPFILTER = el.dataset.k; $$('#mapfilter .chip').forEach(c => { const on = c.dataset.k === MAPFILTER; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
  MAPMARK.forEach((m, id) => { const v = BOARD.villages.find(x => x.id === id), ok = MAPFILTER === 'all' || v.status === MAPFILTER; m.getElement()?.style && (m.getElement().style.display = ok ? '' : 'none'); }); paintVillageList(); };
function paintVillageList() {
  const q = ($('#vq')?.value || '').toLowerCase();
  const vs = BOARD.villages.filter(v => (MAPFILTER === 'all' || v.status === MAPFILTER) && (!q || [v.name, v.college, v.taluk, v.lsgi].some(x => String(x || '').toLowerCase().includes(q))));
  const dot = s => ({ registered: '#0a9f4c', present: '#f7861d', allotted: '#8b92b0', open: '#d3d8e8' }[s]);
  show($('#vlist'), vs.length ? html`${vs.slice(0, 120).map(v => html`<div class="vrow" role="listitem" tabindex="0" data-act="flyto" data-id="${v.id}"><span class="dot" style="color:${dot(v.status)}"></span><span class="grow"><b>${v.name}</b><small>${v.college || STATUS_LABEL[v.status]}${v.registered ? ` · ${n(v.registered)} enrolled` : ''}</small></span></div>`)}` : html`<p class="muted small">No villages match.</p>`);
}
actions.flyto = el => { const m = MAPMARK.get(Number(el.dataset.id)); if (m && MAP) { MAP.flyTo(m.getLatLng(), 12); m.openPopup(); $('#map').scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); } };
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.vrow')) { e.preventDefault(); e.target.click(); } });

const CG_PAGE = 12; let cgPage = 0;
function paintColleges(keepPage) {
  keepPage = keepPage === true;
  const q = ($('#cq')?.value || '').toLowerCase();
  if (!keepPage) cgPage = 0;
  const cs = (feat('public', 'map') ? [...BOARD.colleges] : BOARD.campus.institutions.map(i => ({ ...i, villages: 0 }))).sort((a, b) => a.name.localeCompare(b.name)).filter(c => !q || c.name.toLowerCase().includes(q));
  const pages = Math.max(1, Math.ceil(cs.length / CG_PAGE)); cgPage = Math.min(cgPage, pages - 1);
  const shown = cs.slice(cgPage * CG_PAGE, cgPage * CG_PAGE + CG_PAGE);
  show($('#cg'), cs.length ? html`${shown.map(c => html`<div class="cg rv"><span class="lt">${initials(c.short_name)}</span><div class="grow"><b>${c.name}</b><small>${feat('public', 'map') ? `${c.villages} village${c.villages === 1 ? '' : 's'} · ${n(c.registered)} enrolled` : `${c.kind === 'school' ? 'School' : 'College'} · ${c.pct == null ? 'not started' : c.pct + '% covered'}${c.status === 'active' ? ' · active' : ''}`}</small></div></div>`)}` : empty('No college matches', '', 'search'));
  show($('#cgpager'), pages > 1 ? html`<button class="btn secondary sm" data-act="cgPrev" ${cgPage === 0 ? 'disabled' : ''}>${icon('arrow-left')} Previous</button><span class="small muted" aria-live="polite">Colleges ${cgPage * CG_PAGE + 1}–${Math.min(cs.length, cgPage * CG_PAGE + CG_PAGE)} of ${cs.length} · page ${cgPage + 1} of ${pages}</span><button class="btn secondary sm" data-act="cgNext" ${cgPage >= pages - 1 ? 'disabled' : ''}>Next ${icon('arrow-right')}</button>` : '');
}
actions.cgPrev = () => { cgPage--; paintColleges(true); $('#colleges')?.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); };
actions.cgNext = () => { cgPage++; paintColleges(true); $('#colleges')?.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); };

// ---------- display board ----------
let boardTimer = null;
async function renderBoard() {
  show($('#app'), publicShell(html`<div class="loading"><div class="spin"></div>Loading the display board…</div>`, 'board'));
  try { await loadPublic(); } catch (e) { return show($('#app'), publicShell(html`<div class="wrap section"><div class="alert err">${e.message}</div></div>`, 'board')); }
  const t = BOARD.totals;
  if (!feat('public', 'map')) return renderCampusBoard();
  show($('#app'), publicShell(html`<div class="wrap" style="padding-top:26px">
    ${pageHead('Display board', html`Live programme figures for Kozhikode district. Refreshes automatically.`, html`<button class="btn secondary" data-act="tv">${icon('eye')} Full screen</button><a class="btn secondary" href="#/">${icon('home')} Home</a>`, 'Electoral Literacy Clubs')}
    <div class="kpis">${kpi('Voters enrolled', t.registered, { ic: 'user-check', tone: 'green' })}${kpi('People reached', t.addressed, { ic: 'megaphone', tone: 'saffron' })}${kpi('Student volunteers', t.volunteers, { ic: 'users' })}
      ${kpi('Colleges', t.colleges, { ic: 'building', tone: 'info' })}${kpi('Villages active', `${t.villages_active}/${t.villages_total}`, { ic: 'map-pin', count: false })}${kpi('Reports sent for certification', t.colleges_submitted, { ic: 'certificate', tone: 'green' })}</div>
    <div class="grid g2" style="margin-top:16px"><div class="card rv"><div class="card-head"><h3>Enrolment by taluk</h3></div><div class="bars" id="taluks"></div></div>
      <div class="card rv"><div class="card-head"><h3>Voters enrolled per field day</h3></div><div id="trend"></div></div></div>
    <div class="insights" style="margin-top:16px">${insightCards(BOARD.insights, t)}</div>
    <div class="section-head" style="margin-top:34px"><div><h2>College ranking</h2><p>Ranked by ${SORTS[sortKey].toLowerCase()}. Score = ${BOARD.formula.registered} per voter enrolled + ${BOARD.formula.addressed} per person reached + ${BOARD.formula.attended} per volunteer-day + ${BOARD.formula.verifiedVillage} per village certified.</p></div>
      <label class="f" style="margin:0;min-width:240px"><span class="sr">Search colleges</span><input type="search" id="bq" placeholder="Search a college…" value="${query}"></label></div>
    <div class="tabs" role="tablist" aria-label="Rank by" id="sorts" style="margin-bottom:14px"></div><div id="podium"></div><div class="board" id="lb"></div>
    <div class="grid g2" style="margin:28px 0 0"><div><div class="section-head"><h2>Live activity</h2></div><div class="card"><ul class="feed" id="feed"></ul></div></div><div><div class="section-head"><h2>Hall of fame</h2></div><div class="stack-s" id="awards"></div></div></div></div>`, 'board'));
  const tl = BOARD.taluks.filter(x => x.taluk && x.taluk !== 'Other'), mx = Math.max(1, ...tl.map(x => x.registered));
  show($('#taluks'), html`${tl.map(x => html`<div class="bar"><span>${x.taluk}</span><div class="t" title="${x.active} of ${x.villages} villages active"><i data-w="${Math.round(x.registered * 100 / mx)}"></i></div><b class="tnum">${n(x.registered)}</b></div>`)}`);
  paintTrend('#trend'); paintSorts(); paintBoard('#podium', '#lb', 0);
  show($('#feed'), BOARD.feed.length ? html`${BOARD.feed.map(f => html`<li><span class="d">${icon('check-circle')}</span><div><b>${f.college}</b> in <b>${f.village}</b><div class="small muted">${f.registered} enrolled · ${f.addressed} reached · ${fdate(f.date)}</div></div></li>`)}` : html`<li class="muted">Field activity will appear here.</li>`);
  const a = BOARD.awards, items = [['user-check', 'Most voters enrolled', a.registrations, 'enrolled'], ['megaphone', 'Widest reach', a.outreach, 'reached'], ['users', 'Biggest team', a.volunteers, 'students'], ['certificate', 'Most villages certified', a.verified, 'villages'], ['clock', 'Best attendance', a.attendance, '%']];
  show($('#awards'), html`${items.map(([ic, tt, w, u]) => html`<div class="res rv"><span class="ico">${icon(ic)}</span><div class="grow"><h3>${tt}</h3><p>${w ? html`<b>${w.name}</b> · ${n(w.value)} ${u}` : 'Up for grabs'}</p></div></div>`)}`);
  $('#bq').addEventListener('input', e => { query = e.target.value.toLowerCase(); paintBoard('#podium', '#lb', 0); });
  clearInterval(boardTimer); boardTimer = setInterval(async () => { if (location.hash !== '#/board') return clearInterval(boardTimer); try { BOARD = await api('/api/public/board'); paintBoard('#podium', '#lb', 0); } catch {} }, 30000);
  $('#main').focus({ preventScroll: true });
}
function paintSorts() { show($('#sorts'), html`${Object.entries(SORTS).map(([k, l]) => html`<button class="tab" role="tab" aria-selected="${k === sortKey}" data-act="sort" data-k="${k}">${l}</button>`)}`); }
actions.sort = el => { sortKey = el.dataset.k; paintSorts(); paintBoard('#podium', '#lb', location.hash === '#/board' ? 0 : 10); };
actions.tv = () => { const d = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else d.requestFullscreen?.(); };

// ---------- sign-in pages ----------
async function renderLogin(role = 'college') {
  const roles = [['college', 'College', 'building'], ['school', 'School', 'book'], ...(feat('public', 'officer_login') ? [['officer', 'Village officer', 'landmark']] : []), ['staff', 'Staff', 'shield']];
  if (role === 'officer' && !feat('public', 'officer_login')) role = 'college';
  show($('#app'), publicShell(html`<div class="loginpage"><div class="logincard"><div class="lg"><img src="${LOGO.sweepDark}" alt="SWEEP Kozhikode"></div>
    <h1>Sign in</h1><p class="sub">Choose how you take part in the programme.</p>
    <nav class="rolepick" aria-label="Sign in as">${roles.map(([k, l, ic]) => k === 'staff' ? html`<a href="/admin">${icon(ic)}${l}</a>` : html`<a href="#/login/${k}" ${role === k ? 'aria-current="page"' : ''}>${icon(ic)}${l}</a>`)}</nav>
    <div id="lc"><div class="loading" style="padding:20px"><div class="spin"></div></div></div></div></div>`, ''));
  try {
    if (role === 'officer') {
      const list = await api('/api/public/officers');
      show($('#lc'), html`<form data-form="loginOfficer" class="stack-s">${comboField('officer_id', 'Your name', 'Start typing your name or village…', list.map(o => ({ id: o.id, label: o.name, sub: o.villages || '' })))}
        <label class="f"><span>Passcode</span><input name="passcode" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. K7M2-9XQP" required style="letter-spacing:.08em;font-weight:600;text-transform:uppercase"></label><div data-err></div>
        <button class="btn primary lg" type="submit" style="width:100%">Sign in</button><p class="hint center">Your passcode is shared by the district office. Not listed? Ask them to add you.</p></form>`);
    } else if (role === 'school') {
      show($('#lc'), html`<form data-form="loginSchool" class="stack-s"><label class="f"><span>School email</span><input name="email" type="email" required autocomplete="username" placeholder="The email you registered with"></label>
        <label class="f"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label><div data-err></div>
        <button class="btn primary lg" type="submit" style="width:100%">Sign in</button><p class="hint center">New school? <a href="#/school-signup">Register here</a>. Colleges: use the College tab.</p></form>`);
    } else {
      const school = false, list = await api('/api/public/colleges');
      show($('#lc'), html`<form data-form="loginCollege" class="stack-s">${comboField('college_id', school ? 'Your school' : 'Your college', school ? 'Start typing your school name…' : 'Start typing your college name…', list.map(c => ({ id: c.id, label: c.name, sub: '' })))}
        <label class="f"><span>Password</span><input name="passcode" type="password" autocomplete="current-password" required></label><div data-err></div>
        <button class="btn primary lg" type="submit" style="width:100%">Sign in</button><p class="hint center">First time? Use the starting password shared by the district office, then change it from your workspace. Schools: use the School tab.</p></form>`);
    }
    wireCombo($('#lc'));
  } catch (e) { show($('#lc'), html`<div class="alert err">${e.message}</div>`); }
}

// ---------- type-to-search suggestion list (replaces the long drop-down) ----------
let COMBO_ITEMS = [];
function comboField(name, label, placeholder, items) {
  COMBO_ITEMS = items;
  return html`<div class="combo"><label class="f"><span>${label}</span><input type="text" class="combo-in" role="combobox" aria-expanded="false" aria-controls="combo-list" aria-autocomplete="list" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="${placeholder}" required></label>
    <input type="hidden" name="${name}" class="combo-id"><ul id="combo-list" class="combo-list" role="listbox" hidden></ul></div>`;
}
function wireCombo(root) {
  const input = $('.combo-in', root), hid = $('.combo-id', root), list = $('.combo-list', root);
  if (!input) return;
  const items = COMBO_ITEMS; let shown = [], at = -1;
  const mark = (text, toks) => { let out = esc(text); for (const t of toks) if (t) out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); return out; };
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); at = -1; };
  const pick = i => { const it = shown[i]; if (!it) return; hid.value = it.id; input.value = it.label; input.setCustomValidity(''); close(); $('input[type=password],input[name=passcode]', root)?.focus(); };
  const paint = () => {
    const toks = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    shown = items.map(it => ({ it, hay: (it.label + ' ' + it.sub).toLowerCase() })).filter(x => toks.every(t => x.hay.includes(t)))
      .sort((a, b) => (b.hay.startsWith(toks[0] || '') ? 1 : 0) - (a.hay.startsWith(toks[0] || '') ? 1 : 0) || a.it.label.localeCompare(b.it.label)).map(x => x.it).slice(0, 8);
    list.innerHTML = shown.length ? shown.map((it, i) => `<li role="option" id="co${i}" data-i="${i}" aria-selected="false"><b>${mark(it.label, toks)}</b>${it.sub ? `<small>${mark(it.sub, toks)}</small>` : ''}</li>`).join('') : '<li class="none" role="option" aria-disabled="true">No match. Check the spelling, or ask the district office to add you.</li>';
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); at = -1;
  };
  const move = d => { if (list.hidden) paint(); if (!shown.length) return; at = (at + d + shown.length) % shown.length; $$('li', list).forEach((li, i) => { const on = i === at; li.classList.toggle('on', on); li.setAttribute('aria-selected', on); if (on) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); } }); };
  input.addEventListener('input', () => { hid.value = ''; input.setCustomValidity('Choose from the suggestions'); paint(); });
  input.addEventListener('focus', () => { if (!hid.value) paint(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter' && !list.hidden) { if (at >= 0 || shown.length === 1) { e.preventDefault(); pick(at >= 0 ? at : 0); } }
    else if (e.key === 'Escape') close();
  });
  list.addEventListener('mousedown', e => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); pick(Number(li.dataset.i)); } });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.setCustomValidity('Choose from the suggestions');
  input.focus();
}
forms.loginSchool = async f => { await api('/api/auth/school', 'POST', fd(f)); await detectMe(); toast('Welcome, ' + ME.name); location.hash = '#/me'; };
forms.loginCollege = async f => { if (!fd(f).college_id) throw new Error('Pick your college from the suggestions'); await api('/api/auth/college', 'POST', fd(f)); await detectMe(); toast('Welcome, ' + ME.name); location.hash = '#/me'; };
forms.loginOfficer = async f => { if (!fd(f).officer_id) throw new Error('Pick your name from the suggestions'); await api('/api/auth/officer', 'POST', fd(f)); await detectMe(); toast('Welcome, ' + ME.name); location.hash = '#/officer'; };
