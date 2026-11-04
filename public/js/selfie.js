'use strict';
// ---- Selfie contest: the public page (details, the official order, and the entry form with several pictures) ----
let SF = { files: [], max: 5, d: null, busy: false };
const SF_ORDER = { pdf: '/docs/selfie-contest-order.pdf', img: '/docs/selfie-contest-order.png', no: 'EE2/135/2026/Elec.', date: '22 October 2026' };

async function renderSelfie() {
  if (!feat('public', 'selfie')) { location.hash = '#/'; return; }
  show($('#app'), publicShell(html`<div class="wrap section"><div class="loading"><div class="spin"></div>Loading the contest…</div></div>`, 'selfie'));
  let d; try { d = await api('/api/public/selfie'); } catch (e) { d = { open: false, institutions: [], max_photos: 5 }; }
  SF = { files: [], max: d.max_photos || 5, d, busy: false };
  const colleges = d.institutions.filter(i => i.kind !== 'school'), schools = d.institutions.filter(i => i.kind === 'school');
  show($('#app'), publicShell(html`
  <section class="hero sf-hero"><div class="wrap sf-hero-in"><div>
      <span class="eyebrow"><span class="live"></span> Campus to booth · for students</span>
      <h1>The <em>Selfie</em> Contest</h1>
      <p class="lead">Show us your Campus to Booth moment. Take a selfie at your help desk, with the voter pledge, at the booth, in the middle of the campaign, and send it in. The best three of Kozhikode go to the Chief Electoral Officer, Kerala.</p>
      <div class="row"><a class="btn accent lg" href="#/selfie" data-act="sfGo" data-to="sfform">${icon('camera')} Send your selfie</a><a class="btn outline-light lg" href="#/selfie" data-act="sfGo" data-to="sforder">${icon('file')} Read the official order</a></div></div>
    <div class="sf-art" aria-hidden="true"><div class="sf-phone"><div class="sf-screen"><span class="sf-face">${icon('camera')}</span><i class="sf-ring"></i><b>Say cheese, vote smart</b></div></div><span class="sf-chip c1">${icon('check-circle')} Pledge</span><span class="sf-chip c2">${icon('users')} Together</span><span class="sf-chip c3">${icon('award')} NVD 2027</span></div></div></section>

  <section class="section"><div class="wrap"><div class="sf-facts">
    <article class="sf-fact rv"><span class="ico">${icon('users')}</span><h3>Who can take part</h3><p>Students of colleges and higher secondary schools taking part in the Campus to Booth programme.</p></article>
    <article class="sf-fact rv"><span class="ico">${icon('camera')}</span><h3>What to send</h3><p>Selfies taken during the Campus to Booth programme. You can send more than one picture in a single entry.</p></article>
    <article class="sf-fact rv"><span class="ico">${icon('trophy')}</span><h3>What you can win</h3><p>The best three entries of the district are sent to the office of the Chief Electoral Officer, Kerala. The top entries are awarded on <b>National Voters Day 2027</b>.</p></article></div></div></section>

  <section class="section sf-steps-sec"><div class="wrap"><div class="section-head"><div><h2>How it works</h2><p>Four easy steps from your phone.</p></div></div>
    <ol class="sf-steps">${[['camera', 'Take your selfie', 'During the Campus to Booth programme: at the help desk, a rally, a class campaign or the pledge.'], ['upload', 'Send it here', 'Fill in the form below and add your pictures. They are resized on your phone, so it is quick.'], ['filter', 'District selection', 'The district election office looks through every entry and picks the best three of Kozhikode.'], ['award', 'State level', 'The three go to the CEO, Kerala. Top entries are awarded on National Voters Day 2027.']].map(([ic, t, p], i) => html`<li class="rv"><span class="n">${i + 1}</span><span class="ico">${icon(ic)}</span><h3>${t}</h3><p>${p}</p></li>`)}</ol></div></section>

  <section class="section" id="sforder"><div class="wrap"><div class="section-head"><div><h2>The official order</h2><p>The contest is held on the instruction of the Chief Electoral Officer, Kerala.</p></div></div>
    <div class="sf-order rv"><a class="sf-doc" href="${SF_ORDER.pdf}" target="_blank" rel="noopener" aria-label="Open the official order (PDF)"><img src="${SF_ORDER.img}" alt="First page of the order from the Chief Electoral Officer, Kerala, about the Campus to Booth selfie contest" loading="lazy"><span class="sf-pdf">PDF</span></a>
      <div class="sf-order-body"><span class="badge info">Attachment</span><h3>Special Summary Revision · Campus to Booth Programme · Selfie Contest</h3>
        <dl class="sf-meta"><div><dt>Issued by</dt><dd>Chief Electoral Officer &amp; Special Secretary to Government, Kerala</dd></div><div><dt>Order no.</dt><dd>${SF_ORDER.no}</dd></div><div><dt>Dated</dt><dd>${SF_ORDER.date}</dd></div><div><dt>Addressed to</dt><dd>All District Election Officers</dd></div></dl>
        <p class="sf-quote">District Election Officers are asked to conduct a selfie contest among the students of colleges and higher secondary schools during the Campus to Booth programme, and to forward the best three entries of each district to the office of the CEO, Kerala. The top entries will be awarded on National Voters Day 2027.</p>
        <div class="row"><a class="btn primary" href="${SF_ORDER.pdf}" target="_blank" rel="noopener">${icon('external')} Open the order</a><a class="btn secondary" href="${SF_ORDER.pdf}" download="Selfie-contest-order-CEO-Kerala.pdf">${icon('download')} Download PDF</a></div></div></div></div></section>

  <section class="section sf-form-sec" id="sfform"><div class="wrap"><div class="section-head"><div><h2>Send your entry</h2><p>Add up to ${SF.max} selfies. No sign-in is needed.</p></div></div>
    ${d.open ? html`<form class="sf-form card" data-form="sfSubmit" novalidate>
      <div class="sf-form-grid"><div class="stack-s">
        <h3 class="sf-h">About you</h3>
        <label class="f"><span>Your name *</span><input type="text" name="name" maxlength="100" autocomplete="name" required placeholder="Full name"></label>
        <label class="f"><span>College or school *</span><select name="college_id" id="sfcol" required><option value="">Choose from the list…</option>${colleges.length ? html`<optgroup label="Colleges">${colleges.map(c => html`<option value="${c.id}">${c.name}</option>`)}</optgroup>` : ''}${schools.length ? html`<optgroup label="Schools">${schools.map(c => html`<option value="${c.id}">${c.name}</option>`)}</optgroup>` : ''}<option value="other">My institution is not in the list</option></select></label>
        <label class="f hide" id="sfother"><span>Name of your college or school *</span><input type="text" name="institution" maxlength="160" placeholder="Type the full name"></label>
        <div class="formgrid"><label class="f"><span>Class or course</span><input type="text" name="course" maxlength="80" placeholder="e.g. 2nd year BA, Plus Two"></label>
          <label class="f"><span>Mobile number *</span><input type="tel" name="phone" inputmode="tel" autocomplete="tel" maxlength="14" required placeholder="10-digit number"></label></div>
        <label class="f"><span>Email (optional)</span><input type="email" name="email" maxlength="120" autocomplete="email"></label>
        <label class="f"><span>A line about your selfie (optional)</span><textarea name="caption" rows="2" maxlength="400" placeholder="Where and when was it taken?"></textarea></label>
        <input type="text" name="website" class="sf-hp" tabindex="-1" autocomplete="off" aria-hidden="true"></div>
      <div class="stack-s"><h3 class="sf-h">Your selfies</h3>
        <label class="sf-drop" id="sfdrop" for="sfile"><input type="file" id="sfile" accept="image/*" multiple hidden><span class="ico">${icon('upload')}</span><b>Choose pictures</b><small>or take a new selfie · JPG, PNG or WebP · up to ${SF.max}</small></label>
        <div class="sf-prev" id="sfprev" aria-live="polite"></div></div></div>
      <label class="chk" style="margin-top:12px"><input type="checkbox" name="consent" required> I confirm that these selfies are my own, and I allow the district election office to share them for this contest and the SVEEP campaign.</label>
      <div data-err></div><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn accent lg" type="submit">${icon('check-circle')} Submit my entry</button></div></form>
      <div class="sf-done card hide" id="sfdone" role="status"></div>`
      : html`<div class="card">${empty('Entries are closed', 'The selfie contest is not taking entries right now. Please check back with the district election office.', 'camera')}</div>`}</div></section>`, 'selfie'));
  sfPaint();
}
actions.sfGo = (el, e) => { e.preventDefault(); document.getElementById(el.dataset.to)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); };
document.addEventListener('change', e => {
  if (e.target.id === 'sfcol') { const o = e.target.value === 'other'; $('#sfother')?.classList.toggle('hide', !o); const i = $('#sfother input'); if (i) i.required = o; }
  if (e.target.id === 'sfile') {
    const room = SF.max - SF.files.length, add = [...e.target.files].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
    if (add.length > room) toast(`You can add ${SF.max} pictures to one entry`, true);
    SF.files.push(...add.slice(0, Math.max(0, room)).map(f => ({ f, url: URL.createObjectURL(f) }))); e.target.value = ''; sfPaint();
  }
});
function sfPaint() {
  const box = $('#sfprev'); if (!box) return;
  show(box, html`${SF.files.map((x, i) => html`<figure class="sf-p"><img src="${x.url}" alt="Selfie ${i + 1}"><button type="button" class="sf-x" data-act="sfRm" data-i="${i}" aria-label="Remove picture ${i + 1}">${icon('x')}</button></figure>`)}${SF.files.length ? html`<span class="sf-count">${SF.files.length} of ${SF.max}</span>` : ''}`);
  $('#sfdrop')?.classList.toggle('full', SF.files.length >= SF.max);
}
actions.sfRm = el => { const [x] = SF.files.splice(Number(el.dataset.i), 1); if (x) URL.revokeObjectURL(x.url); sfPaint(); };
forms.sfSubmit = async f => {
  if (SF.busy) return;
  if (!SF.files.length) throw new Error('Add at least one selfie');
  const v = fd(f), box = $('[data-err]', f);
  if (!v.college_id) throw new Error('Choose your college or school');
  if (v.college_id === 'other' && !String(v.institution || '').trim()) throw new Error('Type the name of your college or school');
  SF.busy = true;
  let entry = null, done = 0;
  try {
    box.innerHTML = '<div class="alert info">Sending your entry…</div>';
    entry = await api('/api/public/selfie', 'POST', { name: v.name, college_id: v.college_id === 'other' ? '' : v.college_id, institution: v.institution, course: v.course, phone: v.phone, email: v.email, caption: v.caption, consent: !!v.consent, website: v.website });
    for (const x of SF.files) {
      box.innerHTML = `<div class="alert info">Uploading picture ${done + 1} of ${SF.files.length}… please keep this page open.</div>`;
      const cv = await readPhoto(x.f, 2000), blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.85));
      await api(`/api/public/selfie/${entry.id}/photo`, 'POST', { key: entry.key, mime: 'image/jpeg', orientation: cv.height > cv.width ? 'portrait' : 'landscape', thumb: await thumbB64(cv), data: await toB64(blob) });
      done++;
    }
  } catch (e) {
    if (entry && !done) await api(`/api/public/selfie/${entry.id}/discard`, 'POST', { key: entry.key }).catch(() => {});
    SF.busy = false;
    throw new Error(done ? `${done} of ${SF.files.length} pictures were sent before a problem: ${e.message}. Your entry is saved; you can send the rest as a new entry.` : e.message);
  }
  SF.busy = false; const n = SF.files.length; SF.files.forEach(x => URL.revokeObjectURL(x.url)); SF.files = [];
  f.classList.add('hide'); const d = $('#sfdone'); d.classList.remove('hide');
  show(d, html`<span class="sf-tick">${icon('check-circle')}</span><h3>Thank you, ${String(v.name).split(' ')[0]}!</h3><p>Your entry with ${n} picture${n === 1 ? '' : 's'} has been received (entry no. <b>${entry.id}</b>). The district election office will look through all the entries.</p><div class="row" style="justify-content:center"><button class="btn secondary" data-act="sfAgain">${icon('plus')} Send another entry</button><a class="btn primary" href="#/">${icon('home')} Back to the home page</a></div>`);
  d.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
};
actions.sfAgain = () => renderSelfie();
