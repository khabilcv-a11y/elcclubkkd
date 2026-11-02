'use strict';
// ---- college / school workspace: the institution's own details (coordinator, head of institution, contact) ----
async function pgProfile(el) {
  const d = await api('/api/college/profile'), p = d.profile, school = p.kind === 'school';
  show(el, html`${pageHead('Institution profile', `Keep your ${school ? 'school' : 'college'} details up to date. The district office uses them to reach your coordinator, and your coordinator's name appears on your records.`, '', 'Campus to booth')}
    ${p.profile_at ? '' : html`<div class="alert warn" style="margin-bottom:16px">${icon('alert')}<div><b>Please complete your profile.</b> Add the ELC coordinator's mobile number and the head of the institution, then save.</div></div>`}
    <div class="card"><form data-form="profileSave" class="stack-s">${detailFields(p, false)}<div data-err></div><div class="row"><button class="btn primary" type="submit">${icon('check')} Save details</button></div></form></div>`);
}
forms.profileSave = async f => { await api('/api/college/profile', 'PUT', fd(f)); toast('Details saved'); reloadCol(); };
