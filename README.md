# ELC Kozhikode Portal

Electoral Literacy Clubs portal for Kozhikode district. Two pages:

- **`/`** public leaderboard + college login
- **`/admin`** staff console (Super admin · Admin · Intern)

Everything runs on **free** services:

| Piece | Where |
|---|---|
| Code | GitHub (this repo) |
| Website + API | Cloudflare Workers (free plan) |
| Live working copy | Cloudflare Durable Object with SQLite storage (free plan) |
| **Database of record** | **A Google Sheet** (one tab per table) reached through a Google Apps Script |
| Photos | Google Drive (same Apps Script) |
| Sharing logins | Copy and paste (the portal never sends email) |

## How the Google Sheet works as the database (and why it is not slow)
```
Browser ⇄ Cloudflare Worker ⇄ Portal object (keeps the live copy) ⇄ Apps Script ⇄ Google Sheet
```
- **Reads are instant.** The Portal object keeps a copy of the whole sheet in its own free storage and answers from it. It re-checks the sheet in the background (≈ every 8 s while in use, and every 5 minutes by a scheduled job), so changes typed directly into the sheet show up within a few seconds to minutes.
- **Saves take about one Google round-trip (2–4 s; that is Google's own speed).** Only the changed rows are sent, under a lock, so two colleges saving at the same moment queue up instead of overwriting each other. A progress bar shows while saving.
- Sign-in, audit-log and email-log writes happen in the background and never make anyone wait. Sessions are signed cookies, so sign-in doesn't touch the sheet.
- **One village, one college.** Enforced in the app and again inside the script under the lock.
- The sheet is the source of truth. Hand-edits are allowed (don't touch the `id` columns, tab names or header row). Keep the sheet **private**: it contains password hashes.
- If the Portal object is ever reset, it reloads everything from the sheet automatically.

## Setup

### 1. Connect the Google Sheet (once)
1. Open your Google Sheet → **Extensions → Apps Script**. Delete the sample code and paste all of `apps-script/Code.gs`.
2. Set `SECRET` (a long random string; keep it private) and `PHOTO_FOLDER_ID` (a Drive folder for photos; the id is the last part of its URL). Tip: keep a private copy named `apps-script/Code.local.gs` with your values filled in (it is git-ignored).
3. **Deploy → New deployment → Web app** · *Execute as:* **Me** · *Who has access:* **Anyone** → **Deploy**, then **Authorize** (*Advanced → Go to project → Allow*). Copy the **Web app URL**.
4. Opening the URL in a browser should show `ELC database service is running.`
5. After changing `Code.gs` later: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.

The tabs and headings are created automatically the first time the portal connects.

### 2. Run it on your computer (optional)
```
npm install
```
Create `.dev.vars` (git-ignored; keep the quotes):
```
SCRIPT_URL="https://script.google.com/macros/s/XXXX/exec"
SCRIPT_SECRET="the same SECRET you put in the script"
ADMIN_PASSWORD="choose-a-strong-password"
SHEET_URL="https://docs.google.com/spreadsheets/d/<your sheet id>/edit"
```
```
npm run dev          # http://localhost:8787   admin: /admin   user: superadmin
npm run demo         # OPTIONAL: fictional demo colleges written into the sheet
```
`ADMIN_PASSWORD` is only used once, to create the first `superadmin` when the sheet has no staff yet.
Forgot it? `npm run admin-password -- superadmin NewPassword123`.

**Try it without touching Google:** `npm run mock` starts a local stand-in that runs the real `Code.gs` against a fake sheet (`SCRIPT_URL="http://127.0.0.1:8799/"`, `SCRIPT_SECRET="dev-secret"`).

### 3. Put it online (free)
```
npx wrangler login
npx wrangler deploy
```
Then give the Worker its settings (run each, paste the value when asked; or Cloudflare dashboard → Worker → Settings → Variables and Secrets):
```
npx wrangler secret put SCRIPT_URL
npx wrangler secret put SCRIPT_SECRET
npx wrangler secret put SHEET_URL        # optional: adds a "Sheet" button for the super admin
```
Optional: `BASE_URL` (your public address, used when copying certification links).

**Automatic deploys from GitHub:** Cloudflare dashboard → Workers & Pages → your Worker → **Settings → Builds → Connect** → pick this repo. Build command: empty. Deploy command: `npx wrangler deploy`. From then on every push to `main` redeploys. Secrets stay in Cloudflare and are not touched by deploys.

### 4. Sharing logins (no email)
The portal never sends email. When you create or reset a college password, an officer passcode or a staff login, it shows a copy-ready message that you paste into WhatsApp or SMS yourself.

## Staff roles
| | Super admin | Admin | Intern |
|---|---|---|---|
| Add / edit colleges, villages, allotments | ✔ | ✔ | edit & allot **only assigned** colleges/villages |
| Push passcodes, decide change requests, officer acknowledgements, reports | ✔ | ✔ | assigned scope only |
| Delete colleges/villages, issue certificate numbers | ✔ | – | – |
| Team management, sign-in & action log | ✔ | – | – |

## How the programme works
Every village a college holds needs **15 field days with 2 student volunteers each day**. A college with 3 villages therefore has 6 students out each day, in shifts.

1. **District office** imports or adds colleges and villages, allots villages (a village belongs to one college), assigns village officers, and sends each college its passcode.
2. **College** adds its students (paste a list), then creates the schedule in one tap: 15 working days per village. Students are split between villages so nobody is in two places on a day; in each village they work in pairs, each pair a few days in a row, then the next pair takes over, repeating until all 15 days are covered. Any day can be changed; shifts can be rebuilt when the list changes (days with attendance are never touched).
3. **Daily log**: for each village and day the college records who was present, how many people they reached and how many registered, plus photos (saved to Drive).
4. **Village officer** signs in, sees which students are working in their villages today, confirms or disputes attendance, reviews the report, and finally **certifies** the village. Colleges can also use the emailed link without signing in.
5. When every village of a college is certified it is certificate-ready; the super admin records the certificate number and prints college + student certificates.
6. The **home page and display board** show live counts, a village map, insights, a leaderboard, announcements and public resources. Score = registered×10 + reached×2 + shifts worked×5 + villages certified×50 (`src/lib/stats.js`).

Also included: announcements (to everyone / colleges / officers), a college help desk, a resource centre (files kept in Google Drive), filtered and sorted exports (CSV), and an accessibility toolbar (text size, high contrast, readable font, underlined links, pause animations).

### Importing the district list
`node scripts/import-xlsx.js <file.xlsx> --dry` shows what would change; add `--geocode --prune` to place villages on the map from their PIN codes and remove unused starter villages. Run `npm install xlsx --no-save` once first. After that, colleges, villages and allotments are maintained from the staff console.

## Free-plan limits to know about
- Cloudflare free: 100,000 requests/day to the Portal object and 5 GB storage: far more than this programme needs.
- Google Apps Script quotas are generous for this use; Sheets holds up to 10 million cells.
- If two people change the very same record at the same instant, the second save is refused with "changed by someone else, refresh" rather than silently overwriting.
- Sessions are signed cookies valid 8 h (staff) / 12 h (college). Changing a password or re-pushing a passcode signs the old sessions out.
- Starter villages (`src/lib/villages.js`) have **approximate** coordinates; correct them and add officer contacts in Staff → Villages. Distances are straight-line.

## Campus to booth drive

The portal now runs the drive to bring every eligible student onto the electoral roll (target: 100%).

- **Enrolment drive.** Each college or school enters its own total numbers on the Enrolment drive page: total students, registered (already on the electoral roll), not eligible yet, and eligible students yet to register (the box suggests the figure worked out from the other numbers; the college can type its own). A pop-up explains who is eligible (18, or 17 now and 18 by the qualifying date, set as `QUALIFYING` in `public/js/enrol.js`). The balance to cover and the coverage % are worked out for them. The district console shows every institution; Reports and exports has "Enrolment by college / school" and "College and school performance".
- **Help desk daily report.** Each day an institution records registrations made and volunteers present, and adds volunteers of other activities (Flash Mob, Class to Class Campaign, Game Zone, Other with a custom name). Names used before are suggested. Reports: "Help desk totals", "day by day", "Volunteers in other activities", "Activities summary".
- **Gallery and photo frames.** Colleges and schools make framed photos (crop, pinch and zoom, institution name, landscape or portrait JPG), save them to their gallery with a description, download, delete or share on WhatsApp. The frame uses the district's template files (`public/img/frame-landscape.png` and `frame-strip.webp`); the college name (up to two lines) and the activity title are fitted into the template's boxes. Saved photos appear in a cover-flow album on the public home page and on the Gallery page (staff can hide any photo). In Drive they are filed as `College / Activity /` and, when the same activity is held again, `College / Activity / date /`. **After updating, paste the new `Code.local.gs` into Apps Script and deploy a new version** (it adds the nested folders).
- **Schools.** Schools without an ELC register themselves (home page, Sign in, School) with their email and a password, and sign in with that email. They get the same workspace as colleges (enrolment drive, daily report, gallery).
- **Access control.** The super admin can switch sections on or off for colleges, schools, staff and the public page (Administration, Access control). The village programme sections start switched off.

- **Logos.** A college or school adds its logo from the Logo button in its workspace header (or the prompt on its Home page). It is resized in the browser to a small picture and stored in the sheet itself, then shown as a round profile picture beside the name on the public ranking, gallery and album, in its workspace header, and in the staff dashboard and enrolment tables.

### Gallery, albums, templates and resource links
- **Gallery page** (`#/gallery`): the running campaign is highlighted at the top (photos from colleges and schools, plus anything the office adds to a "current" album); earlier work is shown as albums with titles. Admins and super admins create albums, add photos (several at once, resized automatically) and move photos between albums from the staff console: *Gallery*. A photo from a previous-works album can also be shown on the home page.
- **Frames and posters** (staff console): upload a design image, drag boxes over it to mark where the college name, a typed title, fixed text or the college logo go, choose colour, weight, alignment and lines. *Photo frame* templates appear as extra frames in the college photo editor; *poster / banner* templates appear under **Posters and banners** in every college and school workspace, where the text is typed in and the result downloaded as JPG or PDF. The two standard frames stay built in.
- **Resources**: every uploaded file gets a preview picture (pictures and the first page of PDFs; other types show a type tile) and a portal link such as `https://<your portal>/#/resource/12`. Public files open for anyone; files meant for colleges, officers or staff ask the visitor to sign in first. Use **Copy link** in the staff Resources page or on any resource card.
- **Help desk volunteers**: the daily report now takes volunteer *names* (the count is worked out from them). Names used before are suggested while typing. The report page lists every student with their activities and dates (student-wise or day by day, sortable, searchable, CSV), and staff have the same as the report *Volunteers: student-wise list*.
- **Participating colleges and schools** on the home page lists only institutions that have signed in or started work, with Colleges / Schools filters, search, and an auto-sliding row (or *Show all*).
- PDF previews use pdf.js (Apache 2.0), kept in `public/vendor/pdfjs`.

### Daily counts, badges and the institution repository
- Colleges and schools enter their **starting numbers once** (Enrolment drive). Registrations in the daily reports are added to *registered* and taken off *yet to register* automatically, so the dashboard, the ranking and the home page always follow the daily reports.
- **Epic of Kozhikode**: an institution that reaches 100% is highlighted on the home page and display board and gets a gold badge; milestone badges (25 / 50 / 75%, daily reporter, photo champion) show in the ranking and in the college's own home. The ranking itself appears once **more than 5** institutions have entered numbers.
- **Institution profile** (every college and school): coordinator, designation, mobile, email, head of institution, type and code. The staff *Colleges* and *Schools* pages show all of it in compact rows with icon buttons, and **Download all details** gives one CSV of the whole repository.
- Share links for resources look like `/r/<first words of the title>-<id>.<extension>`; pasted into WhatsApp they show the title and the preview picture.

### Certificates
1. Staff console → **Frames, posters, certificates**: upload a certificate design (type *Certificate*), drag boxes over it, and choose what each box merges: student name, college or school, activities, dates, number of days, campaign title, certificate number, date of issue, fixed text, or the college logo. Preview shows sample text.
2. Staff console → **Certificates**: create a campaign (title, dates, design, number prefix, suggested minimum days) and switch it on. Nothing reaches colleges until it is switched on.
3. Each college or school opens **Certificates**: its volunteers are taken from the daily reports. The coordinator ticks who is eligible (or *Select all*, or *Select with at least N days*), edits dates and events with the pencil, adds or removes students, prints or downloads the list to verify, then **submits the final list**.
4. After submitting, **Generate** makes the certificates. Before that, text that will not fit its box (for example a very long name) is flagged. Certificates are generated **once**; they can be downloaded again any number of times, one by one or as a ZIP. The PDFs are drawn in the browser from the details frozen at generation, so no files are stored.
5. Staff see every institution's students listed, selected, final list submitted, generated, successful and remaining, can open the student list, **allow generating again** (for chosen students or for everyone) and **reopen** a submitted list.
6. **Import participants** (Certificates page and Help desk reports page): paste a Google Sheet link (shared as "Anyone with the link: Viewer") or upload an **Excel (.xlsx / .xls) or CSV** file, match the columns (institution, student, date, activity), and choose where the students go: each college's and school's own volunteer records (their Daily report page and the reports), a campaign's certificate list, or both. Institution names must match the portal (capitals and spacing do not matter); names that do not match are listed so the right institution can be chosen or the rows skipped. Excel files are read in the browser with SheetJS (Apache 2.0, in `public/vendor/xlsx`).

### Pixieset photos in the gallery
Staff console → **Gallery** → **Import from Pixieset** links the photos of the district's Pixieset galleries (Vote Utsavam 2026 and ELC Club Activities) into the public gallery, one album per set under *Previous works*. The photos are shown from Pixieset itself (nothing is copied to Drive or the sheet), so they cost nothing and the sheet stays small. Sets of press clippings and social media statistics are left unticked. Running it again skips photos already linked. The list of photos is in `public/pixieset-import.json`; deleting an album of linked photos removes the links only (use the bin on the album).

### Certificate text: paragraphs, placeholders and fonts
A text box in a template can be **Fixed text, or a sentence with placeholders**. Type the whole sentence once and insert placeholders where the details belong, for example `of {college} has volunteered ... from {dates}.` Placeholders are `{student}`, `{college}`, `{activities}`, `{dates}`, `{days}`, `{campaign}`, `{serial}` and `{issued}`. The sentence wraps inside its box like normal text, can be justified, and each placeholder can be set to Bold or Normal (stored as `{college:b}` / `{college:n}`); other words can be made bold by wrapping them in `**double stars**`. Leave the sentence area blank in the design image and add the sentence from the designer; a design image can be replaced later (the boxes stay in place). Each box also has a font (Times New Roman, Garamond, Cormorant Garamond, Libre Baskerville, Playfair Display, Great Vibes script or Inter), italic, weight, alignment, up to 12 lines and a largest font size. Text shrinks only when it does not fit, and before generating, the college is warned about any student whose details would not sit neatly. Fonts come from Google Fonts and are loaded only when a template uses them.

### Gallery wall and the home carousel
- The **Gallery** page (`#/gallery`) opens as albums (a first tile for the current campaign, then one tile per album); opening one shows its photos. **See all photos once** (`#/gallery/all`) gives one endless wall of every public photo that loads as you scroll, can be searched, ordered *Featured*, *Newest*, *Oldest* or *Shuffle*. Each photo opens in a full-screen viewer with swipe/arrow keys, a filmstrip, a slideshow, a link to the photo (`#/gallery/photo/<id>`) and a link to the original. In the staff console the Gallery page is also album-first: open an album to manage its photos (hide, move, delete, 48 at a time), or use *See all photos once*.
- The home page **Moments from the campaign** is a fanned arc of photo cards: drag to spin, tap a card to bring it forward and tap again to open it; it drifts slowly by itself and stops for people who prefer less motion.
- Only admin and super admin logins add photos in the staff console; photos they add count as the district administration's.

### Preview pictures for links
Web-link resources get a thumbnail too. When a link is added, the portal reads the linked page's own preview picture (its Open Graph / Twitter image) and shrinks it to a small thumbnail. If a site does not offer or allow one, upload a picture by hand in *Add resource* or *Edit*. *Get preview* (per link) and *Make previews for older files* (all) fill in links added earlier. In the certificate designer, each text box has a font size (automatic, or an exact size with A- / A+ buttons), line spacing, and a live preview of the sample text on the design picture.

### Instagram on the home page
**Latest on Instagram** shows the district's chosen posts of @sveep.kozhikode, each with Instagram's own embed (loaded only when scrolled near, so visitors who never reach it are not sent to Instagram). Instagram does not offer a public feed of an account, and the portal does not scrape it, so the posts are chosen in the staff console under **Social media**: paste post links (newest first), reorder or remove them. Until the first post is added, the latest posts of the page are shown. A switch in *Access control* turns the section off. For an automatic feed, Instagram's official route is the Graph API with an access token from the page owner (a Professional account); say if you want that connected.

### Selfie contest
Public page `#/selfie` (menu, footer and a home page banner): the contest details, the official order of the Chief Electoral Officer, Kerala (`public/docs/selfie-contest-order.pdf`, with a preview and download), and a button to sign in. Entries are sent from **inside the portal**: in a college or school workspace, **Selfie contest** has a short form (student name, class, optional mobile and caption, up to 5 selfies, a consent tick); the institution is already known, so only the student and the pictures are typed, and the class is kept for the next student. The institution can see what it sent and withdraw an entry until the office has looked at it. Pictures are saved in Drive under *Selfie contest / <institution>* with a small thumbnail in the sheet.
Staff console → **Selfie contest**: entries as picture cards with search and status filters; open one to see all pictures, download them, and mark it *Shortlisted*, *Best three* (at most three) or *Not selected* (admins and super admins; interns can only look). *Download the list* gives a CSV. The super admin can switch the page off for colleges, schools and the public under Access control.

### Assembly Constituency of each institution
`colleges.ac` holds the AC an institution belongs to (and `ac_all` every AC it works in); the quiz and essay rounds are built on it. The district office's list is in `src/lib/ac.js`. On the **Dashboard** admins and super admins see a notice while any active college or school has no AC: *Apply the district office's list* matches the listed names to the registered institutions (spelling differences are tolerated; names not found are shown) and *Set them one by one* opens a table to choose the AC of each. An institution that works in several ACs takes the first as its own, which can be changed there.

### Quiz competition (ECI letter of 30 Oct 2026)
Three rounds, each one quiz with a six-character join code (`#/quiz`, `#/quiz/CODE`, a code box on the home page):
- **Institution round** (college or school workspace → *Quiz competition*): one click creates the quiz from the 50 reference questions of Annexure-I (`src/lib/quizbank.js`, drawn evenly from the four topics). Students join with the code or QR (no sign-in) and answer on their phones within the time; paper mode prints the question paper, answer sheet and key (*Print*), and the coordinator types each student's answers as letters (or just the marks). Phone and paper results are ranked together (score, then time); the coordinator selects the top 2.
- **AC round** and **district final** (staff console → *Quiz competition* → *AC rounds and final*; admins and super admins): one AC round per constituency invites the students the institutions of that AC selected (the AC comes from the institution's Assembly Constituency, see above); the final invites the AC winners. Each round runs on phones (self-paced) or *live*: the host screen shows each question with a countdown, the phones follow, answers are revealed with counts, and the standings are kept. Staff can enter paper results, add a substitute student, change settings and select the top 10.
- **Question bank** tab (add, edit, switch off questions) and **Compliance report** tab (the district's row of Annexure-II, the winners, a CSV and a print view).
Live rounds poll every 1.5 to 2.5 seconds, so one 30-minute final with about 130 students uses roughly 50,000 requests of the 100,000 a day on the free plan.

### ELC registration prompt
When a college or school opens its workspace, a popup asks whether its Electoral Literacy Club is registered on the ECINET app. **Yes** shows how to track the application on https://elc.eci.gov.in/ and the answer is remembered (no more popups). **No** shows a short video and a *Register My ELC* button (Play Store); the question comes back on every visit until the answer is Yes. Every popup has a cross to close it. The answer is stored in `colleges.elc_status` (`yes` / `no`), shown as a small *ELC status* line on the Institution profile page (with a Change link) and in the staff Colleges row details. The video is embedded from youtube-nocookie.com, allowed in `public/_headers`. Staff see who has done it: an **ELC** column (Done / Not yet / Pending) and an *ELC registered on ECINET x/y* tile on the Dashboard, a small *ELC ✓ / ✗* badge beside each name on the Colleges and Schools pages, and an *ELC registered on ECINET* column in the performance report and its CSV.

### Stopping a live quiz early
On the host screen, both the question and the answer screens have an **End quiz now** button (with a confirmation). It stops the quiz where it is, closes it to answers and shows the winners from the answers given so far; the standings are saved like a normal finish.

### Student coordinators and the password eye
The Institution profile (and the staff college form) has a *Student coordinator* name and mobile, with a tick-box *Add one more student coordinator* that opens a second name and mobile (unticking it hides and clears them). They are stored in `stu1_name`, `stu1_phone`, `stu2_name`, `stu2_phone`, and appear in the staff row details and the *Download all details* CSV. They do not count towards the profile percentage. Every password box on the site has an eye button (`core.js`) that shows or hides what was typed.

### Institution profile chip and Hall of fame
The college and school top bar shows an icon and the percentage of the institution profile that is filled in (red under 50%, amber below 100%, green at 100%); hovering lists what is missing, and it opens the profile. *Institution profile* is the only item of its own group, *Your institution*, at the end of the menu.
The **Hall of fame** (home page, below *Campus to booth*, and the display board) shows the leader of each award with its logo, full name, type and figure; awards with no leader show *Up for grabs*.

### Speed and paper saving
- Saves of the quiz, selfie contest and constituency list are acknowledged at once and reach the Google Sheet in the background. The home page no longer waits for the map library or the certificate fonts (fetched only when needed), the main font loads without blocking, and scripts and styles are cached for a minute and refreshed in the background.
- Quiz papers (`quizPrint` in `public/js/media.js`): the question paper is two columns (2 pages for 20 questions), answer sheets are three to a page with cut lines (30 students need 10 pages), and *Show the questions on a screen* projects the questions so only the answer sheets are printed. The page title, header and footer name the institution, quiz code and page numbers.
- The home page photo cycle holds up to 24 photos: two office photos for every college or school photo.

### Running the institution quiz live
A coordinator chooses on the Quiz page how to run the institution round: **Live on the screen** (like Mentimeter or Kahoot: the questions are shown on the classroom screen from the *host screen*, students see only the answer buttons on their phones and the next question appears when the host moves on; *Show the answer* reveals the right answer with how many chose each, and the standings follow) or **On phones, at their own pace** (every student gets all the questions and a timer). The same host screen (`quizHost` in `public/js/media.js`) is used by the staff console for the AC rounds and the district final.

### Quiz sounds, reading aloud, shuffling
- **Sounds and music** (`public/js/qsound.js`): all made in the browser (Web Audio), nothing to download. The host's screen starts with sound and music on: a join blip, a start fanfare, a chime for each question, ticks in the last 5 seconds, a buzzer at time-up, a drum-roll and chime for the answer, a fanfare for the winners, and soft background music (calm while students join, a steady pulse while they think). Phones start **silent** (a classroom of phones chiming would be chaos); a student switches **Sound** on, and on a phone gets a click on choosing, a gentle ping when one minute is left, a right/wrong sound after each live answer and a jingle at the end. The choice is remembered per device.
- **Read aloud** (accessibility): a *Read aloud* button and *Read each question automatically* tick on phones (self-paced and live) and on the host screen; it reads the question and the four options with the device's own voice (English India, or Malayalam if the text is Malayalam and the device has a voice).
- **Answer places:** every quiz made after this change has the right answer spread evenly over A, B, C and D with no letter three times in a row (`orderFor` in `src/routes/quiz.js`, seeded by `quizzes.opt_seed`); paper, key, projector, host and phones all use the same order, and a phone student gets their own balanced order. A quiz made before it keeps its original order (mostly B and C) until the coordinator presses *Mix questions and answers* on the Quiz page (only before any student has joined).
- **Question order:** *Shuffled* (each phone student gets a different order) or *Same as the question bank*; chosen when a quiz is created and changeable under *Order of the questions* (colleges) or on the round page (district team), until students join.
- The winners screen on the host fits any screen: top three on a podium with name and institution, ranks 4–10 in two columns.

### Quiz screens
Every quiz screen for students (`#/quiz`, `#/quiz/CODE`) uses a focused layout (`quizShell` in `public/js/quiz.js`): a slim header with the quiz name and the timer, no website menu or footer, a thin progress bar, and a bottom bar with Previous, the number answered and Next or Finish. Questions are set large with clear answer cards; in a live quiz the phone shows coloured answer tiles that match the tiles on the big screen. The projector display (`quizHost` and `quizProjector` in `public/js/media.js`) has a top bar with the progress and a countdown ring, a large centred question, a 2 x 2 grid of answer tiles, the answer reveal with counts, and a podium for the final standings.

### Tie-breaker round
When students are tied at the cut-off (same score and same time), the results page shows who is tied and a **Start the tie-breaker** form (coordinator: institution round; staff: AC rounds and the district final). It makes a short extra quiz of 2 to 5 questions the quiz has not used (`level='tiebreak'`, `parent_id` is the round it settles), invites only the tied students (`quiz_people.from_id`), and runs on phones or live like any round, or on paper (*Enter result*). Tie-breaker points are added to each tied student and decide the order after the score and the time; if they tie again another tie-breaker can follow. Tie-breakers are not counted as rounds in the compliance report.

### Phones
On screens under 960px the college, officer and staff consoles use a slide-in menu (opened by the menu button; it holds the user, all pages and Tour, Logo, Password and Sign out) and a bottom bar with three quick links and Menu (college: Home, Daily report, Quiz; staff: Dashboard, Colleges, Quiz). The public site has a menu button that opens a full-screen list of its pages. Buttons are at least 40 to 44px tall, fields are 16px so phones do not zoom in, and text is never below 12px. The tour opens the menu while it points at a menu item. The accessibility button moves up above the bottom bar and hides while a menu is open.

### Vote Unbound (PwD call campaign)
Staff console → **Vote Unbound**: import the district's PwD CSV (columns Name, DOB, Age, Gender, Mobile, Address, Ward, Anganwadi, ICDS, LSGD, Bedridden, Disability, Disability%, UDID Status). The people are kept in a **private register**, a separate Durable Object with its own SQLite storage (`src/registry.js`, binding `REGISTRY`), not in the Google Sheet: the sensitive details never sit in a spreadsheet and the 34,000 rows do not slow the portal. **Aadhaar and UDID numbers are never read or stored**; the date of birth only makes a person's id (so importing again updates people and keeps their call history).
- **Allotment:** by local body (LSGD) and optionally ward (`pwd_alloc` in the sheet). *Allot* gives a whole local body or ticked wards to an institution; *Allot each college's own local body* uses the institution's local body from its profile, and leaves shared towns (the Corporation) to be split by ward.
- **Call desk** (college or school workspace → *Vote Unbound*, switched off by default under Access control until you turn it on): only the people in the allotted areas are ever sent to the browser, and the register checks the allotment again on every list, person and call. People sharing one phone number are one card; bedridden people come first. Outcomes: reached, needs help (home voting Form 12D, transport, ramp or assistance, UDID card, electoral roll, other), call again, not reachable, wrong number, declined. Each person's address and call history open on demand, and every access is recorded.
- **District view:** progress by local body and by institution, UDID status and disability breakdown, recent access, and a call log download (no mobile numbers) as a backup of the calls, which exist only in the register.

### Vote Unnathi and Sea Your Vote (settlement drives)
Staff console → **Special drives → Vote Unnathi** (Scheduled Tribe settlements) and **Sea Your Vote** (landing centres and coastal communities). Both work the same way and hold **no personal data**: only the places, a figure for the people living there, and a contact person for the place.
- **The list:** add places one by one, or import a CSV (any column order; the portal looks for Name, Type, Local body, Ward, Village, Population, Households, Contact person, Contact phone, Address, Note; only the name is needed). *Blank sheet to fill in* downloads a template. Importing again updates places already listed. Tables `drive_units`, `drive_alloc`, `drive_visits`.
- **Allotment:** tick places and *Allot selected*, or give an institution every place of a local body or of a village in one go; *Allot each college's own local body* gives the places of a local body to the one institution based there. A place can be moved to another institution.
- **Institution workspace** (*Special drives* group, switched off by default under Access control until you turn them on): an institution sees only its own places, can call the contact person, record visits (date, what was done, people reached, new registrations helped) and mark a place completed. It cannot record a visit for a place that is not allotted to it.
- **District view:** progress per institution, people reached and registrations helped, recent visits, and a CSV of all visits. Removing: the bin icon on a row deletes one place, tick several and press *Delete selected* for many (allotments and visits of those places go too); the super admin can *Empty the whole list* or tick *Replace the whole list* when importing a new sheet.

### Vote Unbound welfare institutions, and volunteers on every visit
Vote Unbound now has a second part that works exactly like Vote Unnathi and Sea Your Vote: staff console → Vote Unbound → **Welfare institutions to visit** (a switch at the top of the page; the other side is the call campaign). Add or import welfare homes, old age homes, BRCs, Buds and special schools, rehabilitation centres, then allot them to colleges and schools. The institution sees them under **Special drives → Vote Unbound** and records its visits there. If both the call campaign and the institutions are switched on for an institution, its Vote Unbound page has a switch between the two. The access switches are separate: *Vote Unbound: welfare institutions to visit* (on by default) and *Vote Unbound call campaign* (off until you are ready). Schools now also have their own Vote Unnathi and Sea Your Vote switches.

Every visit report, in all three drives, takes the **volunteers who went**: type names (several at once, separated by commas) or tap a suggested name. Names already used by that institution in the daily help-desk report, other activities, its student list and earlier visits are suggested. The volunteers show in the visit history, in the district's recent visits and in the visits CSV (names and count). Each volunteer is also written into the institution's volunteer list (the same log as the daily report) as an activity named after the drive (*Vote Unnathi*, *Sea Your Vote* or *Vote Unbound*) on the date of the visit, so the visit appears in the volunteer list and comes into certificates with *Sync from the portal*, counting towards the days like any other activity. A name already logged for the same drive and date is not repeated. Visits recorded before this change: on any drive page, *Recent visits* → **Add earlier visits to volunteer lists** (admins) adds their volunteers for all three drives; it is safe to press again, nothing is repeated.

### Vote Unbound by village
The register only knows a person's local body and ward, so a **village** is a set of wards: staff console → Vote Unbound → **Villages** → *Link a village to wards* (choose the local body, then all wards or ticked wards; a village can cover several local bodies), or *Import a sheet* with the columns Village, Local body, Ward (several wards in one cell: 3, 4, 5). *Allot* on a village gives the institution every ward it covers in one step (the usual ward allotment underneath, so the institution's call desk is unchanged). Table `pwd_village`.

### Certificates need the district admin's approval
The college verifies its list and sends it **for approval**; the list is locked meanwhile. A super admin or admin approves it (or sends it back with a reason, which the coordinator sees), and only then can the college generate its certificates. Staff console → Certificates: the status table has *Awaiting approval* / *Approved* filters and approve / send-back buttons (also inside the student list), the menu shows how many requests are waiting, and the dashboard counts them. Reopening a list still returns it to draft.

### Free-plan limits (Durable Object writes)
Cloudflare's free plan allows 100,000 Durable Object row writes a day (the allowance resets at 00:00 UTC, 05:30 IST); beyond it every database call fails. The portal therefore saves its copy to the object's storage at most once every 20 seconds, and if storage refuses (allowance used up) it loads from and saves to the Google Sheet only, so the site keeps working, with a ~30 second wait after the object has been idle. The Vote Unbound register has its own storage and is unavailable until the allowance resets.

### Gallery categories and order
Albums have a **category**: *Current campaign*, *Press reports* or *Past events* (the sets imported from Pixieset). The public gallery page groups albums under these headings with filter chips; staff set the category when creating or editing an album (staff console → Gallery), and the album list there can be filtered the same way. Albums imported from Pixieset go to *Past events*, and the press and media report sets to *Press reports*; an album with no category set is placed by its title (press or media reports) or as a past event. Recent uploads come first everywhere: photos in the current campaign are ordered by upload time whoever added them (district photos no longer stay on top), albums by their latest upload, and the "all photos" wall puts the running campaign first, newest first.
