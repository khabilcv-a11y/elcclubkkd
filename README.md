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
Staff console → **Gallery** → **Import from Pixieset** links the photos of the district's Pixieset galleries (Vote Utsavam 2026 and ELC Club Activities) into the public gallery, one album per set under *Previous works*. The photos are shown from Pixieset itself (nothing is copied to Drive or the sheet), so they cost nothing and the sheet stays small. Sets of press clippings and social media statistics are left unticked. Running it again skips photos already linked. The list of photos is in `public/data/pixieset-import.json`; deleting an album of linked photos removes the links only (use the bin on the album).

### Certificate text: paragraphs, placeholders and fonts
A text box in a template can be **Fixed text, or a sentence with placeholders**. Type the whole sentence once and insert placeholders where the details belong, for example `of {college} has volunteered ... from {dates}.` Placeholders are `{student}`, `{college}`, `{activities}`, `{dates}`, `{days}`, `{campaign}`, `{serial}` and `{issued}`. The sentence wraps inside its box like normal text, can be justified, and each placeholder can be set to Bold or Normal (stored as `{college:b}` / `{college:n}`); other words can be made bold by wrapping them in `**double stars**`. Leave the sentence area blank in the design image and add the sentence from the designer; a design image can be replaced later (the boxes stay in place). Each box also has a font (Times New Roman, Garamond, Cormorant Garamond, Libre Baskerville, Playfair Display, Great Vibes script or Inter), italic, weight, alignment, up to 12 lines and a largest font size. Text shrinks only when it does not fit, and before generating, the college is warned about any student whose details would not sit neatly. Fonts come from Google Fonts and are loaded only when a template uses them.

### Gallery wall and the home carousel
- The **Gallery** page is one endless wall of every public photo (no clusters to dig through). It loads as you scroll, can be searched (college, event or album), ordered *Featured* (district administration photos of the running campaign first, then colleges and schools, then earlier albums), *Newest*, *Oldest* or *Shuffle*, and each photo opens in a full-screen viewer with swipe/arrow keys, a filmstrip, a slideshow, a link to that photo (`#/gallery/photo/<id>`) and a link to the original. Albums remain on an optional page (`#/gallery/albums`).
- The home page **Moments from the campaign** is a fanned arc of photo cards: drag to spin, tap a card to bring it forward and tap again to open it; it drifts slowly by itself and stops for people who prefer less motion.
- Only admin and super admin logins add photos in the staff console; photos they add count as the district administration's.

### Preview pictures for links
Web-link resources get a thumbnail too. When a link is added, the portal reads the linked page's own preview picture (its Open Graph / Twitter image) and shrinks it to a small thumbnail. If a site does not offer or allow one, upload a picture by hand in *Add resource* or *Edit*. *Get preview* (per link) and *Make previews for older files* (all) fill in links added earlier. In the certificate designer, each text box has a font size (automatic, or an exact size with A- / A+ buttons), line spacing, and a live preview of the sample text on the design picture.

### Instagram on the home page
**Latest on Instagram** shows the district's chosen posts of @sveep.kozhikode, each with Instagram's own embed (loaded only when scrolled near, so visitors who never reach it are not sent to Instagram). Instagram does not offer a public feed of an account, and the portal does not scrape it, so the posts are chosen in the staff console under **Social media**: paste post links (newest first), reorder or remove them. Until the first post is added, the latest posts of the page are shown. A switch in *Access control* turns the section off. For an automatic feed, Instagram's official route is the Graph API with an access token from the page owner (a Professional account); say if you want that connected.
