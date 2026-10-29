'use strict';
// ---- shared toolkit: templating, API, icons, modals, toasts, animations, accessibility panel ----
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
class Raw { constructor(s) { this.s = s; } }
const raw = s => new Raw(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// html`...` escapes every interpolated value unless it is raw() / html`` or an array of those
function html(strings, ...vals) {
  const f = v => v instanceof Raw ? v.s : Array.isArray(v) ? v.map(f).join('') : esc(v);
  return raw(strings.reduce((o, s, i) => o + s + (i < vals.length ? f(vals[i]) : ''), ''));
}
const show = (el, tpl) => { if (!el) return; el.innerHTML = tpl instanceof Raw ? tpl.s : esc(tpl); reveal(el); };

const n = v => (v == null ? '—' : Number(v).toLocaleString('en-IN'));
const pct = v => (v == null ? '—' : v + '%');
const km = v => (v == null ? '—' : v + ' km');
const fdate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
const fdateLong = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
const fdt = s => s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit' }) : '—';
const ago = s => { const m = Math.round((Date.now() - new Date(s)) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const todayISO = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);   // India date
const addDays = (iso, k) => new Date(Date.parse(iso + 'T00:00:00Z') + k * 864e5).toISOString().slice(0, 10);
const logoUrl = (id, v) => `/api/logo/${id}?v=${encodeURIComponent(v)}`;
// round logo of a college or school, or its initials when it has none
const avatar = (id, v, name, size = 36) => (v ? html`<img class="av" src="${logoUrl(id, v)}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px" loading="lazy">` : html`<span class="av ini" aria-hidden="true" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px">${initials(name)}</span>`);
const initials = s => String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

// ---------- icons (outline, 24px grid) ----------
const ICONS = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.7l6.8-4M8.6 13.3l6.8 4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/>',
  crop: '<path d="M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.4 0 4 1.8 4 4.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  check: '<path d="M5 12l5 5L20 7"/>', 'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  'map-pin': '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21h4"/>',
  megaphone: '<path d="M3 11v3h4l8 4V7L7 11z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7"/><path d="M12 17h.01"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  book: '<path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z"/><path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>', filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  logout: '<path d="M9 4H4v16h5M16 8l4 4-4 4M20 12H9"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 21l5-3 5 3-1.5-7"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>', trend: '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
  building: '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6M9 11h.01M15 11h.01"/>',
  landmark: '<path d="M3 10l9-6 9 6M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  'chevron-right': '<path d="M9 5l7 7-7 7"/>', 'chevron-down': '<path d="M5 9l7 7 7-7"/>', 'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>', 'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  printer: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>', refresh: '<path d="M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  accessibility: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8h14M12 8v6M8.5 21l3.5-7 3.5 7"/>', contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  type: '<path d="M4 7V5h16v2M12 5v14M9 19h6"/>', zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  grid: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>', message: '<path d="M4 5h16v12H8l-4 4z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', certificate: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 9h8M8 13h5M9 17l-1 4 4-2 4 2-1-4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', sort: '<path d="M8 4v16M4 16l4 4 4-4M16 20V4M12 8l4-4 4 4"/>', folder: '<path d="M3 6h7l2 3h9v11H3z"/>',
  pin: '<path d="M12 21v-7M8 3h8l-1 6 3 4H6l3-4z"/>', 'user-check': '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7 1.5 0 2.8.4 4 1.1M16 17l2 2 4-4"/>',
};
const icon = (name, cls = '') => raw(`<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`);

// ---------- reusable pieces ----------
const kpi = (label, value, { sub = '', ic = 'chart', tone = '', count = true } = {}) => html`<div class="kpi t-${tone} rv"><span class="ico">${icon(ic)}</span><div class="l">${label}</div>
  <div class="v">${count && typeof value === 'number' ? html`<span data-count="${value}">0</span>` : value}</div>${sub ? html`<div class="s">${sub}</div>` : ''}</div>`;
const empty = (title, text = '', ic = 'folder') => html`<div class="empty">${icon(ic)}<b>${title}</b>${text}</div>`;
const badge = (text, tone = '') => html`<span class="badge ${tone}">${text}</span>`;
const ackBadge = s => ({ none: badge('In progress', 'grey'), submitted: badge('Awaiting officer', 'warn'), acknowledged: badge(html`${icon('check')} Certified`, 'ok') }[s] || '');
const pageHead = (title, sub = '', actions = '', crumb = '') => html`<div class="page-head"><div>${crumb ? html`<div class="crumb">${crumb}</div>` : ''}<h1>${title}</h1>${sub ? html`<p>${sub}</p>` : ''}</div>${actions ? html`<div class="row">${actions}</div>` : ''}</div>`;
const progress = (v, tone = '') => html`<div class="progress ${tone}" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;

// ---------- API ----------
let inflight = 0;
const busy = d => { inflight += d; document.body.classList.toggle('busy', inflight > 0); };
async function api(path, method = 'GET', body) {
  busy(1);
  try { return await apiCall(path, method, body); } finally { busy(-1); }
}
// ---------- session watch: quiet renewal while someone works, a warning 3 minutes before it ends ----------
let SESS_END = 0, SESS_TOTAL = 0, sessTimer = null, warnTimer = null, lastTouch = Date.now();
['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { lastTouch = Date.now(); }, { passive: true }));
function sessSeen(left) {
  SESS_END = Date.now() + left * 1000; SESS_TOTAL = Math.max(SESS_TOTAL, left);
  if (!sessTimer) sessTimer = setInterval(sessTick, 15000);
  if (left > 190) hideSessWarn();
}
function sessClear() { SESS_END = 0; SESS_TOTAL = 0; hideSessWarn(); }
function sessTick() {
  if (!SESS_END) return; const left = (SESS_END - Date.now()) / 1000;
  if (left > 0 && Date.now() - lastTouch < 5 * 60000 && left < SESS_TOTAL * 0.6) { apiCall('/api/session/extend', 'POST').catch(() => {}); return; }   // still working: renew quietly
  if (left > 0 && left <= 180) showSessWarn(); else if (left <= 0) { hideSessWarn(); SESS_END = 0; onUnauth({ status: 401 }); }
}
function showSessWarn() {
  if (document.getElementById('sessWarn')) return;
  const el = document.createElement('div'); el.id = 'sessWarn'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-live', 'assertive'); el.setAttribute('aria-label', 'Session about to end');
  el.innerHTML = '<b>Your session is about to end</b><p>You will be signed out in <b id="sessLeft"></b> because there has been no activity.</p><div class="row"><button class="btn primary sm" data-act="sessStay">Stay signed in</button><button class="btn ghost sm" data-act="signout">Sign out</button></div>';
  document.body.append(el);
  const paint = () => { const s = Math.max(0, Math.round((SESS_END - Date.now()) / 1000)), t = document.getElementById('sessLeft'); if (t) t.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  paint(); warnTimer = setInterval(paint, 1000); el.querySelector('[data-act=sessStay]').focus();
}
function hideSessWarn() { clearInterval(warnTimer); document.getElementById('sessWarn')?.remove(); }
async function apiCall(path, method, body) {
  const r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : (method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : (method === 'GET' ? undefined : '{}'), credentials: 'same-origin' });
  const left = r.headers.get('X-Session-Left'); if (left) sessSeen(Number(left));
  if (/\/logout$/.test(path)) sessClear();
  if (!r.ok) {
    let d = {}; try { d = await r.json(); } catch {}
    const e = new Error(d.error || `Request failed (${r.status})`); e.status = r.status; e.data = d; throw e;
  }
  return r.headers.get('content-type')?.includes('json') ? r.json() : r.text();
}

// ---------- toasts, live announcements, modals ----------
function toast(msg, bad) {
  let box = $('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
  const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : '');
  t.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[bad ? 'alert' : 'check-circle']}</svg><span></span>`; $('span', t).textContent = msg; box.append(t);
  setTimeout(() => t.remove(), bad ? 6500 : 3400);
}
function announce(msg) { const l = $('#live'); if (l) { l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 50); } }

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function modal(content, { wide = false, label = '' } = {}) {
  const prev = document.activeElement;
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true">${content instanceof Raw ? content.s : esc(content)}</div>`;
  const box = $('.modal', o), h = $('h2', box);
  if (h) { h.id = 'mt' + Date.now(); box.setAttribute('aria-labelledby', h.id); } else if (label) box.setAttribute('aria-label', label);
  const close = () => { o.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  const onKey = e => {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    const f = $$(FOCUSABLE, box).filter(x => x.offsetParent !== null); if (!f.length) return;
    const first = f[0], last = f.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  o.addEventListener('mousedown', e => { if (e.target === o) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(o);
  const f = $('input:not([type=hidden]),select,textarea', box) || $('button', box); if (f) f.focus();
  o.close = close;
  return o;
}
function confirmBox(message, okLabel = 'Yes, continue', danger = false) {
  return new Promise(res => {
    const m = modal(html`<h2>Please confirm</h2><p>${message}</p><div class="row" style="justify-content:flex-end;margin-top:20px">
      <button class="btn secondary" data-x="0">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-x="1">${okLabel}</button></div>`);
    m.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b) { m.close(); res(b.dataset.x === '1'); } });
  });
}

// ---------- delegated actions / forms ----------
const actions = {}, forms = {};
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]');
  if (!el || !actions[el.dataset.act]) return;
  try { await actions[el.dataset.act](el, e); } catch (err) { handleErr(err); }
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-form]');
  if (!f || !forms[f.dataset.form]) return;
  e.preventDefault();
  const btn = e.submitter || $('button[type=submit]', f); if (btn) btn.disabled = true;
  $$('[data-err]', f).forEach(x => { x.innerHTML = ''; });
  try { await forms[f.dataset.form](f, e); }
  catch (er) { const box = $('[data-err]', f); if (box) { box.innerHTML = `<div class="alert err" role="alert">${esc(er.message)}</div>`; } else handleErr(er); }
  finally { if (btn) btn.disabled = false; }
});
let onUnauth = () => {};
const setUnauth = fn => { onUnauth = e => { sessClear(); fn(e); }; };
actions.sessStay = async () => { await apiCall('/api/session/extend', 'POST'); hideSessWarn(); toast('You are still signed in'); };
function handleErr(err) { if (err.status === 401) return onUnauth(err); toast(err.message || 'Something went wrong', true); }
const fd = form => Object.fromEntries(new FormData(form).entries());
actions.closeModal = el => el.closest('.overlay').close();
actions.dropdown = el => { const d = el.closest('.dropdown'); d.classList.toggle('open'); el.setAttribute('aria-expanded', d.classList.contains('open')); };
document.addEventListener('click', e => { if (!e.target.closest('.dropdown')) $$('.dropdown.open').forEach(d => { d.classList.remove('open'); $('[aria-expanded]', d)?.setAttribute('aria-expanded', 'false'); }); });

// ---------- gentle motion ----------
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a-nomotion');
let io = null;
function reveal(root = document) {
  const els = $$('.rv:not(.in)', root);
  if (!els.length) { animate(root); return; }
  if (reduced() || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); animate(root); return; }
  io ||= new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); animate(x.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e, i) => { if (!/\bd\d\b/.test(e.className)) e.classList.add('d' + (i % 4 + 1)); io.observe(e); });
  animate(root);
}
function animate(root) {
  $$('[data-count]:not([data-done])', root).forEach(el => {
    const vis = el.closest('.rv'); if (vis && !vis.classList.contains('in') && !reduced()) return;
    el.dataset.done = 1;
    const target = Number(el.dataset.count) || 0;
    if (reduced() || target < 2) { el.textContent = n(target); return; }
    const t0 = performance.now(), dur = 1000;
    const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = n(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  requestAnimationFrame(() => { $$('[data-w]', root).forEach(el => { el.style.width = el.dataset.w + '%'; }); $$('[data-h]', root).forEach(el => { el.style.height = el.dataset.h + '%'; }); });
}
const countUp = animate;

// ---------- small helpers ----------
function sortTable(table) {   // click a header with data-k to sort the rows client-side
  $$('th[data-k]', table).forEach(th => {
    th.classList.add('sortable'); th.tabIndex = 0; th.setAttribute('role', 'columnheader');
    const go = () => {
      const k = +th.dataset.k, asc = th.getAttribute('aria-sort') !== 'ascending', body = $('tbody', table);
      const rows = $$('tr', body).sort((a, b) => { const x = a.cells[k].dataset.v ?? a.cells[k].textContent.trim(), y = b.cells[k].dataset.v ?? b.cells[k].textContent.trim();
        const nx = parseFloat(x), ny = parseFloat(y); const c = !isNaN(nx) && !isNaN(ny) ? nx - ny : String(x).localeCompare(String(y), undefined, { numeric: true }); return asc ? c : -c; });
      rows.forEach(r => body.append(r)); $$('th', table).forEach(h => h.removeAttribute('aria-sort')); th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
    };
    th.addEventListener('click', go); th.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
}
function download(name, text, type = 'text/csv') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); a.remove(); }
const csvCell = v => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCsv = (head, rows) => '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');

// ---------- accessibility panel ----------
const A11Y = (() => { try { return JSON.parse(localStorage.getItem('elc-a11y') || '{}'); } catch { return {}; } })();
function applyA11y() {
  const h = document.documentElement;
  h.style.setProperty('--fs', (A11Y.size || 16) + 'px');
  h.classList.toggle('a-hc', !!A11Y.hc); h.classList.toggle('a-links', !!A11Y.links); h.classList.toggle('a-readable', !!A11Y.readable); h.classList.toggle('a-nomotion', !!A11Y.nomotion);
  if (A11Y.readable && !$('#font-read')) { const l = document.createElement('link'); l.id = 'font-read'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap'; document.head.append(l); }
  try { localStorage.setItem('elc-a11y', JSON.stringify(A11Y)); } catch {}
}
function initA11y() {
  if ($('.a11y-fab')) return;
  const btn = document.createElement('button'); btn.className = 'a11y-fab'; btn.setAttribute('aria-label', 'Accessibility options'); btn.setAttribute('aria-expanded', 'false'); btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS.accessibility}</svg>`;
  document.body.append(btn);
  const live = document.createElement('div'); live.id = 'live'; live.className = 'sr'; live.setAttribute('aria-live', 'polite'); document.body.append(live);
  btn.addEventListener('click', () => {
    const open = $('.a11y-panel');
    if (open) { open.remove(); btn.setAttribute('aria-expanded', 'false'); btn.focus(); return; }
    const p = document.createElement('div'); p.className = 'a11y-panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Accessibility options');
    const sw = (k, label) => `<label class="opt"><span>${label}</span><span class="switch"><input type="checkbox" data-k="${k}" ${A11Y[k] ? 'checked' : ''}><i></i></span></label>`;
    p.innerHTML = `<h2>Accessibility</h2>
      <div class="opt"><span>Text size</span><span class="row gap-s nowrap"><button class="btn sm secondary" data-s="-1" aria-label="Smaller text">A−</button><button class="btn sm secondary" data-s="0" aria-label="Normal text size">A</button><button class="btn sm secondary" data-s="1" aria-label="Larger text">A+</button></span></div>
      ${sw('hc', 'High contrast')}${sw('readable', 'Easy-to-read font')}${sw('links', 'Underline all links')}${sw('nomotion', 'Pause animations')}
      <div class="row between" style="margin-top:12px"><button class="btn sm ghost" data-reset>Reset</button><button class="btn sm secondary" data-close>Close</button></div>`;
    document.body.append(p); btn.setAttribute('aria-expanded', 'true'); $('button', p).focus();
    p.addEventListener('click', e => {
      const s = e.target.closest('[data-s]'); if (s) { const cur = A11Y.size || 16, d = +s.dataset.s; A11Y.size = d === 0 ? 16 : Math.max(14, Math.min(24, cur + d * 2)); applyA11y(); }
      if (e.target.closest('[data-reset]')) { Object.keys(A11Y).forEach(k => delete A11Y[k]); applyA11y(); $$('input[data-k]', p).forEach(i => { i.checked = false; }); }
      if (e.target.closest('[data-close]')) { p.remove(); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
    p.addEventListener('change', e => { const k = e.target.dataset.k; if (k) { A11Y[k] = e.target.checked; applyA11y(); } });
    p.addEventListener('keydown', e => { if (e.key === 'Escape') { p.remove(); btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });
  });
}
document.addEventListener('DOMContentLoaded', () => { applyA11y(); initA11y(); });
if (document.readyState !== 'loading') { applyA11y(); initA11y(); }

// section switches set by the super admin (loaded once at start)
let FEAT = null;
async function loadFeatures() { try { FEAT = await api('/api/features'); } catch { FEAT = null; } }
const feat = (aud, id) => !FEAT || FEAT[aud]?.[id] !== false;

// Student certificates for one certified village (data from /certificates/...): preview in a dialog, print them all at once
function showCertificates(d) {
  const head = html`<div class="lg"><img src="${LOGO.district}" alt=""><img src="${LOGO.sweepDark}" alt=""></div>`;
  const year = d.officer.certified_at ? new Date(d.officer.certified_at).getFullYear() : new Date().getFullYear();
  const span = d.period.from ? `${new Date(d.period.from + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} to ${new Date(d.period.to + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : '';
  if (!d.students.length) return modal(html`<h2>Student certificates</h2><p>No student has an attended, undisputed field day in ${d.village}, so there are no certificates to print.</p><div class="row" style="justify-content:flex-end"><button class="btn primary" data-act="closeModal">OK</button></div>`);
  modal(html`<h2 class="noprint">Student certificates: ${d.village}</h2><p class="small muted noprint" style="margin-bottom:10px">${d.students.length} eligible student${d.students.length > 1 ? 's' : ''}, certified by ${d.officer.name || 'the village officer'} (${d.cert_no}). Each student gets one page.</p>
    <div class="row noprint" style="justify-content:flex-end;margin-bottom:12px"><button class="btn primary" data-act="doPrint">${icon('printer')} Print all (${d.students.length} page${d.students.length > 1 ? 's' : ''})</button><button class="btn secondary" data-act="closeModal">Close</button></div>
    ${d.students.map(s => html`<div class="cert" style="margin-top:20px">${head}<div style="letter-spacing:.3em;font-size:.8rem">DISTRICT ELECTION OFFICE · KOZHIKODE</div><h1>Certificate of Participation</h1><p>This is to certify that</p><div class="nm">${s.name}</div>
      <p>of <b>${d.college}</b> took part in the Electoral Literacy Club voter-awareness and enrolment drive in <b>${d.village}</b> village for <b>${s.days_attended}</b> field day${s.days_attended > 1 ? 's' : ''}${span ? `, between ${span}` : ''}, reaching <b>${n(s.addressed)}</b> people and helping <b>${n(s.registered)}</b> citizens register as voters.</p>
      <p class="small">Participation certified by the Village Officer, ${d.village}. Certificate No. ${s.no} · ${year}</p>
      <div class="sig"><div>${d.officer.name || 'Village Officer'}<br><small>${d.officer.designation || 'Village Officer'}, ${d.village}</small></div><div>District Collector &amp; District Election Officer</div></div></div>`)}`, { wide: true });
}
actions.doPrint = () => { document.body.classList.add('pc'); window.print(); setTimeout(() => document.body.classList.remove('pc'), 500); };

// ---------- logos + the workspace frame used by the college, officer and staff consoles ----------
const LOGO = { nvlb: '/img/nvlb.png', sweepDark: '/img/sweep-dark.webp', sweepWhite: '/img/sweep-white.webp', district: '/img/district.png' };
// nav = [{ group: 'Title', items: [{ id, label, icon, count }] }]; base = '#/me' etc.
function consoleShell({ product, who, role, nav, active, base, content, extra = '', avatarUrl = '' }) {
  const tkind = base === '#/me' ? 'college' : base === '#/officer' ? 'officer' : 'staff';
  if (typeof maybeTour === 'function') maybeTour(tkind, who, role);
  const items = g => g.items.map(i => html`<a class="nav" href="${base}/${i.id}" ${i.id === active ? 'aria-current="page"' : ''}>${icon(i.icon)}<span>${i.label}</span>${i.count ? html`<span class="count" aria-label="${i.count} new">${i.count}</span>` : ''}</a>`);
  return html`<header class="topbar" data-tour-kind="${tkind}" data-tour-who="${who}" data-tour-role="${role}"><div class="wrap"><a class="brand" href="${base}/${nav[0].items[0].id}"><img src="${LOGO.district}" alt="District Administration Kozhikode" style="height:36px"><span class="sep"></span><img src="${LOGO.sweepDark}" alt="SWEEP Kozhikode" style="height:32px"><span class="sep"></span><span><b>${product}</b><small>Electoral Literacy Clubs</small></span></a><span class="spacer"></span>${extra}
      <span class="userchip">${avatarUrl ? html`<img class="avatar" src="${avatarUrl}" alt="">` : html`<span class="avatar" aria-hidden="true">${initials(who)}</span>`}<span class="who"><b>${who}</b><br><small class="muted">${role}</small></span></span>
      <button class="btn secondary sm" data-act="tour">${icon('help')}<span>Tour</span></button>${typeof ME !== 'undefined' && ME.kind === 'college' ? html`<button class="btn secondary sm" data-act="logoModal">${icon('image')}<span>Logo</span></button><button class="btn secondary sm" data-act="changePw">${icon('key')}<span>Password</span></button>` : ''}
      <button class="btn secondary sm" data-act="signout">${icon('logout')}<span>Sign out</span></button></div></header>
    <div class="shell"><nav class="side" aria-label="Workspace">${nav.map(g => html`${g.group ? html`<h4>${g.group}</h4>` : ''}${items(g)}`)}</nav>
    <main id="main" class="main page-in" tabindex="-1">${content}</main></div>`;
}
