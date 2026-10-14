# ELC Kozhikode Portal

Electoral Literacy Clubs portal for Kozhikode district. Two pages:

- **`/`** public leaderboard + college login
- **`/admin`** staff console (Super admin · Admin · Intern)

| Piece | Where |
|---|---|
| Code | GitHub (this repo) |
| Hosting (website + API) | Cloudflare Workers |
| **Database** | **A Google Sheet** (one tab per table), reached through a small Google Apps Script |
| Photos | Google Drive (same Apps Script) |
| Emails | Resend (optional; without it emails are saved in the Outbox tab) |

## How the Google Sheet works as the database (and why it is not slow)
```
Browser ⇄ Cloudflare Worker ⇄ (fast in-memory copy, refreshed in the background) ⇄ Apps Script ⇄ Google Sheet
```
- **Reads are instant (~20 ms).** The Worker keeps a copy of the whole sheet at Cloudflare's edge and answers from it. It re-checks the sheet in the background every ~8 s, so changes made by other people, or typed directly into the sheet, show up within about 10 seconds.
- **Saves take about one Google round-trip (~1 s).** Only the changed rows are sent, and the script takes a lock, so two colleges saving at the same moment queue up instead of overwriting each other.
- Sign-in, audit-log and email-log writes happen in the background and never make anyone wait.
- Sessions are signed cookies, so sign-in doesn't touch the sheet.
- **One village, one college.** The rule is enforced in the app *and* again inside the script under the lock.
- The sheet is the single source of truth. Hand-edits are allowed (don't touch the `id` columns, tab names or the header row). Keep the sheet **private**: it contains password hashes.

## Setup

### 1. Connect the Google Sheet (about 10 minutes, once)
1. Open your Google Sheet → **Extensions → Apps Script**.
2. Delete the sample code, paste all of `apps-script/Code.gs`.
3. In the first lines set `SECRET` (a long random string; keep it private) and `PHOTO_FOLDER_ID` (create a Drive folder for photos; the id is the last part of its URL).
4. **Deploy → New deployment → Web app** · *Execute as:* **Me** · *Who has access:* **Anyone** → **Deploy**, then **Authorize** (Google warns the app is unverified: *Advanced → Go to project*). Copy the **Web app URL**.
5. Check it: open the URL in a browser. You should see `ELC database service is running.`
6. Whenever you change `Code.gs` later: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.

The tabs and headings are created automatically the first time the portal connects.

### 2. Run it on your computer
```
npm install
```
Create `.dev.vars` in the project folder (git-ignored, never commit it). Keep the quotes:
```
SCRIPT_URL="https://script.google.com/macros/s/XXXX/exec"
SCRIPT_SECRET="the same SECRET you put in the script"
ADMIN_PASSWORD="choose-a-strong-password"
SHEET_URL="https://docs.google.com/spreadsheets/d/<your sheet id>/edit"
```
```
npm run dev          # http://localhost:8787   admin: /admin   user: superadmin
npm run demo         # OPTIONAL: fictional demo colleges (prints their passcodes)
```
`ADMIN_PASSWORD` is only used once, to create the first `superadmin` when the sheet has no staff yet.
Forgot it? `npm run admin-password -- superadmin NewPassword123`.

**Try it without Google:** `npm run mock` starts a local stand-in that runs the real `Code.gs` against a fake sheet. Use `SCRIPT_URL="http://127.0.0.1:8799/"` and `SCRIPT_SECRET="dev-secret"`.

### 3. Put it online with Cloudflare
1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Import a repository**. Build command: empty. Deploy command: `npx wrangler deploy`.
3. Worker → **Settings → Variables and Secrets** → add as *Secret*: `SCRIPT_URL`, `SCRIPT_SECRET`, `ADMIN_PASSWORD`. Optional: `SHEET_URL`, `BASE_URL` (your public address, used in emailed links), `RESEND_API_KEY`, `MAIL_FROM`.
4. Open the Worker's address and sign in at `/admin`. Every push to `main` redeploys.

> **Cloudflare plan:** the free Workers plan allows 10 ms of CPU per request. Reading is far below that. Rebuilding the in-memory copy after data changes takes ~55 ms at full district scale (about 60 colleges), so on the free plan those background refreshes can be cut off and the data may look slightly stale. The **$5/month Workers Paid plan** removes the limit and is recommended once you go live.

### 4. Email (passcodes, officer links)
Sign up at resend.com, verify your sending domain, create an API key → `RESEND_API_KEY`, and set `MAIL_FROM="ELC Kozhikode <elc@yourdomain>"`. Until then every email is stored in **Staff → Outbox**.

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

## Limits to know about
- Google Apps Script quotas apply (generous for this use; a script call is typically 0.5–2 s). Sheets holds up to 10 million cells.
- If two people change the very same record at the same instant, the second save is refused with "changed by someone else, refresh" rather than silently overwriting.
- Sessions are signed cookies valid 8 h (staff) / 12 h (college). Changing a password or re-pushing a passcode signs the old sessions out.
- Starter villages (`src/lib/villages.js`) have **approximate** coordinates; correct them and add officer contacts in Staff → Villages. Distances are straight-line.
