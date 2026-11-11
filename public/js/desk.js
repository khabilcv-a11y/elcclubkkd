'use strict';
// ---- college / school workspace: daily help-desk report, volunteers (help desk and other activities), volunteer list ----
let DESKDATE = null, DESK = null;

async function pgDesk(el) {
  DESKDATE ||= COL.today;
  DESK = await api('/api/college/desk?date=' + DESKDATE);
  const d = DESK, day = d.day, t = d.totals, isToday = d.date === d.today, future = d.date > d.today;
  const helpers = d.activities.filter(a => a.activity === 'Help desk'), others = d.activities.filter(a => a.activity !== 'Help desk');
  const legacy = day && !helpers.length && day.volunteers > 0;
  const nameBox = (form, more = '') => html`<label class="f"><span>Volunteer name${more}</span><input type="text" name="name" list="deskNames" autocomplete="off" maxlength="400" placeholder="Start typing a name…" required><datalist id="deskNames">${d.suggestions.map(s => html`<option value="${s}">`)}</datalist></label>
        ${d.suggestions.length ? html`<div class="chips small" aria-label="Recently used names">${d.suggestions.slice(0, 8).map(s => html`<button type="button" class="chip" data-act="useName" data-n="${s}">${s}</button>`)}</div>` : ''}`;
  show(el, html`${pageHead('Daily help-desk report', 'Each day, record how many registrations your help desk made and which volunteers were present. Below, add the volunteers who took part in other activities, and see every volunteer\'s activities and dates.', '', 'Campus to booth')}
    <div class="kpis" style="margin-bottom:16px">${kpi('Registrations so far', t.registrations, { ic: 'user-check', tone: 'green' })}${kpi('Days reported', t.days, { ic: 'calendar' })}${kpi('Volunteer-days at the help desk', t.volunteer_days, { ic: 'users', tone: 'saffron', sub: '1 volunteer present for 1 day = 1 volunteer-day' })}</div>
    <div class="card" style="margin-bottom:16px"><div class="row between"><div class="row nowrap"><button class="iconbtn" data-act="deskPrev" aria-label="Previous day">${icon('arrow-left')}</button>
      <label class="f" style="margin:0"><span class="sr">Date</span><input type="date" id="deskdate" value="${d.date}" max="${d.today}" style="width:auto"></label><button class="iconbtn" data-act="deskNext" aria-label="Next day" ${isToday ? 'disabled' : ''}>${icon('arrow-right')}</button>
      ${isToday ? '' : html`<button class="btn ghost sm" data-act="deskToday">Today</button>`}</div><div><b>${fdateLong(d.date)}</b> ${isToday ? badge('Today', 'saffron') : ''} ${day ? badge('Reported', 'ok') : badge('Not reported', 'warn')}</div></div></div>
    <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${icon('help')} Help desk</h3>${day?.updated_at ? html`<span class="small muted">Saved ${fdt(day.updated_at)}</span>` : ''}</div>
      <form data-form="deskSave" class="stack-s"><div class="formgrid"><label class="f"><span>Registrations made today</span><input type="number" name="registrations" min="0" inputmode="numeric" required value="${day ? day.registrations : ''}" placeholder="0"></label>
        <label class="f"><span>Notes (optional)</span><input type="text" name="notes" maxlength="400" value="${day?.notes || ''}" placeholder="e.g. rain in the afternoon, forms ran out"></label></div>
        <div data-err></div><div class="row"><button class="btn primary" type="submit">${icon('check')} ${day ? 'Update the report' : 'Save the report'}</button></div></form>
      <hr class="soft">
      <h4 style="margin-bottom:6px">Volunteers at the help desk <span class="badge">${helpers.length || day?.volunteers || 0}</span></h4>
      <p class="small muted" style="margin-bottom:10px">Add the name of each volunteer who was at the help desk. The count is worked out from the names. Names used before are suggested as you type; to add several at once, separate them with commas.</p>
      ${legacy ? html`<div class="alert info" style="margin-bottom:10px">An earlier report counted <b>${day.volunteers}</b> volunteers without names. Add their names below and the count will follow the names.</div>` : ''}
      <form data-form="deskHelp" class="stack-s">${nameBox('help')}<div data-err></div><div class="row"><button class="btn secondary" type="submit">${icon('plus')} Add volunteer</button></div></form>
      ${helpers.length ? html`<div class="pillrow" style="margin-top:12px">${helpers.map(a => html`<span class="pill">${a.name}<button type="button" class="x" data-act="delAct" data-id="${a.id}" aria-label="Remove ${a.name}">${icon('x')}</button></span>`)}</div>` : html`<p class="muted small" style="margin-top:12px">No help desk volunteers added for this day yet.</p>`}</div>
    <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${icon('users')} Volunteers in other activities</h3></div>
      <p class="small muted" style="margin-bottom:10px">Flash mob, class-to-class campaign, game zone or anything else. Names you have used before are suggested, so you don't have to type them again.</p>
      <form data-form="deskAct" class="stack-s"><div class="formgrid"><label class="f"><span>Activity</span><select name="activity" id="actsel">${d.choices.map(c => html`<option>${c}</option>`)}</select></label>
        <label class="f hide" id="actother"><span>Which activity?</span><input type="text" name="other" maxlength="60" placeholder="e.g. Street play"></label></div>
        ${nameBox('act', ' (commas to add several)')}
        <div data-err></div><div class="row"><button class="btn secondary" type="submit">${icon('plus')} Add volunteer</button></div></form>
      ${others.length ? html`<div style="margin-top:14px">${groupActs(others).map(([k, list]) => html`<div class="actgroup"><b>${k}</b> <span class="muted small">${list.length} volunteer${list.length > 1 ? 's' : ''}</span><div class="pillrow" style="margin-top:6px">${list.map(a => html`<span class="pill">${a.name}<button type="button" class="x" data-act="delAct" data-id="${a.id}" aria-label="Remove ${a.name}">${icon('x')}</button></span>`)}</div></div>`)}</div>` : html`<p class="muted small" style="margin-top:12px">No other activity volunteers added for this day yet.</p>`}</div>
    <div class="card pad0" style="margin-bottom:16px"><div class="card-head pad"><h3>${icon('list')} Volunteer list</h3><span class="small muted" id="volcount"></span></div>
      <div class="filterbar"><div class="chips" role="group" aria-label="View"><button class="chip on" data-act="volView" data-k="student">Student-wise</button><button class="chip" data-act="volView" data-k="day">Day by day</button></div>
        <label class="f"><span class="sr">Activity</span><select id="volact" aria-label="Activity"><option value="">All activities</option></select></label>
        <label class="f"><span class="sr">Search</span><input type="search" id="volq" placeholder="Search a student or activity…"></label><button class="btn secondary sm" data-act="volCsv">${icon('download')} Download CSV</button></div>
      <div id="voltable"><div class="loading" style="padding:20px"><div class="spin"></div></div></div></div>
    <div class="card pad0"><div class="card-head pad"><h3>Reports so far</h3></div>${d.history.length ? html`<div class="tablewrap" style="max-height:340px"><table><thead><tr><th>Date</th><th class="num">Registrations</th><th class="num">Volunteers</th><th></th></tr></thead><tbody>${d.history.map(h => html`<tr><td>${fdateLong(h.date)}</td><td class="num">${h.registrations}</td><td class="num">${h.volunteers}</td><td class="right"><button class="btn sm secondary" data-act="deskGo" data-d="${h.date}">Open</button></td></tr>`)}</tbody></table></div>` : html`<div style="padding:20px">${empty('No reports yet', 'Your first daily report will appear here.', 'clipboard')}</div>`}</div>`);
  const sel = $('#actsel'); const toggle = () => $('#actother').classList.toggle('hide', sel.value !== 'Other'); sel.addEventListener('change', toggle); toggle();
  $('#deskdate').addEventListener('change', e => { if (e.target.value) { DESKDATE = e.target.value; pgDesk($('#pg')); } });
  if (future) toast('That date has not happened yet', true);
  loadVol();
}
const actLabel = a => (a.activity === 'Other' && a.activity_other ? (['Vote Unnathi', 'Sea Your Vote', 'Vote Unbound'].includes(a.activity_other) ? a.activity_other : `Other: ${a.activity_other}`) : a.activity);
function groupActs(rows) { const m = new Map(); for (const r of rows) (m.get(actLabel(r)) || m.set(actLabel(r), []).get(actLabel(r))).push(r); return [...m.entries()]; }
actions.deskPrev = () => { DESKDATE = addDays(DESKDATE, -1); pgDesk($('#pg')); };
actions.deskNext = () => { if (DESKDATE < COL.today) { DESKDATE = addDays(DESKDATE, 1); pgDesk($('#pg')); } };
actions.deskToday = () => { DESKDATE = COL.today; pgDesk($('#pg')); };
actions.deskGo = el => { DESKDATE = el.dataset.d; pgDesk($('#pg')); window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }); };
actions.useName = el => { const i = $('input[name=name]', el.closest('form')); i.value = i.value && /,\s*$/.test(i.value) ? i.value + el.dataset.n : el.dataset.n; i.focus(); };
const splitNames = s => String(s || '').split(/[,\n;]/).map(x => x.trim()).filter(Boolean);
forms.deskSave = async f => { const v = fd(f); await api('/api/college/desk', 'PUT', { date: DESKDATE, registrations: v.registrations, notes: v.notes }); toast('Report saved'); pgDesk($('#pg')); };
forms.deskHelp = async f => {
  const names = splitNames(fd(f).name); if (!names.length) throw new Error('Enter the volunteer name');
  await api('/api/college/desk/activity', 'POST', { date: DESKDATE, activity: 'Help desk', names });
  toast(names.length > 1 ? `${names.length} volunteers added` : `${names[0]} added`); await pgDesk($('#pg')); $('input[name=name]', $('[data-form=deskHelp]'))?.focus();
};
forms.deskAct = async f => {
  const v = fd(f), names = splitNames(v.name); if (!names.length) throw new Error('Enter the volunteer name');
  await api('/api/college/desk/activity', 'POST', { date: DESKDATE, activity: v.activity, other: v.other, names });
  toast(names.length > 1 ? `${names.length} volunteers added` : `${names[0]} added`); const keep = v.activity; await pgDesk($('#pg')); const s = $('#actsel'); if (s) { s.value = keep; s.dispatchEvent(new Event('change')); $('input[name=name]', $('[data-form=deskAct]'))?.focus(); }
};
actions.delAct = async el => { await api('/api/college/desk/activity/' + el.dataset.id, 'DELETE'); pgDesk($('#pg')); };

// ---------- the volunteer list: student-wise and day by day, sortable, searchable, downloadable ----------
let VOL = [], VVIEW = 'student', VQ = '', VACT = '', VSORT = { student: ['name', 1], day: ['date', -1] };
async function loadVol() {
  try { VOL = await api('/api/college/desk/volunteers'); } catch { VOL = []; }
  const acts = [...new Set(VOL.map(r => r.activity))].sort();
  const sel = $('#volact'); if (!sel) return;
  sel.innerHTML = '<option value="">All activities</option>' + acts.map(a => `<option>${esc(a)}</option>`).join('');
  sel.value = acts.includes(VACT) ? VACT : ''; VACT = sel.value;
  sel.onchange = () => { VACT = sel.value; paintVol(); };
  const q = $('#volq'); q.value = VQ; q.oninput = () => { VQ = q.value; paintVol(); };
  paintVol();
}
function volData() {
  const q = VQ.toLowerCase(), rows = VOL.filter(r => (!VACT || r.activity === VACT) && (!q || r.name.toLowerCase().includes(q) || r.activity.toLowerCase().includes(q)));
  if (VVIEW === 'day') return { cols: [['date', 'Date'], ['name', 'Student'], ['activity', 'Activity']], rows: rows.map(r => ({ date: r.date, name: r.name, activity: r.activity })) };
  const m = new Map();
  for (const r of rows) { const k = r.name.toLowerCase(), g = m.get(k) || { name: r.name, acts: new Set(), dates: new Set(), first: r.date, last: r.date }; g.acts.add(r.activity); g.dates.add(r.date); if (r.date < g.first) g.first = r.date; if (r.date > g.last) g.last = r.date; m.set(k, g); }
  return { cols: [['name', 'Student'], ['activities', 'Activities taken part in'], ['days', 'Days'], ['first', 'First day'], ['last', 'Latest day']], rows: [...m.values()].map(g => ({ name: g.name, activities: [...g.acts].sort().join(', '), days: g.dates.size, first: g.first, last: g.last })) };
}
function volSorted() {
  const d = volData(), [k, dir] = VSORT[VVIEW], num = typeof d.rows[0]?.[k] === 'number';
  d.rows.sort((a, b) => (num ? a[k] - b[k] : String(a[k]).localeCompare(String(b[k]), undefined, { sensitivity: 'base' })) * dir || String(a.name).localeCompare(String(b.name)));
  return d;
}
function paintVol() {
  const box = $('#voltable'); if (!box) return;
  const d = volSorted(), [sk, sd] = VSORT[VVIEW];
  $('#volcount').textContent = VVIEW === 'student' ? `${d.rows.length} student${d.rows.length === 1 ? '' : 's'}` : `${d.rows.length} entr${d.rows.length === 1 ? 'y' : 'ies'}`;
  const fmt = (k, v) => (['date', 'first', 'last'].includes(k) && v ? fdate(v) : v);
  show(box, d.rows.length ? html`<div class="tablewrap" style="max-height:420px"><table><caption class="sr">Volunteer list</caption><thead><tr>${d.cols.map(([k, l]) => html`<th class="${k === 'days' ? 'num' : ''}" aria-sort="${sk === k ? (sd === 1 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="sortbtn ${sk === k ? 'on' : ''}" data-act="volSort" data-k="${k}" title="Sort by ${l}">${l}<span class="sico ${sk === k ? (sd === 1 ? 'asc' : 'desc') : ''}" aria-hidden="true"></span></button></th>`)}</tr></thead>
      <tbody>${d.rows.map(r => html`<tr>${d.cols.map(([k]) => html`<td class="${k === 'days' ? 'num' : ''}">${fmt(k, r[k])}</td>`)}</tr>`)}</tbody></table></div>`
    : html`<div style="padding:20px">${empty(VOL.length ? 'No one matches' : 'No volunteers added yet', VOL.length ? 'Try another search or activity.' : 'Names you add above appear here, with their activities and dates.', 'users')}</div>`);
}
actions.volView = el => { VVIEW = el.dataset.k; $$('[data-act=volView]').forEach(b => b.classList.toggle('on', b === el)); paintVol(); };
actions.volSort = el => { const k = el.dataset.k, s = VSORT[VVIEW]; VSORT[VVIEW] = s[0] === k ? [k, -s[1]] : [k, 1]; paintVol(); };
actions.volCsv = () => {
  const d = volSorted(), q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const text = '﻿' + [d.cols.map(c => q(c[1])).join(','), ...d.rows.map(r => d.cols.map(([k]) => q(r[k])).join(','))].join('\r\n');
  saveBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), `volunteers-${VVIEW === 'student' ? 'student-wise' : 'day-by-day'}.csv`);
};
