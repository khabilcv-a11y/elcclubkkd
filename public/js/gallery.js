'use strict';
// ---- college / school workspace: photo-frame editor (your templates) and gallery ----
// Landscape uses the full template (frame-landscape.png, 1883 x 1080); portrait uses the bottom strip (frame-strip.webp) with the logo bar from the landscape template.
const STRIP = { w: 2000, h: 508, name: { x: 738, y: 259, w: 868, h: 117 }, act: { x: 736, y: 388, w: 814, h: 70 } };
const LAND = { w: 1883, h: 1080, name: { x: 830, y: 901, w: 534, h: 72 }, act: { x: 830, y: 980, w: 500, h: 43 }, chip: { w: 432, h: 118 } };
const FRAME = { landscape: { w: LAND.w, h: LAND.h }, portrait: { w: 1080, h: 1350 } };
const imgCache = {};
const loadImg = src => imgCache[src] ||= new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
let ED = null;

// ---------- text that always stays inside its box ----------
function wrap2(c, words, size) {   // best split of the words into two balanced lines
  c.font = `800 ${size}px Inter, Arial, sans-serif`;
  let best = null;
  for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(' '), b = words.slice(k).join(' '), w = Math.max(c.measureText(a).width, c.measureText(b).width); if (!best || w < best.w) best = { lines: [a, b], w }; }
  return best;
}
function drawInBox(c, text, box, o) {
  const t = String(text || '').trim().toUpperCase(); if (!t) return;
  const padX = box.w * 0.045, maxW = box.w - padX * 2, cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  c.save(); c.fillStyle = o.color; c.textAlign = 'center'; c.textBaseline = 'middle';
  const one = size => { c.font = `800 ${size}px Inter, Arial, sans-serif`; return c.measureText(t).width <= maxW; };
  let size = Math.floor(box.h * (o.lines === 2 ? 0.6 : 0.68));
  const floor1 = Math.floor(box.h * (o.lines === 2 ? 0.40 : 0.34));
  while (size > floor1 && !one(size)) size -= 1;
  if (one(size)) { c.fillText(t, cx, cy + size * 0.04); c.restore(); return; }
  const words = t.split(/\s+/);
  if (o.lines === 2 && words.length > 1) {
    // two lines, tight line spacing, shrink until both lines sit inside the shape
    for (let s = Math.floor(box.h * 0.46); s >= 8; s -= 1) {
      const w = wrap2(c, words, s), lh = s * 1.0;
      if (w && w.w <= maxW && lh * 2 <= box.h * 0.9) { c.font = `800 ${s}px Inter, Arial, sans-serif`; c.fillText(w.lines[0], cx, cy - lh / 2 + s * 0.04); c.fillText(w.lines[1], cx, cy + lh / 2 + s * 0.04); c.restore(); return; }
    }
  }
  // single long word, or a one-line box: shrink to fit the width
  let s = floor1; while (s > 8 && !one(s)) s -= 1; c.fillText(t, cx, cy); c.restore();
}

// ---------- the photo inside the whole frame ----------
function photoGeom(slot, W, H) {
  const im = slot.img; if (!im) return null;
  const sc = Math.max(W / im.width, H / im.height) * slot.zoom, dw = im.width * sc, dh = im.height * sc, mx = Math.max(0, (dw - W) / 2), my = Math.max(0, (dh - H) / 2);
  slot.ox = Math.max(-mx, Math.min(mx, slot.ox)); slot.oy = Math.max(-my, Math.min(my, slot.oy));
  return { dw, dh };
}
function drawFrame(c, scale, ed, art) {
  const land = ed.orient === 'landscape', W = FRAME[ed.orient].w, H = FRAME[ed.orient].h;
  c.save(); c.scale(scale, scale);
  c.fillStyle = '#e9ecf7'; c.fillRect(0, 0, W, H);
  const g = photoGeom(ed.slot, W, H);
  if (g) c.drawImage(ed.slot.img, (W - g.dw) / 2 + ed.slot.ox, (H - g.dh) / 2 + ed.slot.oy, g.dw, g.dh);
  else if (!ed.exporting) { c.fillStyle = '#7a82ad'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 54px Inter, Arial, sans-serif'; c.fillText('Add a photo', W / 2, H * 0.42); }
  let nameBox, actBox;
  if (land) {
    if (art.frame) c.drawImage(art.frame, 0, 0, W, H);
    nameBox = LAND.name; actBox = LAND.act;
  } else {
    const k = W / STRIP.w, sh = STRIP.h * k, y0 = H - sh;
    if (art.strip) c.drawImage(art.strip, 0, y0, W, sh);
    if (art.frame) { const q = 0.8; c.drawImage(art.frame, 0, 0, LAND.chip.w, LAND.chip.h, 0, 0, LAND.chip.w * q, LAND.chip.h * q); }
    const sc = b => ({ x: b.x * k, y: y0 + b.y * k, w: b.w * k, h: b.h * k });
    nameBox = sc(STRIP.name); actBox = sc(STRIP.act);
  }
  drawInBox(c, ed.inst || (ed.exporting ? '' : 'Your institution name'), nameBox, { color: '#1c2162', lines: 2 });
  drawInBox(c, ed.title || (ed.exporting ? '' : 'Activity title'), actBox, { color: '#d96a0b', lines: 1 });
  c.restore();
}
const artwork = async () => ({ frame: await loadImg('/img/frame-landscape.png'), strip: await loadImg('/img/frame-strip.webp') });
async function paintEditor() {
  const cv = $('#edcv'); if (!cv || !ED) return;
  const F = FRAME[ED.orient], pw = cv.clientWidth || 640, scale = pw / F.w;
  cv.width = Math.round(F.w * scale); cv.height = Math.round(F.h * scale); cv.style.aspectRatio = `${F.w} / ${F.h}`;
  drawFrame(cv.getContext('2d'), cv.width / F.w, ED, await artwork());
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
  ED = { orient: 'landscape', slot: { img: null, zoom: 1, ox: 0, oy: 0 }, inst: COL.college.name, title: '' };
  const m = modal(html`<h2>Make a framed photo</h2>
    <div class="edgrid"><div class="edpreview"><canvas id="edcv" aria-label="Preview of the framed photo. Drag the photo to move it; pinch or scroll to zoom."></canvas><p class="hint">Drag the photo to move it. Pinch, scroll or use the zoom slider to fit it in the frame.</p></div>
      <form data-form="saveFrame" class="stack-s edform">
        <label class="f"><span>Shape</span><select id="edorient"><option value="landscape">Landscape (1883 × 1080)</option><option value="portrait">Portrait (1080 × 1350)</option></select></label>
        <div class="edslot"><div class="row between"><b>Photo</b><label class="btn secondary sm"><input type="file" accept="image/*" hidden data-pick="1">${icon('image')} <span id="pickl">Choose photo</span></label></div>
          <label class="f"><span class="sr">Zoom</span><input type="range" min="1" max="3" step="0.01" value="1" id="edzoom" aria-label="Zoom the photo" disabled></label></div>
        <label class="f"><span>College or school name (shown on the frame)</span><input type="text" id="edinst" maxlength="120" value="${COL.college.name}"></label>
        <label class="f"><span>Activity title (shown on the frame and in the gallery) *</span><input type="text" name="title" id="edtitle" maxlength="60" required placeholder="e.g. Help desk at the main block"></label>
        <div class="formgrid"><label class="f"><span>Activity</span><select name="activity" id="edact">${['Help desk', 'Flash Mob', 'Class to Class Campaign', 'Game Zone', 'Awareness rally', 'Other'].map(a => html`<option>${a}</option>`)}</select></label>
          <label class="f hide" id="edother"><span>Which activity?</span><input type="text" name="activity_other" maxlength="60"></label>
          <label class="f"><span>Date of the event</span><input type="date" name="event_date" max="${COL.today}" value="${COL.today}"></label></div>
        <label class="f"><span>Short description</span><textarea name="description" maxlength="500" rows="2" placeholder="What happened? How many students took part?"></textarea></label>
        <div data-err></div>
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Close</button><button type="button" class="btn secondary" data-act="frameDownload">${icon('download')} Download JPG</button><button class="btn primary" type="submit">${icon('upload')} Save to gallery</button></div></form></div>`, { wide: true });
  const $r = s => $(s, m);
  $r('#edorient').addEventListener('change', e => { ED.orient = e.target.value; ED.slot.ox = 0; ED.slot.oy = 0; paintEditor(); });
  $r('#edinst').addEventListener('input', e => { ED.inst = e.target.value; paintEditor(); });
  $r('#edtitle').addEventListener('input', e => { ED.title = e.target.value; paintEditor(); });
  $r('#edact').addEventListener('change', e => $r('#edother').classList.toggle('hide', e.target.value !== 'Other'));
  $r('#edzoom').addEventListener('input', e => { ED.slot.zoom = Number(e.target.value); paintEditor(); });
  wireCanvas(); setTimeout(paintEditor, 60);
  new ResizeObserver(() => paintEditor()).observe($r('.edpreview'));
};
document.addEventListener('change', async e => {
  const t = e.target; if (!t.matches?.('input[data-pick]') || !ED) return;
  const f = t.files[0]; if (!f) return;
  try { ED.slot = { img: await readPhoto(f), zoom: 1, ox: 0, oy: 0 }; const z = $('#edzoom'); z.disabled = false; z.value = 1; $('#pickl').textContent = 'Change photo'; paintEditor(); } catch (err) { toast(err.message, true); }
});

// drag, pinch and wheel on the preview
function wireCanvas() {
  const cv = $('#edcv'), pts = new Map(); let last = null, startDist = 0, startZoom = 1;
  const setZoom = z => { ED.slot.zoom = Math.max(1, Math.min(3, z)); const sl = $('#edzoom'); if (sl) sl.value = ED.slot.zoom; };
  cv.style.touchAction = 'none'; cv.style.cursor = 'grab';
  cv.addEventListener('pointerdown', ev => { cv.setPointerCapture(ev.pointerId); pts.set(ev.pointerId, ev); last = { x: ev.clientX, y: ev.clientY }; if (pts.size === 2) { const [a, b] = [...pts.values()]; startDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); startZoom = ED.slot.zoom; } });
  cv.addEventListener('pointermove', ev => {
    if (!pts.has(ev.pointerId) || !ED.slot.img) return; pts.set(ev.pointerId, ev);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; setZoom(startZoom * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / (startDist || 1)); }
    else if (last) { const k = FRAME[ED.orient].w / cv.getBoundingClientRect().width; ED.slot.ox += (ev.clientX - last.x) * k; ED.slot.oy += (ev.clientY - last.y) * k; last = { x: ev.clientX, y: ev.clientY }; }
    paintEditor();
  });
  const end = ev => { pts.delete(ev.pointerId); last = pts.size === 1 ? { x: [...pts.values()][0].clientX, y: [...pts.values()][0].clientY } : null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', ev => { if (!ED.slot.img) return; ev.preventDefault(); setZoom(ED.slot.zoom - ev.deltaY * 0.002); paintEditor(); }, { passive: false });
}

// ---------- export, download, save ----------
async function frameBlob() {
  const F = FRAME[ED.orient], cv = document.createElement('canvas'); cv.width = F.w; cv.height = F.h;
  drawFrame(cv.getContext('2d'), 1, { ...ED, exporting: true }, await artwork());
  return new Promise(res => cv.toBlob(res, 'image/jpeg', 0.9));
}
const needPhoto = () => { if (!ED.slot.img) throw new Error('Add a photo first'); };
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
  show(el, html`${pageHead('Gallery', 'Make framed photos of your events, keep them here, and share them. They also appear on the public home page.', html`<button class="btn primary" data-act="newFrame">${icon('crop')} Make a framed photo</button>`, 'Campus to booth')}
    ${GAL.items.length ? html`<div class="galgrid">${GAL.items.map(g => html`<article class="galcard rv"><img src="/api/college/gallery/${g.id}/image" alt="${g.title}" loading="lazy"><div class="galbody"><h3>${g.title}</h3><div class="small muted">${g.activity} · ${fdate(g.event_date)}</div>${g.description ? html`<p class="small">${g.description}</p>` : ''}
        <div class="row gap-s" style="margin-top:10px"><a class="btn sm secondary" href="/api/college/gallery/${g.id}/image" download="elc-${slug(g.title)}.jpg">${icon('download')} Download</a><button class="btn sm green" data-act="shareGal" data-id="${g.id}">${icon('share')} WhatsApp</button><button class="btn sm danger" data-act="delGal" data-id="${g.id}" aria-label="Delete ${g.title}">${icon('trash')}</button></div></div></article>`)}</div>`
      : html`<div class="card">${empty('No photos yet', 'Tap "Make a framed photo", add your photo, type the activity title and save it here.', 'image')}</div>`}`);
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
