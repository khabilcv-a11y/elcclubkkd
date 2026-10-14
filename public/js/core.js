'use strict';
// ---- tiny helpers shared by the home/college page and the admin page ----
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
class Raw { constructor(s) { this.s = s; } }
const raw = s => new Raw(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// html`...` escapes every interpolated value unless it is raw() or an array of such
function html(strings, ...vals) {
  const f = v => v instanceof Raw ? v.s : Array.isArray(v) ? v.map(f).join('') : esc(v);
  return raw(strings.reduce((o, s, i) => o + s + (i < vals.length ? f(vals[i]) : ''), ''));
}
const show = (el, tpl) => { el.innerHTML = tpl instanceof Raw ? tpl.s : esc(tpl); };

const n = v => (v == null ? '—' : Number(v).toLocaleString('en-IN'));
const pct = v => (v == null ? '—' : v + '%');
const km = v => (v == null ? '—' : v + ' km');
const fdate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
const fdt = s => s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit' }) : '—';
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const addDays = (iso, k) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

let inflight = 0;
const busy = d => { inflight += d; document.body.classList.toggle('busy', inflight > 0); };
async function api(path, method = 'GET', body) {
  busy(1);
  try { return await apiCall(path, method, body); } finally { busy(-1); }
}
async function apiCall(path, method, body) {
  const r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : (method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : (method === 'GET' ? undefined : '{}'), credentials: 'same-origin' });
  if (!r.ok) {
    let d = {}; try { d = await r.json(); } catch {}
    const e = new Error(d.error || `Request failed (${r.status})`); e.status = r.status; e.data = d; throw e;
  }
  return r.headers.get('content-type')?.includes('json') ? r.json() : r.text();
}

function toast(msg, bad) {
  let box = $('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.append(box); }
  const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; box.append(t);
  setTimeout(() => t.remove(), bad ? 6000 : 3200);
}

function modal(content, { wide = false } = {}) {
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true">${content instanceof Raw ? content.s : esc(content)}</div>`;
  const close = () => { o.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  o.addEventListener('mousedown', e => { if (e.target === o) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(o);
  const f = $('input,select,textarea,button', o); if (f) f.focus();
  o.close = close;
  return o;
}
function confirmBox(message, okLabel = 'Yes, do it') {
  return new Promise(res => {
    const m = modal(html`<h3>Please confirm</h3><p>${message}</p><div class="row" style="justify-content:flex-end;margin-top:18px">
      <button class="btn white" data-x="0">Cancel</button><button class="btn pink" data-x="1">${okLabel}</button></div>`);
    m.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b) { m.close(); res(b.dataset.x === '1'); } });
  });
}

// delegated actions: <button data-act="name" data-id="1"> -> actions.name(el)
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
  const btn = $('button[type=submit]', f); if (btn) btn.disabled = true;
  const err = $('.err', f); if (err) err.remove();
  try { await forms[f.dataset.form](f, e); }
  catch (er) {
    const box = $('[data-err]', f);
    if (box) { box.innerHTML = `<div class="err" role="alert">${esc(er.message)}</div>`; } else handleErr(er);
  } finally { if (btn) btn.disabled = false; }
});
let onUnauth = () => {};
const setUnauth = fn => { onUnauth = fn; };
function handleErr(err) { if (err.status === 401) return onUnauth(err); toast(err.message || 'Something went wrong', true); }
const fd = form => Object.fromEntries(new FormData(form).entries());

function countUp(root = document) {
  $$('[data-count]', root).forEach(el => {
    const target = Number(el.dataset.count) || 0;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || target < 2) { el.textContent = n(target); return; }
    const t0 = performance.now(), dur = 1100;
    const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = n(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
const statusChip = s => ({ none: html`<span class="chip grey">In progress</span>`, submitted: html`<span class="chip warn">Awaiting officer</span>`, acknowledged: html`<span class="chip ok">✔ Acknowledged</span>` }[s] || '');
