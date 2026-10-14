'use strict';
// ---- village officer workspace: Today · Verify · My villages · Announcements · Resources ----
let OV = null, OANN = [];
const vTone = v => (v === 'yes' ? 'ok' : v === 'no' ? 'danger' : 'warn');

async function renderOfficer(page = 'today') {
  if (!OV) show($('#app'), html`<div class="loading"><div class="spin"></div>Opening your workspace…</div>`);
  try { [OV, OANN] = await Promise.all([api('/api/officer/overview'), api('/api/announcements').catch(() => [])]); } catch (e) { return handleErr(e); }
  const unread = OANN.filter(a => !seenIds().includes(a.id)).length;
  const nav = [{ group: 'Your work', items: [{ id: 'today', label: 'Today', icon: 'calendar', count: OV.todayRows.length || 0 }, { id: 'verify', label: 'Verify attendance', icon: 'user-check', count: OV.queue.length }, { id: 'villages', label: 'My villages', icon: 'landmark', count: OV.pending }] },
    { group: 'Programme', items: [{ id: 'notices', label: 'Announcements', icon: 'megaphone', count: unread }, { id: 'resources', label: 'Resources', icon: 'book' }] }];
  const pages = { today: opToday, verify: opVerify, villages: opVillages, notices: opNotices, resources: opResources };
  if (!pages[page]) page = 'today';
  show($('#app'), consoleShell({ product: 'Village officer', who: OV.officer.name, role: OV.officer.designation || 'Village Officer', nav, active: page, base: '#/officer', content: html`<div id="pg"></div>` }));
  document.title = ({ today: 'Today', verify: 'Verify attendance', villages: 'My villages', notices: 'Announcements', resources: 'Resources' }[page]) + ' · Village officer';
  await pages[page]($('#pg'));
  announce(document.title);
}
const reloadOff = () => renderOfficer(location.hash.split('/')[2] || 'today');
const tel = p => (p ? html`<a href="tel:${String(p).replace(/[^\d+]/g, '')}">${p}</a>` : '—');

const studentRow = (v, canVerify = true) => html`<div class="stu" style="grid-template-columns:minmax(150px,1.4fr) minmax(110px,.8fr) minmax(120px,.7fr) auto">
  <div class="who"><b>${v.name}</b><small>${tel(v.contact)}</small></div>
  <div>${v.attended === 1 ? html`${badge('Present', 'ok')}<div class="small muted" style="margin-top:3px">${v.addressed} reached · ${v.registered} registered</div>` : v.attended === 0 ? badge('Absent', 'danger') : badge('Not marked yet', 'grey')}</div>
  <div>${v.attended == null ? '' : v.verified ? html`${badge(v.verified === 'yes' ? 'You confirmed' : 'You disputed', vTone(v.verified))}${v.verify_note ? html`<div class="small muted">${v.verify_note}</div>` : ''}` : badge('Awaiting your check', 'warn')}</div>
  <div class="row gap-s">${canVerify && v.attended != null ? html`<button class="btn sm green" data-act="verifyOne" data-ids="${v.id}" aria-label="Confirm ${v.name}">${icon('check')} Confirm</button><button class="btn sm danger" data-act="disputeOne" data-ids="${v.id}" data-name="${v.name}">${icon('x')} Dispute</button>` : ''}</div></div>`;

async function opToday(el) {
  const t = OV.todayRows, up = OV.upcoming;
  show(el, html`${pageHead('Today in your villages', fdateLong(OV.today), '', 'Village officer')}
    ${!OV.villages.length ? empty('No villages assigned to you yet', 'The district office will assign your villages.', 'landmark') : ''}
    ${OV.pending ? html`<div class="alert warn" style="margin-bottom:14px">${icon('certificate')}<div><b>${OV.pending} village${OV.pending > 1 ? 's are' : ' is'} waiting for your certification.</b> <a href="#/officer/villages">Review and certify</a></div></div>` : ''}
    ${t.length ? html`<div class="stack">${t.map(r => html`<div class="daycard"><div class="hd"><div><b>${r.village}</b> <span class="muted small">· ${r.college}</span></div><div class="row gap-s small muted">${icon('phone')} College coordinator: ${tel(r.college_phone)}</div></div>
        ${r.volunteers.length ? r.volunteers.map(v => studentRow(v)) : html`<div class="stu"><span class="muted">No students assigned for today.</span></div>`}
        ${r.volunteers.some(v => v.attended != null && !v.verified) ? html`<div class="ft"><span class="small muted">${r.photos ? `${r.photos} photo${r.photos > 1 ? 's' : ''} uploaded` : 'No photos uploaded'}</span><button class="btn primary sm" data-act="verifyOne" data-ids="${r.volunteers.filter(v => v.attended != null && !v.verified).map(v => v.id).join(',')}">${icon('check-circle')} Confirm all marked</button></div>` : ''}</div>`)}</div>`
      : OV.villages.length ? empty('No field work scheduled today', 'Students will appear here on the days they are working in your villages.', 'calendar') : ''}
    ${up.length ? html`<div class="card pad0" style="margin-top:20px"><div class="card-head pad"><h3>Coming up this week</h3></div><div class="tablewrap"><table><thead><tr><th>Date</th><th>Village</th><th>College</th><th>Students</th></tr></thead><tbody>
      ${up.map(r => html`<tr><td>${fdate(r.date)}</td><td><b>${r.village}</b></td><td>${r.college}</td><td>${r.volunteers.length ? r.volunteers.map(v => v.name).join(', ') : html`<span class="muted">Not assigned yet</span>`}</td></tr>`)}</tbody></table></div></div>` : ''}`);
}

async function opVerify(el) {
  const q = OV.queue;
  show(el, html`${pageHead('Verify attendance', 'Confirm the attendance the colleges recorded for earlier days, or dispute entries that are wrong.', '', 'Village officer')}
    ${q.length ? html`<div class="stack">${q.map(r => html`<div class="daycard"><div class="hd"><div><b>${r.village}</b> <span class="muted small">· ${r.college} · ${fdate(r.date)}</span></div>
      <button class="btn sm primary" data-act="verifyOne" data-ids="${r.volunteers.filter(v => v.attended != null && !v.verified).map(v => v.id).join(',')}">${icon('check-circle')} Confirm all</button></div>${r.volunteers.map(v => studentRow(v))}</div>`)}</div>`
      : empty('Everything is verified', 'Nothing is waiting for your check right now.', 'check-circle')}`);
}
actions.verifyOne = async el => {
  const ids = el.dataset.ids.split(',').map(Number); await api('/api/officer/verify', 'POST', { ids, decision: 'yes' }); toast(`Confirmed ${ids.length} ${ids.length > 1 ? 'entries' : 'entry'}`); reloadOff();
};
actions.disputeOne = el => modal(html`<h2>Dispute ${el.dataset.name}'s entry</h2><form data-form="dispute" data-ids="${el.dataset.ids}" class="stack-s"><label class="f"><span>What is wrong?</span><textarea name="note" required maxlength="300" placeholder="e.g. The student was not present in the village that day."></textarea></label><div data-err></div>
  <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn danger" type="submit">Dispute entry</button></div></form>`);
forms.dispute = async f => { await api('/api/officer/verify', 'POST', { ids: f.dataset.ids.split(',').map(Number), decision: 'no', note: fd(f).note }); f.closest('.overlay').close(); toast('Marked as incorrect. The college will see your note.'); reloadOff(); };

async function opVillages(el) {
  show(el, html`${pageHead('My villages', 'Review each village\'s record. When the college sends it to you and you are satisfied, certify the data. Certificates are issued on your certification.', '', 'Village officer')}
    ${OV.villages.length ? html`<div class="grid g2">${OV.villages.map(v => html`<div class="card rv"><div class="card-head"><h3>${v.name}</h3>${ackBadge(v.status)}</div>
      ${v.unallotted ? html`<p class="muted">No college has been allotted to this village yet.</p>` : html`<dl class="kv"><dt>College</dt><dd>${v.college}</dd><dt>Coordinator</dt><dd>${tel(v.college_phone)}${v.coordinator ? ` · ${v.coordinator}` : ''}</dd><dt>LSGI</dt><dd>${v.lsgi || '—'}</dd><dt>Progress</dt><dd>${v.totals.days} field days · ${v.totals.attended} shifts worked</dd>
        <dt>Results</dt><dd><b>${n(v.totals.registered)}</b> registered · ${n(v.totals.addressed)} reached</dd><dt>Your checks</dt><dd>${v.totals.verified} confirmed · ${v.totals.unverified} waiting${v.totals.disputed ? ` · <b style="color:var(--danger)">${v.totals.disputed} disputed</b>` : ''}</dd></dl>
        ${v.query_note ? html`<div class="alert warn" style="margin-top:12px">${icon('alert')}<div>Sent back for correction: ${v.query_note}</div></div>` : ''}
        ${v.status === 'acknowledged' ? html`<div class="alert ok" style="margin-top:12px">${icon('certificate')}<div>You certified this village on ${fdt(v.ack_at)}.</div></div>` : v.status === 'submitted' ? html`<div class="alert info" style="margin-top:12px">${icon('clock')}<div>The college sent this village to you on ${fdt(v.submitted_at)}. Please review and decide.</div></div>` : html`<p class="hint" style="margin-top:12px">The college has not sent this village for certification yet.</p>`}
        <div class="row" style="margin-top:14px"><button class="btn secondary" data-act="viewVillage" data-id="${v.id}">${icon('eye')} View full report</button>
          ${v.status === 'submitted' ? html`<button class="btn green" data-act="certify" data-a="${v.assignment_id}" data-name="${v.name}" data-un="${v.totals.unverified}">${icon('certificate')} Certify</button><button class="btn danger" data-act="sendBack" data-a="${v.assignment_id}" data-name="${v.name}">Send back</button>` : ''}</div>`}</div>`)}</div>` : empty('No villages assigned to you yet', '', 'landmark')}`);
}
actions.viewVillage = async el => {
  const r = await api('/api/officer/village/' + el.dataset.id);
  const m = modal(html`<h2>${r.village.name}: full report</h2><div class="small muted" style="margin-bottom:10px">${r.college} · ${r.village.lsgi || ''}</div>
    <div class="kpis" style="margin-bottom:12px">${kpi('Registered', r.totals.registered, { ic: 'user-check', tone: 'green' })}${kpi('Reached', r.totals.addressed, { ic: 'megaphone', tone: 'saffron' })}${kpi('Shifts worked', r.totals.attended, { ic: 'users' })}</div>
    <div class="tablewrap" style="max-height:46vh"><table><thead><tr><th>Date</th><th>Student</th><th>Attendance</th><th class="num">Reached</th><th class="num">Registered</th><th>Your check</th></tr></thead><tbody>
      ${r.days.flatMap(d => d.volunteers.length ? d.volunteers.map((v, i) => html`<tr><td>${i ? '' : fdate(d.date)}</td><td>${v.name}<div class="small muted">${v.contact}</div></td><td>${v.attended === 1 ? badge('Present', 'ok') : v.attended === 0 ? badge('Absent', 'danger') : badge('—', 'grey')}</td>
        <td class="num">${v.attended === 1 ? v.addressed : '—'}</td><td class="num">${v.attended === 1 ? v.registered : '—'}</td><td>${v.verified ? badge(v.verified === 'yes' ? 'Confirmed' : 'Disputed', vTone(v.verified)) : ''}</td></tr>`) : [html`<tr><td>${fdate(d.date)}</td><td colspan="5" class="muted">No students listed</td></tr>`])}</tbody></table></div>
    ${r.days.some(d => d.media.length) ? html`<h3 style="margin:16px 0 8px">Photos</h3><div class="photogrid">${r.days.flatMap(d => d.media.map(p => html`<figure><img src="/api/officer/photos/${p.id}" alt="Field day ${d.date}" loading="lazy"></figure>`))}</div>` : ''}
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn secondary" data-act="closeModal">Close</button></div>`, { wide: true });
};
actions.certify = el => modal(html`<h2>Certify ${el.dataset.name}</h2><p class="muted" style="margin-bottom:10px">By certifying, you confirm the attendance and the numbers the college recorded for this village are correct. The district collector issues certificates on your certification.</p>
  ${Number(el.dataset.un) ? html`<div class="alert warn" style="margin-bottom:10px">${icon('alert')}<div>${el.dataset.un} attendance entr${el.dataset.un === '1' ? 'y has' : 'ies have'} not been checked by you yet. You can still certify, or check them first under <a href="#/officer/verify" data-act="closeModal">Verify attendance</a>.</div></div>` : ''}
  <form data-form="certify" data-a="${el.dataset.a}" class="stack-s"><label class="f"><span>Remarks (optional)</span><textarea name="remarks" maxlength="500" placeholder="e.g. Verified on site on 12 and 13 November"></textarea></label><div data-err></div>
  <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn green" type="submit">${icon('certificate')} Yes, certify</button></div></form>`);
forms.certify = async f => { await api('/api/officer/certify', 'POST', { assignment_id: Number(f.dataset.a), action: 'certify', remarks: fd(f).remarks }); f.closest('.overlay').close(); toast('Certified. Thank you!'); reloadOff(); };
actions.sendBack = el => modal(html`<h2>Send ${el.dataset.name} back</h2><form data-form="sendBack" data-a="${el.dataset.a}" class="stack-s"><label class="f"><span>What needs correcting?</span><textarea name="remarks" required maxlength="500"></textarea></label><div data-err></div>
  <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn danger" type="submit">Send back to the college</button></div></form>`);
forms.sendBack = async f => { await api('/api/officer/certify', 'POST', { assignment_id: Number(f.dataset.a), action: 'query', remarks: fd(f).remarks }); f.closest('.overlay').close(); toast('Sent back to the college'); reloadOff(); };

async function opNotices(el) {
  show(el, html`${pageHead('Announcements', 'Messages from the district election office.', '', 'Programme')}${OANN.length ? html`<div class="stack-s">${OANN.map(a => html`<article class="notice ${a.pinned ? 'pinned' : ''}"><h3>${a.title} ${seenIds().includes(a.id) ? '' : badge('New', 'saffron')}</h3>${a.body ? html`<p>${a.body}</p>` : ''}<div class="when">${fdt(a.created_at)}</div></article>`)}</div>` : empty('No announcements', '', 'megaphone')}`);
  markSeen(OANN.map(a => a.id));
}
async function opResources(el) {
  const list = await api('/api/resources'), cats = [...new Set(list.map(r => r.category))].sort();
  show(el, html`${pageHead('Resource centre', 'Guides and forms for village officers.', '', 'Programme')}${list.length ? cats.map(c => html`<h3 style="margin:18px 0 8px">${c}</h3><div class="grid g2">${list.filter(r => r.category === c).map(resCard)}</div>`) : empty('Nothing shared yet', '', 'book')}`);
}
