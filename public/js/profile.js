'use strict';
// ---- college / school workspace: the institution's own details (coordinator, head of institution, contact) ----
async function pgProfile(el) {
  const d = await api('/api/college/profile'), p = d.profile, school = p.kind === 'school';
  show(el, html`${pageHead('Institution profile', `Keep your ${school ? 'school' : 'college'} details up to date. The district office uses them to reach your coordinator, and your coordinator's name appears on your records.`, '', 'Campus to booth')}
    <div class="elcline">${icon('check-circle')} <span>ELC status: ${elcBadge(p.elc_status)}</span> <button type="button" class="linkbtn" data-act="elcAgain">${p.elc_status === 'yes' ? 'Change' : 'Update'}</button></div>
    ${p.profile_at ? '' : html`<div class="alert warn" style="margin-bottom:16px">${icon('alert')}<div><b>Please complete your profile.</b> Add the ELC coordinator's mobile number and the head of the institution, then save.</div></div>`}
    <div class="card"><form data-form="profileSave" class="stack-s">${detailFields(p, false)}<div data-err></div><div class="row"><button class="btn primary" type="submit">${icon('check')} Save details</button></div></form></div>`);
}
forms.profileSave = async f => { await api('/api/college/profile', 'PUT', fd(f)); toast('Details saved'); reloadCol(); };

// ---- ELC registration on ECINET: asked once per visit until the answer is Yes ----
const ELC_SITE = 'https://elc.eci.gov.in/', ELC_APP = 'https://play.google.com/store/apps/details?id=in.gov.eci.app', ELC_VIDEO = 'https://www.youtube-nocookie.com/embed/FbelFRtGTKU';
let ELC_ASKED = false;
const elcBadge = s => s === 'yes' ? badge('Registered on ECINET', 'ok') : s === 'no' ? badge('Not registered yet', 'danger') : badge('Not answered', 'grey');
function elcPop(inner, label) {
  const m = modal(html`<button type="button" class="mx" aria-label="Close">&times;</button>${inner}`, { label });
  m.addEventListener('click', e => { if (e.target.closest('.mx')) m.close(); });
  return m;
}
function elcAsk() {
  const m = elcPop(html`<h2>ELC registration</h2><p>Have you officially registered your institution's Electoral Literacy Club (ELC) on the ECINET App?</p>
    <div class="row" style="justify-content:flex-end;margin-top:20px"><button class="btn secondary" data-a="no">No</button><button class="btn primary" data-a="yes">Yes</button></div>`, 'ELC registration');
  m.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    try { await api('/api/college/elc-status', 'PUT', { status: b.dataset.a }); } catch (err) { return toast(err.message || 'Could not save. Try again.'); }
    if (COL) COL.college.elc_status = b.dataset.a;
    m.close(); elcShow(b.dataset.a);
    if (location.hash.endsWith('/profile')) reloadCol();
  });
}
function elcShow(ans) {
  if (ans === 'yes') elcPop(html`<h2>Track your application</h2><p>Track your application on the ELC website using the Tracking ID sent to your email/mobile. If approved, log in to your ELC portal from the same site.</p>
    <div class="row" style="justify-content:flex-end;margin-top:20px"><a class="btn primary" href="${ELC_SITE}" target="_blank" rel="noopener">Open ELC Website</a></div>`, 'Track your application');
  else elcPop(html`<h2>Register your ELC</h2><p>It takes only 5 minutes. Watch the short video, and register.</p>
    <iframe class="elcvid" src="${ELC_VIDEO}" title="How to register your ELC" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><a class="btn primary" href="${ELC_APP}" target="_blank" rel="noopener">Register My ELC</a></div>`, 'Register your ELC');
}
function elcGate() { if (ELC_ASKED || !COL || COL.college.elc_status === 'yes') return; ELC_ASKED = true; elcAsk(); }
actions.elcAgain = () => elcAsk();
