'use strict';
// ---- college / school workspace: photo-frame editor and gallery ----
const FRAME = {
  landscape: { w: 1920, h: 1080, head: 150, foot: 150, slots: { 1: [[60, 176, 1800, 740]], 2: [[60, 176, 890, 740], [970, 176, 890, 740]] } },
  portrait: { w: 1080, h: 1350, head: 190, foot: 250, slots: { 1: [[50, 210, 980, 850]], 2: [[50, 210, 980, 415], [50, 645, 980, 415]] } },
};
const logoCache = {};
function loadLogo(src) { return logoCache[src] ||= new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
let ED = null;

// ---------- drawing (same code for the preview and the full-size JPG) ----------
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function fitText(c, text, maxW, size, weight = 800, min = 30) { let s = size; do { c.font = `${weight} ${s}px Inter, Arial, sans-serif`; if (c.measureText(text).width <= maxW) break; s -= 2; } while (s > min); return s; }
function slotGeom(slot, rect) {
  const [, , w, h] = rect, im = slot.img; if (!im) return null;
  const base = Math.max(w / im.width, h / im.height), sc = base * slot.zoom, dw = im.width * sc, dh = im.height * sc;
  const mx = Math.max(0, (dw - w) / 2), my = Math.max(0, (dh - h) / 2);
  slot.ox = Math.max(-mx, Math.min(mx, slot.ox)); slot.oy = Math.max(-my, Math.min(my, slot.oy));
  return { dw, dh };
}
function drawFrame(c, scale, ed, logos) {
  const F = FRAME[ed.orient], W = F.w, H = F.h, land = ed.orient === 'landscape';
  c.save(); c.scale(scale, scale);
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1c2162'); g.addColorStop(0.55, '#2b3078'); g.addColorStop(1, '#3a42a0'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(247,134,29,.18)'; c.beginPath(); c.arc(W, 0, land ? 360 : 300, 0, 7); c.fill(); c.fillStyle = 'rgba(10,159,76,.16)'; c.beginPath(); c.arc(0, H, land ? 320 : 280, 0, 7); c.fill();
  // header: logos on a white chip + title
  const hh = land ? 112 : 120, hy = 22, [d, sw, nv] = logos;
  const dh = hh - 24, dw = d ? d.width * dh / d.height : 0, sh = hh - 30, swd = sw ? sw.width * sh / sw.height : 0, chipW = 28 + dw + (d && sw ? 28 : 0) + swd + 28;
  c.fillStyle = '#fff'; rrect(c, 50, hy, chipW, hh, 22); c.fill();
  if (d) c.drawImage(d, 78, hy + 12, dw, dh);
  if (sw) c.drawImage(sw, 78 + dw + (d ? 28 : 0), hy + (hh - sh) / 2, swd, sh);
  c.textBaseline = 'alphabetic'; c.textAlign = 'right'; c.fillStyle = '#fff';
  if (land) { const nvW = nv ? nv.width * 118 / nv.height : 0; if (nv) { c.fillStyle = '#fff'; rrect(c, W - 50 - nvW - 20, hy, nvW + 20, hh, 22); c.fill(); c.drawImage(nv, W - 50 - nvW - 10, hy + 6, nvW, 100); }
    c.fillStyle = '#fff'; c.font = '800 60px Inter, Arial, sans-serif'; c.fillText('CAMPUS TO BOOTH', W - 50 - nvW - 50, hy + 62); c.fillStyle = '#ffb25b'; c.font = '700 27px Inter, Arial, sans-serif'; c.fillText('ELECTORAL LITERACY CLUBS · KOZHIKODE', W - 50 - nvW - 50, hy + 102); }
  else { c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '800 54px Inter, Arial, sans-serif'; c.fillText('CAMPUS TO BOOTH', 50, hy + hh + 52); c.fillStyle = '#ffb25b'; c.font = '700 24px Inter, Arial, sans-serif'; c.fillText('ELECTORAL LITERACY CLUBS · KOZHIKODE', 50, hy + hh + 88);
    if (nv) { const nvW = nv.width * 150 / nv.height; c.fillStyle = '#fff'; rrect(c, W - 50 - nvW - 20, hy, nvW + 20, 150, 22); c.fill(); c.drawImage(nv, W - 50 - nvW - 10, hy + 8, nvW, 134); } }
  // photo slots
  F.slots[ed.layout].forEach((rect, i) => {
    const [x, y, w, h] = rect, slot = ed.slots[i];
    c.save(); rrect(c, x, y, w, h, 28); c.clip();
    c.fillStyle = '#0f1340'; c.fillRect(x, y, w, h);
    const geo = slotGeom(slot, rect);
    if (geo) c.drawImage(slot.img, x + (w - geo.dw) / 2 + slot.ox, y + (h - geo.dh) / 2 + slot.oy, geo.dw, geo.dh);
    else if (!ed.exporting) { c.fillStyle = 'rgba(255,255,255,.55)'; c.textAlign = 'center'; c.font = '700 34px Inter, Arial, sans-serif'; c.fillText(ed.layout === 2 ? `Add photo ${i + 1}` : 'Add a photo', x + w / 2, y + h / 2); }
    c.restore(); c.lineWidth = 6; c.strokeStyle = '#fff'; rrect(c, x, y, w, h, 28); c.stroke();
  });
  // footer: event title + institution name
  const lastSlot = F.slots[ed.layout].at(-1), fy = lastSlot[1] + lastSlot[3] + 20, fh = H - fy - 18, cx = W / 2;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const name = (ed.inst || 'Your institution name').toUpperCase(), title = (ed.title || '').trim();
  const nameSize = fitText(c, name, W - 120, land ? 70 : 64, 800, 28);
  const hasTitle = !!title, blockH = nameSize + (hasTitle ? 54 : 0), top = fy + (fh - blockH) / 2;
  if (hasTitle) { fitText(c, title, W - 140, land ? 38 : 40, 700, 22); c.fillStyle = '#ffb25b'; c.fillText(title, cx, top + 20); }
  c.font = `800 ${nameSize}px Inter, Arial, sans-serif`; c.fillStyle = '#fff'; c.fillText(name, cx, top + (hasTitle ? 54 : 0) + nameSize / 2);
  c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '600 22px Inter, Arial, sans-serif'; c.fillText('Register to vote · voters.eci.gov.in · Helpline 1950', cx, H - 22);
  c.restore();
}
async function paintEditor() {
  const cv = $('#edcv'); if (!cv || !ED) return;
  const F = FRAME[ED.orient], pw = cv.clientWidth || 640, scale = pw / F.w;
  cv.width = Math.round(F.w * scale); cv.height = Math.round(F.h * scale); cv.style.aspectRatio = `${F.w} / ${F.h}`;
  const logos = await Promise.all(['/img/district.png', '/img/sweep-dark.webp', '/img/nvlb.png'].map(loadLogo));
  drawFrame(cv.getContext('2d'), cv.width / F.w, ED, logos);
}
// shrink big camera photos so editing stays smooth on phones
async function readPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(`${file.name} isn't a readable image`)); i.src = url; });
    const s = Math.min(1, 2400 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); return cv;
  } finally { URL.revokeObjectURL(url); }
}

// ---------- the editor dialog ----------
actions.newFrame = async () => {
  await document.fonts?.load?.('800 40px Inter').catch(() => {});
  ED = { orient: 'landscape', layout: 1, slots: [{ img: null, zoom: 1, ox: 0, oy: 0 }, { img: null, zoom: 1, ox: 0, oy: 0 }], inst: COL.college.name, title: '', active: 0 };
  const m = modal(html`<h2>Make a framed photo</h2>
    <div class="edgrid"><div class="edpreview"><canvas id="edcv" aria-label="Preview of the framed photo. Drag a photo to move it; pinch or scroll to zoom."></canvas><p class="hint">Drag a photo to move it. Pinch, scroll or use the zoom slider to fit it in the frame.</p></div>
      <form data-form="saveFrame" class="stack-s edform">
        <div class="formgrid"><label class="f"><span>Shape</span><select id="edorient"><option value="landscape">Landscape (1920 × 1080)</option><option value="portrait">Portrait (1080 × 1350)</option></select></label>
          <label class="f"><span>Photos</span><select id="edlayout"><option value="1">One photo</option><option value="2">Two photos</option></select></label></div>
        <div id="edslots"></div>
        <label class="f"><span>Institution name (shown on the frame)</span><input type="text" id="edinst" maxlength="90" value="${COL.college.name}"></label>
        <label class="f"><span>Event title (shown on the frame and in the gallery) *</span><input type="text" name="title" id="edtitle" maxlength="100" required placeholder="e.g. Help desk at the main block"></label>
        <div class="formgrid"><label class="f"><span>Activity</span><select name="activity" id="edact">${['Help desk', 'Flash Mob', 'Class to Class Campaign', 'Game Zone', 'Awareness rally', 'Other'].map(a => html`<option>${a}</option>`)}</select></label>
          <label class="f hide" id="edother"><span>Which activity?</span><input type="text" name="activity_other" maxlength="60"></label>
          <label class="f"><span>Date of the event</span><input type="date" name="event_date" max="${COL.today}" value="${COL.today}"></label></div>
        <label class="f"><span>Short description</span><textarea name="description" maxlength="500" rows="2" placeholder="What happened? How many students took part?"></textarea></label>
        <div data-err></div>
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Close</button><button type="button" class="btn secondary" data-act="frameDownload">${icon('download')} Download JPG</button><button class="btn primary" type="submit">${icon('upload')} Save to gallery</button></div></form></div>`, { wide: true });
  const root = m;
  const $r = s => $(s, root);
  $r('#edorient').addEventListener('change', e => { ED.orient = e.target.value; ED.slots.forEach(s => { s.ox = 0; s.oy = 0; }); paintEditor(); });
  $r('#edlayout').addEventListener('change', e => { ED.layout = Number(e.target.value); drawSlotControls(); paintEditor(); });
  $r('#edinst').addEventListener('input', e => { ED.inst = e.target.value; paintEditor(); });
  $r('#edtitle').addEventListener('input', e => { ED.title = e.target.value; paintEditor(); });
  $r('#edact').addEventListener('change', e => $r('#edother').classList.toggle('hide', e.target.value !== 'Other'));
  drawSlotControls(); wireCanvas(); setTimeout(paintEditor, 60);
  new ResizeObserver(() => paintEditor()).observe($r('.edpreview'));
};
function drawSlotControls() {
  const box = $('#edslots'); if (!box) return;
  show(box, html`${Array.from({ length: ED.layout }, (_, i) => html`<div class="edslot"><div class="row between"><b>${ED.layout === 2 ? `Photo ${i + 1}` : 'Photo'}</b><label class="btn secondary sm"><input type="file" accept="image/*" hidden data-pick="1" data-i="${i}">${icon('image')} ${ED.slots[i].img ? 'Change' : 'Choose'} photo</label></div>
      <label class="f"><span class="sr">Zoom</span><input type="range" min="1" max="3" step="0.01" value="${ED.slots[i].zoom}" data-i="${i}" class="edzoom" aria-label="Zoom photo ${i + 1}" ${ED.slots[i].img ? '' : 'disabled'}></label></div>`)}`);
}
document.addEventListener('change', async e => {
  const t = e.target; if (!t.matches?.('input[data-pick]') || !ED) return;
  const f = t.files[0]; if (!f) return;
  try { const i = Number(t.dataset.i); ED.slots[i] = { img: await readPhoto(f), zoom: 1, ox: 0, oy: 0 }; ED.active = i; drawSlotControls(); paintEditor(); } catch (err) { toast(err.message, true); }
});
document.addEventListener('input', e => { const t = e.target; if (!t.matches?.('.edzoom') || !ED) return; ED.slots[Number(t.dataset.i)].zoom = Number(t.value); paintEditor(); });

// drag, pinch and wheel on the preview
function wireCanvas() {
  const cv = $('#edcv'), pts = new Map(); let last = null, startDist = 0, startZoom = 1;
  const slotAt = ev => { const r = cv.getBoundingClientRect(), k = FRAME[ED.orient].w / r.width, x = (ev.clientX - r.left) * k, y = (ev.clientY - r.top) * k; const i = FRAME[ED.orient].slots[ED.layout].findIndex(([sx, sy, sw, sh]) => x >= sx && x <= sx + sw && y >= sy && y <= sy + sh); return { i, k }; };
  cv.style.touchAction = 'none'; cv.style.cursor = 'grab';
  cv.addEventListener('pointerdown', ev => { cv.setPointerCapture(ev.pointerId); pts.set(ev.pointerId, ev); const { i } = slotAt(ev); if (i >= 0) ED.active = i; last = { x: ev.clientX, y: ev.clientY }; if (pts.size === 2) { const [a, b] = [...pts.values()]; startDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); startZoom = ED.slots[ED.active].zoom; } });
  cv.addEventListener('pointermove', ev => {
    if (!pts.has(ev.pointerId)) return; pts.set(ev.pointerId, ev); const s = ED.slots[ED.active]; if (!s.img) return;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); s.zoom = Math.max(1, Math.min(3, startZoom * d / (startDist || d))); const sl = $(`.edzoom[data-i="${ED.active}"]`); if (sl) sl.value = s.zoom; }
    else if (last) { const k = FRAME[ED.orient].w / cv.getBoundingClientRect().width; s.ox += (ev.clientX - last.x) * k; s.oy += (ev.clientY - last.y) * k; last = { x: ev.clientX, y: ev.clientY }; }
    paintEditor();
  });
  const end = ev => { pts.delete(ev.pointerId); last = pts.size === 1 ? { x: [...pts.values()][0].clientX, y: [...pts.values()][0].clientY } : null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', ev => { const { i } = slotAt(ev); const s = ED.slots[i >= 0 ? i : ED.active]; if (!s?.img) return; ev.preventDefault(); s.zoom = Math.max(1, Math.min(3, s.zoom - ev.deltaY * 0.002)); const sl = $(`.edzoom[data-i="${i >= 0 ? i : ED.active}"]`); if (sl) sl.value = s.zoom; paintEditor(); }, { passive: false });
}

// ---------- export, download, save ----------
async function frameBlob() {
  const F = FRAME[ED.orient], cv = document.createElement('canvas'); cv.width = F.w; cv.height = F.h;
  const logos = await Promise.all(['/img/district.png', '/img/sweep-dark.webp', '/img/nvlb.png'].map(loadLogo));
  drawFrame(cv.getContext('2d'), 1, { ...ED, exporting: true }, logos);
  return new Promise(res => cv.toBlob(res, 'image/jpeg', 0.9));
}
const needPhoto = () => { if (!ED.slots.slice(0, ED.layout).every(s => s.img)) throw new Error(ED.layout === 2 ? 'Add both photos first' : 'Add a photo first'); };
const slug = s => String(s || 'photo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
actions.frameDownload = async () => {
  try { needPhoto(); const b = await frameBlob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `elc-${slug(ED.inst)}-${ED.orient}.jpg`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Downloaded'); } catch (e) { toast(e.message, true); }
};
const toB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Could not read the picture')); r.readAsDataURL(blob); });
forms.saveFrame = async f => {
  needPhoto(); const v = fd(f), blob = await frameBlob();
  await api('/api/college/gallery', 'POST', { title: v.title, description: v.description, activity: v.activity, activity_other: v.activity_other, event_date: v.event_date, orientation: ED.orient, mime: 'image/jpeg', name: `${slug(v.title)}.jpg`, data: await toB64(blob) });
  f.closest('.overlay').close(); ED = null; toast('Saved to your gallery'); reloadCol();
};

// ---------- the gallery page ----------
let GAL = null;
async function pgGallery(el) {
  GAL = await api('/api/college/gallery');
  show(el, html`${pageHead('Gallery', 'Make framed photos of your events, keep them here, and share them. The best appear on the public home page.', html`<button class="btn primary" data-act="newFrame">${icon('crop')} Make a framed photo</button>`, 'Campus to booth')}
    ${GAL.items.length ? html`<div class="galgrid">${GAL.items.map(g => html`<article class="galcard rv"><img src="/api/college/gallery/${g.id}/image" alt="${g.title}" loading="lazy"><div class="galbody"><h3>${g.title}</h3><div class="small muted">${g.activity} · ${fdate(g.event_date)}</div>${g.description ? html`<p class="small">${g.description}</p>` : ''}
        <div class="row gap-s" style="margin-top:10px"><a class="btn sm secondary" href="/api/college/gallery/${g.id}/image" download="elc-${slug(g.title)}.jpg">${icon('download')} Download</a><button class="btn sm green" data-act="shareGal" data-id="${g.id}">${icon('share')} WhatsApp</button><button class="btn sm danger" data-act="delGal" data-id="${g.id}" aria-label="Delete ${g.title}">${icon('trash')}</button></div></div></article>`)}</div>`
      : html`<div class="card">${empty('No photos yet', 'Tap "Make a framed photo", add your photo, type the event title and save it here.', 'image')}</div>`}`);
}
actions.delGal = async el => { if (!await confirmBox('Delete this photo from your gallery and from the public album?', 'Delete', true)) return; await api('/api/college/gallery/' + el.dataset.id, 'DELETE'); toast('Deleted'); reloadCol(); };
actions.shareGal = async el => {
  const g = GAL.items.find(x => x.id === Number(el.dataset.id)), text = `${g.title}${g.description ? ': ' + g.description : ''} (${GAL.institution}, Campus to Booth drive)`;
  try {
    const blob = await (await fetch(`/api/college/gallery/${g.id}/image`)).blob(), file = new File([blob], `elc-${slug(g.title)}.jpg`, { type: blob.type || 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = `/api/college/gallery/${g.id}/image`; a.download = `elc-${slug(g.title)}.jpg`; document.body.append(a); a.click(); a.remove();
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); toast('Photo downloaded. Attach it in WhatsApp.');
};
