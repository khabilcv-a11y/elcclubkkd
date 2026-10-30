// Guided tour: a short walk through the options a signed-in person has. Starts once for each new sign-in
// (remembered in this browser) and can be replayed any time with the "Tour" button.
const TOURS = {
  college: name => [
    { title: `Welcome, ${name}`, text: 'This one-minute tour shows what you can do here. You can skip it now and replay it any time with the Tour button at the top.' },
    { sel: 'a.nav[href="#/me/home"]', title: 'Home', text: 'Your progress at a glance, with quick links to everything below.' },
    { sel: 'a.nav[href="#/me/enrol"]', title: 'Enrolment drive', text: 'Enter your total numbers: total students, how many are already registered, and how many are not eligible yet. Then say how many eligible students are yet to register (we suggest the figure from your other numbers). Keep them up to date; the target is 100%.' },
    { sel: 'a.nav[href="#/me/desk"]', title: 'Daily report', text: 'Each day, record how many registrations your help desk made and how many volunteers were present. Add volunteers of other activities too; names you used before are suggested.' },
    { sel: 'a.nav[href="#/me/gallery"]', title: 'Gallery', text: 'Make framed photos of your events: add a photo, fit it in the frame, type the institution name and event title, then download it or save it here. Saved photos can be shared on WhatsApp and appear on the home page.' },
    { sel: 'a.nav[href="#/me/students"]', title: 'Students', text: 'Add your volunteers one by one, or paste a whole list copied from Excel or WhatsApp (name, then mobile number). Every village needs 2 students a day.' },
    { sel: 'a.nav[href="#/me/villages"]', title: 'My villages', text: 'The villages allotted to you, with the village office address, contact and distance. You can request a change if a village is not workable.' },
    { sel: 'a.nav[href="#/me/schedule"]', title: 'Schedule', text: 'Create the 15 field days for each village in one tap; students are shared out in shifts. Afterwards you can change any day: its date, village, students and a remark; add or remove days; or move the whole schedule.' },
    { sel: 'a.nav[href="#/me/log"]', title: 'Daily log', text: 'On or after each field day, record who attended, how many people they reached and how many registered. You can also add photos.' },
    { sel: 'a.nav[href="#/me/notices"]', title: 'Announcements', text: 'Messages from the district office. A number here means something new.' },
    { sel: 'a.nav[href="#/me/help"]', title: 'Help desk', text: 'Stuck or found a mistake? Raise an issue and the district team will reply here.' },
    { sel: 'a.nav[href="#/me/resources"]', title: 'Resources', text: 'Guides, forms and posters to download.' },
    { sel: 'a.nav[href="#/me/report"]', title: 'Reports', text: 'Print or download your club\'s work, and send a finished village to the village officer for certification.' },
    { sel: '[data-act=changePw]', title: 'Change your password', text: 'You start with the password shared by the district office. Please change it to your own. Keep it private.' },
    { sel: '[data-act=tour]', title: 'That is it', text: 'Press Tour whenever you want to see this again.' },
  ],
  officer: name => [
    { title: `Welcome, ${name}`, text: 'A quick look at how you verify and certify the work done in your village. Replay it any time with the Tour button.' },
    { sel: 'a.nav[href="#/officer/today"]', title: 'Today', text: 'The students scheduled in your village(s) today, with their phone numbers.' },
    { sel: 'a.nav[href="#/officer/verify"]', title: 'Verify attendance', text: 'Confirm or dispute the attendance recorded by each college. The number shows how many are waiting.' },
    { sel: 'a.nav[href="#/officer/villages"]', title: 'My villages', text: 'See each village\'s report. When a college submits a village, you can certify it here, or send it back with a query.' },
    { sel: 'a.nav[href="#/officer/notices"]', title: 'Announcements', text: 'Messages from the district office.' },
    { sel: 'a.nav[href="#/officer/resources"]', title: 'Resources', text: 'Guides and forms to download.' },
    { sel: '[data-act=tour]', title: 'That is it', text: 'Press Tour whenever you want to see this again.' },
  ],
  staff: (name, role) => [
    { title: `Welcome, ${name}`, text: `You are signed in as ${role}. This tour covers the options you have. Replay it any time with the Tour button.` },
    { sel: 'a.nav[href="#/enrol"]', title: 'Enrolment drive', text: 'Every college and school with its total students, registered, not eligible yet and yet to register, as entered by the institution itself.' },
    { sel: 'a.nav[href="#/desk"]', title: 'Help desk reports', text: 'Registrations and volunteers reported from the help desks each day, with totals for every institution.' },
    { sel: 'a.nav[href="#/gallery"]', title: 'Gallery', text: 'Photos made by colleges and schools. Hide a photo from the public home page or delete it.' },
    { sel: 'a.nav[href="#/schools"]', title: 'Schools', text: 'Schools that registered themselves. You can reset a school password here.' },
    { sel: 'a.nav[href="#/dashboard"]', title: 'Dashboard', text: 'District totals and items needing attention.' },
    { sel: 'a.nav[href="#/colleges"]', title: 'Colleges', text: 'Add or edit colleges, search and filter them. Every college starts with the default password; use Reset password to give it back, then share the login by WhatsApp.' },
    { sel: 'a.nav[href="#/villages"]', title: 'Villages', text: 'The village list with office address, contact and map position.' },
    { sel: 'a.nav[href="#/allot"]', title: 'Allotments', text: 'Give each village to one college. A village can belong to only one college.' },
    { sel: 'a.nav[href="#/officers"]', title: 'Village officers', text: 'One officer per village to verify attendance and certify. Edit the placeholder names as you learn them.' },
    { sel: 'a.nav[href="#/requests"]', title: 'Change requests', text: 'Colleges asking to switch villages. Approve or decline.' },
    { sel: 'a.nav[href="#/cert"]', title: 'Certification', text: 'Villages waiting for the officer, and certificates once everything is certified.' },
    { sel: 'a.nav[href="#/issues"]', title: 'Help desk', text: 'Issues raised by colleges. Reply and mark them resolved.' },
    { sel: 'a.nav[href="#/notices"]', title: 'Announcements', text: 'Post updates that show on the home page and in every workspace.' },
    { sel: 'a.nav[href="#/resources"]', title: 'Resources', text: 'Upload guides and forms for colleges and officers.' },
    { sel: 'a.nav[href="#/reports"]', title: 'Reports and exports', text: 'Pick a report, filter and sort it, choose columns, then print a formatted page or download CSV.' },
    { sel: 'a.nav[href="#/team"]', title: 'Team', text: 'Add staff and interns. Interns see only the colleges and villages you assign. Use Share login to give someone a new password.' },
    { sel: 'a.nav[href="#/features"]', title: 'Access control', text: 'Switch sections on or off for colleges, schools, staff and the public page. Switched-off sections disappear and stop working.' },
    { sel: 'a.nav[href="#/logs"]', title: 'Activity log', text: 'Every sign-in and management action, for accountability.' },
    { sel: '[data-act=tour]', title: 'That is it', text: 'Press Tour whenever you want to see this again.' },
  ],
};

let tour = null;
const tourKey = (kind, who) => `elc_tour_${kind}_${who}`;
const tourSeen = k => { try { return !!localStorage.getItem(k); } catch { return false; } };
const tourMark = k => { try { localStorage.setItem(k, '1'); } catch {} };
const tourVisible = el => !!el && el.getClientRects().length > 0;

function tourEnd() {
  if (!tour) return;
  document.removeEventListener('keydown', tour.onKey);
  tour.root.remove(); tour.prevFocus?.focus?.(); tour = null;
}
function tourDraw() {
  const t = tour, s = t.steps[t.i], el = s.sel ? document.querySelector(s.sel) : null, vis = tourVisible(el);
  if (vis) el.scrollIntoView({ block: 'nearest' });
  t.card.innerHTML = `<div class="tour-count">Step ${t.i + 1} of ${t.steps.length}</div><h2 id="tour-h"></h2><p></p>
    <div class="tour-dots" aria-hidden="true">${t.steps.map((_, k) => `<i class="${k === t.i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="tour-btns"><button type="button" class="btn ghost sm" data-t="skip">Skip tour</button><span class="grow"></span>${t.i ? '<button type="button" class="btn secondary sm" data-t="back">Back</button>' : ''}<button type="button" class="btn primary sm" data-t="next">${t.i === t.steps.length - 1 ? 'Done' : 'Next'}</button></div>`;
  t.card.querySelector('h2').textContent = s.title; t.card.querySelector('p').textContent = s.text;
  t.card.querySelector('[data-t=next]').focus();
  t.place = () => {
    const spot = t.spot, c = t.card, vw = innerWidth, vh = innerHeight, cw = Math.min(360, vw - 24);
    c.style.width = cw + 'px';
    const r = vis ? el.getBoundingClientRect() : null;
    if (!r) { spot.style.display = 'none'; t.root.classList.add('dim'); c.style.left = (vw - cw) / 2 + 'px'; c.style.top = Math.max(16, (vh - c.offsetHeight) / 2) + 'px'; return; }
    t.root.classList.remove('dim'); spot.style.display = 'block';
    Object.assign(spot.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' });
    let left = r.right + 16, top = r.top;
    if (left + cw > vw - 12) { left = Math.max(12, Math.min(vw - cw - 12, r.left)); top = r.bottom + 14; }
    if (top + c.offsetHeight > vh - 12) top = Math.max(12, vh - c.offsetHeight - 12);
    c.style.left = left + 'px'; c.style.top = top + 'px';
  };
  t.place();
}
function startTour(kind, who, role) {
  if (tour) tourEnd();
  const steps = (TOURS[kind] || (() => []))(who, role).filter(s => !s.sel || !s.sel.startsWith('a.nav') || document.querySelector(s.sel));   // skip sections that are switched off
  if (!steps.length) return;
  const root = document.createElement('div'); root.className = 'tour';
  root.innerHTML = '<div class="tour-spot"></div><div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-h"></div>';
  document.body.append(root);
  tour = { steps, i: 0, root, spot: root.querySelector('.tour-spot'), card: root.querySelector('.tour-card'), prevFocus: document.activeElement };
  const finish = () => { tourMark(tourKey(kind, who)); tourEnd(); };
  tour.card.addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    if (b.dataset.t === 'skip') return finish();
    if (b.dataset.t === 'back') { tour.i--; return tourDraw(); }
    if (tour.i >= tour.steps.length - 1) return finish();
    tour.i++; tourDraw();
  });
  tour.onKey = e => {
    if (e.key === 'Escape') finish();
    else if (e.key === 'ArrowRight') tour.card.querySelector('[data-t=next]').click();
    else if (e.key === 'ArrowLeft') tour.card.querySelector('[data-t=back]')?.click();
    else if (e.key === 'Tab') { const f = [...tour.card.querySelectorAll('button')]; const k = f.indexOf(document.activeElement); e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
  };
  document.addEventListener('keydown', tour.onKey);
  tourDraw();
}
window.addEventListener('resize', () => tour?.place?.());
// called by the workspace shell after it draws; starts the tour once for a new sign-in
let tourOffered = '';
function maybeTour(kind, who, role) {
  const k = tourKey(kind, who);
  if (tourOffered === k || tourSeen(k)) return;
  tourOffered = k;
  setTimeout(() => { if (!tour && document.querySelector('.topbar')) startTour(kind, who, role); }, 900);
}
actions.tour = () => { const d = document.querySelector('.topbar')?.dataset; if (d?.tourKind) startTour(d.tourKind, d.tourWho, d.tourRole); };
