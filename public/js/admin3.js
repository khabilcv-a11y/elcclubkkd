'use strict';
// ---- staff console: photo frames and poster / banner templates (upload an image, mark where the text and logo go) ----
let TD = null;   // the template being designed

async function apTemplates(el) {
  const list = await api('/api/templates'); window.__tpls = list;
  const cats = [...new Set(list.map(t => t.category || 'Other'))];
  show(el, html`${pageHead('Photo frames and poster templates', 'Upload a design, mark where the college name, title or logo should appear, and colleges and schools can use it. Photo frames are used in the Gallery editor; posters and banners are filled in and downloaded as JPG or PDF.', html`<button class="btn primary" data-act="tplAdd">${icon('plus')} Add a template</button>`, 'Campus to booth')}
    ${list.length ? cats.map(c => html`<h3 class="tplgroup">${c}</h3><div class="tplgrid">${list.filter(t => (t.category || 'Other') === c).map(t => tplCard(t, `data-act="tplEdit" data-id="${t.id}"`, html`<div class="row gap-s tplact">${t.active ? badge('Visible', 'ok') : badge('Hidden', 'grey')}<button class="btn sm secondary" data-act="tplToggle" data-id="${t.id}">${t.active ? 'Hide' : 'Show'}</button><button class="btn sm danger" data-act="tplDel" data-id="${t.id}" aria-label="Delete ${esc(t.title)}">${icon('trash')}</button></div>`))}</div>`)
      : html`<div class="card">${empty('No templates yet', 'Standard landscape and portrait photo frames are built in. Add your own frames, posters and banners here.', 'image')}</div>`}`);
}
actions.tplToggle = async el => { const t = window.__tpls.find(x => x.id === Number(el.dataset.id)); await api('/api/staff/templates/' + t.id, 'PUT', { title: t.title, category: t.category, kind: t.kind, fields: t.fields, active: !t.active }); apTemplates($('#pg')); };
actions.tplDel = async el => { if (!await confirmBox('Delete this template for good? Colleges will no longer see it.', 'Delete', true)) return; await api('/api/staff/templates/' + el.dataset.id, 'DELETE'); toast('Deleted'); apTemplates($('#pg')); };
actions.tplAdd = () => openDesigner(null);
actions.tplEdit = el => openDesigner(window.__tpls.find(x => x.id === Number(el.dataset.id)));

const newField = (type, n, W, H) => ({ label: type === 'logo' ? 'College logo' : 'Text ' + n, type, src: type === 'logo' ? 'college' : (TD?.kind === 'certificate' ? 'student' : 'ask'), value: '', x: Math.round(W * 0.2), y: Math.round(H * Math.min(0.8, 0.15 + 0.1 * n)), w: Math.round(type === 'logo' ? W * 0.18 : W * 0.6), h: Math.round(type === 'logo' ? W * 0.18 : H * 0.09), color: '#1c2162', weight: 800, align: 'center', caps: false, lines: 1, font: 'sans', italic: false, boldMerge: false, size: 0 });
const tdMode = f => (f.type === 'logo' ? 'logo' : f.src);

async function openDesigner(t) {
  TD = t ? { id: t.id, title: t.title, kind: t.kind, category: t.category || '', active: !!t.active, w: t.width, h: t.height, fields: t.fields.map(f => ({ ...f })), img: null, file: null, sel: 0 }
    : { id: null, title: '', kind: 'poster', category: '', active: true, w: 0, h: 0, fields: [], img: null, file: null, sel: 0 };
  const cats = [...new Set((window.__tpls || []).map(x => x.category).filter(Boolean)), 'Photo frames', 'Posters', 'Banners'].filter((v, i, a) => a.indexOf(v) === i);
  const m = modal(html`<h2>${t ? 'Edit template' : 'Add a template'}</h2>
    <div class="edgrid"><div class="edpreview"><div class="tdstage checker live" id="tdstage"><img id="tdimg" alt="Template picture" hidden><canvas id="tdlive" aria-hidden="true"></canvas><div id="tdboxes"></div><div class="tdempty" id="tdempty">${t ? 'Loading…' : 'Choose the template image to start'}</div></div>
      <label class="chk" style="margin-top:8px"><input type="checkbox" id="tdlivechk" checked> Show sample text on the picture, to see how it lays out</label>
      <p class="hint">Drag a box to move it, and drag its corner square to resize it. Photo frames should be PNG or WebP with a transparent window where the photo shows.</p></div>
      <form data-form="tplSave" class="stack-s edform">
        ${t ? html`<label class="f"><span>Replace the design image (optional)</span><input type="file" id="tdfile" accept="image/png,image/webp,image/jpeg"><span class="hint">Choose a new picture, for example one with the sentence area left blank. Your boxes stay where they are.</span></label>` : html`<label class="f"><span>Template image (PNG, WebP or JPG, up to 6 MB) *</span><input type="file" id="tdfile" accept="image/png,image/webp,image/jpeg" required></label>`}
        <label class="f"><span>Title *</span><input type="text" name="title" maxlength="80" required value="${TD.title}" placeholder="e.g. Rally banner, Blue frame"></label>
        <div class="formgrid"><label class="f"><span>Type</span><select name="kind" id="tdkind"><option value="poster" ${TD.kind === 'poster' ? 'selected' : ''}>Poster or banner (text only)</option><option value="photo" ${TD.kind === 'photo' ? 'selected' : ''}>Photo frame (photo goes behind)</option><option value="certificate" ${TD.kind === 'certificate' ? 'selected' : ''}>Certificate (merged with each student's details)</option></select></label>
          <label class="f"><span>Album / category</span><input type="text" name="category" list="tdcats" maxlength="40" value="${TD.category}" placeholder="e.g. Banners"><datalist id="tdcats">${cats.map(c => html`<option value="${c}">`)}</datalist></label></div>
        <label class="chk"><input type="checkbox" name="active" ${TD.active ? 'checked' : ''}> Visible to colleges and schools</label>
        <div class="edslot"><div class="row between"><b>Text and logo boxes</b><span class="row gap-s"><button type="button" class="btn secondary sm" data-act="tdAdd" data-t="text">${icon('plus')} Text</button><button type="button" class="btn secondary sm" data-act="tdAdd" data-t="logo">${icon('plus')} Logo</button></span></div>
          <div class="pillrow" id="tdlist" style="margin:8px 0"></div><div id="tdfield"></div></div>
        <div data-err></div><div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Close</button><button type="button" class="btn secondary" data-act="tdPreview">${icon('eye')} Preview</button><button class="btn primary" type="submit">${icon('upload')} ${t ? 'Save' : 'Add template'}</button></div></form></div>`, { wide: true });
  tdWire(m);
  if (t) { const im = await loadImg(`/api/templates/${t.id}/image`); if (im) tdImage(im); else $('#tdempty').textContent = 'The image could not be loaded'; }
}
function tdImage(im) {
  TD.img = im; TD.w ||= im.naturalWidth; TD.h ||= im.naturalHeight;
  const el = $('#tdimg'); el.src = im.src; el.hidden = false; $('#tdempty').hidden = true;
  if (!TD.fields.length && TD.kind === 'certificate') { TD.fields.push(newField('text', 1, TD.w, TD.h)); TD.fields[0].label = 'Student name'; TD.fields[0].caps = true; const c = newField('text', 2, TD.w, TD.h); c.label = 'College or school'; c.src = 'college'; c.weight = 600; const d = newField('text', 3, TD.w, TD.h); d.label = 'Dates'; d.src = 'dates'; d.weight = 600; TD.fields.push(c, d); }
  if (!TD.fields.length) { TD.fields.push(newField('text', 1, TD.w, TD.h)); if (TD.kind === 'photo') { TD.fields[0].src = 'college'; TD.fields[0].label = 'College name'; TD.fields.push(newField('text', 2, TD.w, TD.h)); TD.fields[1].label = 'Activity title'; } }
  tdPaint();
}
function tdWire(m) {
  const stage = $('#tdstage', m);
  $('#tdfile', m)?.addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 6 * 1024 * 1024) { e.target.value = ''; return toast('The image must be 6 MB or smaller', true); }
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      if (TD.id) { const kx = im.naturalWidth / TD.w, ky = im.naturalHeight / TD.h; TD.fields.forEach(q => { q.x = Math.round(q.x * kx); q.w = Math.round(q.w * kx); q.y = Math.round(q.y * ky); q.h = Math.round(q.h * ky); }); TD.file = f; TD.w = im.naturalWidth; TD.h = im.naturalHeight; TD.img = im; $('#tdimg').src = im.src; tdPaint(); toast('New picture chosen. Press Save to keep it.'); return; }
      TD.file = f; TD.w = im.naturalWidth; TD.h = im.naturalHeight; TD.fields = []; tdImage(im);
    };
    im.onerror = () => toast('That file is not a readable image', true); im.src = url;
  });
  $('#tdkind', m).addEventListener('change', e => { TD.kind = e.target.value; const cert = TD.kind === 'certificate'; TD.fields.forEach(f => { if (f.type === 'text') { if (cert && f.src === 'ask') f.src = 'student'; else if (!cert && !['college', 'fixed', 'ask'].includes(f.src)) f.src = 'ask'; } }); tdPaint(); });
  // dragging and resizing boxes
  let drag = null;
  stage.addEventListener('pointerdown', e => {
    const bx = e.target.closest('.tdbox'); if (!bx) return; e.preventDefault();
    TD.sel = Number(bx.dataset.i); const f = TD.fields[TD.sel];
    drag = { mode: e.target.classList.contains('tdh') ? 'size' : 'move', x: e.clientX, y: e.clientY, f0: { ...f }, k: TD.w / stage.clientWidth };
    stage.setPointerCapture(e.pointerId); tdPaint();
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return; const f = TD.fields[TD.sel], dx = (e.clientX - drag.x) * drag.k, dy = (e.clientY - drag.y) * drag.k;
    if (drag.mode === 'move') { f.x = Math.round(Math.max(0, Math.min(TD.w - f.w, drag.f0.x + dx))); f.y = Math.round(Math.max(0, Math.min(TD.h - f.h, drag.f0.y + dy))); }
    else { f.w = Math.round(Math.max(20, Math.min(TD.w - f.x, drag.f0.w + dx))); f.h = Math.round(Math.max(20, Math.min(TD.h - f.y, drag.f0.h + dy))); }
    tdBoxes(); tdNums();
  });
  const end = () => { if (drag) { drag = null; tdField(); } };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  // the box settings
  const upd = e => {
    const tk = e.target.dataset.tok, k = e.target.dataset.tf; if (e.target.dataset.tokstyle) { TD.tokStyle = e.target.value; return; }
    if (tk && TD.fields[TD.sel]) { const q = TD.fields[TD.sel]; q.value = q.value.replace(new RegExp('\\{' + tk + '(?::[bn])?\\}', 'g'), `{${tk}:${e.target.value}}`); const ta = $('#tdvalue'); if (ta) ta.value = q.value; return; }
    if (!k || !TD.fields[TD.sel]) return; const f = TD.fields[TD.sel];
    if (k === 'mode') { const v = e.target.value; f.type = v === 'logo' ? 'logo' : 'text'; f.src = v === 'logo' ? 'college' : v; if (v === 'fixed' && TD.kind === 'certificate' && !f.value) { f.value = 'of {college:b} has actively volunteered as part of the {campaign:b} from {dates:b}, in {activities:n}. Their contribution towards voter awareness is sincerely acknowledged and appreciated.'; f.lines = Math.max(f.lines, 4); f.weight = 400; f.align = 'justify'; } tdPaint(); return; }
    if (['x', 'y', 'w', 'h'].includes(k)) { f[k] = Math.round(Math.max(k === 'w' || k === 'h' ? 20 : 0, Number(e.target.value) || 0)); tdBoxes(); return; }
    if (['caps', 'italic', 'boldMerge', 'exact'].includes(k)) f[k] = e.target.checked; else if (['weight', 'lines', 'size'].includes(k)) f[k] = Number(e.target.value) || 0; else if (k === 'lh') f.lh = Number(e.target.value) || 0; else f[k] = e.target.value;
    tdLive();
    if (k === 'label') { tdBoxes(); tdList(); }
  };
  m.addEventListener('input', upd); m.addEventListener('change', e => { upd(e); if (e.target.dataset.tf === 'mode') tdField(); });
}
let tdLiveTimer = 0;
// the sample text drawn over the design picture, exactly as it will be printed, so size and layout can be judged while adjusting
function tdLive() {
  clearTimeout(tdLiveTimer);
  tdLiveTimer = setTimeout(async () => {
    const cv = $('#tdlive'), stage = $('#tdstage'); if (!cv || !stage || !TD?.img) return;
    const on = $('#tdlivechk')?.checked !== false; stage.classList.toggle('live', on); cv.style.display = on ? 'block' : 'none';
    const t = tdObject(), k = stage.clientWidth / TD.w; await ensureFonts(t);
    const hint = $('#tdsizehint'), f = TD.fields[TD.sel];
    if (on) {
      cv.width = Math.round(TD.w * k); cv.height = Math.round(TD.h * k); const c = cv.getContext('2d'); c.scale(k, k);
      const values = {}; t.fields.forEach(x => { values[x.id] = CERT_SAMPLE[x.src] ?? ('Sample ' + x.label); });
      drawFields(c, t, { values, merge: CERT_SAMPLE, exporting: false, showEmpty: false, logo: null });
    }
    if (hint && f && f.type === 'text') {
      const x = t.fields[TD.sel], txt = x.src === 'fixed' ? (hasTokens(x.value) ? tokenRuns(x.value, CERT_SAMPLE, x.boldMerge, false) : x.value) : (CERT_SAMPLE[x.src] ?? 'Sample ' + x.label);
      const r = txt && txt.length ? fitText(document.createElement('canvas').getContext('2d'), txt, x, { ...x, dry: true }) : null;
      hint.textContent = r ? (r.fits ? 'Drawn at ' + r.size + ' px.' : 'Does not fit the box at ' + r.size + ' px: make the box bigger or the text smaller.') : '';
      hint.style.color = r && !r.fits ? 'var(--danger)' : '';
    }
  }, 40);
}
actions.tdSize = el => { const f = TD.fields[TD.sel]; if (!f) return; const cur = f.size || Number(($('#tdsizehint')?.textContent.match(/(\d+) px/) || [])[1]) || 36; f.size = Math.max(8, Math.min(600, cur + Number(el.dataset.d))); const i = $('[data-tf=size]'); if (i) i.value = f.size; tdLive(); };
document.addEventListener('change', e => { if (e.target.id === 'tdlivechk') tdLive(); });
const tdBoxes = () => {
  const b = $('#tdboxes'); if (!b) return;
  tdLive();
  b.innerHTML = TD.fields.map((f, i) => `<div class="tdbox ${i === TD.sel ? 'on' : ''} ${f.type === 'logo' ? 'logo' : ''}" data-i="${i}" style="left:${f.x * 100 / TD.w}%;top:${f.y * 100 / TD.h}%;width:${f.w * 100 / TD.w}%;height:${f.h * 100 / TD.h}%"><span>${esc(f.label)}</span><i class="tdh" title="Resize"></i></div>`).join('');
};
const tdList = () => show($('#tdlist'), html`${TD.fields.map((f, i) => html`<button type="button" class="chip ${i === TD.sel ? 'on' : ''}" data-act="tdSel" data-i="${i}">${f.label}</button>`)}`);
const tdNums = () => { const f = TD.fields[TD.sel]; if (!f) return; for (const k of ['x', 'y', 'w', 'h']) { const i = $(`[data-tf=${k}]`); if (i) i.value = f[k]; } };
function tdField() {
  const f = TD.fields[TD.sel], box = $('#tdfield'); if (!box) return;
  if (!f) return show(box, html`<p class="muted small">Add a text or logo box, then place it on the picture.</p>`);
  const mode = tdMode(f), sel = (k, opts, cur) => html`<select data-tf="${k}">${opts.map(([v, l]) => html`<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`)}</select>`;
  show(box, html`<div class="tdfield"><label class="f"><span>Name of this box</span><input type="text" data-tf="label" maxlength="40" value="${f.label}"></label>
    <label class="f"><span>What goes here</span>${sel('mode', TD.kind === 'certificate' ? [['student', 'Student name'], ['college', 'College / school name'], ['activities', 'Activities taken part in'], ['dates', 'Dates of participation'], ['days', 'Number of days'], ['campaign', 'Campaign title'], ['serial', 'Certificate number'], ['issued', 'Date of issue'], ['fixed', 'Fixed text, or a sentence with placeholders'], ['logo', 'The college\'s logo']] : [['ask', 'Text typed by the college'], ['college', 'College / school name (filled in automatically)'], ['fixed', 'Fixed text (same for everyone)'], ['logo', 'The college\'s logo']], mode)}</label>
    ${mode === 'fixed' ? html`<label class="f"><span>${TD.kind === 'certificate' ? 'Text (type the whole sentence and insert placeholders where the details belong)' : 'Text'}</span><textarea data-tf="value" id="tdvalue" rows="${TD.kind === 'certificate' ? 6 : 2}" maxlength="1200">${f.value}</textarea></label>
      ${TD.kind === 'certificate' ? html`<div class="tdtokens"><span class="small muted">Insert a placeholder as:</span><label class="chk"><input type="radio" name="tdstyle" data-tokstyle="1" value="b" ${(TD.tokStyle || 'b') === 'b' ? 'checked' : ''}> <b>Bold</b></label><label class="chk"><input type="radio" name="tdstyle" data-tokstyle="1" value="n" ${TD.tokStyle === 'n' ? 'checked' : ''}> Normal</label></div>
        <div class="tdtokens">${MERGE_TOKENS.map(([k, l]) => html`<button type="button" class="chip" data-act="tdToken" data-k="${k}">${l}</button>`)}</div>
        ${(() => { const seen = new Map(); for (const m of String(f.value || '').matchAll(/\{([a-z]+)(?::([bn]))?\}/g)) seen.set(m[1], m[2] || (f.boldMerge ? 'b' : 'n')); return seen.size ? html`<div class="tdused"><span class="small muted">Placeholders in this sentence (bold or normal):</span>${[...seen].map(([k, st]) => html`<label class="tdu"><span>${(MERGE_TOKENS.find(x => x[0] === k) || [k, k])[1]}</span><select data-tok="${k}"><option value="b" ${st === 'b' ? 'selected' : ''}>Bold</option><option value="n" ${st === 'n' ? 'selected' : ''}>Normal</option></select></label>`)}</div>` : ''; })()}
        <p class="hint">To make other words bold, put ** on both sides of them, like **SVEEP Election Awareness Campaign**.</p>` : ''}` : ''}
    ${f.type === 'text' ? html`<div class="formgrid"><label class="f"><span>Font</span>${sel('font', Object.entries(FONTS).map(([k, v]) => [k, v[0]]), f.font || 'sans')}</label><label class="f"><span>Colour</span><input type="color" data-tf="color" value="${f.color}"></label><label class="f"><span>Weight</span>${sel('weight', [[400, 'Normal'], [600, 'Semi-bold'], [700, 'Bold'], [800, 'Extra bold']], f.weight)}</label>
      <label class="f"><span>Alignment</span>${sel('align', [['left', 'Left'], ['center', 'Centre'], ['right', 'Right'], ['justify', 'Justified']], f.align)}</label><label class="f"><span>Lines (at most)</span>${sel('lines', [1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => [n, n]), f.lines)}</label></div>
      <div class="tdsize"><label class="f"><span>Font size (pixels)</span><div class="row nowrap" style="gap:6px"><button type="button" class="btn secondary sm" data-act="tdSize" data-d="-2" aria-label="Smaller text">A−</button><input type="number" data-tf="size" min="0" max="600" value="${f.size || ''}" placeholder="automatic" style="flex:1;min-width:0"><button type="button" class="btn secondary sm" data-act="tdSize" data-d="2" aria-label="Larger text">A+</button></div><span class="hint" id="tdsizehint"></span></label>
        <label class="f"><span>Line spacing</span>${sel('lh', [[0, 'Automatic'], [1, 'Tight (1.0)'], [1.15, 'Normal (1.15)'], [1.3, 'Relaxed (1.3)'], [1.5, 'Open (1.5)'], [1.8, 'Airy (1.8)']], f.lh || 0)}</label></div>
      <label class="chk"><input type="checkbox" data-tf="exact" ${f.exact ? 'checked' : ''}> Use exactly this size (do not shrink to fit the box)</label>
      <div class="row gap-s"><label class="chk"><input type="checkbox" data-tf="italic" ${f.italic ? 'checked' : ''}> <i>Italic</i></label><label class="chk"><input type="checkbox" data-tf="caps" ${f.caps ? 'checked' : ''}> CAPITAL LETTERS</label></div>
      <p class="hint">Leave the size empty to fit the box automatically. With a size set, the text starts at that size and only shrinks if it does not fit, unless you tick &quot;exactly&quot;. Words wrap onto the next line.</p>` : ''}
    <details class="tdnums"><summary>Exact position and size (pixels)</summary><div class="formgrid">${['x', 'y', 'w', 'h'].map(k => html`<label class="f"><span>${{ x: 'Left', y: 'Top', w: 'Width', h: 'Height' }[k]}</span><input type="number" data-tf="${k}" value="${f[k]}" min="0"></label>`)}</div></details>
    <button type="button" class="btn ghost sm" data-act="tdRemove">${icon('trash')} Remove this box</button></div>`);
}
function tdPaint() { tdBoxes(); tdList(); tdField(); }
actions.tdToken = el => {
  const ta = $('#tdvalue'), tok = `{${el.dataset.k}:${TD.tokStyle || 'b'}}`, a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a;
  ta.value = ta.value.slice(0, a) + tok + ta.value.slice(b); TD.fields[TD.sel].value = ta.value; tdField(); const n = $('#tdvalue'); n.focus(); n.setSelectionRange(a + tok.length, a + tok.length);
};
actions.tdSel = el => { TD.sel = Number(el.dataset.i); tdPaint(); };
actions.tdAdd = el => { if (!TD.img) return toast('Choose the template image first', true); TD.fields.push(newField(el.dataset.t, TD.fields.length + 1, TD.w, TD.h)); TD.sel = TD.fields.length - 1; tdPaint(); };
actions.tdRemove = () => { TD.fields.splice(TD.sel, 1); TD.sel = Math.max(0, TD.sel - 1); tdPaint(); };
const tdObject = () => ({ width: TD.w, height: TD.h, kind: TD.kind, fields: TD.fields.map((f, i) => ({ ...f, id: 'f' + (i + 1) })) });
actions.tdPreview = async () => {
  if (!TD.img) return toast('Choose the template image first', true);
  const t = tdObject(), m = modal(html`<h2>Preview with sample text</h2><canvas id="tdpv" style="width:100%;border-radius:12px;box-shadow:var(--shadow)"></canvas><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" data-act="closeModal">Close</button></div>`, { wide: true });
  const cv = $('#tdpv', m), k = Math.min(1, 1200 / t.width); cv.width = Math.round(t.width * k); cv.height = Math.round(t.height * k);
  await ensureFonts(t);
  const c = cv.getContext('2d'); c.scale(k, k); const values = {}; t.fields.forEach(f => { values[f.id] = CERT_SAMPLE[f.src] ?? ('Sample ' + f.label); });
  drawTemplate(c, t, { img: TD.img, photo: null, values, merge: CERT_SAMPLE, logo: null, exporting: false, showEmpty: true });
};
forms.tplSave = async f => {
  if (!TD.img) throw new Error('Choose the template image first');
  if (!TD.fields.length) throw new Error('Add at least one text box');
  const v = fd(f), body = { title: v.title, kind: v.kind, category: v.category, active: !!v.active, fields: TD.fields, width: TD.w, height: TD.h };
  const t = { ...tdObject(), kind: v.kind };
  $('[data-err]', f).innerHTML = '<div class="alert info">Saving the template…</div>';
  body.thumb = await templateThumb(t, TD.img);
  if (TD.id) { if (TD.file) { body.mime = TD.file.type; body.data = await toB64(TD.file); } await api('/api/staff/templates/' + TD.id, 'PUT', body); }
  else { body.mime = TD.file.type; body.data = await toB64(TD.file); await api('/api/staff/templates', 'POST', body); }
  f.closest('.overlay').close(); toast('Template saved'); apTemplates($('#pg'));
};
