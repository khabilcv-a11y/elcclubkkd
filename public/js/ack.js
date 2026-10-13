'use strict';
// ---- public village-officer acknowledgement page (#/ack/<token>) ----
let ACK_TOKEN = null;
async function renderAck(token) {
  ACK_TOKEN = token;
  show(app, html`<div class="loading">Loading report…</div>`);
  let r;
  try { r = await api('/api/ack/' + encodeURIComponent(token)); }
  catch (e) { return show(app, html`<div class="wrap app"><div class="err">${e.message}</div></div>`); }
  const t = r.totals;
  show(app, html`<div class="wrap app" style="max-width:860px">
    <span class="chip violet">Village officer acknowledgement</span>
    <h1 style="font-size:clamp(1.8rem,5vw,2.8rem);text-transform:uppercase;margin:8px 0">${r.village} <em style="font-style:normal;color:var(--violet)">report</em></h1>
    <p class="muted">Electoral Literacy Club activity by <b>${r.college}</b> in ${r.village}${r.taluk ? `, ${r.taluk} taluk` : ''}.</p>
    <div class="tiles" style="margin:18px 0"><div class="tile t1"><b>${t.days}</b><span>Field days</span></div><div class="tile t4"><b>${t.attended}</b><span>Volunteer-days</span></div>
      <div class="tile t3"><b>${n(t.addressed)}</b><span>People addressed</span></div><div class="tile t2"><b>${n(t.registered)}</b><span>Registered</span></div></div>
    <div class="tablewrap"><table><thead><tr><th>Date</th><th>Volunteer</th><th>Attended</th><th class="num">Addressed</th><th class="num">Registered</th></tr></thead><tbody>
      ${r.days.flatMap(d => d.volunteers.length ? d.volunteers.map((v, i) => html`<tr><td>${i ? '' : fdate(d.date)}</td><td>${v.name}</td><td>${v.attended === 1 ? '✅ Yes' : v.attended === 0 ? '❌ No' : '—'}</td><td class="num">${v.attended === 1 ? v.addressed : '—'}</td><td class="num">${v.attended === 1 ? v.registered : '—'}</td></tr>`) : [html`<tr><td>${fdate(d.date)}</td><td colspan="4" class="muted">No volunteers listed</td></tr>`])}</tbody></table></div>
    ${r.days.some(d => d.media.length) ? html`<h3 style="margin:22px 0 10px;text-transform:uppercase">Field photos</h3><div class="photogrid">${r.days.flatMap(d => d.media.map(m => html`<figure><img src="/api/ack/${token}/photos/${m.id}" alt="Field day ${d.date}" loading="lazy"></figure>`))}</div>` : ''}
    <div class="card" style="margin-top:22px">${r.status === 'acknowledged' ? html`<h3>✔ Acknowledged</h3><p>Acknowledged by <b>${r.ack_name}</b>${r.ack_designation ? `, ${r.ack_designation}` : ''} on ${fdt(r.ack_at)}. Thank you! This feeds the club's certificate.</p>`
      : r.status === 'submitted' ? html`<h3>Is this report correct?</h3><p class="muted">Your acknowledgement confirms the club genuinely carried out this activity in your village. It will be used when the District Collector issues certificates.</p>
        <form data-form="ack" class="stack"><div class="formgrid"><label class="f"><span>Your name</span><input type="text" name="name" required maxlength="100"></label>
        <label class="f"><span>Designation</span><input type="text" name="designation" maxlength="100" placeholder="e.g. Village Officer"></label></div>
        <label class="f"><span>Remarks (needed if something is wrong)</span><textarea name="remarks" maxlength="500"></textarea></label><div data-err></div>
        <div class="row"><button class="btn xl" name="action" value="acknowledge" type="submit" data-a="acknowledge">✔ Acknowledge</button><button class="btn white" type="submit" data-a="query">Ask for a correction</button></div></form>`
      : html`<h3>Nothing to do right now</h3><p>This report isn't waiting for acknowledgement. If the club has corrected it, you'll get a fresh email.</p>`}</div></div>`);
}
forms.ack = async (f, e) => {
  const action = (e.submitter && e.submitter.dataset.a) || 'acknowledge', v = fd(f);
  if (action === 'acknowledge' && !(await confirmBox('Confirm you have reviewed this report and acknowledge it?', 'Acknowledge'))) return;
  await api('/api/ack/' + encodeURIComponent(ACK_TOKEN), 'POST', { action, name: v.name, designation: v.designation || '-', remarks: v.remarks });
  toast(action === 'acknowledge' ? 'Acknowledged. Thank you! 🙏' : 'Sent back to the club for correction');
  renderAck(ACK_TOKEN);
};
