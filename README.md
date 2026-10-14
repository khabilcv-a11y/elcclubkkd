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
| Emails | Resend free tier (optional; without it emails are saved in the Outbox tab) |

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
Optional: `BASE_URL` (your public address, used in emailed links), `RESEND_API_KEY`, `MAIL_FROM`.

**Automatic deploys from GitHub:** Cloudflare dashboard → Workers & Pages → your Worker → **Settings → Builds → Connect** → pick this repo. Build command: empty. Deploy command: `npx wrangler deploy`. From then on every push to `main` redeploys. Secrets stay in Cloudflare and are not touched by deploys.

### 4. Email (passcodes, officer links)
Sign up at resend.com (free tier), verify your sending domain, create an API key → `RESEND_API_KEY`, and set `MAIL_FROM="ELC Kozhikode <elc@yourdomain>"`. Until then every email is stored in **Staff → Outbox**.

## Staff roles
| | Super admin | Admin | Intern |
|---|---|---|---|
| Add / edit colleges, villages, allotments | ✔ | ✔ | edit & allot **only assigned** colleges/villages |
| Push passcodes, decide change requests, officer acknowledgements, reports | ✔ | ✔ | assigned scope only |
| Delete colleges/villages, issue certificate numbers | ✔ | – | – |
| Team management, sign-in & action log | ✔ | – | – |

## How the programme works
1. Admin adds a college and allots villages (distance shown, nearest first; a village taken by one college can't be given to another), then taps **Push passcode**.
2. College signs in, can request a different village (only free ones are offered), **schedules 15 days in one tap** (3 days per village), sets 2 volunteers per village block, and records per volunteer: attended or not, people addressed, registered, plus photos (saved to Drive).
3. A finished village goes to the **village officer** by emailed link to acknowledge (or ask for corrections).
4. When every village of a college is acknowledged it is certificate-ready; the super admin records the certificate number and prints college + volunteer certificates.
5. The home page shows the live leaderboard. Score = registered×10 + addressed×2 + volunteer-days×5 + villages acknowledged×50 (`src/lib/stats.js`).

## Free-plan limits to know about
- Cloudflare free: 100,000 requests/day to the Portal object and 5 GB storage: far more than this programme needs.
- Google Apps Script quotas are generous for this use; Sheets holds up to 10 million cells.
- If two people change the very same record at the same instant, the second save is refused with "changed by someone else, refresh" rather than silently overwriting.
- Sessions are signed cookies valid 8 h (staff) / 12 h (college). Changing a password or re-pushing a passcode signs the old sessions out.
- Starter villages (`src/lib/villages.js`) have **approximate** coordinates; correct them and add officer contacts in Staff → Villages. Distances are straight-line.
