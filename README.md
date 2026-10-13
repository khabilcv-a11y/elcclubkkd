# ELC Kozhikode Portal

Electoral Literacy Clubs portal for Kozhikode district.

| Piece | Where |
|---|---|
| Code | GitHub (this repo) |
| Hosting (website + API) | Cloudflare Workers |
| Database | Supabase (Postgres). Tables are created automatically on first run |
| Photos | Google Drive (through a tiny Apps Script) |
| Emails | Resend (optional; without it, emails are saved in the Outbox tab) |

Two pages: **`/`** public leaderboard + college login, **`/admin`** staff console (Super admin · Admin · Intern).

## 1. Database: Supabase
1. Supabase dashboard → your project → **Connect** → **Transaction pooler** → copy the URI
   (`postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres`).
2. Replace `[YOUR-PASSWORD]` with your database password (Project Settings → Database → *Reset database password* if you've lost it).
3. That's all. You do **not** need the Supabase CLI. The app creates its tables and turns on row-level security by itself.

## 2. Try it on your computer
```
npm install
```
Create a file called `.dev.vars` (it is git-ignored, never commit it):
```
DATABASE_URL="postgresql://postgres.<ref>:YOURPASSWORD@aws-0-<region>.pooler.supabase.com:6543/postgres"
ADMIN_PASSWORD="choose-a-strong-password"
```
```
npm run dev          # opens http://localhost:8787  (admin: /admin, user: superadmin)
npm run demo         # OPTIONAL: fictional demo colleges. Needs DATABASE_URL in your shell
```
`ADMIN_PASSWORD` is only used to create the first `superadmin` when the database has no staff yet.
Reset a password later: `DATABASE_URL=... npm run admin-password -- superadmin NewPassword123`.
No Supabase handy? `npm run localdb` starts a throw-away local Postgres (see `scripts/localdb.js`).

## 3. Put it online: Cloudflare
1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → pick the repo.
   Build command: leave empty. Deploy command: `npx wrangler deploy`.
3. After the first deploy: Worker → **Settings → Variables and Secrets** → add (type *Secret*):
   - `DATABASE_URL` (the Transaction pooler string), `ADMIN_PASSWORD`
   - optional: `BASE_URL` (your public address, used in emailed links), `RESEND_API_KEY`, `MAIL_FROM`, `DRIVE_SCRIPT_URL`, `DRIVE_SCRIPT_SECRET`
4. Open the Worker's address. First visit sets up the database. Sign in at `/admin`.
5. Every `git push` to the main branch redeploys automatically.

## 4. Photos in Google Drive
1. In Drive create a folder (e.g. *ELC photos*). Open it, copy the id from the URL (`…/folders/<ID>`).
2. Go to script.google.com → New project → paste `drive/Code.gs`. Set `ROOT_FOLDER_ID` and a long random `SECRET`.
3. **Deploy → New deployment → Web app**, *Execute as: Me*, *Who has access: Anyone* → copy the web-app URL.
4. Set `DRIVE_SCRIPT_URL` (that URL) and `DRIVE_SCRIPT_SECRET` (your SECRET) as Worker secrets.
Colleges can then add up to 8 photos per field day (📷 button). Photos are served through the portal, only to that college, staff, or the village officer's link; Drive links are never public.

## 5. Email (passcodes, officer links)
Sign up at resend.com, verify your sending domain, create an API key → `RESEND_API_KEY`, and set `MAIL_FROM="ELC Kozhikode <elc@yourdomain>"`. Until then every email is stored in **Staff → Outbox**.

## Staff roles
| | Super admin | Admin | Intern |
|---|---|---|---|
| Add / edit colleges, villages, allotments | ✔ | ✔ | edit & allot **only assigned** colleges/villages |
| Push passcodes, decide change requests, officer acknowledgements, reports | ✔ | ✔ | assigned scope only |
| Delete colleges/villages, issue certificate numbers | ✔ | – | – |
| Team management, sign-in & action log | ✔ | – | – |

## How it works
1. Admin adds a college and allots villages (distance shown, nearest first), then taps **Push passcode**.
2. College signs in, can request a village change, **schedules 15 days in one tap** (3 days per village), sets 2 volunteers per village block, and records per volunteer: attended or not, people addressed, registered, plus photos.
3. A finished village goes to the **village officer** by emailed link to acknowledge (or ask for corrections).
4. When every village of a college is acknowledged, it is certificate-ready; the super admin records the certificate number and prints college + volunteer certificates.
5. The home page shows the live leaderboard. Score = registered×10 + addressed×2 + volunteer-days×5 + villages acknowledged×50 (`src/lib/stats.js`).

## Notes
- Starter village list (`src/lib/villages.js`) has **approximate** coordinates; correct them and add officer contacts in Staff → Villages. Distances are straight-line.
- Passwords use PBKDF2 (Web Crypto). If Cloudflare's *free* plan ever reports "CPU time exceeded" on login, the $5 Workers plan removes the limit.
- Keep `.dev.vars` and database passwords out of GitHub and out of chat.
