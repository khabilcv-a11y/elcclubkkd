'use strict';
// ---- college / school workspace: daily help-desk report and volunteers of other activities ----
let DESKDATE = null, DESK = null;

async function pgDesk(el) {
  DESKDATE ||= COL.today;
  DESK = await api('/api/college/desk?date=' + DESKDATE);
  const d = DESK, day = d.day, t = d.totals, isToday = d.date === d.today, future = d.date > d.today;
  show(el, html`${pageHead('Daily help-desk report', 'Each day, record how many registrations your help desk made and how many volunteers were present. Below, add the volunteers who took part in other activities.', '', 'Campus to booth')}
    <div class="kpis" style="margin-bottom:16px">${kpi('Registrations so far', t.registrations, { ic: 'user-check', tone: 'green' })}${kpi('Days reported', t.days, { ic: 'calendar' })}${kpi('Volunteer-days at the help desk', t.volunteer_days, { ic: 'users', tone: 'saffron', sub: '1 volunteer present for 1 day = 1 volunteer-day' })}</div>
    <div class="card" style="margin-bottom:16px"><div class="row between"><div class="row nowrap"><button class="iconbtn" data-act="deskPrev" aria-label="Previous day">${icon('arrow-left')}</button>
      <label class="f" style="margin:0"><span class="sr">Date</span><input type="date" id="deskdate" value="${d.date}" max="${d.today}" style="width:auto"></label><button class="iconbtn" data-act="deskNext" aria-label="Next day" ${isToday ? 'disabled' : ''}>${icon('arrow-right')}</button>
      ${isToday ? '' : html`<button class="btn ghost sm" data-act="deskToday">Today</button>`}</div><div><b>${fdateLong(d.date)}</b> ${isToday ? badge('Today', 'saffron') : ''} ${day ? badge('Reported', 'ok') : badge('Not reported', 'warn')}</div></div></div>
    <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${icon('help')} Help desk</h3>${day?.updated_at ? html`<span class="small muted">Saved ${fdt(day.updated_at)}</span>` : ''}</div>
      <form data-form="deskSave" class="stack-s"><div class="formgrid"><label class="f"><span>Registrations made today</span><input type="number" name="registrations" min="0" inputmode="numeric" required value="${day ? day.registrations : ''}" placeholder="0"></label>
        <label class="f"><span>Volunteers present at the help desk</span><input type="number" name="volunteers" min="0" inputmode="numeric" required value="${day ? day.volunteers : ''}" placeholder="0"></label></div>
        <label class="f"><span>Notes (optional)</span><input type="text" name="notes" maxlength="400" value="${day?.notes || ''}" placeholder="e.g. rain in the afternoon, forms ran out"></label>
        <div data-err></div><div class="row"><button class="btn primary" type="submit">${icon('check')} ${day ? 'Update the report' : 'Save the report'}</button></div></form></div>
    <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${icon('users')} Volunteers in other activities</h3></div>
      <p class="small muted" style="margin-bottom:10px">Flash mob, class-to-class campaign, game zone or anything else. Names you have used before are suggested, so you don't have to type them again.</p>
      <form data-form="deskAct" class="stack-s"><div class="formgrid"><label class="f"><span>Activity</span><select name="activity" id="actsel">${d.choices.map(c => html`<option>${c}</option>`)}</select></label>
        <label class="f hide" id="actother"><span>Which activity?</span><input type="text" name="other" maxlength="60" placeholder="e.g. Street play"></label></div>
        <label class="f"><span>Volunteer name</span><input type="text" name="name" list="deskNames" autocomplete="off" maxlength="80" placeholder="Start typing a name…" required><datalist id="deskNames">${d.suggestions.map(s => html`<option value="${s}">`)}</datalist></label>
        ${d.suggestions.length ? html`<div class="chips small" aria-label="Recently used names">${d.suggestions.slice(0, 8).map(s => html`<button type="button" class="chip" data-act="useName" data-n="${s}">${s}</button>`)}</div>` : ''}
        <div data-err></div><div class="row"><button class="btn secondary" type="submit">${icon('plus')} Add volunteer</button></div></form>
      ${d.activities.length ? html`<div style="margin-top:14px">${groupActs(d.activities).map(([k, list]) => html`<div class="actgroup"><b>${k}</b> <span class="muted small">${list.length} volunteer${list.length > 1 ? 's' : ''}</span><div class="pillrow" style="margin-top:6px">${list.map(a => html`<span class="pill">${a.name}<button type="button" class="x" data-act="delAct" data-id="${a.id}" aria-label="Remove ${a.name}">${icon('x')}</button></span>`)}</div></div>`)}</div>` : html`<p class="muted small" style="margin-top:12px">No other activity volunteers added for this day yet.</p>`}</div>
    <div class="card pad0"><div class="card-head pad"><h3>Reports so far</h3></div>${d.history.length ? html`<div class="tablewrap" style="max-height:340px"><table><thead><tr><th>Date</th><th class="num">Registrations</th><th class="num">Volunteers</th><th></th></tr></thead><tbody>${d.history.map(h => html`<tr><td>${fdateLong(h.date)}</td><td class="num">${h.registrations}</td><td class="num">${h.volunteers}</td><td class="right"><button class="btn sm secondary" data-act="deskGo" data-d="${h.date}">Open</button></td></tr>`)}</tbody></table></div>` : html`<div style="padding:20px">${empty('No reports yet', 'Your first daily report will appear here.', 'clipboard')}</div>`}</div>`);
  const sel = $('#actsel'); const toggle = () => $('#actother').classList.toggle('hide', sel.value !== 'Other'); sel.addEventListener('change', toggle); toggle();
  $('#deskdate').addEventListener('change', e => { if (e.target.value) { DESKDATE = e.target.value; pgDesk($('#pg')); } });
  if (future) toast('That date has not happened yet', true);
}
const actLabel = a => (a.activity === 'Other' && a.activity_other ? `Other: ${a.activity_other}` : a.activity);
function groupActs(rows) { const m = new Map(); for (const r of rows) (m.get(actLabel(r)) || m.set(actLabel(r), []).get(actLabel(r))).push(r); return [...m.entries()]; }
actions.deskPrev = () => { DESKDATE = addDays(DESKDATE, -1); pgDesk($('#pg')); };
actions.deskNext = () => { if (DESKDATE < COL.today) { DESKDATE = addDays(DESKDATE, 1); pgDesk($('#pg')); } };
actions.deskToday = () => { DESKDATE = COL.today; pgDesk($('#pg')); };
actions.deskGo = el => { DESKDATE = el.dataset.d; pgDesk($('#pg')); window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }); };
actions.useName = el => { const i = $('input[name=name]', el.closest('form')); i.value = el.dataset.n; i.focus(); };
forms.deskSave = async f => { const v = fd(f); await api('/api/college/desk', 'PUT', { date: DESKDATE, registrations: v.registrations, volunteers: v.volunteers, notes: v.notes }); toast('Report saved'); pgDesk($('#pg')); };
forms.deskAct = async f => { const v = fd(f); const r = await api('/api/college/desk/activity', 'POST', { date: DESKDATE, activity: v.activity, other: v.other, name: v.name }); toast(`${v.name} added`); const keep = v.activity; await pgDesk($('#pg')); const s = $('#actsel'); if (s) { s.value = keep; s.dispatchEvent(new Event('change')); $('input[name=name]', $('#pg'))?.focus(); } };
actions.delAct = async el => { await api('/api/college/desk/activity/' + el.dataset.id, 'DELETE'); pgDesk($('#pg')); };
