'use strict';
// ---- shared picture tools: reading photos, thumbnails, fitting text into boxes, drawing templates, PDF export, copy link ----
const imgCache = {};
const loadImg = src => imgCache[src] ||= new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
// a photo linked from another site is shown from there in the size the page needs; uploaded photos come from the portal
const gUrl = (g, size, fallback) => (g.ext_url ? g.ext_url.replace('{s}', size) : fallback);
const slug = s => String(s || 'photo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const toB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Could not read the file')); r.readAsDataURL(blob); });
function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
async function copyText(text, done = 'Copied') {
  try { await navigator.clipboard.writeText(text); }
  catch { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch {} t.remove(); }
  toast(done);
}
const portalLink = path => location.origin + '/#/' + path;
// a link that names the file: /r/guide-to-voter-registration-1793426997481919.pdf (first four words of the title, the id, the extension)
const resSlug = r => { const w = String(r.title || 'file').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).slice(0, 4).join('-') || 'file', e = (String(r.filename || '').match(/\.[A-Za-z0-9]{1,6}$/) || [''])[0].toLowerCase(); return `${w}-${r.id}${e}`; };
const resLink = r => location.origin + '/r/' + resSlug(r);
actions.copyRes = el => copyText(location.origin + '/r/' + el.dataset.s, 'Link copied');

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

// ---------- fonts a template can use ----------
// Times New Roman is drawn with Tinos (the same letter shapes and widths), so it looks identical on every phone and computer.
const FONTS = {
  sans: ['Inter (clean sans-serif)', 'Inter, Arial, sans-serif'],
  times: ['Times New Roman', 'Tinos, "Times New Roman", Times, serif'],
  garamond: ['Garamond', '"EB Garamond", Garamond, "Times New Roman", serif'],
  cormorant: ['Cormorant Garamond (fine serif)', '"Cormorant Garamond", Garamond, serif'],
  baskerville: ['Libre Baskerville', '"Libre Baskerville", Georgia, serif'],
  playfair: ['Playfair Display (elegant serif)', '"Playfair Display", Georgia, serif'],
  script: ['Great Vibes (script)', '"Great Vibes", cursive'],
};
const fontStack = k => (FONTS[k] || FONTS.sans)[1];
// load every font a template uses before anything is measured or drawn (canvas will not wait for them by itself)
// the extra fonts for certificates and posters (Tinos, Garamond, Playfair …) are fetched only when a template is drawn
let displayFonts = false;
function loadDisplayFonts() {
  if (displayFonts) return; displayFonts = true;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400;1,700&family=Great+Vibes&display=swap';
  document.head.append(l);
}
async function ensureFonts(t) {
  loadDisplayFonts();
  const want = new Set();
  for (const f of t.fields || []) if (f.type !== 'logo') { const st = fontStack(f.font), i = f.italic ? 'italic ' : ''; for (const w of [f.weight || 800, 700, 400]) want.add(`${i}${w} 32px ${st}`); }
  await Promise.all([...want].map(s => document.fonts?.load?.(s).catch(() => {}) || 0));
}

// ---------- text that always stays inside its box ----------
// text: a string, or runs [{ t: 'words', b: true }] where b marks the merged details (shown bold). Words wrap to the box, the size
// shrinks until everything fits, and a paragraph can be justified. o: color, weight, font, italic, align (left|center|right|justify),
// lines (at most), caps, size (largest size to use), dry (only measure).
function fitText(c, text, box, o) {
  const runs = typeof text === 'string' ? [{ t: text, b: false }] : text, caps = !!o.caps;
  const words = []; let cw0 = null;
  for (const r of runs) for (const part of String(r.t || '').split(/(\s+)/)) { if (!part) continue; if (/^\s+$/.test(part)) { cw0 = null; continue; } if (!cw0) { cw0 = { segs: [] }; words.push(cw0); } cw0.segs.push({ t: caps ? part.toUpperCase() : part, b: !!r.b }); }
  if (!words.length) return { fits: true, size: 0 };
  const pad = Math.min(box.w * 0.03, 14), maxW = box.w - pad * 2, maxLines = o.lines || 1, w0 = o.weight || 800, wb = Math.max(700, w0), family = fontStack(o.font), ital = o.italic ? 'italic ' : '';
  const fnt = (size, b) => `${ital}${b ? wb : w0} ${size}px ${family}`, LH = o.lh > 0 ? o.lh : (maxLines > 2 ? 1.3 : 1.12), exact = !!(o.exact && o.size);
  let fitsExact = true, size = o.size || Math.floor(box.h / (maxLines > 1 ? maxLines * LH : 1.15)), lines = null, gap = 0;   // a size set by the designer is the starting point; the text only shrinks when it does not fit
  for (; size >= 8; size -= exact ? 1e9 : (size > 160 ? 3 : 1)) {
    c.font = fnt(size, false); gap = c.measureText(' ').width;
    for (const x of words) x.m = x.segs.reduce((n, g) => { c.font = fnt(size, g.b); return n + c.measureText(g.t).width; }, 0);
    const ls = []; let cur = [], cw = 0;
    for (const x of words) { const add = cur.length ? gap + x.m : x.m; if (cur.length && cw + add > maxW) { ls.push(cur); cur = [x]; cw = x.m; } else { cur.push(x); cw += add; } }
    if (cur.length) ls.push(cur);
    if (exact) { lines = ls; fitsExact = ls.length <= maxLines && ls.length * size * LH <= box.h && words.every(x => x.m <= maxW); break; }
    if (ls.length <= maxLines && ls.length * size * LH <= box.h && words.every(x => x.m <= maxW)) { lines = ls; break; }
  }
  const fits = exact ? fitsExact : !!lines;
  if (!lines) { size = 8; c.font = fnt(8, false); gap = c.measureText(' ').width; for (const x of words) x.m = x.segs.reduce((n, g) => { c.font = fnt(8, g.b); return n + c.measureText(g.t).width; }, 0); lines = [words]; }
  if (o.dry) return { fits, size };
  c.save(); c.fillStyle = o.color || '#1c2162'; c.textBaseline = 'middle'; c.textAlign = 'left';
  const lh = size * LH, y0 = box.y + (box.h - lines.length * lh) / 2 + lh / 2;
  lines.forEach((ln, i) => {
    const wsum = ln.reduce((s, x) => s + x.m, 0), natural = wsum + gap * (ln.length - 1), justify = o.align === 'justify' && i < lines.length - 1 && ln.length > 1, g = justify ? (maxW - wsum) / (ln.length - 1) : gap;
    const total = wsum + g * (ln.length - 1);
    let x = o.align === 'right' ? box.x + box.w - pad - total : o.align === 'left' || justify ? box.x + pad : box.x + (box.w - total) / 2;
    for (const w of ln) { let px = x; for (const sg of w.segs) { c.font = fnt(size, sg.b); c.fillText(sg.t, px, y0 + i * lh + size * 0.04); px += c.measureText(sg.t).width; } x += w.m + g; }
  });
  c.restore();
  return { fits, size };
}
// a sentence with placeholders such as {student}, {college}, {dates}: the merged details are marked so they can be shown in bold
const MERGE_TOKENS = [['student', 'Student name'], ['college', 'College / school'], ['activities', 'Activities'], ['dates', 'Dates'], ['days', 'Days'], ['campaign', 'Campaign'], ['serial', 'Certificate number'], ['issued', 'Date of issue']];
const hasTokens = s => /\{[a-z]+(?::[bn])?\}|\*\*[^*]+\*\*/.test(String(s || ''));
function tokenRuns(text, merge, boldMerge, exporting) {
  const out = [];
  for (const part of String(text || '').split(/(\{[a-z]+(?::[bn])?\}|\*\*[^*]+\*\*)/)) {
    const m = part.match(/^\{([a-z]+)(?::([bn]))?\}$/);
    if (m) { const v = merge?.[m[1]]; out.push({ t: v !== undefined && v !== '' ? v : (exporting ? '' : part), b: m[2] ? m[2] === 'b' : !!boldMerge }); }
    else if (/^\*\*[^*]+\*\*$/.test(part)) out.push({ t: part.slice(2, -2), b: true });
    else if (part) out.push({ t: part, b: false });
  }
  return out;
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
  drawFields(c, t, st);
}
function drawFields(c, t, st) {
  for (const f of t.fields) {
    if (f.type === 'logo') {
      if (st.logo) { const k = Math.min(f.w / st.logo.width, f.h / st.logo.height), w = st.logo.width * k, h = st.logo.height * k; c.drawImage(st.logo, f.x + (f.w - w) / 2, f.y + (f.h - h) / 2, w, h); }
      else if (!st.exporting && st.showEmpty) { c.save(); c.strokeStyle = '#99a'; c.setLineDash([10, 8]); c.lineWidth = 3; c.strokeRect(f.x, f.y, f.w, f.h); c.restore(); }
      continue;
    }
    const text = f.src === 'fixed' ? (hasTokens(f.value) ? tokenRuns(f.value, st.merge, f.boldMerge, st.exporting) : f.value) : (st.values?.[f.id] ?? '');
    if (text && text.length) fitText(c, text, f, f);
    else if (!st.exporting && st.showEmpty) fitText(c, f.label, f, { ...f, color: '#9aa1c4', weight: 600, font: 'sans', italic: false, align: 'center', lines: 1, size: 0, exact: false, lh: 0 });
  }
}
// a small picture of a template with sample text, kept in the sheet for the template albums
async function templateThumb(t, img) {
  const k = 520 / t.width, cv = document.createElement('canvas'); cv.width = 520; cv.height = Math.max(1, Math.round(t.height * k));
  const c = cv.getContext('2d'); c.scale(k, k);
  const values = {}; t.fields.forEach(f => { values[f.id] = CERT_SAMPLE[f.src] ?? (f.src === 'college' ? 'Sample College' : f.label); });
  await ensureFonts(t);
  drawTemplate(c, t, { img, photo: null, values, merge: CERT_SAMPLE, logo: null, exporting: true });
  return thumbB64(cv, [[520, 0.72], [440, 0.65], [360, 0.6], [300, 0.55]]);
}
// what each merge box shows in the designer's preview and thumbnail
const CERT_SAMPLE = { student: 'Aswathy K. Nair', college: 'Sample College of Arts and Science', activities: 'Help desk, Flash Mob', dates: '2 Nov 2026 to 9 Nov 2026', days: '5', campaign: 'Campus to Booth 2026', serial: 'ELC-2026-0001', issued: '12 November 2026' };
const TPL_KIND = { photo: 'Photo frame', poster: 'Poster / banner', certificate: 'Certificate' };
const tplThumbUrl = t => (t.has_thumb ? `/api/templates/${t.id}/thumb` : `/api/templates/${t.id}/image`);
const tplCard = (t, attrs = '', extra = '') => html`<div class="tplcard"><button type="button" class="tplpic" ${raw(attrs)} aria-label="${t.title}"><span class="tplimg ${t.kind === 'photo' ? 'checker' : ''}"><img src="${tplThumbUrl(t)}" alt="" loading="lazy" decoding="async"></span><b>${t.title}</b><small>${TPL_KIND[t.kind] || 'Template'}${t.category ? ' · ' + t.category : ''}</small></button>${extra}</div>`;

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

const INST_TYPES = ['Government', 'Aided', 'Unaided / self-financing', 'Autonomous', 'Other'];
// every detail kept about an institution: used by the staff form here and by the institution's own Profile page
const detailFields = (c, staff) => html`<h4 class="fsec">Institution</h4>
  <div class="formgrid">${staff ? html`<label class="f"><span>Name *</span><input type="text" name="name" value="${c?.name || ''}" required maxlength="160"></label>` : html`<label class="f"><span>Name</span><input type="text" value="${c?.name || ''}" disabled><span class="hint">To change the name, ask the district office.</span></label>`}
    <label class="f"><span>Short name (shown on the leaderboard)</span><input type="text" name="short_name" value="${c?.short_name || ''}" maxlength="40"></label>
    <label class="f"><span>Type</span><select name="inst_type"><option value="">Choose…</option>${INST_TYPES.map(t => html`<option ${c?.inst_type === t ? 'selected' : ''}>${t}</option>`)}</select></label>
    <label class="f"><span>AISHE / UDISE code (optional)</span><input type="text" name="inst_code" value="${c?.inst_code || ''}" maxlength="40"></label></div>
  <label class="f"><span>Address *</span><textarea name="address" required maxlength="300" rows="2">${c?.address || ''}</textarea></label>
  <div class="formgrid"><label class="f"><span>Located LSGI</span><input type="text" name="lsgi" value="${c?.lsgi || ''}" maxlength="120" placeholder="e.g. Chelannur Grama Panchayath"></label>
    <label class="f"><span>Office phone *</span><input type="tel" name="phone" value="${c?.phone || ''}" required></label>
    <label class="f"><span>Office email *</span><input type="email" name="email" value="${c?.email || ''}" required></label></div>
  <h4 class="fsec">ELC coordinator (teacher in charge)</h4>
  <div class="formgrid"><label class="f"><span>Name</span><input type="text" name="coordinator" value="${c?.coordinator || ''}" maxlength="100"></label>
    <label class="f"><span>Designation</span><input type="text" name="designation" value="${c?.designation || ''}" maxlength="80" placeholder="e.g. Assistant Professor"></label>
    <label class="f"><span>Mobile (WhatsApp)</span><input type="tel" name="coord_phone" value="${c?.coord_phone || ''}" maxlength="30"></label>
    <label class="f"><span>Email</span><input type="email" name="coord_email" value="${c?.coord_email || ''}"></label></div>
  <h4 class="fsec">Head of the institution (principal / headmaster)</h4>
  <div class="formgrid"><label class="f"><span>Name</span><input type="text" name="head_name" value="${c?.head_name || ''}" maxlength="100"></label><label class="f"><span>Phone</span><input type="tel" name="head_phone" value="${c?.head_phone || ''}" maxlength="30"></label></div>`;

// ---------- certificates: values for the merge boxes, an alignment check, PDF per student, and a zip of many ----------
// every box takes its text from the frozen details of one student: student, college, activities, dates, days, campaign, serial, issued
const certValues = (t, snap) => Object.fromEntries(t.fields.map(f => [f.id, f.src === 'fixed' ? f.value : (f.src === 'ask' ? '' : (snap[f.src] ?? ''))]));
const fieldContent = (f, v, snap) => (f.src === 'fixed' && hasTokens(f.value) ? tokenRuns(f.value, snap, f.boldMerge, true) : v[f.id]);
// which students' details do not fit their box (text would have to shrink below readable size or run out of room)
function certCheck(t, snaps) {
  const c = document.createElement('canvas').getContext('2d'), bad = [];
  for (const s of snaps) {
    const v = certValues(t, s);
    for (const f of t.fields) { const txt = fieldContent(f, v, s); if (f.type !== 'text' || !txt || !txt.length) continue; const r = fitText(c, txt, f, { ...f, dry: true }); if (!r.fits || r.size < (f.size && !f.exact ? f.size * 0.8 : f.exact ? 0 : Math.max(12, f.h / (f.lines || 1) * (f.lines > 2 ? 0.4 : 0.28)))) { bad.push({ name: s.student, field: f.label }); break; } }
  }
  return bad;
}
async function certPdf(t, img, snap, logo = null) {
  const k = Math.min(1, 3400 / Math.max(t.width, t.height)), cv = document.createElement('canvas'); cv.width = Math.round(t.width * k); cv.height = Math.round(t.height * k);
  await ensureFonts(t);
  const c = cv.getContext('2d'); c.scale(k, k);
  drawTemplate(c, t, { img, photo: null, values: certValues(t, snap), merge: snap, logo, exporting: true });
  const jpg = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.92));
  return jpegToPdf(jpg, cv.width, cv.height);
}
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
// a plain zip file (no compression: PDFs are already compressed) built in the browser
async function zipStore(files) {
  const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
  const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  const now = new Date(), dt = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(), tm = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  for (const f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer()), name = enc.encode(f.name), crc = crc32(data);
    const local = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(tm), ...u16(dt), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    parts.push(local, name, data);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(tm), ...u16(dt), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += local.length + name.length + data.length;
  }
  const cd = central.reduce((s, p) => s + p.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cd), ...u32(offset), ...u16(0)]);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

// the picture of a web link: the server takes it from the linked page, the browser shrinks it to a small thumbnail
async function linkPreview(url) {
  const r = await api('/api/staff/resources/link-preview', 'POST', { url });
  if (!r.image) return { ...r, thumb: null };
  const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(r.image), ch => ch.charCodeAt(0))], { type: r.mime }));
  return { ...r, image: null, thumb: await thumbB64(bmp, [[360, 0.72], [300, 0.62], [240, 0.55]]) };
}

// a QR code for a link, as an inline picture (needs /vendor/qrcode.js)
function qrSvg(text) {
  try { const q = qrcode(0, 'M'); q.addData(String(text)); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }
  catch { return ''; }
}

// ---------- quiz papers: the question paper, answer sheets and key (shared by the coordinator page and the staff console) ----------
// Made to save paper: the questions are set in two columns, the answer sheets are half a page each (two to a sheet, with a cut line), and the questions can be
// shown on a screen or projector instead of being printed at all.
const qpEsc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function quizPrintHtml(kind, p, o = {}) {
  const q = p.quiz, inst = o.institution || q.title, lvl = q.level === 'institution' ? 'Institution round' : q.level === 'ac' ? 'AC round · ' + (q.ac || '') : 'District final';
  const head = `<header class="pp-head"><div class="pp-t"><b>ELC Quiz Competition 2026</b><span>${qpEsc(lvl)}</span></div><div class="pp-inst">${qpEsc(inst)}</div></header>`;
  const meta = `<div class="pp-meta"><span><i>Questions</i>${q.n}</span><span><i>Time allowed</i>${q.minutes} minutes</span><span><i>Maximum marks</i>${q.n}</span><span><i>Quiz code</i>${qpEsc(q.code)}</span></div>`;
  if (kind === 'paper') {
    return `<section class="pp-paper">${head}${meta}<div class="pp-fields"><span>Name</span><i></i><span>Class</span><i></i><span>Date</span><i></i></div>
      <ol class="pp-rules"><li>Choose the one best answer for each question and mark it on the answer sheet. Do not write on this paper.</li><li>Fill the circle completely. Each question carries one mark; there is no negative marking.</li></ol>
      <div class="pp-cols">${p.questions.map(x => `<div class="pp-q"><span class="pp-n">${x.no}</span><div><p>${qpEsc(x.text)}</p><ul>${x.opts.map((t, i) => `<li><b>${'abcd'[i]}</b><span>${qpEsc(t)}</span></li>`).join('')}</ul></div></div>`).join('')}</div>
      <footer class="pp-foot">Questions from the reference bank of the Election Commission of India · Quiz code ${qpEsc(q.code)}</footer></section>`;
  }
  if (kind === 'key') {
    return `<section class="pp-paper">${head}${meta}<h3 class="pp-h">Answer key (for the coordinator only)</h3><div class="pp-keygrid">${p.key.map((k, i) => `<span><b>${i + 1}</b>${k.toUpperCase()}</span>`).join('')}</div>
      <p class="pp-note">One mark for each correct answer. Add the marks and write them on the sheet, or type the letters marked by the student into the portal and it will mark them.</p></section>`;
  }
  // answer sheets: questions run down in columns of ten
  const cols = Math.ceil(q.n / 10), sheet = `<div class="pp-sheet">${head}<div class="pp-fields"><span>Name</span><i></i><span>Class</span><i></i></div>
    <p class="pp-note">Fill <b>one</b> circle for each question, completely, with a pen.</p>
    <div class="pp-omr" style="--cols:${cols}">${Array.from({ length: cols }, (_, c) => `<div class="pp-col">${Array.from({ length: 10 }, (_, r) => { const no = c * 10 + r + 1; return no > q.n ? '' : `<div class="pp-row"><b>${no}</b>${'abcd'.split('').map(l => `<span class="pp-bub">${l}</span>`).join('')}</div>`; }).join('')}</div>`).join('')}</div>
    <div class="pp-sfoot"><span>Quiz code ${qpEsc(q.code)}</span><span>Marks: ______ / ${q.n}</span></div></div>`;
  const copies = Math.max(1, Math.min(400, Number(o.copies) || 1)), pages = [];
  const cut = '<div class="pp-cut"><span>cut here</span></div>';
  for (let i = 0; i < copies; i += 3) pages.push(`<div class="pp-page">${[0, 1, 2].filter(k => i + k < copies).map(() => sheet).join(cut)}</div>`);
  return pages.join('');
}
function quizPrint(kind, p, o = {}) {
  const label = { paper: 'Question paper', sheet: 'Answer sheets', key: 'Answer key' }[kind], inst = o.institution || p.quiz.title, oldTitle = document.title;
  document.title = `ELC Quiz 2026 - ${inst} - ${label}`;                 // names the PDF and appears in the print preview
  document.getElementById('printarea')?.remove(); document.getElementById('ppstyle')?.remove();
  const st = document.createElement('style'); st.id = 'ppstyle';
  st.textContent = `@page{size:A4;margin:11mm 12mm 14mm;@bottom-left{content:"ELC Quiz Competition 2026 · ${qpEsc(inst).replace(/"/g, '')} · ${label}";font:7.5pt Inter,sans-serif;color:#555}@bottom-right{content:"Page " counter(page) " of " counter(pages);font:7.5pt Inter,sans-serif;color:#555}}`;
  document.head.append(st);
  const d = document.createElement('div'); d.id = 'printarea'; d.innerHTML = quizPrintHtml(kind, p, o); document.body.append(d);
  const done = () => { d.remove(); st.remove(); document.title = oldTitle; removeEventListener('afterprint', done); };
  addEventListener('afterprint', done); setTimeout(() => print(), 120);
}
// buttons on both pages: data-url (the paper of the quiz), data-inst (name printed on it), data-k (paper, sheet, key or project)
actions.qpPrint = async el => {
  const k = el.dataset.k, p = await api(el.dataset.url), o = { institution: el.dataset.inst || '' };
  window.__qp = { p, o };
  if (k === 'project') return quizProjector(p);
  if (k === 'sheet') {
    return modal(html`<h2>Answer sheets</h2><p class="muted small">Three answer sheets are printed on each page (cut along the dashed lines), so 30 students need only 10 pages. Print one for every student.</p>
      <form data-form="qpSheets" class="stack-s"><label class="f"><span>How many students?</span><input type="number" name="copies" min="1" max="400" value="30" required></label>${typeof mfoot === 'function' ? mfoot('Print') : html`<div data-err></div><div class="row" style="justify-content:flex-end"><button class="btn primary" type="submit">Print</button></div>`}</form>`);
  }
  quizPrint(k, p, o);
};
forms.qpSheets = f => { const n = Number(fd(f).copies); f.closest('.overlay').close(); quizPrint('sheet', window.__qp.p, { ...window.__qp.o, copies: n }); };
// the questions on a screen or projector, one at a time: students mark their answer sheets, so nothing but the answer sheets is printed
function quizProjector(p) {
  document.getElementById('qahost')?.remove();
  const box = document.createElement('div'); box.id = 'qahost'; box.className = 'qa-host'; document.body.append(box); document.body.style.overflow = 'hidden';
  let i = 0; const n = p.questions.length;
  const close = () => { box.remove(); document.body.style.overflow = ''; removeEventListener('keydown', key); };
  const paint = () => {
    const x = p.questions[i];
    box.innerHTML = `<button class="qh-x" data-h="close" aria-label="Close">×</button><div class="qh-main"><div class="qh-top"><span>Question ${x.no} of ${n}</span><span></span><span>${qpEsc(p.quiz.title)}</span></div><h1 class="qh-q">${qpEsc(x.text)}</h1>
      <div class="qh-opts">${x.opts.map((t, k) => `<div class="qh-opt c${k}"><span class="qz-l">${'ABCD'[k]}</span><span class="qh-t">${qpEsc(t)}</span></div>`).join('')}</div>
      <div class="qh-foot"><button class="btn secondary lg" data-h="prev" ${i === 0 ? 'disabled' : ''}>Previous</button><button class="btn accent lg" data-h="${i === n - 1 ? 'close' : 'next'}">${i === n - 1 ? 'Finish' : 'Next question'}</button></div></div>`;
  };
  const step = d => { i = Math.max(0, Math.min(n - 1, i + d)); paint(); };
  const key = e => { if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); step(1); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') step(-1); else if (e.key === 'Escape') close(); };
  box.addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (!b) return; if (b.dataset.h === 'close') close(); else step(b.dataset.h === 'next' ? 1 : -1); });
  addEventListener('keydown', key); paint();
}

// the village map library is large, so it is fetched only when the map is shown
let leafletLoad = null;
function loadLeaflet() {
  return (leafletLoad ||= new Promise((res, rej) => { const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = '/vendor/leaflet/leaflet.css'; document.head.append(c); loadScript('/vendor/leaflet/leaflet.js').then(res, rej); }));
}
