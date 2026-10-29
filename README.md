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

- **Enrolment drive.** Each college or school enters its own total numbers on the Enrolment drive page: total students, registered (already on the electoral roll) and not eligible yet. A pop-up explains who is eligible (18, or 17 now and 18 by the qualifying date, set as `QUALIFYING` in `public/js/enrol.js`). The balance to cover and the coverage % are worked out for them. The district console shows every institution; Reports and exports has "Enrolment by college / school" and "College and school performance".
- **Help desk daily report.** Each day an institution records registrations made and volunteers present, and adds volunteers of other activities (Flash Mob, Class to Class Campaign, Game Zone, Other with a custom name). Names used before are suggested. Reports: "Help desk totals", "day by day", "Volunteers in other activities", "Activities summary".
- **Gallery and photo frames.** Colleges and schools make framed photos (crop, pinch and zoom, institution name, landscape or portrait JPG), save them to their gallery with a description, download, delete or share on WhatsApp. The frame uses the district's template files (`public/img/frame-landscape.png` and `frame-strip.webp`); the college name (up to two lines) and the activity title are fitted into the template's boxes. Saved photos appear in a cover-flow album on the public home page and on the Gallery page (staff can hide any photo). In Drive they are filed as `College / Activity /` and, when the same activity is held again, `College / Activity / date /`. **After updating, paste the new `Code.local.gs` into Apps Script and deploy a new version** (it adds the nested folders).
- **Schools.** Schools without an ELC register themselves (home page, Sign in, School) with their email and a password, and sign in with that email. They get the same workspace as colleges (enrolment drive, daily report, gallery).
- **Access control.** The super admin can switch sections on or off for colleges, schools, staff and the public page (Administration, Access control). The village programme sections start switched off.

- **Logos.** A college or school adds its logo from the Logo button in its workspace header (or the prompt on its Home page). It is resized in the browser to a small picture and stored in the sheet itself, then shown as a round profile picture beside the name on the public ranking, gallery and album, in its workspace header, and in the staff dashboard and enrolment tables.
