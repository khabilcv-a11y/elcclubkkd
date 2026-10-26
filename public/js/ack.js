'use strict';
// ---- certification link for a village officer without a login (#/ack/<token>) ----
let ACK_TOKEN = null;
async function renderAck(token) {
  ACK_TOKEN = token;
  show($('#app'), publicShell(html`<div class="loading"><div class="spin"></div>Loading the report…</div>`));
  let r;
  try { r = await api('/api/ack/' + encodeURIComponent(token)); }
  catch (e) { return show($('#app'), publicShell(html`<div class="wrap section"><div class="alert err">${e.message}</div></div>`)); }
  const t = r.totals;
  show($('#app'), publicShell(html`<div class="wrap" style="max-width:900px;padding-top:26px">
    ${pageHead(`${r.village} · certification`, `Electoral Literacy Club activity by ${r.college}${r.taluk ? `, ${r.taluk} taluk` : ''}.`, '', 'Village officer')}
    <div class="kpis" style="margin-bottom:16px">${kpi('Field days', t.days, { ic: 'calendar' })}${kpi('Shifts worked', t.attended, { ic: 'users' })}${kpi('People reached', t.addressed, { ic: 'megaphone', tone: 'saffron' })}${kpi('Registered', t.registered, { ic: 'user-check', tone: 'green' })}</div>
    <div class="card pad0"><div class="tablewrap"><table><thead><tr><th>Date</th><th>Student</th><th>Attendance</th><th class="num">Reached</th><th class="num">Registered</th></tr></thead><tbody>
      ${r.days.flatMap(d => d.volunteers.length ? d.volunteers.map((v, i) => html`<tr><td>${i ? '' : fdate(d.date)}</td><td>${v.name}</td><td>${v.attended === 1 ? badge('Present', 'ok') : v.attended === 0 ? badge('Absent', 'danger') : '—'}</td><td class="num">${v.attended === 1 ? v.addressed : '—'}</td><td class="num">${v.attended === 1 ? v.registered : '—'}</td></tr>`) : [html`<tr><td>${fdate(d.date)}</td><td colspan="4" class="muted">No students listed</td></tr>`])}</tbody></table></div></div>
    ${r.days.some(d => d.media.length) ? html`<h3 style="margin:22px 0 10px">Field photos</h3><div class="photogrid">${r.days.flatMap(d => d.media.map(m => html`<figure><img src="/api/ack/${token}/photos/${m.id}" alt="Field day ${d.date}" loading="lazy"></figure>`))}</div>` : ''}
    <div class="card" style="margin-top:22px">${r.status === 'acknowledged' ? html`<h3>${icon('certificate')} Certified</h3><p style="margin-top:6px">Certified by <b>${r.ack_name}</b>${r.ack_designation ? `, ${r.ack_designation}` : ''} on ${fdt(r.ack_at)}. Thank you.</p>`
      : r.status === 'submitted' ? html`<h3>Is this report correct?</h3><p class="muted" style="margin:6px 0 12px">Your certification confirms the club carried out this activity in your village. Certificates are issued on the strength of it.</p>
        <form data-form="ack" class="stack-s"><div class="formgrid"><label class="f"><span>Your name</span><input type="text" name="name" required maxlength="100"></label><label class="f"><span>Designation</span><input type="text" name="designation" maxlength="100" placeholder="Village Officer"></label></div>
        <label class="f"><span>Remarks (needed if something is wrong)</span><textarea name="remarks" maxlength="500"></textarea></label><div data-err></div>
        <div class="row"><button class="btn green lg" type="submit" data-a="acknowledge">${icon('certificate')} Certify</button><button class="btn secondary lg" type="submit" data-a="query">Ask for a correction</button></div></form>`
      : html`<h3>Nothing to do right now</h3><p class="muted" style="margin-top:6px">This report isn't waiting for certification. If the college has corrected it, the district office will share a fresh link.</p>`}</div></div>`));
}
forms.ack = async (f, e) => {
  const action = (e.submitter && e.submitter.dataset.a) || 'acknowledge', v = fd(f);
  if (action === 'acknowledge' && !(await confirmBox('Confirm you have reviewed this report and certify it?', 'Certify'))) return;
  await api('/api/ack/' + encodeURIComponent(ACK_TOKEN), 'POST', { action, name: v.name, designation: v.designation || '-', remarks: v.remarks });
  toast(action === 'acknowledge' ? 'Certified. Thank you!' : 'Sent back to the college for correction');
  renderAck(ACK_TOKEN);
};
