'use strict';
// ---- router, nav, public home (leaderboard) and college login ----
const app = $('#app');
let ME = null;       // signed-in college {id,name} or null
let BOARD = null;
let sortKey = 'score', query = '';

const SORTS = { score: ['🔥 Score', 'score'], registered: ['📝 Registered', 'registered'], addressed: ['📣 Addressed', 'addressed'],
  attendance_pct: ['✅ Attendance', 'attendance_pct'], villages_ack: ['🏡 Verified villages', 'villages_ack'], volunteers: ['🙌 Volunteers', 'volunteers'] };

function renderNav() {
  show($('#navlinks'), html`
    <a class="l" href="#/">Leaderboard</a>
    ${ME ? html`<a class="l" href="#/me">My college</a><button class="btn sm white" data-act="logout">Sign out</button>`
         : html`<a class="btn sm" href="#/login">College login</a>`}`);
}

async function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [seg, ...rest] = h.split('/');
  window.scrollTo(0, 0);
  renderNav();
  if (seg === 'ack') return renderAck(rest[0]);
  if (seg === 'login') return ME ? (location.hash = '#/me') : renderLogin();
  if (seg === 'me') return ME ? renderCollege(rest[0] || 'overview') : (location.hash = '#/login');
  return renderHome();
}

async function boot() {
  try { ME = await api('/api/college/me'); } catch { ME = null; }
  setUnauth(() => { ME = null; location.hash = '#/login'; toast('Your session ended. Please sign in again.', true); });
  window.addEventListener('hashchange', route);
  route();
}

actions.logout = async () => { await api('/api/auth/college/logout', 'POST'); ME = null; location.hash = '#/'; toast('Signed out. See you on the field! ✌️'); };
actions.sort = el => { sortKey = el.dataset.k; paintBoard(); };
actions.toBoard = () => $('#board').scrollIntoView({ behavior: 'smooth' });
actions.goLogin = () => { location.hash = ME ? '#/me' : '#/login'; };

// ---------------- home ----------------
async function renderHome() {
  if (!BOARD) show(app, html`<div class="loading">Fetching the scoreboard…</div>`);
  try { BOARD = await api('/api/public/board'); } catch (e) { return show(app, html`<div class="wrap sec"><div class="err">Couldn't load the leaderboard: ${e.message}</div></div>`); }
  const t = BOARD.totals;
  show(app, html`
  <section class="hero">
    <div class="sticker s1">18+<br>= VOTER</div><div class="sticker s2">FORM<br>6</div>
    <div class="wrap">
      <span class="kicker">Kozhikode · Electoral Literacy Clubs</span>
      <h1>Your vote.<br><em>Your voice.</em><br>Get on the <u>roll.</u></h1>
      <p class="lead">Campus clubs across Kozhikode are going village to village, helping every eligible young person enrol as a voter. This is the live scoreboard of that movement.</p>
      <div class="row"><button class="btn xl" data-act="toBoard">See who's leading ↓</button>
        <a class="btn xl white" href="${ME ? '#/me' : '#/login'}">${ME ? 'My college dashboard' : 'College login'}</a></div>
      <div class="big-counter"><b data-count="${t.registered}">0</b><span>new voters enrolled</span></div>
    </div>
  </section>
  <div class="marquee" aria-hidden="true"><div>${[1, 2].map(() => html`<span>Enrol</span><span>★</span><span>Educate</span><span>★</span><span>Elevate</span><span>★</span><span>Every vote counts</span><span>★</span><span>Be voter ready</span><span>★</span>`)}</div></div>

  <section class="sec"><div class="wrap">
    <div class="tiles">
      <div class="tile t1"><i>🏫</i><b data-count="${t.colleges}">0</b><span>Clubs on board</span></div>
      <div class="tile t2"><i>🙌</i><b data-count="${t.volunteers}">0</b><span>Student volunteers</span></div>
      <div class="tile t3"><i>📣</i><b data-count="${t.addressed}">0</b><span>People addressed</span></div>
      <div class="tile t4"><i>🗓️</i><b data-count="${t.days_done}">0</b><span>Field days held</span></div>
      <div class="tile t5"><i>🏡</i><b>${n(t.villages_active)}<small style="font-size:1.2rem">/${n(t.villages_total)}</small></b><span>Villages reached</span></div>
      <div class="tile t6"><i>✅</i><b data-count="${t.verified_registered}">0</b><span>Officer-verified enrolments</span></div>
    </div>
  </div></section>

  <section class="sec dark" id="board"><div class="wrap">
    <h2>The leaderboard</h2>
    <p class="sub">Clubs earn points for every voter enrolled, every person reached, every volunteer on the ground and every village a village officer signs off. Live, every refresh.</p>
    <div id="podium"></div>
    <div class="tabs" role="tablist" id="sorts"></div>
    <label class="f" style="max-width:340px"><span class="sr" style="position:absolute;left:-9999px">Search clubs</span><input type="search" id="q" placeholder="🔍 Search a college…"></label>
    <div class="lb" id="lb"></div>
  </div></section>

  <section class="sec"><div class="wrap">
    <h2>Hall of fame</h2><p class="sub">Little trophies for big efforts.</p>
    <div class="awards" id="awards"></div>
  </div></section>

  <section class="sec" style="background:#fff;border-block:3px solid var(--ink)"><div class="wrap">
    <h2>Daily enrolment pulse</h2><p class="sub">Voters registered per field day (last ${BOARD.trend.length} active days).</p>
    <div id="trend"></div>
  </div></section>

  <section class="sec"><div class="wrap">
    <h2>Village coverage</h2><p class="sub">${t.villages_allotted} of ${t.villages_total} villages allotted · ${t.villages_active} visited · ${t.villages_verified} signed off by village officers.</p>
    <div class="legend"><span><i style="background:#fff;border-style:dashed"></i>Open</span><span><i style="background:var(--sun)"></i>Allotted</span><span><i style="background:var(--cyan)"></i>Volunteers visited</span><span><i style="background:var(--lime)"></i>Officer verified</span></div>
    <div id="villages"></div>
  </div></section>

  <footer class="foot"><div class="wrap how">
    <p><b>How points work:</b> <code>${BOARD.formula.registered} pts</code> per voter registered · <code>${BOARD.formula.addressed} pts</code> per person addressed · <code>${BOARD.formula.attended} pts</code> per volunteer-day attended · <code>${BOARD.formula.verifiedVillage} pts</code> per village acknowledged by its officer.</p>
    <p>Not registered yet? Turning 18? Use Form 6 on the Election Commission's Voters' Service Portal or ask any ELC volunteer to help you.</p>
    <p><a href="/admin">Staff console</a></p></div></footer>`);
  $('#q').addEventListener('input', e => { query = e.target.value.toLowerCase(); paintBoard(); });
  paintBoard(); paintExtras(); countUp(app);
}

function paintBoard() {
  const cs = BOARD.colleges;
  const key = sortKey;
  const sorted = [...cs].sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1) || a.rank - b.rank);
  const max = k => Math.max(1, ...cs.map(c => c[k] || 0));
  const mx = { score: max('score'), registered: max('registered') };
  show($('#sorts'), html`${Object.entries(SORTS).map(([k, [label]]) => html`<button class="tab ${k === sortKey ? 'on' : ''}" role="tab" aria-selected="${k === sortKey}" data-act="sort" data-k="${k}">${label}</button>`)}`);
  const podium = sorted.slice(0, 3);
  const ord = ['p1', 'p2', 'p3'], medals = ['🥇', '🥈', '🥉'];
  show($('#podium'), cs.length ? html`<div class="podium">${podium.map((c, i) => html`
    <div class="pod ${ord[i]}"><span class="medal">${medals[i]}</span><h3>${c.short_name}</h3>
      <div class="sc">${n(c[key] ?? 0)}<small>${SORTS[key][0].replace(/^\S+\s/, '')}</small></div>
      <div class="mini">${n(c.registered)} registered · ${n(c.addressed)} reached</div></div>`)}</div>` : html`<div class="empty" style="color:var(--ink)">No clubs have joined yet. Be the first!</div>`);
  const rows = sorted.filter(c => !query || c.name.toLowerCase().includes(query) || (c.short_name || '').toLowerCase().includes(query));
  const col = (k, label, v, extra = '') => html`<div class="c ${k === key ? 'on' : ''}"><small>${label}</small><b>${v}</b>${extra}</div>`;
  show($('#lb'), html`
    <div class="lbr head"><div>#</div><div>College</div><div>Registered</div><div>Addressed</div><div>Attendance</div><div>Villages ✔/total</div><div>Score</div></div>
    ${rows.length ? rows.map((c, i) => {
      const pos = sorted.indexOf(c) + 1;
      return html`<div class="lbr ${ME && ME.id === c.id ? 'me' : ''}"><div class="rk">${pos}</div>
        <div class="nm">${c.name}${ME && ME.id === c.id ? html` <span class="chip pink">YOU</span>` : ''}<small>${c.volunteers} volunteers · ${c.days_done}/${c.days_planned} days</small></div>
        ${col('registered', 'Registered', n(c.registered), html`<div class="bar"><i style="width:${Math.round(c.registered * 100 / mx.registered)}%"></i></div>`)}
        ${col('addressed', 'Addressed', n(c.addressed))}
        ${col('attendance_pct', 'Attendance', pct(c.attendance_pct))}
        ${col('villages_ack', 'Villages ✔', `${c.villages_ack}/${c.villages}`)}
        ${col('score', 'Score', n(c.score), html`<div class="bar"><i style="width:${Math.round(c.score * 100 / mx.score)}%;background:var(--pink)"></i></div>`)}
      </div>`; }) : html`<div class="empty" style="color:var(--ink)">No college matches “${query}”.</div>`}`);
}

function paintExtras() {
  const a = BOARD.awards;
  const items = [['📝', 'Registration Rocket', a.registrations, 'voters enrolled'], ['📣', 'Loudest Voice', a.outreach, 'people addressed'],
    ['🙌', 'Biggest Squad', a.volunteers, 'volunteers'], ['🏡', 'Village Champion', a.verified, 'villages verified'], ['🎯', 'Attendance Ace', a.attendance, '% turn-up']];
  show($('#awards'), html`${items.map(([e, t, w, u]) => html`<div class="award"><em>${e}</em><b>${t}</b>${w ? html`<div style="font-weight:800">${w.name}</div><small>${n(w.value)} ${u}</small>` : html`<small>Up for grabs!</small>`}</div>`)}`);
  const tr = BOARD.trend, mx = Math.max(1, ...tr.map(x => x.registered));
  show($('#trend'), tr.length ? html`<div class="chart" role="img" aria-label="Registrations per day">${tr.map(x => html`<div class="col" data-tip="${fdate(x.date)}: ${x.registered} registered, ${x.addressed} addressed"><i style="height:${Math.max(2, Math.round(x.registered * 100 / mx))}%"></i></div>`)}</div>
    <div class="row between small muted" style="margin-top:6px"><span>${fdate(tr[0].date)}</span><span>${fdate(tr.at(-1).date)}</span></div>` : html`<div class="empty">The first field day will light this up.</div>`);
  const by = {};
  BOARD.villages.forEach(v => (by[v.taluk || 'Other'] ||= []).push(v));
  show($('#villages'), html`${Object.entries(by).map(([tk, vs]) => html`<div class="vgroup"><h4>${tk} <span class="muted small">(${vs.length})</span></h4><div class="vchips">${vs.map(v => html`<span class="vc ${v.status}">${v.name}${v.status === 'verified' ? ' ✔' : ''}</span>`)}</div></div>`)}`);
}

// ---------------- college login ----------------
async function renderLogin() {
  show(app, html`<div class="login-bg"><div class="card"><h2 style="font-size:2rem;text-transform:uppercase">College login</h2>
    <p class="muted">Pick your club and enter the passcode emailed to your coordinator.</p><div class="center muted" id="lc">Loading colleges…</div></div></div>`);
  const list = await api('/api/public/colleges');
  show($('#lc'), html`<form data-form="login" class="stack" style="text-align:left">
    <label class="f"><span>Your college</span><select name="college_id" required><option value="">Select…</option>${list.map(c => html`<option value="${c.id}">${c.name}</option>`)}</select></label>
    <label class="f"><span>Passcode</span><input name="passcode" type="text" autocomplete="off" autocapitalize="characters" placeholder="e.g. K7M2-9XQP" required style="letter-spacing:.12em;font-weight:800;text-transform:uppercase"></label>
    <div data-err></div><button class="btn pink xl" type="submit" style="width:100%">Let me in →</button>
    <p class="small muted">No passcode? Ask your ELC nodal officer or the district admin to push it to your college email.</p></form>`);
  $('#lc').classList.remove('center', 'muted');
}
forms.login = async f => {
  await api('/api/auth/college', 'POST', fd(f));
  ME = await api('/api/college/me');
  toast(`Welcome, ${ME.name}! 🎉`);
  location.hash = '#/me';
};

boot();
