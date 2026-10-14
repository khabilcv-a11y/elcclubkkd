'use strict';
// ---- college workspace: Home · Daily log · Schedule · Students · Villages · Announcements · Help desk · Resources · Reports ----
let COL = null, CANN = [], LOGDATE = null, SCHEDVILLAGE = null;
const seenKey = 'elc-seen-ann';
const seenIds = () => { try { return JSON.parse(localStorage.getItem(seenKey) || '[]'); } catch { return []; } };
const markSeen = ids => { try { localStorage.setItem(seenKey, JSON.stringify([...new Set([...seenIds(), ...ids])].slice(-200))); } catch {} };

async function renderCollege(page = 'home') {
  if (!COL) show($('#app'), html`<div class="loading"><div class="spin"></div>Opening your workspace…</div>`);
  try { [COL, CANN] = await Promise.all([api('/api/college/overview'), api('/api/announcements').catch(() => [])]); } catch (e) { return handleErr(e); }
  const unread = CANN.filter(a => !seenIds().includes(a.id)).length;
  const nav = [{ group: 'Daily work', items: [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'log', label: 'Daily log', icon: 'clipboard' }, { id: 'schedule', label: 'Schedule', icon: 'calendar' }, { id: 'students', label: 'Students', icon: 'users' }] },
    { group: 'Programme', items: [{ id: 'villages', label: 'My villages', icon: 'map-pin' }, { id: 'notices', label: 'Announcements', icon: 'megaphone', count: unread }, { id: 'help', label: 'Help desk', icon: 'help' }, { id: 'resources', label: 'Resources', icon: 'book' }, { id: 'report', label: 'Reports', icon: 'chart' }] }];
  const pages = { home: pgHome, log: pgLog, schedule: pgSchedule, students: pgStudents, villages: pgVillages, notices: pgNotices, help: pgHelp, resources: pgResources, report: pgReport };
  if (!pages[page]) page = 'home';
  show($('#app'), consoleShell({ product: COL.college.short_name || COL.college.name, who: COL.college.coordinator || COL.college.short_name || 'Coordinator', role: 'College coordinator', nav, active: page, base: '#/me', content: html`<div id="pg"></div>` }));
  document.title = ({ home: 'Home', log: 'Daily log', schedule: 'Schedule', students: 'Students', villages: 'My villages', notices: 'Announcements', help: 'Help desk', resources: 'Resources', report: 'Reports' }[page]) + ' · ' + (COL.college.short_name || 'College');
  await pages[page]($('#pg'));
  announce(document.title);
}
const reloadCol = () => renderCollege(location.hash.split('/')[2] || 'home');
const villageOf = id => COL.assignments.find(a => a.village_id === id);
const marked = d => d.volunteers.some(v => v.attended != null);
const staffed = d => d.volunteers.filter(v => v.name).length >= 2;

// ---------- Home ----------
async function pgHome(el) {
  const c = COL, s = c.stats, V = c.assignments.length, need = 2 * V, have = c.pool.filter(p => p.active).length;
  const done = c.days.filter(marked).length, total = c.days.length, perVillage = V * 15;
  const todayDays = c.days.filter(d => d.date === c.today), todoToday = todayDays.filter(d => !marked(d) && !villageOf(d.village_id)?.locked);
  const past = c.days.filter(d => d.date < c.today && !marked(d) && !villageOf(d.village_id)?.locked);
  const unstaffed = c.days.filter(d => !staffed(d) && !marked(d) && !villageOf(d.village_id)?.locked);
  const steps = [
    { done: have >= need && V > 0, t: 'Add your students', s: V ? `${have} of ${need} needed (2 per village)` : 'Waiting for villages', go: 'students' },
    { done: total > 0, t: 'Create the 15-day schedule', s: total ? `${V} village${V > 1 ? 's' : ''} × 15 days` : 'One tap once students are added', go: 'schedule' },
    { done: total > 0 && unstaffed.length === 0, t: 'Shifts filled', s: total ? (unstaffed.length ? `${unstaffed.length} day(s) need 2 students` : 'Every day has 2 students') : '', go: 'schedule' },
    { done: total > 0 && done === total, t: 'Mark attendance daily', s: total ? `${done} of ${total} village-days recorded` : '', go: 'log' },
    { done: V > 0 && c.assignments.every(a => a.ack_status === 'acknowledged'), t: 'Village officer certifies', s: `${c.assignments.filter(a => a.ack_status === 'acknowledged').length} of ${V} certified`, go: 'villages' }];
  show(el, html`${pageHead(`Welcome, ${c.college.short_name || c.college.name}`, `${V} village${V === 1 ? '' : 's'} allotted. Each needs 2 students on every one of 15 field days.`, html`<a class="btn primary" href="#/me/log">${icon('clipboard')} Open today's log</a>`, 'College workspace')}
    ${c.assignments.some(a => a.ack_status === 'acknowledged') ? html`<div class="alert ok" style="margin-bottom:16px">${icon('certificate')}<div><b>Student certificates are ready</b> for ${c.assignments.filter(a => a.ack_status === 'acknowledged').map(a => a.village_name).join(', ')}. Open <a href="#/me/villages">My villages</a> to view and print them.</div></div>` : ''}
    ${!V ? html`<div class="alert warn" style="margin-bottom:16px">${icon('clock')}<div><b>No villages allotted yet.</b> The district office will allot your villages soon. You can already add your students.</div></div>` : ''}
    <div class="steps" style="margin-bottom:18px">${steps.map((x, i) => html`<a class="step ${x.done ? 'done' : ''}" href="#/me/${x.go}" style="text-decoration:none;color:inherit"><span class="n">${x.done ? icon('check') : i + 1}</span><div><b>${x.t}</b><small>${x.s}</small></div></a>`)}</div>
    ${past.length || todoToday.length ? html`<div class="alert warn" style="margin-bottom:16px">${icon('alert')}<div><b>${todoToday.length ? `${todoToday.length} village${todoToday.length > 1 ? 's' : ''} to record today. ` : ''}${past.length ? `${past.length} earlier village-day${past.length > 1 ? 's are' : ' is'} missing attendance.` : ''}</b> <a href="#/me/log">Open the daily log</a></div></div>` : ''}
    <div class="kpis" style="margin-bottom:18px">${kpi('Voters enrolled', s.registered, { ic: 'user-check', tone: 'green', sub: `${n(s.addressed)} people reached` })}${kpi('Attendance', s.attendance_pct == null ? '—' : s.attendance_pct + '%', { ic: 'check-circle', count: false, sub: `${s.vdays_attended} shifts worked` })}
      ${kpi('Field days', `${done}/${perVillage || 0}`, { ic: 'calendar', count: false, sub: 'village-days recorded' })}${kpi('Your points', s.score, { ic: 'trophy', tone: 'saffron', sub: `rank ${s.rank} of the district` })}</div>
    <div class="grid g2"><div class="card"><div class="card-head"><h3>Your villages</h3><a class="btn ghost sm" href="#/me/villages">Details ${icon('arrow-right')}</a></div>
      ${c.assignments.length ? c.assignments.map(a => { const dd = c.days.filter(d => d.village_id === a.village_id), dn = dd.filter(marked).length; return html`<div style="margin-bottom:16px"><div class="row between"><b>${a.village_name}</b>${ackBadge(a.ack_status)}</div>
        <div class="small muted" style="margin:2px 0 6px">${dn} of 15 field days recorded · ${a.coverage.staffed}/${a.coverage.days || 15} days staffed</div>${progress(Math.round(dn * 100 / 15), 'green')}</div>`; }) : empty('Nothing allotted yet', '', 'map-pin')}</div>
      <div class="card"><div class="card-head"><h3>Latest announcements</h3><a class="btn ghost sm" href="#/me/notices">All ${icon('arrow-right')}</a></div>
      ${CANN.length ? CANN.slice(0, 3).map(a => html`<div class="notice ${a.pinned ? 'pinned' : ''}" style="margin-bottom:10px"><h3>${a.title}</h3>${a.body ? html`<p>${a.body.slice(0, 160)}${a.body.length > 160 ? '…' : ''}</p>` : ''}<div class="when">${fdt(a.created_at)}</div></div>`) : html`<p class="muted">No announcements right now.</p>`}</div></div>`);
}

// ---------- Students ----------
async function pgStudents(el) {
  const V = COL.assignments.length, need = 2 * V, active = COL.pool.filter(p => p.active), short = Math.max(0, need - active.length);
  show(el, html`${pageHead('Your students', 'Everyone who may work a shift. The schedule picks two of them for each village on each day.', html`<button class="btn primary" data-act="addStudent">${icon('plus')} Add a student</button><button class="btn secondary" data-act="bulkStudents">${icon('upload')} Paste a list</button>`, 'Daily work')}
    <div class="need" style="margin-bottom:16px"><div class="ring" style="--p:${need ? Math.min(100, Math.round(active.length * 100 / need)) : 0}"><b>${active.length}</b></div>
      <div class="grow"><b>${active.length} student${active.length === 1 ? '' : 's'} in your list</b><div class="small muted">${V ? `You hold ${V} village${V > 1 ? 's' : ''}, so you need at least ${need} students (2 per village) so nobody is in two villages on the same day. ${short ? `Add ${short} more.` : 'That is enough. More students mean longer rests between shifts.'}` : 'Villages will be allotted by the district office.'}</div></div>
      ${COL.days.length ? html`<button class="btn secondary" data-act="rebuild">${icon('refresh')} Rebuild shifts</button>` : ''}</div>
    ${COL.pool.length ? html`<div class="pool">${COL.pool.map(p => html`<div class="person rv ${p.active ? '' : 'muted'}"><span class="av">${initials(p.name)}</span><div class="grow"><b>${p.name}</b><small>${p.contact}${p.active ? '' : ' · resting'}</small></div>
      <button class="iconbtn" data-act="editStudent" data-id="${p.id}" aria-label="Edit ${p.name}">${icon('edit')}</button><button class="iconbtn" data-act="delStudent" data-id="${p.id}" aria-label="Remove ${p.name}">${icon('trash')}</button></div>`)}</div>`
      : empty('No students yet', 'Add the students who will volunteer. You can paste a whole list: one line per student, name then mobile number.', 'users')}`);
}
actions.addStudent = () => modal(html`<h2>Add a student</h2><form data-form="addStudent" class="stack-s"><label class="f"><span>Full name</span><input type="text" name="name" maxlength="80" required></label>
  <label class="f"><span>Mobile number</span><input type="tel" name="contact" inputmode="numeric" maxlength="16" placeholder="10-digit mobile" required></label><div data-err></div>
  <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Add student</button></div></form>`);
forms.addStudent = async f => { await api('/api/college/pool', 'POST', fd(f)); f.closest('.overlay').close(); toast('Student added'); reloadCol(); };
actions.bulkStudents = () => modal(html`<h2>Paste a list of students</h2><p class="muted small" style="margin-bottom:10px">One student per line: name, then mobile number. Commas, dashes and +91 are fine. Copy straight from Excel or WhatsApp.</p>
  <form data-form="bulkStudents" class="stack-s"><label class="f"><span class="sr">List</span><textarea name="bulk" rows="9" required placeholder="Anu Raj, 9876543210&#10;Basil Kurian - 9876543211&#10;Chithra 98765 43212"></textarea></label><div data-err></div>
  <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Add students</button></div></form>`, { wide: true });
forms.bulkStudents = async f => {
  const r = await api('/api/college/pool', 'POST', { bulk: fd(f).bulk }); f.closest('.overlay').close();
  if (r.errors.length) modal(html`<h2>Added ${r.added} student${r.added === 1 ? '' : 's'}</h2><p class="muted">${r.duplicates ? `${r.duplicates} were already in your list. ` : ''}These lines could not be read:</p><ul>${r.errors.map(e => html`<li class="small">${e}</li>`)}</ul><div class="row" style="justify-content:flex-end"><button class="btn primary" data-act="closeModal">OK</button></div>`);
  else toast(`${r.added} student${r.added === 1 ? '' : 's'} added${r.duplicates ? `, ${r.duplicates} already listed` : ''}`);
  reloadCol();
};
actions.editStudent = el => { const p = COL.pool.find(x => x.id === Number(el.dataset.id));
  modal(html`<h2>Edit student</h2><form data-form="editStudent" data-id="${p.id}" class="stack-s"><label class="f"><span>Full name</span><input type="text" name="name" value="${p.name}" required maxlength="80"></label>
  <label class="f"><span>Mobile number</span><input type="tel" name="contact" value="${p.contact}" required></label><label class="chk"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}> Available for shifts</label><div data-err></div>
  <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`); };
forms.editStudent = async f => { const v = fd(f); await api('/api/college/pool/' + f.dataset.id, 'PUT', { name: v.name, contact: v.contact, active: !!v.active }); f.closest('.overlay').close(); toast('Saved'); reloadCol(); };
actions.delStudent = async el => { const p = COL.pool.find(x => x.id === Number(el.dataset.id)); if (!await confirmBox(`Remove ${p.name} from your list? Days already scheduled keep their name until you rebuild the shifts.`, 'Remove', true)) return; await api('/api/college/pool/' + p.id, 'DELETE'); toast('Removed'); reloadCol(); };

// ---------- Schedule ----------
const SHIFTS = [[1, 'every day a new pair'], [2, '2 days in a row'], [3, '3 days in a row (usual)'], [5, '5 days in a row'], [7, 'a week at a time']];
async function pgSchedule(el) {
  const V = COL.assignments.length;
  if (!V) return show(el, html`${pageHead('Schedule', '', '', 'Daily work')}${empty('No villages allotted yet', 'Once the district office allots villages, you can create the schedule here.', 'calendar')}`);
  const open = COL.assignments.filter(a => !a.locked), without = open.filter(a => !COL.days.some(d => d.village_id === a.village_id));
  const active = COL.pool.filter(p => p.active).length, need = 2 * open.length;
  if (!COL.days.length) {
    return show(el, html`${pageHead('Create your schedule', `${open.length} village${open.length > 1 ? 's' : ''} × 15 field days × 2 students each day.`, '', 'Daily work')}
      <div class="grid g2"><div class="card"><form data-form="schedule" class="stack-s"><div class="formgrid"><label class="f"><span>First field day</span><input type="date" name="start" value="${addDays(COL.today, 1)}" required></label>
        <label class="f"><span>Shift length</span><select name="shift_len">${SHIFTS.map(([k, l]) => html`<option value="${k}" ${k === 3 ? 'selected' : ''}>${l}</option>`)}</select><span class="hint">How long one pair works before the next pair takes over.</span></label></div>
        <label class="chk"><input type="checkbox" name="skip_sundays"> Skip Sundays (the 15 days then run a little longer)</label>
        ${active < need ? html`<div class="alert warn">${icon('alert')}<div>You have ${active} student${active === 1 ? '' : 's'} but need ${need}. You can still create the schedule and add students later, then rebuild the shifts. <a href="#/me/students">Add students</a></div></div>` : html`<div class="alert ok">${icon('check-circle')}<div>${active} students are enough to staff ${open.length} village${open.length > 1 ? 's' : ''}.</div></div>`}
        <div data-err></div><button class="btn primary lg" type="submit">${icon('zap')} Create schedule and shifts</button></form></div>
      <div class="card"><h3 style="margin-bottom:10px">How shifts work</h3><ul class="small muted" style="padding-left:18px;line-height:1.8"><li>Your students are split between your villages, so nobody is in two villages on the same day.</li><li>In each village, students work as pairs. One pair works a few days in a row, then the next pair takes over.</li><li>When every pair has had a turn, the first pair repeats, until all 15 days are covered.</li><li>You can change any day afterwards, and rebuild the shifts whenever your student list changes. Days that already have attendance are never touched.</li></ul></div></div>`);
  }
  if (!COL.assignments.some(a => a.village_id === SCHEDVILLAGE)) SCHEDVILLAGE = (open[0] || COL.assignments[0]).village_id;
  const a = villageOf(SCHEDVILLAGE), days = COL.days.filter(d => d.village_id === SCHEDVILLAGE).sort((x, y) => x.date.localeCompare(y.date));
  show(el, html`${pageHead('Schedule', `15 field days for each village, 2 students a day. ${days.length ? fdate(days[0].date) + ' to ' + fdate(days.at(-1).date) : ''}`,
      html`${without.length ? html`<button class="btn secondary" data-act="schedNew">${icon('plus')} Schedule ${without.length} new village${without.length > 1 ? 's' : ''}</button>` : ''}<button class="btn secondary" data-act="addDay" data-v="${SCHEDVILLAGE}">${icon('plus')} Add a day</button><button class="btn secondary" data-act="moveAll" data-v="${SCHEDVILLAGE}">${icon('calendar')} Move all dates</button><button class="btn primary" data-act="rebuild">${icon('refresh')} Rebuild shifts</button>`, 'Daily work')}
    <div class="tabs" role="tablist" aria-label="Village" style="margin-bottom:14px">${COL.assignments.map(x => html`<button class="tab" role="tab" aria-selected="${x.village_id === SCHEDVILLAGE}" data-act="schedTab" data-id="${x.village_id}">${x.village_name}${x.locked ? html` ${icon('lock')}` : ''}</button>`)}</div>
    ${a.locked ? html`<div class="alert info" style="margin-bottom:12px">${icon('lock')}<div>This village is with the village officer for certification, so the schedule is locked.</div></div>` : ''}
    <div class="row between" style="margin-bottom:10px"><div class="small muted">${days.filter(staffed).length} of ${days.length} days staffed · ${days.filter(marked).length} recorded</div>${days.some(d => !staffed(d)) ? badge('Some days need students', 'warn') : badge('All days staffed', 'ok')}</div>
    ${days.length ? html`<div class="card pad0"><div class="tablewrap"><table><caption class="sr">Schedule for ${a.village_name}</caption><thead><tr><th>Day</th><th>Date</th><th>Students on shift</th><th>Attendance</th><th></th></tr></thead><tbody>
      ${days.map((d, i) => { const vs = d.volunteers.filter(v => v.name); return html`<tr><td class="tnum"><b>${i + 1}</b></td><td>${fdate(d.date)}${d.date === COL.today ? html` ${badge('Today', 'saffron')}` : ''}${d.notes ? html`<div class="small muted">${d.notes}</div>` : ''}</td>
        <td>${vs.length ? html`<div class="pillrow">${vs.map(v => badge(v.name, vs.length < 2 ? 'warn' : ''))}</div>` : html`<span class="badge danger">Nobody assigned</span>`}</td>
        <td>${marked(d) ? html`<div class="pillrow">${vs.map(v => v.attended === 1 ? badge('Present', 'ok') : v.attended === 0 ? badge('Absent', 'danger') : badge('—', 'grey'))}</div>` : d.date > COL.today ? html`<span class="muted small">Upcoming</span>` : badge('Not recorded', 'warn')}</td>
        <td class="right">${a.locked ? '' : html`<button class="btn sm secondary" data-act="swap" data-id="${d.id}">${icon('edit')} Change</button>`}</td></tr>`; })}</tbody></table></div></div>` : empty('This village has no schedule yet')}`);
}
actions.schedTab = el => { SCHEDVILLAGE = Number(el.dataset.id); reloadCol(); };
forms.schedule = async f => {
  const v = fd(f); const r = await api('/api/college/schedule', 'POST', { start: v.start, shift_len: Number(v.shift_len), skip_sundays: !!v.skip_sundays, days: 15 });
  f.closest('.overlay')?.close();
  toast(`Schedule created: ${r.created.length} village${r.created.length === 1 ? '' : 's'} × 15 days`);
  if (r.roster.warnings.length) modal(html`<h2>Add more students</h2><p>The schedule is ready, but ${r.roster.warnings.length} village${r.roster.warnings.length > 1 ? 's do' : ' does'} not have 2 students for every day. You have ${r.roster.pool}, you need ${r.roster.need}.</p><div class="row" style="justify-content:flex-end"><a class="btn primary" href="#/me/students" data-act="closeModal">Add students</a></div>`);
  reloadCol();
};
actions.schedNew = () => modal(html`<h2>Schedule the new villages</h2><form data-form="schedule" class="stack-s"><label class="f"><span>First field day</span><input type="date" name="start" value="${addDays(COL.today, 1)}" required></label>
  <label class="f"><span>Shift length</span><select name="shift_len">${SHIFTS.map(([k, l]) => html`<option value="${k}" ${k === 3 ? 'selected' : ''}>${l}</option>`)}</select></label><label class="chk"><input type="checkbox" name="skip_sundays"> Skip Sundays</label><div data-err></div>
  <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Create</button></div></form>`);
actions.rebuild = () => modal(html`<h2>Rebuild the shifts</h2><p class="muted small" style="margin-bottom:10px">Hands out your current students again across all open days. Days that already have attendance are not changed.</p>
  <form data-form="rebuild" class="stack-s"><label class="f"><span>Shift length</span><select name="shift_len">${SHIFTS.map(([k, l]) => html`<option value="${k}" ${k === 3 ? 'selected' : ''}>${l}</option>`)}</select></label><div data-err></div>
  <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Rebuild</button></div></form>`);
forms.rebuild = async f => { const r = await api('/api/college/roster', 'POST', { shift_len: Number(fd(f).shift_len) }); f.closest('.overlay').close(); toast(`Shifts rebuilt: ${r.roster.staffed} days staffed`); reloadCol(); };
actions.swap = el => {
  const d = COL.days.find(x => x.id === Number(el.dataset.id)), cur = d.volunteers.filter(v => v.name), done = marked(d);
  const busyToday = new Set(COL.days.filter(x => x.date === d.date && x.id !== d.id).flatMap(x => x.volunteers.map(v => v.contact)));
  const opt = sel => html`<option value="">— nobody —</option>${COL.pool.filter(p => p.active || p.contact === sel).map(p => html`<option value="${p.contact}" ${sel === p.contact ? 'selected' : ''} ${busyToday.has(p.contact) ? 'disabled' : ''}>${p.name}${busyToday.has(p.contact) ? ' (in another village that day)' : ''}</option>`)}`;
  modal(html`<h2>Edit field day</h2><form data-form="swap" data-id="${d.id}" class="stack-s">
    <div class="formgrid"><label class="f"><span>Date</span><input type="date" name="date" value="${d.date}" required></label>
    <label class="f"><span>Village</span><select name="village_id">${COL.assignments.filter(x => !x.locked).map(x => html`<option value="${x.village_id}" ${x.village_id === d.village_id ? 'selected' : ''}>${x.village_name}</option>`)}</select></label></div>
    ${done ? html`<div class="alert info">${icon('lock')}<div>Attendance is already recorded for this day, so its students can't be changed. You can still change the date or add a remark.</div></div>` : html`<label class="f"><span>Student 1</span><select name="s0">${opt(cur[0]?.contact)}</select></label><label class="f"><span>Student 2</span><select name="s1">${opt(cur[1]?.contact)}</select></label>
    <label class="f"><span>Extra student (optional)</span><select name="s2">${opt(cur[2]?.contact)}</select></label>`}
    <label class="f"><span>Remarks (optional)</span><input type="text" name="notes" maxlength="300" value="${d.notes || ''}" placeholder="e.g. Ward 4 door-to-door, meet at the village office at 9 am"></label><div data-err></div>
    <div class="row between"><button type="button" class="btn danger" data-act="delDay" data-id="${d.id}">${icon('trash')} Remove this day</button><div class="row"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Save</button></div></div></form>`);
};
forms.swap = async f => {
  const d = COL.days.find(x => x.id === Number(f.dataset.id)), v = fd(f);
  if (!marked(d)) {
    const chosen = [v.s0, v.s1, v.s2].filter(Boolean);
    if (new Set(chosen).size !== chosen.length) throw new Error('Pick different students for each place');
    const volunteers = chosen.map(c => { const p = COL.pool.find(x => x.contact === c); return { name: p.name, contact: p.contact, attended: null }; });
    await api(`/api/college/days/${d.id}/volunteers`, 'PUT', { volunteers });
  }
  await api('/api/college/days/' + d.id, 'PATCH', { date: v.date, village_id: Number(v.village_id), notes: v.notes || '' });
  f.closest('.overlay').close(); toast('Field day updated'); reloadCol();
};
actions.delDay = async el => {
  const d = COL.days.find(x => x.id === Number(el.dataset.id));
  if (!await confirmBox(marked(d) ? 'This day has attendance recorded. Remove it and its records permanently?' : 'Remove this field day from the schedule?', 'Remove', true)) return;
  await api('/api/college/days/' + d.id, 'DELETE'); $('.overlay')?.close(); toast('Day removed'); reloadCol();
};
actions.addDay = el => {
  const vid = Number(el.dataset.v), days = COL.days.filter(d => d.village_id === vid).sort((x, y) => x.date.localeCompare(y.date));
  modal(html`<h2>Add a field day</h2><form data-form="addDay" data-v="${vid}" class="stack-s"><label class="f"><span>Date</span><input type="date" name="date" value="${addDays(days.at(-1)?.date || COL.today, 1)}" required></label>
    <p class="hint">The previous day's students are copied when they are free on that date. You can change them afterwards.</p><div data-err></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Add day</button></div></form>`);
};
forms.addDay = async f => { await api('/api/college/days', 'POST', { village_id: Number(f.dataset.v), date: fd(f).date }); f.closest('.overlay').close(); toast('Day added'); reloadCol(); };
actions.moveAll = el => {
  const vid = Number(el.dataset.v), days = COL.days.filter(d => d.village_id === vid).sort((x, y) => x.date.localeCompare(y.date));
  modal(html`<h2>Move the whole schedule</h2><form data-form="moveAll" data-v="${vid}" class="stack-s"><label class="f"><span>New first field day</span><input type="date" name="start" value="${days[0]?.date || COL.today}" required></label>
    <p class="hint">Every day of ${villageOf(vid).village_name} moves by the same number of days, keeping the gaps. Days with attendance already recorded stay where they are.</p><div data-err></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Move</button></div></form>`);
};
forms.moveAll = async f => {
  const r = await api('/api/college/schedule/shift', 'POST', { village_id: Number(f.dataset.v), start: fd(f).start });
  f.closest('.overlay').close(); toast(r.moved ? `${r.moved} days moved` : 'Nothing to move'); reloadCol();
  if (r.clashes?.length) modal(html`<h2>Check the students</h2><p>On ${r.clashes.length} moved day${r.clashes.length > 1 ? 's' : ''} a student is also working in another village. Open those days and change a student.</p><div class="row" style="justify-content:flex-end"><button class="btn primary" data-act="closeModal">OK</button></div>`);
};

// ---------- Daily log ----------
function pickLogDate() {
  const dates = [...new Set(COL.days.map(d => d.date))].sort();
  if (!dates.length) return COL.today;
  if (dates.includes(COL.today)) return COL.today;
  const pastUnmarked = dates.filter(x => x < COL.today && COL.days.some(d => d.date === x && !marked(d)));
  return pastUnmarked.at(-1) || dates.filter(x => x <= COL.today).at(-1) || dates[0];
}
async function pgLog(el) {
  LOGDATE ||= pickLogDate();
  const dates = [...new Set(COL.days.map(d => d.date))].sort();
  const missing = dates.filter(x => x < COL.today && COL.days.some(d => d.date === x && !marked(d) && !villageOf(d.village_id)?.locked));
  const days = COL.days.filter(d => d.date === LOGDATE).sort((x, y) => villageOf(x.village_id).village_name.localeCompare(villageOf(y.village_id).village_name));
  const future = LOGDATE > COL.today;
  show(el, html`${pageHead('Daily log', 'Record who worked, how many people they reached and how many registered.', '', 'Daily work')}
    <div class="card" style="margin-bottom:14px"><div class="row between"><div class="row nowrap"><button class="iconbtn" data-act="logPrev" aria-label="Previous day">${icon('arrow-left')}</button><label class="f" style="margin:0"><span class="sr">Date</span><input type="date" id="logdate" value="${LOGDATE}" style="width:auto"></label><button class="iconbtn" data-act="logNext" aria-label="Next day">${icon('arrow-right')}</button>
      <button class="btn ghost sm" data-act="logToday">Today</button></div><div><b>${fdateLong(LOGDATE)}</b> ${LOGDATE === COL.today ? badge('Today', 'saffron') : future ? badge('Upcoming', 'info') : ''}</div></div>
      ${missing.length ? html`<div class="alert warn" style="margin-top:12px">${icon('alert')}<div><b>${missing.length} earlier day${missing.length > 1 ? 's' : ''} not recorded:</b> ${missing.slice(-6).map(x => html`<button class="chip" data-act="logGo" data-d="${x}" style="margin:2px">${fdate(x)}</button>`)}</div></div>` : ''}</div>
    ${days.length ? html`<div class="stack">${days.map(d => dayCard(d))}</div>` : empty('No field day on this date', COL.days.length ? 'Pick another date, or see the Schedule page.' : 'Create your schedule first.', 'calendar')}`);
  $('#logdate')?.addEventListener('change', e => { LOGDATE = e.target.value; reloadCol(); });
}
actions.logPrev = () => { LOGDATE = addDays(LOGDATE, -1); reloadCol(); };
actions.logNext = () => { LOGDATE = addDays(LOGDATE, 1); reloadCol(); };
actions.logToday = () => { LOGDATE = COL.today; reloadCol(); };
actions.logGo = el => { LOGDATE = el.dataset.d; reloadCol(); };

function dayCard(d) {
  const a = villageOf(d.village_id), locked = a.locked, future = d.date > COL.today, vols = d.volunteers.filter(v => v.name);
  return html`<form class="daycard" data-form="saveDay" data-id="${d.id}"><div class="hd"><div><b>${a.village_name}</b> <span class="muted small">${a.lsgi || ''}</span></div>
    <div class="row gap-s">${marked(d) ? badge('Recorded', 'ok') : future ? badge('Upcoming', 'info') : badge('Not recorded', 'warn')}${locked ? badge(html`${icon('lock')} Locked`, 'grey') : ''}
      ${COL.photos_enabled || d.media.length ? html`<button type="button" class="btn sm secondary" data-act="photos" data-id="${d.id}">${icon('camera')} Photos${d.media.length ? ` (${d.media.length})` : ''}</button>` : ''}</div></div>
    ${vols.length ? vols.map((v, i) => html`<div class="stu"><input type="hidden" name="n${i}" value="${v.name}"><input type="hidden" name="c${i}" value="${v.contact}">
      <div class="who"><b>${v.name}</b><small>${v.contact}</small>${v.verified === 'yes' ? html`<div>${badge(html`${icon('check')} Checked by officer`, 'ok')}</div>` : v.verified === 'no' ? html`<div>${badge(html`${icon('alert')} Officer: ${v.verify_note || 'incorrect'}`, 'danger')}</div>` : ''}</div>
      <div class="seg" role="radiogroup" aria-label="Attendance of ${v.name}"><label><input type="radio" name="a${i}" value="" ${v.attended == null ? 'checked' : ''} ${locked || future ? 'disabled' : ''}><span class="na">—</span></label>
        <label><input type="radio" name="a${i}" value="1" ${v.attended === 1 ? 'checked' : ''} ${locked || future ? 'disabled' : ''}><span class="yes">${icon('check')} Present</span></label>
        <label><input type="radio" name="a${i}" value="0" ${v.attended === 0 ? 'checked' : ''} ${locked || future ? 'disabled' : ''}><span class="no">${icon('x')} Absent</span></label></div>
      <label class="f" style="margin:0"><span>Reached</span><input type="number" min="0" name="p${i}" value="${v.attended === 1 ? v.addressed : ''}" ${v.attended === 1 && !locked ? '' : 'disabled'} inputmode="numeric"></label>
      <label class="f" style="margin:0"><span>Registered</span><input type="number" min="0" name="r${i}" value="${v.attended === 1 ? v.registered : ''}" ${v.attended === 1 && !locked ? '' : 'disabled'} inputmode="numeric"></label></div>`)
      : html`<div class="stu"><div>${badge('Nobody assigned', 'danger')} <a href="#/me/schedule">Assign students in the Schedule</a></div></div>`}
    ${locked ? '' : html`<div class="ft"><div class="row gap-s">${future ? html`<span class="small muted">Attendance opens on the day.</span>` : vols.length ? html`<button type="button" class="btn sm ghost" data-act="allPresent">${icon('check-circle')} Mark all present</button>` : ''}<button type="button" class="btn sm ghost" data-act="addSub" data-id="${d.id}">${icon('user')} Add a substitute</button></div>
      <div class="row"><div data-err></div>${future || !vols.length ? '' : html`<button class="btn primary" type="submit">${icon('check')} Save</button>`}</div></div>`}</form>`;
}
document.addEventListener('change', e => {
  const r = e.target; if (r.type !== 'radio' || !/^a\d$/.test(r.name)) return;
  const row = r.closest('.stu'), i = r.name.slice(1);
  $$(`input[name=p${i}],input[name=r${i}]`, row).forEach(x => { x.disabled = r.value !== '1'; if (r.value !== '1') x.value = ''; else if (x.value === '') x.value = 0; });
});
actions.allPresent = el => { $$('input[type=radio][value="1"]:not(:disabled)', el.closest('form')).forEach(r => { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }); };
forms.saveDay = async f => {
  const v = fd(f), vols = [];
  for (let i = 0; i < 6; i++) {
    if (v['n' + i] == null) break; const a = v['a' + i];
    vols.push({ name: v['n' + i], contact: v['c' + i], attended: a === '1' ? 1 : a === '0' ? 0 : null, addressed: v['p' + i], registered: v['r' + i] });
  }
  await api(`/api/college/days/${f.dataset.id}/volunteers`, 'PUT', { volunteers: vols });
  toast('Saved'); const y = window.scrollY; await reloadCol(); window.scrollTo(0, y);
};
actions.addSub = el => {
  const d = COL.days.find(x => x.id === Number(el.dataset.id)), have = new Set(d.volunteers.map(v => v.contact));
  const busyToday = new Set(COL.days.filter(x => x.date === d.date && x.id !== d.id).flatMap(x => x.volunteers.map(v => v.contact)));
  const opts = COL.pool.filter(p => p.active && !have.has(p.contact) && !busyToday.has(p.contact));
  modal(html`<h2>Add a substitute</h2>${opts.length ? html`<form data-form="addSub" data-id="${d.id}" class="stack-s"><label class="f"><span>Student</span><select name="c" required><option value="">Choose…</option>${opts.map(p => html`<option value="${p.contact}">${p.name}</option>`)}</select></label><div data-err></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Add</button></div></form>` : html`<p class="muted">Everyone in your list is already working today. Add more students first.</p><div class="row" style="justify-content:flex-end"><a class="btn primary" href="#/me/students" data-act="closeModal">Add students</a></div>`}`);
};
forms.addSub = async f => {
  const d = COL.days.find(x => x.id === Number(f.dataset.id)), p = COL.pool.find(x => x.contact === fd(f).c);
  const keep = d.volunteers.filter(v => v.name).map(v => ({ name: v.name, contact: v.contact, attended: v.attended, addressed: v.addressed, registered: v.registered }));
  await api(`/api/college/days/${d.id}/volunteers`, 'PUT', { volunteers: [...keep, { name: p.name, contact: p.contact, attended: null }] }); f.closest('.overlay').close(); toast('Substitute added'); reloadCol();
};

// ---------- photos ----------
const photoGrid = (d, locked) => html`<div class="photogrid">${d.media.length ? d.media.map(m => html`<figure><img src="/api/college/photos/${m.id}" alt="Field day photo" loading="lazy">${locked ? '' : html`<button type="button" class="x" data-act="delPhoto" data-id="${m.id}" data-day="${d.id}" aria-label="Delete photo">${icon('x')}</button>`}</figure>`) : html`<p class="muted">No photos yet.</p>`}</div>`;
actions.photos = el => {
  const d = COL.days.find(x => x.id === Number(el.dataset.id)), locked = villageOf(d.village_id)?.locked;
  const m = modal(html`<h2>Photos · ${villageOf(d.village_id).village_name}, ${fdate(d.date)}</h2><div id="pg2">${photoGrid(d, locked)}</div>
    ${locked ? '' : COL.photos_enabled ? html`<label class="btn primary" style="margin-top:14px">${icon('camera')} Add photos<input type="file" id="pf" accept="image/*" multiple hidden></label><p class="hint">Up to 8 photos a day. Please photograph only people who are comfortable being photographed.</p><div id="pst" class="small"></div>` : html`<div class="alert info" style="margin-top:14px">Photo storage isn't connected yet.</div>`}
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn secondary" data-act="closeModal">Close</button></div>`, { wide: true });
  const pf = $('#pf', m);
  if (pf) pf.addEventListener('change', async () => {
    const st = $('#pst', m);
    for (const f of pf.files) { st.textContent = `Uploading ${f.name}…`; try { await api(`/api/college/days/${d.id}/photos`, 'POST', { name: f.name, mime: 'image/jpeg', data: await shrink(f) }); } catch (e) { toast(e.message, true); } }
    pf.value = ''; st.textContent = ''; COL = await api('/api/college/overview'); show($('#pg2', m), photoGrid(COL.days.find(x => x.id === d.id), locked));
  });
};
function shrink(file) {   // resize to max 1600px JPEG so uploads stay small on mobile data
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.82).split(',')[1]); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error(`${file.name} isn't a readable image`)); };
    img.src = url;
  });
}
actions.delPhoto = async el => {
  if (!await confirmBox('Delete this photo?', 'Delete', true)) return; await api('/api/college/photos/' + el.dataset.id, 'DELETE');
  const m = el.closest('.overlay'), id = Number(el.dataset.day); COL = await api('/api/college/overview'); show($('#pg2', m), photoGrid(COL.days.find(x => x.id === id), false));
};

// ---------- Villages ----------
async function pgVillages(el) {
  window.__VL = await api('/api/college/villages'); const pendingFor = new Set(COL.requests.filter(r => r.status === 'pending').map(r => r.assignment_id));
  show(el, html`${pageHead('My villages', 'Each village needs 15 field days with 2 students a day. When all days are recorded, send the village to its officer for certification.', html`<button class="btn secondary" data-act="reqChange" data-a="">${icon('plus')} Ask for an extra village</button>`, 'Programme')}
    ${COL.assignments.length ? html`<div class="grid g2">${COL.assignments.map(a => {
      const dd = COL.days.filter(d => d.village_id === a.village_id), mk = dd.filter(marked).length, unst = dd.filter(d => !staffed(d)).length, future = dd.filter(d => d.date > COL.today).length, unrec = dd.filter(d => d.date <= COL.today && !marked(d)).length;
      const why = !dd.length ? 'Create the schedule first' : unrec ? `${unrec} day${unrec > 1 ? 's' : ''} still to record` : future ? `${future} upcoming day${future > 1 ? 's' : ''} to finish` : '';
      return html`<div class="card rv"><div class="card-head"><h3>${a.village_name}</h3>${ackBadge(a.ack_status)}</div>
        <dl class="kv"><dt>LSGI</dt><dd>${a.lsgi || '—'}</dd><dt>Distance</dt><dd>${km(a.distance_km)} ${a.distance_road ? 'by road' : ''}${a.distance_note ? ` (${a.distance_note})` : ''}</dd>
          <dt>Village office</dt><dd>${a.office_address || '—'}</dd><dt>Office phone</dt><dd>${a.office_phone || '—'}</dd><dt>Village officer</dt><dd>${a.officer_name || 'Not assigned yet'}</dd></dl>
        <div style="margin:14px 0 6px" class="row between small"><span class="muted">${mk} of 15 days recorded · ${dd.length - unst} of ${dd.length || 15} staffed</span><b>${Math.round(mk * 100 / 15)}%</b></div>${progress(Math.round(mk * 100 / 15), 'green')}
        <div class="small muted" style="margin-top:10px">${n(a.totals.registered)} registered · ${n(a.totals.addressed)} reached</div>
        ${a.query_note ? html`<div class="alert warn" style="margin-top:12px">${icon('alert')}<div><b>Officer asked for a correction:</b> ${a.query_note}</div></div>` : ''}
        ${a.ack_status === 'acknowledged' ? html`<div class="alert ok" style="margin-top:12px">${icon('certificate')}<div>Participation certified by <b>${a.ack_name}</b>${a.ack_designation ? `, ${a.ack_designation}` : ''} on ${fdt(a.ack_at)}. Your students are eligible for certificates.</div></div><div class="row" style="margin-top:10px"><button class="btn green" data-act="collCerts" data-v="${a.village_id}">${icon('certificate')} Student certificates</button></div>` : ''}
        <div class="row" style="margin-top:14px"><button class="btn primary" data-act="submitVillage" data-v="${a.village_id}" ${a.locked || why ? 'disabled' : ''}>${icon('shield')} ${a.ack_status === 'submitted' ? 'Sent to officer' : 'Send for certification'}</button>
          <button class="btn secondary" data-act="reqChange" data-a="${a.id}" ${a.locked || pendingFor.has(a.id) ? 'disabled' : ''}>Request a different village</button></div>
        ${why && !a.locked ? html`<p class="hint">${why}.</p>` : ''}</div>`; })}</div>` : empty('No villages allotted yet', '', 'map-pin')}
    <div class="card" style="margin-top:18px"><div class="card-head"><h3>Change requests</h3></div>${COL.requests.length ? html`<div class="tablewrap"><table><thead><tr><th>Asked on</th><th>Request</th><th>Reason</th><th>Status</th><th>Admin note</th><th></th></tr></thead><tbody>${COL.requests.map(r => html`<tr>
      <td>${fdt(r.created_at)}</td><td>${r.from_village ? html`${r.from_village} → <b>${r.to_village}</b>` : html`Extra: <b>${r.to_village}</b>`}</td><td>${r.reason}</td><td>${badge(r.status, r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'danger' : 'warn')}</td><td>${r.admin_note || ''}</td>
      <td>${r.status === 'pending' ? html`<button class="btn sm danger" data-act="cancelReq" data-id="${r.id}">Withdraw</button>` : ''}</td></tr>`)}</tbody></table></div>` : html`<p class="muted">No requests. If a village is unsuitable, you can ask for another.</p>`}</div>`);
}
actions.reqChange = el => {
  const aid = el.dataset.a, all = (window.__VL || []).filter(v => !v.mine);
  modal(html`<h2>${aid ? 'Request a different village' : 'Ask for an extra village'}</h2><form data-form="reqChange" class="stack-s">
    ${aid ? html`<input type="hidden" name="assignment_id" value="${aid}"><p>Swapping out <b>${COL.assignments.find(a => String(a.id) === String(aid)).village_name}</b>.</p>` : ''}
    <label class="f"><span>Preferred village</span><select name="to_village_id" required><option value="">Choose a village…</option>${all.map(v => html`<option value="${v.id}">${v.name} · ${v.taluk || ''}${v.distance_km != null ? ' · ' + v.distance_km + ' km away' : ''}</option>`)}</select><span class="hint">${all.some(v => v.distance_km != null) ? 'All villages, nearest to your college first. ' : ''}This is only your preference. Nothing changes until the district office approves it.</span></label>
    <label class="f"><span>Reason</span><textarea name="reason" required maxlength="500" placeholder="e.g. 38 km away, no direct bus for our students"></textarea></label><div data-err></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">Send request</button></div></form>`);
};
actions.collCerts = async el => showCertificates(await api('/api/college/certificates/' + el.dataset.v));
forms.reqChange = async f => { await api('/api/college/requests', 'POST', fd(f)); f.closest('.overlay').close(); toast('Request sent to the district office'); reloadCol(); };
actions.cancelReq = async el => { await api('/api/college/requests/' + el.dataset.id, 'DELETE'); toast('Request withdrawn'); reloadCol(); };
actions.submitVillage = async el => {
  if (!await confirmBox('Send this village to its village officer for certification? You will not be able to edit it while the officer reviews it.', 'Send')) return;
  const r = await api('/api/college/submit-village', 'POST', { village_id: Number(el.dataset.v) });
  toast(r.emailed === 'failed' ? 'Sent. The officer has no email on record, so the district office will pass it on.' : 'Sent to the village officer'); reloadCol();
};

// ---------- Announcements / Help desk / Resources ----------
async function pgNotices(el) {
  show(el, html`${pageHead('Announcements', 'Messages from the district election office.', '', 'Programme')}${CANN.length ? html`<div class="stack-s">${CANN.map(a => html`<article class="notice rv ${a.pinned ? 'pinned' : ''}"><h3>${a.pinned ? html`${icon('pin')} ` : ''}${a.title} ${seenIds().includes(a.id) ? '' : badge('New', 'saffron')}</h3>${a.body ? html`<p>${a.body}</p>` : ''}<div class="when">${fdt(a.created_at)}${a.expires_on ? ` · shown until ${fdate(a.expires_on)}` : ''}</div></article>`)}</div>` : empty('No announcements', 'You will see messages from the district office here.', 'megaphone')}`);
  markSeen(CANN.map(a => a.id));
}
async function pgHelp(el) {
  const [cats, mine] = await Promise.all([api('/api/issue-categories'), api('/api/college/issues')]);
  show(el, html`${pageHead('Help desk', 'Stuck on something? Tell the district office and track the reply here.', '', 'Programme')}
    <div class="grid g2"><div class="card"><div class="card-head"><h3>Raise an issue</h3></div><form data-form="issue" class="stack-s"><label class="f"><span>What is it about?</span><select name="category">${cats.map(c => html`<option>${c}</option>`)}</select></label>
      <label class="f"><span>Subject</span><input type="text" name="subject" required maxlength="140" placeholder="A short title"></label><label class="f"><span>Details</span><textarea name="message" required maxlength="2000" rows="5" placeholder="Tell us what happened and what you need."></textarea></label><div data-err></div>
      <button class="btn primary" type="submit">${icon('message')} Send to the district office</button></form></div>
    <div class="card"><div class="card-head"><h3>Your issues</h3></div>${mine.length ? mine.map(i => html`<div style="padding:12px 0;border-bottom:1px solid var(--line)"><div class="row between"><b>${i.subject}</b>${badge(i.status.replace('_', ' '), i.status === 'resolved' ? 'ok' : i.status === 'in_progress' ? 'info' : 'warn')}</div>
      <div class="small muted">${i.category} · ${fdt(i.created_at)}</div><p class="small" style="margin-top:6px">${i.message}</p>${i.staff_reply ? html`<div class="alert info" style="margin-top:8px">${icon('message')}<div><b>${i.replied_by}:</b> ${i.staff_reply}</div></div>` : ''}</div>`) : html`<p class="muted">Nothing raised yet.</p>`}</div></div>`);
}
forms.issue = async f => { await api('/api/college/issues', 'POST', fd(f)); toast('Sent. We will reply here.'); reloadCol(); };
async function pgResources(el) {
  const list = await api('/api/resources'), cats = [...new Set(list.map(r => r.category))].sort();
  show(el, html`${pageHead('Resource centre', 'Manuals, forms and guides shared by the district office.', '', 'Programme')}
    ${list.length ? cats.map(c => html`<h3 style="margin:18px 0 8px">${c}</h3><div class="grid g2">${list.filter(r => r.category === c).map(resCard)}</div>`) : empty('Nothing shared yet', 'Manuals and forms will appear here.', 'book')}`);
}

// ---------- Reports ----------
async function pgReport(el) {
  const s = COL.stats, byS = new Map();
  COL.days.forEach(d => d.volunteers.filter(v => v.name).forEach(v => { const k = v.contact; const r = byS.get(k) || { name: v.name, contact: v.contact, assigned: 0, present: 0, absent: 0, addr: 0, reg: 0 }; r.assigned++; if (v.attended === 1) { r.present++; r.addr += v.addressed; r.reg += v.registered; } else if (v.attended === 0) r.absent++; byS.set(k, r); }));
  show(el, html`${pageHead('Reports', 'Your club\'s record, ready to print or download.', html`<button class="btn secondary" data-act="csvDays">${icon('download')} Download log (CSV)</button><button class="btn primary" data-act="printPage">${icon('printer')} Print</button>`, 'Programme')}
    <div class="kpis" style="margin-bottom:16px">${kpi('Voters enrolled', s.registered, { ic: 'user-check', tone: 'green' })}${kpi('People reached', s.addressed, { ic: 'megaphone', tone: 'saffron' })}${kpi('Attendance', s.attendance_pct == null ? '—' : s.attendance_pct + '%', { ic: 'check-circle', count: false })}${kpi('Students who worked', s.volunteers, { ic: 'users' })}</div>
    <div class="card pad0" style="margin-bottom:16px"><div class="card-head pad"><h3>By village</h3></div><div class="tablewrap"><table><thead><tr><th>Village</th><th class="num">Days</th><th class="num">Shifts worked</th><th class="num">Reached</th><th class="num">Registered</th><th>Certification</th></tr></thead><tbody>
      ${COL.assignments.map(a => html`<tr><td><b>${a.village_name}</b></td><td class="num">${a.totals.days}</td><td class="num">${a.totals.attended}</td><td class="num">${n(a.totals.addressed)}</td><td class="num">${n(a.totals.registered)}</td><td>${a.ack_status === 'acknowledged' ? html`${a.ack_name}${a.ack_designation ? `, ${a.ack_designation}` : ''} · ${fdt(a.ack_at)}` : ackBadge(a.ack_status)}</td></tr>`)}</tbody></table></div></div>
    <div class="card pad0"><div class="card-head pad"><h3>By student</h3></div><div class="tablewrap"><table><thead><tr><th>Student</th><th>Mobile</th><th class="num">Assigned</th><th class="num">Present</th><th class="num">Absent</th><th class="num">Reached</th><th class="num">Registered</th></tr></thead><tbody>
      ${[...byS.values()].sort((a, b) => b.reg - a.reg).map(v => html`<tr><td><b>${v.name}</b></td><td>${v.contact}</td><td class="num">${v.assigned}</td><td class="num">${v.present}</td><td class="num">${v.absent}</td><td class="num">${n(v.addr)}</td><td class="num">${n(v.reg)}</td></tr>`)}</tbody></table></div></div>`);
}
actions.printPage = () => window.print();
actions.csvDays = () => {
  const rows = []; COL.days.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(d => d.volunteers.filter(v => v.name).forEach(v => rows.push([d.date, villageOf(d.village_id).village_name, v.name, v.contact, v.attended === 1 ? 'Present' : v.attended === 0 ? 'Absent' : 'Not recorded', v.attended === 1 ? v.addressed : '', v.attended === 1 ? v.registered : ''])));
  download(`${(COL.college.short_name || 'college').replace(/\W+/g, '-')}-daily-log.csv`, toCsv(['Date', 'Village', 'Student', 'Mobile', 'Attendance', 'People reached', 'Registered'], rows));
};

// ---------- change own password ----------
actions.changePw = () => modal(html`<h2>Change password</h2><form data-form="changePw" class="stack-s">
  <label class="f"><span>Current password</span><input type="password" name="current" autocomplete="current-password" required></label>
  <label class="f"><span>New password (at least 8 characters)</span><input type="password" name="password" minlength="8" autocomplete="new-password" required></label>
  <div data-err></div><div class="row" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn secondary" data-act="closeModal">Cancel</button><button class="btn primary">Save password</button></div></form>`);
forms.changePw = async f => { await api('/api/college/password', 'POST', fd(f)); f.closest('.overlay').close(); toast('Password changed'); };
