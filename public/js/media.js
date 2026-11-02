'use strict';
// ---- shared picture tools: reading photos, thumbnails, fitting text into boxes, drawing templates, PDF export, copy link ----
const imgCache = {};
const loadImg = src => imgCache[src] ||= new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const slug = s => String(s || 'photo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const toB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Could not read the file')); r.readAsDataURL(blob); });
function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
async function copyText(text, done = 'Copied') {
  try { await navigator.clipboard.writeText(text); }
  catch { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch {} t.remove(); }
  toast(done);
}
const portalLink = path => location.origin + '/#/' + path;
actions.copyRes = el => copyText(portalLink('resource/' + el.dataset.id), 'Link copied');

// shrink big camera photos so editing stays smooth on phones
async function readPhoto(file, max = 2400) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(`${file.name} isn't a readable image`)); i.src = url; });
    const s = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); return cv;
  } finally { URL.revokeObjectURL(url); }
}
// a small picture kept in the sheet so galleries and lists open instantly (source: a blob, or a canvas)
async function thumbB64(src, widths = [[520, 0.7], [440, 0.65], [360, 0.6], [300, 0.55]]) {
  const im = src instanceof Blob ? await createImageBitmap(src) : src;
  for (const [w, q] of widths) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = Math.max(1, Math.round(w * im.height / im.width));
    const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(im, 0, 0, cv.width, cv.height);
    const out = cv.toDataURL('image/jpeg', q).split(',')[1];
    if (out.length <= 40000) return out;
  }
  return null;
}
// a preview picture for an uploaded file: the picture itself, or the first page of a PDF; other files get a type tile on the page
let pdfLib = null;
const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.append(s); });
async function fileThumb(file) {
  try {
    if (/^image\/(png|jpeg|webp)$/.test(file.type)) return await thumbB64(await readPhoto(file, 700), [[360, 0.7], [300, 0.6], [240, 0.55]]);
    if (file.type === 'application/pdf') {
      pdfLib ||= (async () => { await loadScript('/vendor/pdfjs/pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js'; return window.pdfjsLib; })();
      const lib = await pdfLib, doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, page = await doc.getPage(1);
      const vp0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: 420 / vp0.width }), cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: c, viewport: vp }).promise;
      return await thumbB64(cv, [[360, 0.72], [300, 0.62], [240, 0.55]]);
    }
  } catch { /* no preview: the page shows a type tile instead */ }
  return null;
}
// the coloured tile shown when a file has no picture preview
const fileKind = (name, mime) => { const e = String(name || '').split('.').pop().toLowerCase(); return /pdf/.test(e) ? ['PDF', '#c0392b'] : /docx?/.test(e) ? ['DOC', '#2b579a'] : /xlsx?|csv/.test(e) ? [e.toUpperCase().slice(0, 4), '#1d7a46'] : /pptx?/.test(e) ? ['PPT', '#c25b1a'] : e === 'zip' ? ['ZIP', '#6d5c8f'] : /png|jpe?g|webp/.test(e) ? ['IMG', '#2b8a9e'] : e === 'txt' ? ['TXT', '#5d6588'] : ['FILE', '#5d6588']; };
const fileTile = (name, mime, link) => { const [t, c] = link ? ['LINK', '#2b3078'] : fileKind(name, mime); return html`<span class="ftile" style="--fc:${c}" aria-hidden="true"><b>${t}</b></span>`; };

// ---------- text that always stays inside its box ----------
function wrapWords(c, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && c.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
function fitText(c, text, box, o) {
  let t = String(text || '').trim(); if (!t) return;
  if (o.caps) t = t.toUpperCase();
  const pad = Math.min(box.w * 0.03, 14), maxW = box.w - pad * 2, maxLines = o.lines || 1, weight = o.weight || 800, family = 'Inter, Arial, sans-serif';
  let size = Math.floor(box.h / (maxLines > 1 ? maxLines * 1.08 : 1.15)), lines = null;
  for (; size >= 8; size -= size > 160 ? 3 : 1) {
    c.font = `${weight} ${size}px ${family}`;
    const ls = wrapWords(c, t, maxW);
    if (ls.length <= maxLines && ls.length * size * 1.12 <= box.h && ls.every(l => c.measureText(l).width <= maxW)) { lines = ls; break; }
  }
  if (!lines) { size = 8; c.font = `${weight} 8px ${family}`; lines = wrapWords(c, t, maxW).slice(0, maxLines); }
  c.save(); c.fillStyle = o.color || '#1c2162'; c.textBaseline = 'middle'; c.textAlign = o.align || 'center';
  const x = o.align === 'left' ? box.x + pad : o.align === 'right' ? box.x + box.w - pad : box.x + box.w / 2, lh = size * 1.12, y0 = box.y + (box.h - lines.length * lh) / 2 + lh / 2;
  lines.forEach((l, i) => c.fillText(l, x, y0 + i * lh + size * 0.04));
  c.restore();
}

// ---------- the photo inside a whole frame ----------
function photoGeom(slot, W, H) {
  const im = slot.img; if (!im) return null;
  const sc = Math.max(W / im.width, H / im.height) * slot.zoom, dw = im.width * sc, dh = im.height * sc, mx = Math.max(0, (dw - W) / 2), my = Math.max(0, (dh - H) / 2);
  slot.ox = Math.max(-mx, Math.min(mx, slot.ox)); slot.oy = Math.max(-my, Math.min(my, slot.oy));
  return { dw, dh };
}

// ---------- a template drawn onto a canvas (1 unit = 1 pixel of the template image) ----------
// st: { img: template picture, photo: {img,zoom,ox,oy} | null, values: {fieldId: text}, logo: Image | null, exporting: bool }
function drawTemplate(c, t, st) {
  const W = t.width, H = t.height;
  if (t.kind === 'photo') {
    c.fillStyle = '#e9ecf7'; c.fillRect(0, 0, W, H);
    const g = st.photo && photoGeom(st.photo, W, H);
    if (g) c.drawImage(st.photo.img, (W - g.dw) / 2 + st.photo.ox, (H - g.dh) / 2 + st.photo.oy, g.dw, g.dh);
    else if (!st.exporting) { c.fillStyle = '#7a82ad'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `800 ${Math.round(H * 0.05)}px Inter, Arial, sans-serif`; c.fillText('Add a photo', W / 2, H * 0.42); }
  } else { c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); }
  if (st.img) c.drawImage(st.img, 0, 0, W, H);
  for (const f of t.fields) {
    if (f.type === 'logo') {
      if (st.logo) { const k = Math.min(f.w / st.logo.width, f.h / st.logo.height), w = st.logo.width * k, h = st.logo.height * k; c.drawImage(st.logo, f.x + (f.w - w) / 2, f.y + (f.h - h) / 2, w, h); }
      else if (!st.exporting && st.showEmpty) { c.save(); c.strokeStyle = '#99a'; c.setLineDash([10, 8]); c.lineWidth = 3; c.strokeRect(f.x, f.y, f.w, f.h); c.restore(); }
      continue;
    }
    const text = f.src === 'fixed' ? f.value : (st.values?.[f.id] ?? '');
    if (text) fitText(c, text, f, f);
    else if (!st.exporting && st.showEmpty) fitText(c, f.label, f, { ...f, color: '#9aa1c4', weight: 600 });
  }
}
// a small picture of a template with sample text, kept in the sheet for the template albums
async function templateThumb(t, img) {
  const k = 520 / t.width, cv = document.createElement('canvas'); cv.width = 520; cv.height = Math.max(1, Math.round(t.height * k));
  const c = cv.getContext('2d'); c.scale(k, k);
  const values = {}; t.fields.forEach(f => { values[f.id] = f.src === 'college' ? 'Sample College' : f.label; });
  drawTemplate(c, t, { img, photo: null, values, logo: null, exporting: true });
  return thumbB64(cv, [[520, 0.72], [440, 0.65], [360, 0.6], [300, 0.55]]);
}
const tplThumbUrl = t => (t.has_thumb ? `/api/templates/${t.id}/thumb` : `/api/templates/${t.id}/image`);
const tplCard = (t, attrs = '', extra = '') => html`<div class="tplcard"><button type="button" class="tplpic" ${raw(attrs)} aria-label="${t.title}"><span class="tplimg ${t.kind === 'photo' ? 'checker' : ''}"><img src="${tplThumbUrl(t)}" alt="" loading="lazy" decoding="async"></span><b>${t.title}</b><small>${t.kind === 'photo' ? 'Photo frame' : 'Poster / banner'}${t.category ? ' · ' + t.category : ''}</small></button>${extra}</div>`;

// ---------- one JPEG as a one-page PDF (no library needed); the page is the template size at 150 dpi ----------
async function jpegToPdf(jpegBlob, w, h) {
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer()), enc = new TextEncoder(), parts = [], offs = []; let len = 0;
  const push = b => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n${body}\nendobj\n`); };
  const pw = (w * 0.48).toFixed(2), ph = (h * 0.48).toFixed(2), cs = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
  push('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offs[4] = len; push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`); push(jpeg); push('\nendstream\nendobj\n');
  obj(5, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
  const xr = len; push('xref\n0 6\n0000000000 65535 f \n'); for (let i = 1; i <= 5; i++) push(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}
