'use strict';
// ---- college dashboard: overview, villages, schedule, report ----
let COL = null, VLIST = null;
const TABS = [['overview', '🏠 Overview'], ['villages', '🏡 My villages'], ['schedule', '🗓️ 15-day plan'], ['report', '📊 My report']];

async function renderCollege(tab) {
  if (!COL) show(app, html`<div class="loading">Loading your dashboard…</div>`);
  try { COL = await api('/api/college/overview'); } catch (e) { return handleErr(e); }
  if (!TABS.some(t => t[0] === tab)) tab = 'overview';
  const pending = COL.requests.filter(r => r.status === 'pending').length;
  show(app, html`<div class="wrap app">
    <div class="apphead"><div><span class="chip violet">College portal</span><h1>${COL.college.short_name || COL.college.name} <em>HQ</em></h1><div class="muted">${COL.college.name} · ${COL.college.address}</div></div>
      <a class="btn white sm" href="#/">View public leaderboard</a></div>
    <div class="subnav" role="tablist">${TABS.map(([k, l]) => html`<button class="${k === tab ? 'on' : ''}" role="tab" data-act="tab" data-k="${k}">${l}${k === 'villages' && pending ? html`<span class="badge">${pending}</span>` : ''}</button>`)}</div>
    <div id="tab"></div></div>`);
  ({ overview: tabOverview, villages: tabVillages, schedule: tabSchedule, report: tabReport })[tab]();
}
actions.tab = el => { location.hash = '#/me/' + el.dataset.k; };
const reload = () => renderCollege((location.hash.split('/')[2]) || 'overview');

// ---------- overview ----------
async function tabOverview() {
  const s = COL.stats, pastUnmarked = COL.days.filter(d => d.date <= COL.today && (!d.volunteers.length || d.volunteers.some(v => v.attended == null)) && !COL.assignments.find(a => a.village_id === d.village_id)?.locked).length;
  let board = null; try { board = await api('/api/public/board'); } catch {}
  const me = board && board.colleges.find(c => c.id === s.id), above = me && board.colleges[me.rank - 2];
  const todo = [];
  if (!COL.assignments.length) todo.push(['⏳', 'Waiting for villages', 'The district admin hasn\'t allotted villages yet. You\'ll see them here as soon as they do.']);
  else if (!COL.days.length) todo.push(['🗓️', 'Schedule your 15 days', 'One tap on the 15-day plan tab sets every day across your villages.', 'schedule']);
  if (COL.days.some(d => !d.volunteers.length)) todo.push(['🙌', 'Add volunteers', 'Some days have no volunteers yet. Set 2 for each village block in one go.', 'schedule']);
  if (pastUnmarked) todo.push(['✅', `Mark attendance for ${pastUnmarked} day${pastUnmarked > 1 ? 's' : ''}`, 'Record who showed up, how many people were addressed and how many registered.', 'schedule']);
  const ready = COL.assignments.filter(a => !a.locked && a.totals.days && a.totals.attended && COL.days.filter(d => d.village_id === a.village_id).every(d => d.date <= COL.today && d.volunteers.length && d.volunteers.every(v => v.attended != null)));
  ready.forEach(a => todo.push(['📨', `${a.village_name} is ready to send`, 'All days are marked. Send it to the village officer for acknowledgement.', 'villages']));
  COL.assignments.filter(a => a.query_note && !a.locked).forEach(a => todo.push(['✏️', `${a.village_name}: officer asked for a correction`, a.query_note, 'schedule']));
  show($('#tab'), html`
    ${COL.certificate ? html`<div class="card" style="background:var(--lime);margin-bottom:18px"><h3>🏆 Certificate issued!</h3><p style="margin:0">Certificate no. <b>${COL.certificate.number}</b> was issued on ${fdt(COL.certificate.issued_at)}. Collect it from the District Election Office.</p></div>` : ''}
    <div class="grid g2" style="margin-bottom:18px">
      <div class="rankcard"><div class="rn"><small>#</small>${me ? me.rank : '–'}</div><div><b style="font-size:1.3rem">${n(s.score)} points</b><br>
        <span style="opacity:.85">${me ? (above ? `${n(above.score - s.score + 1)} pts to overtake ${above.short_name}` : 'You are leading the district! 👑') : ''}</span><br><a href="#/" style="color:var(--lime);font-weight:800">See the leaderboard →</a></div></div>
      <div class="card"><h3>What's next</h3>${todo.length ? html`<div class="steps">${todo.map(([e, t, d, go]) => html`<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span style="font-size:1.5rem">${e}</span><div class="grow"><b>${t}</b><div class="small muted">${d}</div></div>${go ? html`<button class="btn sm" data-act="tab" data-k="${go}">Go</button>` : ''}</div>`)}</div>` : html`<p class="muted" style="margin:0">You're all caught up. Nice! 🙌</p>`}</div>
    </div>
    <div class="tiles" style="margin-bottom:22px">
      <div class="tile t2"><i>📝</i><b data-count="${s.registered}">0</b><span>Registered</span></div>
      <div class="tile t3"><i>📣</i><b data-count="${s.addressed}">0</b><span>Addressed</span></div>
      <div class="tile t4"><i>✅</i><b>${pct(s.attendance_pct)}</b><span>Attendance</span></div>
      <div class="tile t1"><i>🙌</i><b data-count="${s.volunteers}">0</b><span>Volunteers</span></div>
      <div class="tile t5"><i>🗓️</i><b>${s.days_done}<small style="font-size:1.1rem">/${s.days_planned}</small></b><span>Days held</span></div>
    </div>
    <div class="card"><h3>Village progress</h3>${COL.assignments.length ? COL.assignments.map(a => {
      const tot = COL.days.filter(d => d.village_id === a.village_id), done = tot.filter(d => d.volunteers.some(v => v.attended === 1)).length;
      return html`<div style="margin-bottom:14px"><div class="row between"><b>${a.village_name}</b><span>${statusChip(a.ack_status)} <span class="small muted">${done}/${tot.length} days</span></span></div><div class="progress"><i style="width:${tot.length ? Math.round(done * 100 / tot.length) : 0}%"></i></div></div>`;
    }) : html`<div class="empty">No villages allotted yet.</div>`}</div>`);
  countUp($('#tab'));
}

// ---------- villages ----------
async function tabVillages() {
  VLIST = await api('/api/college/villages');
  const pendingFor = new Set(COL.requests.filter(r => r.status === 'pending').map(r => r.assignment_id));
  show($('#tab'), html`
    <div class="grid g2">${COL.assignments.length ? COL.assignments.map(a => html`<div class="card vcard"><div class="row between"><h4>🏡 ${a.village_name}</h4>${statusChip(a.ack_status)}</div>
      <dl class="kv"><dt>Taluk</dt><dd>${a.taluk || '—'}</dd><dt>Distance</dt><dd>${km(a.distance_km)} from campus (approx.)</dd>
        <dt>Village officer</dt><dd>${a.officer_name || 'Not on record yet'}</dd><dt>Officer contact</dt><dd>${[a.officer_phone, a.officer_email].filter(Boolean).join(' · ') || '—'}</dd>
        <dt>Progress</dt><dd>${a.totals.days} days · ${a.totals.attended} volunteer-days · ${n(a.totals.addressed)} addressed · <b>${n(a.totals.registered)} registered</b></dd></dl>
      ${a.query_note ? html`<div class="note">✏️ Officer feedback: ${a.query_note}</div>` : ''}
      ${a.ack_status === 'acknowledged' ? html`<div class="note" style="background:var(--lime)">Acknowledged by <b>${a.ack_name}</b>${a.ack_designation ? `, ${a.ack_designation}` : ''} on ${fdt(a.ack_at)}</div>` : ''}
      <div class="row"><button class="btn sm violet" data-act="submitVillage" data-v="${a.village_id}" ${a.locked ? 'disabled' : ''}>${a.ack_status === 'submitted' ? 'Sent ✔' : '📨 Send to village officer'}</button>
        <button class="btn sm white" data-act="reqChange" data-a="${a.id}" ${a.locked || pendingFor.has(a.id) ? 'disabled' : ''}>🔁 Request a different village</button></div></div>`)
      : html`<div class="empty" style="grid-column:1/-1">No villages allotted yet. Hang tight, or <button class="btn sm" data-act="reqChange" data-a="">pick a preferred village</button>.</div>`}</div>
    <div class="row" style="margin:18px 0 8px"><h3 style="font-size:1.4rem;text-transform:uppercase">Change requests</h3><button class="btn sm" data-act="reqChange" data-a="">＋ Ask for an extra village</button></div>
    ${COL.requests.length ? html`<div class="tablewrap"><table><thead><tr><th>Asked on</th><th>Swap</th><th>Reason</th><th>Status</th><th>Admin note</th><th></th></tr></thead><tbody>${COL.requests.map(r => html`<tr>
      <td>${fdt(r.created_at)}</td><td>${r.from_village ? html`${r.from_village} → <b>${r.to_village}</b>` : html`＋ <b>${r.to_village}</b>`}</td><td>${r.reason}</td>
      <td><span class="chip ${r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'pink' : 'warn'}">${r.status}</span></td><td>${r.admin_note || ''}</td>
      <td>${r.status === 'pending' ? html`<button class="btn sm danger" data-act="cancelReq" data-id="${r.id}">Withdraw</button>` : ''}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">No change requests. If a village is too far or unsuitable, ask for another and the admin will review it.</div>`}`);
}
actions.reqChange = el => {
  const aid = el.dataset.a;
  const m = modal(html`<h3>Request a village change</h3><form data-form="reqChange" class="stack">
    ${aid ? html`<input type="hidden" name="assignment_id" value="${aid}">` : html`<div class="note">This asks for an <b>additional</b> village. To swap an existing one, use “Request a different village” on its card.</div>`}
    ${aid ? html`<p>Swapping out <b>${COL.assignments.find(a => String(a.id) === String(aid))?.village_name}</b></p>` : ''}
    <label class="f"><span>Preferred village (nearest first)</span><select name="to_village_id" required><option value="">Choose…</option>
      ${VLIST.filter(v => !v.mine && !v.taken).map(v => html`<option value="${v.id}">${v.name} · ${v.taluk || ''} · ${km(v.distance_km)}</option>`)}</select><span class="small muted">Only free villages are listed. Villages already allotted to another college can't be chosen.</span></label>
    <label class="f"><span>Why?</span><textarea name="reason" required maxlength="500" placeholder="e.g. 38 km away, no direct bus for our volunteers"></textarea></label>
    <div data-err></div><div class="row" style="justify-content:flex-end"><button type="button" class="btn white" data-act="closeModal">Cancel</button><button class="btn pink" type="submit">Send request</button></div></form>`);
};
actions.closeModal = el => el.closest('.overlay').close();
forms.reqChange = async f => { await api('/api/college/requests', 'POST', fd(f)); f.closest('.overlay').close(); toast('Request sent to the admin 👍'); reload(); };
actions.cancelReq = async el => { await api('/api/college/requests/' + el.dataset.id, 'DELETE'); toast('Request withdrawn'); reload(); };
actions.submitVillage = async el => {
  if (!await confirmBox('Send this village to its village officer for acknowledgement? The village will be locked for editing until the officer responds.', 'Yes, send it')) return;
  const r = await api('/api/college/submit-village', 'POST', { village_id: Number(el.dataset.v) });
  toast(r.emailed === 'failed' ? 'Sent. The officer has no email on record, so the admin will share the link.' : 'Sent to the village officer ✔'); reload();
};

// ---------- schedule ----------
function planEnd(start, skipSun, count = 15) {
  let d = start, left = count;
  for (; ;) { const dow = new Date(d + 'T00:00:00').getDay(); if (!(skipSun && dow === 0)) { left--; if (!left) return d; } d = addDays(d, 1); }
}
const volPairFields = (a = [], idx = [0, 1]) => idx.map(i => html`<div class="formgrid"><label class="f"><span>Volunteer ${i + 1} name</span><input type="text" name="vn${i}" value="${a[i]?.name || ''}" maxlength="80"></label>
  <label class="f"><span>Mobile number</span><input type="tel" name="vc${i}" value="${a[i]?.contact || ''}" inputmode="numeric" maxlength="14" placeholder="10-digit"></label></div>`);
const pairFrom = f => [0, 1].map(i => ({ name: f['vn' + i], contact: f['vc' + i] })).filter(v => v.name || v.contact);

function tabSchedule() {
  if (!COL.assignments.length) return show($('#tab'), html`<div class="empty">You need allotted villages before you can schedule. Check back after the admin assigns them.</div>`);
  if (!COL.days.length) return show($('#tab'), html`<div class="quick"><h3>Plan your 15 days in one tap</h3>
    <p>Pick the start date. We split the days across your ${COL.assignments.length} village${COL.assignments.length > 1 ? 's' : ''}, 3 days each, with 2 volunteers per day. You can tweak anything later.</p>${scheduleForm(false)}</div>`);
  const blocks = new Map();
  [...COL.days].sort((a, b) => a.date.localeCompare(b.date)).forEach(d => { if (!blocks.has(d.village_id)) blocks.set(d.village_id, []); blocks.get(d.village_id).push(d); });
  const first = COL.days[0].date, last = COL.days.at(-1).date;
  show($('#tab'), html`<div class="row between" style="margin-bottom:14px"><div><b>${COL.days.length} days</b> · ${fdate(first)} → ${fdate(last)}</div>
    <div class="row"><button class="btn sm sun" data-act="replan">🔄 Re-plan all</button></div></div>
    ${[...blocks].map(([vid, ds]) => {
      const a = COL.assignments.find(x => x.village_id === vid) || {}, locked = a.locked;
      return html`<div class="block"><div class="blockhead"><div><h3>🏡 ${ds[0].village_name}</h3><span class="small">${ds.length} days · ${fdate(ds[0].date)} → ${fdate(ds.at(-1).date)}</span> ${statusChip(a.ack_status)}</div>
        ${locked ? html`<span class="chip warn">🔒 Locked for officer</span>` : html`<div class="row"><button class="btn sm violet" data-act="blockVols" data-v="${vid}">🙌 Set volunteers for all ${ds.length} days</button><button class="btn sm white" data-act="addDay" data-v="${vid}">＋ Add day</button></div>`}</div>
        ${a.query_note && !locked ? html`<div class="note" style="margin-bottom:10px">✏️ Officer feedback: ${a.query_note}</div>` : ''}
        ${ds.map(d => dayCard(d, locked))}</div>`;
    })}`);
}
function scheduleForm(replace) {
  const s = todayISO();
  return html`<form data-form="schedule" class="stack"><input type="hidden" name="replace" value="${replace ? '1' : ''}">
    <div class="formgrid"><label class="f"><span>From</span><input type="date" name="start" value="${s}" required id="sf"></label>
      <label class="f"><span>To (auto: 15 days)</span><input type="date" name="end" value="${planEnd(s, false)}" required id="se"></label></div>
    <label class="chk"><input type="checkbox" name="skip_sundays" id="ss"> Skip Sundays</label>
    <div class="small" id="splan"></div>
    <details><summary style="cursor:pointer;font-weight:800">Pre-fill the same 2 volunteers on every day (optional)</summary><div style="margin-top:10px">${volPairFields()}</div></details>
    <div data-err></div><button class="btn xl" type="submit">⚡ Schedule ${replace ? 'again' : 'my 15 days'}</button></form>`;
}
document.addEventListener('input', e => {
  if (!['sf', 'ss'].includes(e.target.id)) return;
  const f = e.target.form, st = f.start.value; if (!st) return;
  f.end.value = planEnd(st, f.skip_sundays.checked);
});
forms.schedule = async f => {
  const v = fd(f);
  const body = { start: v.start, end: v.end, skip_sundays: !!v.skip_sundays, replace: !!v.replace, volunteers: pairFrom(v) };
  const r = await api('/api/college/schedule', 'POST', body);
  const o = f.closest('.overlay'); if (o) o.close();
  toast(`${r.days} days scheduled 🎉`); reload();
};
actions.replan = () => modal(html`<h3>Re-plan the schedule</h3><p class="muted">This replaces your current plan. Only possible while no attendance has been recorded.</p>${scheduleForm(true)}`);

function dayCard(d, locked) {
  const future = d.date > COL.today;
  const vols = d.volunteers, slots = Math.max(2, vols.length);
  const tot = vols.reduce((t, v) => (v.attended === 1 ? { a: t.a + v.addressed, r: t.r + v.registered } : t), { a: 0, r: 0 });
  const done = vols.some(v => v.attended === 1);
  return html`<form class="day ${done ? 'done' : ''}" data-form="saveDay" data-id="${d.id}"><div class="dayhead"><div><span class="dn">${fdate(d.date)}</span> ${future ? html`<span class="chip cyan">upcoming</span>` : d.date === COL.today ? html`<span class="chip pink">today</span>` : ''}
      ${done ? html`<span class="chip ok">${tot.r} registered · ${tot.a} addressed</span>` : ''}</div>
    ${locked && !d.media.length ? '' : html`<div class="row"><button type="button" class="btn sm sun" data-act="photos" data-id="${d.id}">📷 Photos${d.media.length ? ` (${d.media.length})` : ''}</button>${locked ? '' : html`<button type="button" class="btn sm white" data-act="editDay" data-id="${d.id}">✏️ Date</button><button type="button" class="btn sm danger" data-act="delDay" data-id="${d.id}" aria-label="Delete day">🗑 Delete</button>`}</div>`}</div>
    ${[0, 1, 2, 3].map(i => { const v = vols[i] || {}; const hidden = i >= slots;
      return html`<div class="vrow ${hidden ? 'hide' : ''}" data-slot="${i}">
        <label>Student<input type="text" name="n${i}" value="${v.name || ''}" maxlength="80" placeholder="Name" ${locked ? 'disabled' : ''}></label>
        <label>Contact<input type="tel" name="c${i}" value="${v.contact || ''}" inputmode="numeric" maxlength="14" placeholder="Mobile" ${locked ? 'disabled' : ''}></label>
        <div><label>Attended?</label><div class="seg" role="radiogroup" aria-label="Attended">
          <label><input type="radio" name="a${i}" value="" ${v.attended == null ? 'checked' : ''} ${locked || future ? 'disabled' : ''}><span class="na">–</span></label>
          <label><input type="radio" name="a${i}" value="1" ${v.attended === 1 ? 'checked' : ''} ${locked || future ? 'disabled' : ''}><span class="yes">Yes</span></label>
          <label><input type="radio" name="a${i}" value="0" ${v.attended === 0 ? 'checked' : ''} ${locked || future ? 'disabled' : ''}><span class="no">No</span></label></div></div>
        <label>Addressed<input type="number" min="0" name="p${i}" value="${v.attended === 1 ? v.addressed : ''}" ${v.attended === 1 && !locked ? '' : 'disabled'}></label>
        <label>Registered<input type="number" min="0" name="r${i}" value="${v.attended === 1 ? v.registered : ''}" ${v.attended === 1 && !locked ? '' : 'disabled'}></label></div>`; })}
    ${locked ? '' : html`<div class="dayfoot"><div class="row">${slots < 4 ? html`<button type="button" class="btn sm white" data-act="moreVol">＋ volunteer</button>` : ''}${future ? html`<span class="small muted">Attendance opens on the day.</span>` : ''}</div>
      <div data-err></div><button class="btn sm" type="submit">💾 Save day</button></div>`}</form>`;
}
document.addEventListener('change', e => {
  const r = e.target; if (r.type !== 'radio' || !/^a\d$/.test(r.name)) return;
  const row = r.closest('.vrow'), i = r.name.slice(1);
  $$(`input[name=p${i}],input[name=r${i}]`, row).forEach(x => { x.disabled = r.value !== '1'; if (r.value !== '1') x.value = ''; else if (x.value === '') x.value = 0; });
});
actions.moreVol = el => { const f = el.closest('form'); const h = $('.vrow.hide', f); if (h) h.classList.remove('hide'); if (!$('.vrow.hide', f)) el.remove(); };
forms.saveDay = async f => {
  const v = fd(f), vols = [];
  for (let i = 0; i < 4; i++) {
    if (!v['n' + i] && !v['c' + i]) continue;
    const a = v['a' + i];
    vols.push({ name: v['n' + i], contact: v['c' + i], attended: a === '1' ? 1 : a === '0' ? 0 : null, addressed: v['p' + i], registered: v['r' + i] });
  }
  await api(`/api/college/days/${f.dataset.id}/volunteers`, 'PUT', { volunteers: vols });
  toast('Saved ✔'); reload();
};
actions.delDay = async el => {
  if (!await confirmBox('Remove this day from the plan? Its volunteers and attendance go with it.', 'Delete day')) return;
  await api('/api/college/days/' + el.dataset.id, 'DELETE'); toast('Day removed'); reload();
};
actions.editDay = el => {
  const d = COL.days.find(x => x.id === Number(el.dataset.id));
  modal(html`<h3>Edit day</h3><form data-form="editDay" data-id="${d.id}" class="stack">
    <label class="f"><span>Date</span><input type="date" name="date" value="${d.date}" required></label>
    <label class="f"><span>Village</span><select name="village_id">${COL.assignments.filter(a => !a.locked || a.village_id === d.village_id).map(a => html`<option value="${a.village_id}" ${a.village_id === d.village_id ? 'selected' : ''}>${a.village_name}</option>`)}</select></label>
    <label class="f"><span>Note (optional)</span><input type="text" name="notes" maxlength="300" value="${d.notes || ''}"></label>
    <div data-err></div><div class="row" style="justify-content:flex-end"><button type="button" class="btn white" data-act="closeModal">Cancel</button><button class="btn" type="submit">Save</button></div></form>`);
};
forms.editDay = async f => { const v = fd(f); await api('/api/college/days/' + f.dataset.id, 'PATCH', { ...v, village_id: Number(v.village_id) }); f.closest('.overlay').close(); toast('Updated'); reload(); };
actions.addDay = el => {
  const vid = el.dataset.v, last = COL.days.filter(d => d.village_id === Number(vid)).map(d => d.date).sort().at(-1) || COL.today;
  modal(html`<h3>Add a day</h3><form data-form="addDay" class="stack"><input type="hidden" name="village_id" value="${vid}">
    <label class="f"><span>Date</span><input type="date" name="date" value="${addDays(last, 1)}" required></label>
    <p class="small muted">Volunteers from the previous day are copied across.</p><div data-err></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn white" data-act="closeModal">Cancel</button><button class="btn" type="submit">Add day</button></div></form>`);
};
forms.addDay = async f => { const v = fd(f); await api('/api/college/days', 'POST', { date: v.date, village_id: Number(v.village_id) }); f.closest('.overlay').close(); toast('Day added'); reload(); };
actions.blockVols = el => {
  const vid = el.dataset.v, ds = COL.days.filter(d => d.village_id === Number(vid)), cur = ds.find(d => d.volunteers.length)?.volunteers || [];
  modal(html`<h3>Volunteers for ${ds[0].village_name}</h3><p class="muted">The same 2 students go on all ${ds.length} days. You can still change a single day afterwards.</p>
    <form data-form="blockVols" data-v="${vid}" class="stack">${volPairFields(cur)}<div data-err></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn white" data-act="closeModal">Cancel</button><button class="btn violet" type="submit">Apply to ${ds.length} days</button></div></form>`);
};
forms.blockVols = async f => { await api('/api/college/block-volunteers', 'POST', { village_id: Number(f.dataset.v), volunteers: pairFrom(fd(f)) }); f.closest('.overlay').close(); toast('Volunteers assigned ✔'); reload(); };

// ---------- report ----------
function tabReport() {
  const s = COL.stats, byVol = new Map();
  COL.days.forEach(d => d.volunteers.forEach(v => {
    const k = v.name.toLowerCase() + '|' + v.contact; const r = byVol.get(k) || { name: v.name, contact: v.contact, assigned: 0, att: 0, abs: 0, addr: 0, reg: 0 };
    r.assigned++; if (v.attended === 1) { r.att++; r.addr += v.addressed; r.reg += v.registered; } else if (v.attended === 0) r.abs++; byVol.set(k, r);
  }));
  show($('#tab'), html`<div class="row between noprint" style="margin-bottom:14px"><p class="muted" style="margin:0">Your club's activity report, ready to print or save as PDF.</p><button class="btn" data-act="print">🖨 Print / save PDF</button></div>
    <div class="card"><h3>${COL.college.name}: ELC activity report</h3><p class="muted">Generated ${fdt(new Date().toISOString())}</p>
      <div class="tiles" style="margin-bottom:18px"><div class="tile t1"><b>${n(s.registered)}</b><span>Registered</span></div><div class="tile t3"><b>${n(s.addressed)}</b><span>Addressed</span></div>
        <div class="tile t4"><b>${pct(s.attendance_pct)}</b><span>Attendance</span></div><div class="tile t6"><b>${s.volunteers}</b><span>Volunteers</span></div></div>
      <h3>By village</h3><div class="tablewrap"><table><thead><tr><th>Village</th><th class="num">Days</th><th class="num">Vol-days attended</th><th class="num">Addressed</th><th class="num">Registered</th><th>Officer acknowledgement</th></tr></thead><tbody>
        ${COL.assignments.map(a => html`<tr><td><b>${a.village_name}</b></td><td class="num">${a.totals.days}</td><td class="num">${a.totals.attended}</td><td class="num">${n(a.totals.addressed)}</td><td class="num">${n(a.totals.registered)}</td>
          <td>${a.ack_status === 'acknowledged' ? html`${a.ack_name}${a.ack_designation ? `, ${a.ack_designation}` : ''} · ${fdt(a.ack_at)}` : statusChip(a.ack_status)}</td></tr>`)}</tbody></table></div>
      <h3 style="margin-top:20px">By volunteer</h3><div class="tablewrap"><table><thead><tr><th>Volunteer</th><th>Contact</th><th class="num">Days assigned</th><th class="num">Attended</th><th class="num">Absent</th><th class="num">Addressed</th><th class="num">Registered</th></tr></thead><tbody>
        ${[...byVol.values()].map(v => html`<tr><td><b>${v.name}</b></td><td>${v.contact}</td><td class="num">${v.assigned}</td><td class="num">${v.att}</td><td class="num">${v.abs}</td><td class="num">${n(v.addr)}</td><td class="num">${n(v.reg)}</td></tr>`)}</tbody></table></div></div>`);
}
actions.print = () => window.print();

// ---------- photos (stored in Google Drive via the server) ----------
function photoGrid(d, locked) {
  return html`<div class="photogrid">${d.media.length ? d.media.map(m => html`<figure><img src="/api/college/photos/${m.id}" alt="Field day photo" loading="lazy">${locked ? '' : html`<button type="button" class="x" data-act="delPhoto" data-id="${m.id}" data-day="${d.id}" aria-label="Delete photo">✕</button>`}</figure>`) : html`<div class="muted">No photos yet.</div>`}</div>`;
}
actions.photos = el => {
  const d = COL.days.find(x => x.id === Number(el.dataset.id));
  const locked = COL.assignments.find(a => a.village_id === d.village_id)?.locked;
  const m = modal(html`<h3>📷 ${fdate(d.date)} photos</h3><div id="pg">${photoGrid(d, locked)}</div>
    ${locked ? '' : COL.photos_enabled ? html`<label class="btn" style="margin-top:14px">＋ Add photos<input type="file" id="pf" accept="image/*" multiple hidden></label><p class="small muted">Up to 8 photos a day. Photos are saved to the programme's Google Drive. Please only include people who are comfortable being photographed.</p><div id="pst" class="small"></div>`
      : html`<div class="note" style="margin-top:14px">Photo storage isn't connected yet. Ask the district admin to set up Google Drive.</div>`}
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn white" data-act="closeModal">Close</button></div>`);
  const pf = $('#pf', m);
  if (pf) pf.addEventListener('change', async () => {
    const st = $('#pst', m);
    for (const f of pf.files) {
      st.textContent = `Uploading ${f.name}…`;
      try {
        const data = await shrink(f);
        await api(`/api/college/days/${d.id}/photos`, 'POST', { name: f.name, mime: 'image/jpeg', data });
      } catch (e) { toast(e.message, true); }
    }
    pf.value = ''; st.textContent = '';
    await reloadKeep(m, d.id, locked);
  });
};
async function reloadKeep(m, dayId, locked) {
  COL = await api('/api/college/overview');
  const d = COL.days.find(x => x.id === dayId);
  show($('#pg', m), photoGrid(d, locked));
}
// resize to max 1600px JPEG so uploads stay small on mobile data
function shrink(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error(`${file.name} isn't a readable image`)); };
    img.src = url;
  });
}
actions.delPhoto = async el => {
  if (!await confirmBox('Delete this photo?', 'Delete')) return;
  await api('/api/college/photos/' + el.dataset.id, 'DELETE');
  const m = el.closest('.overlay'), dayId = Number(el.dataset.day);
  COL = await api('/api/college/overview');
  show($('#pg', m), photoGrid(COL.days.find(x => x.id === dayId), false));
};
