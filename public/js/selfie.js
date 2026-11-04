'use strict';
// ---- Selfie contest: the public page (details and the official order) and, inside the college or school workspace, the page to send students' selfies ----
let SF = { max: 5, d: null };
const SF_ORDER = { pdf: '/docs/selfie-contest-order.pdf', img: '/docs/selfie-contest-order.png', no: 'EE2/135/2026/Elec.', date: '22 October 2026' };

async function renderSelfie() {
  if (!feat('public', 'selfie')) { location.hash = '#/'; return; }
  show($('#app'), publicShell(html`<div class="wrap section"><div class="loading"><div class="spin"></div>Loading the contest…</div></div>`, 'selfie'));
  let d; try { d = await api('/api/public/selfie'); } catch (e) { d = { open: false, max_photos: 5 }; }
  SF = { max: d.max_photos || 5, d };
  show($('#app'), publicShell(html`
  <section class="hero sf-hero"><div class="wrap sf-hero-in"><div>
      <span class="eyebrow"><span class="live"></span> Campus to booth · for students</span>
      <h1>The <em>Selfie</em> Contest</h1>
      <p class="lead">Show us your Campus to Booth moment. Take a selfie at your help desk, with the voter pledge, at the booth, in the middle of the campaign, and give it to your ELC coordinator to send in. The best three of Kozhikode go to the Chief Electoral Officer, Kerala.</p>
      <div class="row"><a class="btn accent lg" href="#/selfie" data-act="sfGo" data-to="sfform">${icon('camera')} How to send</a><a class="btn outline-light lg" href="#/selfie" data-act="sfGo" data-to="sforder">${icon('file')} Read the official order</a></div></div>
    <div class="sf-art" aria-hidden="true"><div class="sf-phone"><div class="sf-screen"><span class="sf-face">${icon('camera')}</span><i class="sf-ring"></i><b>Say cheese, vote smart</b></div></div><span class="sf-chip c1">${icon('check-circle')} Pledge</span><span class="sf-chip c2">${icon('users')} Together</span><span class="sf-chip c3">${icon('award')} NVD 2027</span></div></div></section>

  <section class="section"><div class="wrap"><div class="sf-facts">
    <article class="sf-fact rv"><span class="ico">${icon('users')}</span><h3>Who can take part</h3><p>Students of colleges and higher secondary schools taking part in the Campus to Booth programme.</p></article>
    <article class="sf-fact rv"><span class="ico">${icon('camera')}</span><h3>What to send</h3><p>Selfies taken during the Campus to Booth programme. You can send more than one picture in a single entry.</p></article>
    <article class="sf-fact rv"><span class="ico">${icon('trophy')}</span><h3>What you can win</h3><p>The best three entries of the district are sent to the office of the Chief Electoral Officer, Kerala. The top entries are awarded on <b>National Voters Day 2027</b>.</p></article></div></div></section>

  <section class="section sf-steps-sec"><div class="wrap"><div class="section-head"><div><h2>How it works</h2><p>Four easy steps from your phone.</p></div></div>
    <ol class="sf-steps">${[['camera', 'Take your selfie', 'During the Campus to Booth programme: at the help desk, a rally, a class campaign or the pledge.'], ['upload', 'Give it to your ELC', 'Your ELC coordinator adds your name and selfies in the portal. The pictures are resized automatically, so it is quick.'], ['filter', 'District selection', 'The district election office looks through every entry and picks the best three of Kozhikode.'], ['award', 'State level', 'The three go to the CEO, Kerala. Top entries are awarded on National Voters Day 2027.']].map(([ic, t, p], i) => html`<li class="rv"><span class="n">${i + 1}</span><span class="ico">${icon(ic)}</span><h3>${t}</h3><p>${p}</p></li>`)}</ol></div></section>

  <section class="section" id="sforder"><div class="wrap"><div class="section-head"><div><h2>The official order</h2><p>The contest is held on the instruction of the Chief Electoral Officer, Kerala.</p></div></div>
    <div class="sf-order rv"><a class="sf-doc" href="${SF_ORDER.pdf}" target="_blank" rel="noopener" aria-label="Open the official order (PDF)"><img src="${SF_ORDER.img}" alt="First page of the order from the Chief Electoral Officer, Kerala, about the Campus to Booth selfie contest" loading="lazy"><span class="sf-pdf">PDF</span></a>
      <div class="sf-order-body"><span class="badge info">Attachment</span><h3>Special Summary Revision · Campus to Booth Programme · Selfie Contest</h3>
        <dl class="sf-meta"><div><dt>Issued by</dt><dd>Chief Electoral Officer &amp; Special Secretary to Government, Kerala</dd></div><div><dt>Order no.</dt><dd>${SF_ORDER.no}</dd></div><div><dt>Dated</dt><dd>${SF_ORDER.date}</dd></div><div><dt>Addressed to</dt><dd>All District Election Officers</dd></div></dl>
        <p class="sf-quote">District Election Officers are asked to conduct a selfie contest among the students of colleges and higher secondary schools during the Campus to Booth programme, and to forward the best three entries of each district to the office of the CEO, Kerala. The top entries will be awarded on National Voters Day 2027.</p>
        <div class="row"><a class="btn primary" href="${SF_ORDER.pdf}" target="_blank" rel="noopener">${icon('external')} Open the order</a><a class="btn secondary" href="${SF_ORDER.pdf}" download="Selfie-contest-order-CEO-Kerala.pdf">${icon('download')} Download PDF</a></div></div></div></div></section>

  <section class="section sf-form-sec" id="sfform"><div class="wrap"><div class="section-head"><div><h2>Send the entries</h2><p>Selfies are sent by the ELC coordinator from inside the portal, so the college or school details are already filled in.</p></div></div>
    <div class="sf-cta card">${d.open ? html`<span class="sf-cta-ico">${icon('camera')}</span><div class="sf-cta-txt"><h3>${ME.kind === 'college' ? 'Open the Selfie contest in your workspace' : 'Sign in to send your students’ selfies'}</h3><p>${ME.kind === 'college' ? 'Add each student’s name and up to ' + SF.max + ' selfies. Your institution is already known.' : 'Colleges and schools that have joined the campaign sign in with their ELC login. Not registered yet? You can register your school or college on the sign-in page.'}</p></div>
      <div class="row">${ME.kind === 'college' ? html`<a class="btn accent lg" href="#/me/selfie">${icon('camera')} Go to the contest</a>` : html`<a class="btn accent lg" href="#/login/college">${icon('building')} College sign-in</a><a class="btn secondary lg" href="#/login/school">${icon('book')} School sign-in</a>`}</div>`
      : html`${empty('Entries are closed', 'The selfie contest is not taking entries right now. Please check back with the district election office.', 'camera')}`}</div></div></section>`, 'selfie'));
}
actions.sfGo = (el, e) => { e.preventDefault(); document.getElementById(el.dataset.to)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); };

// ---- inside the college or school workspace: add the selfies of students (the institution is known, so only the student's name and pictures are typed) ----
let SFC = { files: [], d: null, busy: false };
async function pgSelfie(el) {
  const d = await api('/api/college/selfie'); SFC.d = d; SFC.max = d.max_photos; SFC.files.forEach(x => URL.revokeObjectURL(x.url)); SFC.files = [];
  const aud = d.institution;
  show(el, html`${pageHead('Selfie contest', 'Send the selfies of your students. The district office looks through every entry and sends the best three of Kozhikode to the Chief Electoral Officer, Kerala. Top entries are awarded on National Voters Day 2027.', html`<a class="btn secondary" href="#/selfie">${icon('file')} Contest details and the official order</a>`, 'Campus to booth')}
    ${d.open ? html`<form class="sf-form card" data-form="sfcSubmit" novalidate>
      <div class="sf-instbar">${icon('building')}<span>Entry from <b>${aud}</b></span></div>
      <div class="sf-form-grid"><div class="stack-s">
        <h3 class="sf-h">The student</h3>
        <label class="f"><span>Student's name *</span><input type="text" name="name" maxlength="100" required placeholder="Full name" autocomplete="off"></label>
        <div class="formgrid"><label class="f"><span>Class or course</span><input type="text" name="course" id="sfcourse" maxlength="80" placeholder="e.g. 2nd year BA, Plus Two" value="${esc(SFC.course || '')}"></label>
          <label class="f"><span>Student's mobile (optional)</span><input type="tel" name="phone" inputmode="tel" maxlength="14" placeholder="10-digit number"></label></div>
        <label class="f"><span>A line about the selfie (optional)</span><textarea name="caption" rows="2" maxlength="400" placeholder="Where and when was it taken?"></textarea></label></div>
      <div class="stack-s"><h3 class="sf-h">Selfies</h3>
        <label class="sf-drop" id="sfdrop" for="sfile"><input type="file" id="sfile" accept="image/*" multiple hidden><span class="ico">${icon('upload')}</span><b>Choose pictures</b><small>or take a new selfie · JPG, PNG or WebP · up to ${SFC.max}</small></label>
        <div class="sf-prev" id="sfprev" aria-live="polite"></div></div></div>
      <label class="chk" style="margin-top:12px"><input type="checkbox" name="consent" required> The selfie is the student's own, and the student (with a parent or guardian's consent if under 18) allows the election office to share it for this contest and the SVEEP campaign.</label>
      <div data-err></div><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn accent lg" type="submit">${icon('check-circle')} Send this entry</button></div></form>`
      : html`<div class="card">${empty('Entries are closed', 'The selfie contest is not taking entries right now.', 'camera')}</div>`}
    <div class="section-head" style="margin-top:26px"><div><h2>Sent from your institution</h2><p>${d.entries.length ? d.entries.length + ' entr' + (d.entries.length === 1 ? 'y' : 'ies') + ' so far.' : 'Nothing sent yet.'}</p></div></div>
    ${d.entries.length ? html`<div class="sfgrid">${d.entries.map(e => html`<article class="sfcard"><div class="sfthumb static"><img src="/api/college/selfie/photo/${e.photos[0].id}/thumb" alt="" loading="lazy" decoding="async">${e.photos.length > 1 ? html`<span class="sfn">${icon('image')} ${e.photos.length}</span>` : ''}${e.status === 'top3' ? html`<span class="sfst ok">Best three</span>` : e.status === 'shortlisted' ? html`<span class="sfst info">Shortlisted</span>` : ''}</div>
      <div class="sfbody"><b>${e.name}</b><span class="small muted">${e.course || ''}</span><span class="xs muted">${fdt(e.created_at)}</span>${e.status === 'new' ? html`<button class="btn sm danger" style="margin-top:6px" data-act="sfcDel" data-id="${e.id}">${icon('trash')} Withdraw</button>` : ''}</div></article>`)}</div>` : ''}`);
  sfPaint();
}
document.addEventListener('change', e => {
  if (e.target.id === 'sfile') {
    const room = SFC.max - SFC.files.length, add = [...e.target.files].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
    if (add.length > room) toast(`You can add ${SFC.max} pictures to one entry`, true);
    SFC.files.push(...add.slice(0, Math.max(0, room)).map(f => ({ f, url: URL.createObjectURL(f) }))); e.target.value = ''; sfPaint();
  }
});
function sfPaint() {
  const box = $('#sfprev'); if (!box) return;
  show(box, html`${SFC.files.map((x, i) => html`<figure class="sf-p"><img src="${x.url}" alt="Selfie ${i + 1}"><button type="button" class="sf-x" data-act="sfRm" data-i="${i}" aria-label="Remove picture ${i + 1}">${icon('x')}</button></figure>`)}${SFC.files.length ? html`<span class="sf-count">${SFC.files.length} of ${SFC.max}</span>` : ''}`);
  $('#sfdrop')?.classList.toggle('full', SFC.files.length >= SFC.max);
}
actions.sfRm = el => { const [x] = SFC.files.splice(Number(el.dataset.i), 1); if (x) URL.revokeObjectURL(x.url); sfPaint(); };
forms.sfcSubmit = async f => {
  if (SFC.busy) return;
  if (!SFC.files.length) throw new Error('Add at least one selfie');
  const v = fd(f), box = $('[data-err]', f), total = SFC.files.length;
  SFC.busy = true; let entry = null, done = 0;
  try {
    box.innerHTML = '<div class="alert info">Sending the entry…</div>';
    entry = await api('/api/college/selfie', 'POST', { name: v.name, course: v.course, phone: v.phone, caption: v.caption, consent: !!v.consent });
    for (const x of SFC.files) {
      box.innerHTML = `<div class="alert info">Uploading picture ${done + 1} of ${total}… please keep this page open.</div>`;
      const cv = await readPhoto(x.f, 2000), blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.85));
      await api(`/api/college/selfie/${entry.id}/photo`, 'POST', { mime: 'image/jpeg', orientation: cv.height > cv.width ? 'portrait' : 'landscape', thumb: await thumbB64(cv), data: await toB64(blob) });
      done++;
    }
  } catch (e) {
    SFC.busy = false;
    if (entry && !done) await api('/api/college/selfie/' + entry.id, 'DELETE').catch(() => {});
    throw new Error(done ? `${done} of ${total} pictures were sent before a problem: ${e.message}. The entry is saved with those pictures.` : e.message);
  }
  SFC.busy = false; SFC.course = v.course;      // the class is kept, since the next student is often from the same class
  toast(`Entry for ${v.name} sent`); await pgSelfie($('#pg'));
  $('input[name=name]')?.focus();
};
actions.sfcDel = async el => {
  if (!await confirmBox('Withdraw this entry and its pictures?', 'Withdraw', true)) return;
  await api('/api/college/selfie/' + el.dataset.id, 'DELETE'); toast('Entry withdrawn'); pgSelfie($('#pg'));
};
