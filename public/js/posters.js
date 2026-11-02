'use strict';
// ---- college / school workspace: posters and banners. Pick a template, fill in the text, download it as JPG or PDF ----
let PST = null;   // the poster being edited

async function pgPosters(el) {
  const list = await api('/api/templates?kind=poster');
  const cats = [...new Set(list.map(t => t.category || 'Posters'))];
  show(el, html`${pageHead('Posters and banners', 'Pick a design from the district office, type in your details, then download it as a JPG or PDF and print it.', '', 'Campus to booth')}
    ${list.length ? cats.map(c => html`<h3 class="tplgroup">${c}</h3><div class="tplgrid">${list.filter(t => (t.category || 'Posters') === c).map(t => tplCard(t, `data-act="posterOpen" data-id="${t.id}"`))}</div>`)
      : html`<div class="card">${empty('No posters yet', 'The district office will add poster and banner designs here soon.', 'image')}</div>`}`);
  window.__poster_list = list;
}

actions.posterOpen = async el => {
  const t = window.__poster_list.find(x => x.id === Number(el.dataset.id)); if (!t) return;
  await document.fonts?.load?.('800 40px Inter').catch(() => {});
  const [img, logo] = await Promise.all([loadImg(`/api/templates/${t.id}/image`), COL.college.logo_v ? loadImg(logoUrl(COL.college.id, COL.college.logo_v)) : null]);
  const inputs = t.fields.filter(f => f.type === 'text' && f.src !== 'fixed');
  PST = { t, img, logo, values: Object.fromEntries(inputs.map(f => [f.id, f.src === 'college' ? COL.college.name : ''])) };
  const m = modal(html`<h2>${t.title}</h2>
    <div class="edgrid"><div class="edpreview"><canvas id="pscv" aria-label="Preview of the poster"></canvas></div>
      <form data-form="posterNoop" class="stack-s edform">
        ${inputs.length ? inputs.map(f => html`<label class="f"><span>${f.label}</span>${f.lines > 1 ? html`<textarea data-pf="${f.id}" rows="${Math.min(f.lines, 4)}" maxlength="300">${PST.values[f.id]}</textarea>` : html`<input type="text" data-pf="${f.id}" maxlength="200" value="${PST.values[f.id]}">`}</label>`) : html`<p class="muted">This design needs no typing: just download it.</p>`}
        ${t.fields.some(f => f.type === 'logo') && !logo ? html`<p class="hint">This design has a place for your logo. Add your logo from the <b>Logo</b> button at the top of the page and it will appear here.</p>` : ''}
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Close</button><button type="button" class="btn secondary" data-act="posterJpg">${icon('download')} Download JPG</button><button type="button" class="btn primary" data-act="posterPdf">${icon('printer')} Download PDF</button></div></form></div>`, { wide: true });
  m.addEventListener('input', e => { const id = e.target.dataset.pf; if (id) { PST.values[id] = e.target.value; paintPoster(); } });
  new ResizeObserver(() => paintPoster()).observe($('.edpreview', m));
  setTimeout(paintPoster, 40);
};
function paintPoster() {
  const cv = $('#pscv'); if (!cv || !PST) return;
  const { t } = PST, pw = cv.clientWidth || 520, k = pw / t.width;
  cv.width = Math.round(t.width * k); cv.height = Math.round(t.height * k); cv.style.aspectRatio = `${t.width} / ${t.height}`;
  const c = cv.getContext('2d'); c.scale(k, k);
  drawTemplate(c, t, { img: PST.img, photo: null, values: PST.values, logo: PST.logo, exporting: false, showEmpty: true });
}
async function posterBlob() {
  const { t } = PST, k = Math.min(1, 3400 / Math.max(t.width, t.height)), cv = document.createElement('canvas'); cv.width = Math.round(t.width * k); cv.height = Math.round(t.height * k);
  const c = cv.getContext('2d'); c.scale(k, k);
  drawTemplate(c, t, { img: PST.img, photo: null, values: PST.values, logo: PST.logo, exporting: true });
  return { blob: await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.92)), w: cv.width, h: cv.height };
}
actions.posterJpg = async () => { const { blob } = await posterBlob(); saveBlob(blob, `${slug(PST.t.title)}-${slug(COL.college.short_name || COL.college.name)}.jpg`); toast('Downloaded'); };
actions.posterPdf = async () => { const { blob, w, h } = await posterBlob(); saveBlob(await jpegToPdf(blob, w, h), `${slug(PST.t.title)}-${slug(COL.college.short_name || COL.college.name)}.pdf`); toast('PDF ready'); };
forms.posterNoop = () => {};
