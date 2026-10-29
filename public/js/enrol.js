'use strict';
// ---- Campus to booth: school sign-up and the college / school enrolment page (total numbers only) ----
const QUALIFYING = '1 January 2027';   // students who are 18 (or 17 now and turn 18) by this date are eligible

// ---------- school sign-up ----------
function renderSchoolSignup() {
  if (!feat('public', 'school_signup')) { location.hash = '#/login/school'; return; }
  show($('#app'), publicShell(html`<div class="loginpage"><div class="logincard" style="max-width:520px"><div class="lg"><img src="${LOGO.sweepDark}" alt="SWEEP Kozhikode"></div>
    <h1>Register your school</h1><p class="sub">No Electoral Literacy Club yet? Register here and join the campus-to-booth drive.</p>
    <form data-form="schoolSignup" class="stack-s">
      <label class="f"><span>School name *</span><input type="text" name="name" required maxlength="160" autocomplete="organization"></label>
      <label class="f"><span>Address *</span><textarea name="address" required maxlength="300" rows="2"></textarea></label>
      <div class="formgrid"><label class="f"><span>Teacher in charge *</span><input type="text" name="coordinator" required maxlength="100"></label><label class="f"><span>Mobile number *</span><input type="tel" name="phone" required inputmode="tel"></label></div>
      <label class="f"><span>School email * (you will sign in with it)</span><input type="email" name="email" required autocomplete="email"></label>
      <div class="formgrid"><label class="f"><span>Choose a password *</span><input type="password" name="password" required minlength="8" autocomplete="new-password"><span class="hint">At least 8 characters. You can change it later.</span></label>
        <label class="f"><span>Repeat the password *</span><input type="password" name="password2" required minlength="8" autocomplete="new-password"></label></div>
      <div data-err></div><button class="btn primary lg" type="submit" style="width:100%">Register and continue</button>
      <p class="hint center">Already registered? <a href="#/login/school">Sign in</a></p></form></div></div>`, ''));
}
forms.schoolSignup = async f => {
  const v = fd(f); if (v.password !== v.password2) throw new Error('The two passwords do not match');
  await api('/api/public/school-signup', 'POST', v); await detectMe(); toast('Welcome! Your school is registered.'); location.hash = '#/me';
};

// ---------- the numbers ----------
const enrolKpis = t => html`<div class="kpis">${kpi('Total students', t.strength, { ic: 'users' })}${kpi('Registered', t.registered, { ic: 'user-check', tone: 'green' })}${kpi('Not eligible yet', t.ineligible, { ic: 'clock' })}${kpi('Balance to cover', t.balance, { ic: 'target', tone: 'saffron' })}</div>`;

actions.eligibility = () => modal(html`<h2>Who is eligible to register?</h2>
  <div class="stack-s"><p><b>Eligible:</b> a student who is already 18, or who is 17 now and will complete 18 on or before <b>${QUALIFYING}</b> (the qualifying date).</p>
    <p><b>Not eligible yet:</b> a student who will not be 18 by ${QUALIFYING}. Do not count them in the balance to cover.</p>
    <p><b>Registered:</b> a student whose name is already on the electoral roll.</p>
    <p class="small muted">The balance to cover is the eligible students who are not yet registered. They can apply with Form 6 at <a href="https://voters.eci.gov.in" target="_blank" rel="noopener">voters.eci.gov.in</a>, or call the helpline <b>1950</b>.</p></div>
  <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" data-act="closeModal">Got it</button></div>`);

// ---------- the college / school page ----------
async function pgEnrol(el) {
  const d = await api('/api/college/enrol'), e = d.entry || { strength: '', registered: '', ineligible: '' }, t = d.totals;
  show(el, html`${pageHead('Enrolment drive', 'Campus to booth: every eligible student on the electoral roll. Enter your total numbers and keep them up to date as more students register.', '', 'Campus to booth')}
    <div class="card" style="margin-bottom:16px"><div class="row between"><b>${t.pct == null ? 'Enter your numbers to see your coverage' : t.pct + '% of eligible students registered'}</b><button class="btn ghost sm" data-act="eligibility">${icon('help')} Who is eligible?</button></div>
      <div class="small muted" style="margin:2px 0 4px">${t.pct == null ? 'Target: 100%' : `${n(t.registered)} registered · ${n(t.balance)} still to cover · target 100%`}</div>${progress(t.pct || 0, t.pct >= 100 ? 'green' : 'saffron')}</div>
    <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${icon('edit')} Your total numbers</h3>${d.entry?.updated_at ? html`<span class="small muted">Updated ${fdt(d.entry.updated_at)}</span>` : ''}</div>
      <form data-form="enrolSave" class="stack-s"><div class="formgrid">
        <label class="f"><span>Total students</span><input type="number" name="strength" min="0" inputmode="numeric" required value="${e.strength}" placeholder="0"></label>
        <label class="f"><span>Registered (already on the electoral roll)</span><input type="number" name="registered" min="0" inputmode="numeric" required value="${e.registered}" placeholder="0"></label>
        <label class="f"><span>Not eligible yet (will not be 18 by ${QUALIFYING})</span><input type="number" name="ineligible" min="0" inputmode="numeric" required value="${e.ineligible}" placeholder="0"></label></div>
        <div class="campus-facts" id="enlive"></div><div data-err></div>
        <div class="row"><button class="btn primary" type="submit">${icon('check')} Save my numbers</button></div></form></div>
    ${enrolKpis(t)}`);
  const f = $('form[data-form=enrolSave]', el), live = () => {
    const v = fd(f), s = Number(v.strength) || 0, r = Number(v.registered) || 0, i = Number(v.ineligible) || 0, elg = Math.max(0, s - i), bal = Math.max(0, elg - r);
    show($('#enlive'), html`<div><b>${elg}</b><span>eligible</span></div><div><b>${bal}</b><span>balance to cover</span></div><div><b>${elg ? Math.min(100, Math.round(r * 100 / elg)) + '%' : '—'}</b><span>covered</span></div>`);
  };
  f.addEventListener('input', live); live();
}
forms.enrolSave = async f => { const v = fd(f); await api('/api/college/enrol', 'PUT', { strength: v.strength, registered: v.registered, ineligible: v.ineligible }); toast('Numbers saved'); reloadCol(); };

// ---------- home page of a college / school workspace while the village programme is off ----------
async function pgHomeCampaign(el) {
  const [d, ds] = await Promise.all([api('/api/college/enrol'), api('/api/college/desk/summary').catch(() => null)]);
  const school = COL.college.kind === 'school', t = d.totals;
  const tiles = [['enrol', 'target', 'Enrolment drive', d.entry ? `${n(t.registered)} registered · ${pct(t.pct)} covered` : 'Enter your total numbers'],
    ['desk', 'clipboard', 'Daily help-desk report', ds ? `${n(ds.registrations)} registrations · ${ds.days} day${ds.days === 1 ? '' : 's'} reported` : 'Record registrations and volunteers each day'], ['gallery', 'camera', 'Gallery and photo frames', 'Make framed photos of your events and share them']]
    .filter(([id]) => feat(school ? 'school' : 'college', id));
  show(el, html`${pageHead(`Welcome, ${COL.college.short_name || COL.college.name}`, 'Campus to booth: bring every eligible student onto the electoral roll.', '', school ? 'School workspace' : 'College workspace')}
    ${COL.college.logo_v ? '' : html`<div class="card" style="margin-bottom:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">${avatar(COL.college.id, null, COL.college.name, 48)}<div class="grow"><b>Add your ${school ? 'school' : 'college'} logo</b><div class="small muted">It will appear next to your name on the public ranking, gallery and album.</div></div><button class="btn primary" data-act="logoModal">${icon('image')} Add logo</button></div>`}
    <div class="card" style="margin-bottom:16px"><b>${t.pct == null ? 'Start by entering your total numbers' : t.pct + '% of eligible students registered'}</b><div class="small muted">${t.pct == null ? 'Target: 100%' : `${n(t.registered)} registered · ${n(t.balance)} still to cover · target 100%`}</div>${progress(t.pct || 0, t.pct >= 100 ? 'green' : 'saffron')}</div>
    ${enrolKpis(t)}
    <div class="grid g3" style="margin-top:16px">${tiles.map(([id, ic, ti, sub]) => html`<a class="card rv hometile" href="#/me/${id}" style="text-decoration:none;color:inherit"><span class="kpi" style="padding:0;border:0;box-shadow:none"><span class="ico" style="position:static;width:42px;height:42px">${icon(ic)}</span></span><h3 style="margin:10px 0 4px">${ti}</h3><p class="small muted">${sub}</p></a>`)}</div>
    ${CANN.length ? html`<h3 style="margin:22px 0 8px">Latest announcements</h3><div class="stack-s">${CANN.slice(0, 3).map(a => html`<article class="notice ${a.pinned ? 'pinned' : ''}"><h3>${a.title}</h3>${a.body ? html`<p>${a.body}</p>` : ''}<div class="when">${fdt(a.created_at)}</div></article>`)}</div>` : ''}`);
}

// ---------- the college's logo ----------
let LOGO_NEW = null;
async function logoPrepare(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("That file isn't a readable picture")); i.src = url; });
    for (const [size, q] of [[192, 0.85], [192, 0.7], [160, 0.7], [128, 0.65], [96, 0.6]]) {
      const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d');
      const k = Math.min(size * 0.92 / img.width, size * 0.92 / img.height); c.drawImage(img, (size - img.width * k) / 2, (size - img.height * k) / 2, img.width * k, img.height * k);
      let out = cv.toDataURL('image/webp', q);
      if (!out.startsWith('data:image/webp')) { c.globalCompositeOperation = 'destination-over'; c.fillStyle = '#fff'; c.fillRect(0, 0, size, size); out = cv.toDataURL('image/jpeg', q); }
      const b64 = out.split(',')[1];
      if (b64.length <= 40000) return { mime: out.slice(5, out.indexOf(';')), data: b64, url: out };
    }
    throw new Error('That picture is too detailed. Try a simpler logo.');
  } finally { URL.revokeObjectURL(url); }
}
actions.logoModal = () => {
  LOGO_NEW = null; const has = !!COL.college.logo_v;
  modal(html`<h2>Your logo</h2><p class="small muted" style="margin-bottom:12px">Your logo appears next to your name on the public ranking, the photo gallery and album, and in your workspace.</p>
    <div class="logoprev" id="logoprev">${avatar(COL.college.id, COL.college.logo_v, COL.college.name, 120)}</div>
    <div class="row" style="justify-content:center;margin:12px 0 4px"><label class="btn secondary">${icon('image')} Choose a picture<input type="file" id="logofile" accept="image/*" hidden></label></div>
    <p class="hint center">Square or round logos look best. The picture is resized for you.</p><div id="logoerr"></div>
    <div class="row" style="justify-content:space-between;margin-top:14px"><div>${has ? html`<button class="btn danger" data-act="logoRemove">Remove logo</button>` : ''}</div><div class="row"><button class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" id="logosave" data-act="logoSave" disabled>Save logo</button></div></div>`);
  $('#logofile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return; $('#logoerr').innerHTML = '';
    try { LOGO_NEW = await logoPrepare(f); $('#logoprev').innerHTML = `<img class="av" src="${LOGO_NEW.url}" alt="" style="width:120px;height:120px">`; $('#logosave').disabled = false; }
    catch (err) { LOGO_NEW = null; $('#logosave').disabled = true; $('#logoerr').innerHTML = `<div class="alert err" role="alert">${esc(err.message)}</div>`; }
  });
};
actions.logoSave = async el => { if (!LOGO_NEW) return; el.disabled = true; try { await api('/api/college/logo', 'PUT', { mime: LOGO_NEW.mime, data: LOGO_NEW.data }); el.closest('.overlay').close(); toast('Logo saved'); reloadCol(); } catch (e) { el.disabled = false; $('#logoerr').innerHTML = `<div class="alert err" role="alert">${esc(e.message)}</div>`; } };
actions.logoRemove = async el => { await api('/api/college/logo', 'DELETE'); el.closest('.overlay').close(); toast('Logo removed'); reloadCol(); };
