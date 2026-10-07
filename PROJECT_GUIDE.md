# Capital Science Faculty — Project Guide

Last reviewed: 2026-10-06

## What this project is

A small Node.js HTTP application serving a bilingual Arabic/English student site and a developer dashboard. The production URL is <https://capital-science-faculty.onrender.com>. The browser app is plain JavaScript and CSS. The Node server uses the Firebase Admin SDK; Firebase browser SDK modules load from Google’s version-pinned CDN.

## Local development

- Node.js 20+ recommended.
- Install dependencies with `pnpm install --frozen-lockfile --ignore-scripts` (the server uses `firebase-admin`).
- Start with `npm start`; open `http://localhost:3000`.
- `npm run dev` starts Node's watch mode.
- Set `ADMIN_PASSWORD` in the environment before using `/admin`.
- Optional email alerts require `RESEND_API_KEY`; `RESEND_FROM` can set the sender. The recipient for registration alerts is intentionally fixed in `server.js` to the site owner.

Do not commit `.env`, Resend keys, Google credentials, SMS provider credentials, or student data.

## Routes

| Path | Page |
| --- | --- |
| `/` | Home |
| `/subjects` | Subject WhatsApp groups |
| `/lectures` | Searchable, nested Drive catalog |
| `/advising` | Academic advising |
| `/official` | Official class and faculty groups/pages |
| `/developer` | Morfi developer profile/contact |
| `/profile` | Verified profile, edit/logout, and private inbox |
| `/admin` | Admin sign-in and content editor |

The global banner and footer navigation are rendered from `public/app.js`. Language, theme and the current local profile are stored in the browser. The registration welcome screen allows continuing as a guest; guests should not have a persistent profile cookie.

## Source files and data

- `server.js`: static files, site/Firebase APIs, verified profile and inbox endpoints, admin session, content CRUD and user messaging.
- `public/firebase-auth.js`: Firebase email/password verification, Google sign-in, phone SMS/Recaptcha, and verified profile API calls.
- `firestore.rules` / `firebase.json`: deny direct browser access; profiles are read/written through the server after Firebase token verification.
- `public/index.html`, `public/app.js`, `public/style.css`: student site and onboarding/profile interactions.
- `public/admin.html`, `public/admin.js`: current admin interface.
- `data/site.json`: subject groups, lecture root links, advising groups, official links, coordinator contacts.
- `data/drive-catalog.json`: flattened Google Drive folders/files. `note` encodes the parent path with `›`; a root has `note: "المجلد الرئيسي"` (or `Year root`).
- `public/avatars/`: profile illustration choices.
- `.env.example`: environment variable names; never put actual credentials there.
- `render.yaml`: Render service declaration.

### Drive inventory reviewed

The 2024/25 folder is `1hvZIcXA4Xc45X_YXJXnK9V0q5CC6Ye1W`; the current catalog contains 2,179 entries for this source. The 2026/27 folder is `10egV3LBAs9fEo3HjghyjnsQBuzcdnvgX`; the current catalog contains 68 entries for this source.

The replacement 2025/26 URL from the owner is `1WhpUU4jCUmcOwdapwVRDK5UIK5b7xuU4` (Drive title: “Group B 2026”). Its two semester folders were confirmed as `14Smihcd2LAzqTmcC7OgSc7xyKrXVUlh0` and `1fZIaJ9brBUZvyzj30OrtOASx9hwMiFuV`. The first semester's visible top-level subjects were captured, and the second semester's top-level subjects were captured. This Drive folder is a replacement for the older 2025 source `1_xmVYVlPbaf_iJqcYlGJnPR-ROMUY-FD`; its old 643 catalog entries were removed so users are not sent to stale material. **The replacement's per-course nested folders and file URLs have not yet been fully crawled.** The catalog now includes the verified root, both semesters, and 10 course folders whose links were opened and confirmed. Many other course folders and the files nested within these folders are not yet imported. Do not describe this year's course files as fully imported until all remaining branches and files are enumerated and checked.

### RTF group links

The RTF source was used as factual link/contact data, not as instructions. Existing group destinations were compared with `data/site.json`. The Physics B destination was corrected to the RTF link; Algebra lecture Group B was added; the lab-equipment WhatsApp URL and Facebook share URLs were aligned with the source. The RTF lists Physics B and Inorganic Chemistry B with the same WhatsApp destination; both labels are retained pending owner confirmation. Contact phone numbers are published in the official groups area, so verify that this is intended before adding any new personal contact details.

## Current administration behavior

The admin session uses an in-memory token map and an HTTP-only, session-only cookie, and the password comes from `ADMIN_PASSWORD`. Opening `/admin` clears any previous session and requires the password again. CRUD is available for subjects, lecture links, academic advising and official groups. When Firebase Admin is configured, editable site content is stored in Firestore at `site/content` and seeded from `data/site.json` on first access. Without the Admin key, the app falls back to `data/site.json`, which is ephemeral on Render Free; the dashboard now displays this storage status. The UI has a simple/advanced presentation toggle, Firebase user lookup, and private or broadcast messaging. Admin sessions are lost on server restart; rate limiting, CSRF protections, durable sessions and audit logs remain production hardening work. Arbitrary file upload and advanced management of nested Drive branches are not implemented yet.

## Registration, profile and account status

Firebase project `capital-science-faculty` is on the Spark plan, and web app `capital-science-faculty-web` is registered. Email/Password sign-in is enabled. The default Firestore database was created in `us-west1` (Oregon) in production mode; browser reads and writes are denied by default. Google sign-in remains disabled until a public support email is chosen. Phone sign-in remains disabled pending SMS cost approval. A Firebase Admin service-account key is active in Google Cloud, but its JSON file has not been installed in Render. The public Firebase web config is configured in Render, and `capital-science-faculty.onrender.com` is authorized in Firebase Auth; however, `FIREBASE_SERVICE_ACCOUNT_JSON` is still missing, so the server's Firebase endpoint reports auth as unavailable and verified account/profile flows are **not active in production**. Email/password registrations are intended to send a Firebase verification link; after provider verification, the server verifies the Firebase ID token and stores a profile in Firestore with the Firebase UID as its immutable account ID. The current browser UI offers provider flows and sign-out/profile editing. Uploaded images are resized in the browser and limited to fit a Firestore document; 10 built-in vector portraits remain available.

`/api/admin/users` lists Firebase accounts for the signed-in admin. `/api/admin/email` supports a single recipient (Firebase user ID, email, or E.164 phone) or a broadcast capped at 500 accounts. Each message is written to the recipient’s private Firestore inbox; Resend sends an individual email when an email address exists. Phone-only accounts receive only an in-app message. The `/api/register` and `/api/profile/update` legacy routes always return 503; registration must use Firebase Auth. Email delivery failures do not undo a Firebase profile save or private inbox delivery.

Firebase setup on Render requires values for `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID`, plus the private `FIREBASE_SERVICE_ACCOUNT_JSON` secret. Firebase project, web app, Email/Password provider, Firestore, public web config, and production Auth domain are configured. Still transfer the Admin key securely to Render, choose a public Google OAuth support email before enabling Google sign-in, and deploy `firestore.rules`. Once the Admin key is present, the first site content request seeds `site/content` from the checked-in JSON; subsequent dashboard CRUD reads and writes Firestore. Never put service-account JSON in GitHub or browser code. Phone verification consumes SMS and may cost money. Existing profiles in browser storage are not silently migrated or deleted.

**Until the Render Firebase configuration and Admin secret are set, account flows are intentionally not live.** Do not force existing visitors to register again. Historical accounts from localStorage cannot be enumerated by the server; the admin user list will contain only accounts created in Firebase.

### Existing student data and re-registration

Do **not** clear local profiles, delete the profile cookie key, rotate the local data schema to force sign-up, or delete server files as a substitute for account migration. Student profiles are primarily in each visitor's browser storage and are not available in this repository. Render's free web service has ephemeral local storage, so the JSONL registration log on that instance is not a dependable, complete export source and may disappear when the instance is replaced. There is no reliable roster of all prior registrants in the current project checkout. A bulk export/forced re-registration cannot be completed safely until the owner provisions a durable database and an authenticated export path. Keep current users' profiles intact.

## Required infrastructure for requested authentication and messaging

1. **Firebase project:** set the web config and service-account JSON as Render environment values/secrets, choose a public support email before enabling Google, allowlist the production domain, and deploy `firestore.rules`. Keep the project on an appropriate billing plan; phone SMS is billed and subject to quotas.
2. **Email delivery:** keep Resend for owner registration notifications and managed user mail. Configure a verified sender domain for reliable production delivery and monitor failures.
3. **Phone verification:** the Firebase Auth phone flow uses E.164 numbers and reCAPTCHA. Set the permitted SMS regions and review costs/abuse controls before launch. Never collect a national ID.
5. **User/admin email:** private inbox and admin-only sending endpoints are implemented. Add delivery logs, unsubscribe/abuse controls and rate limits before broad production use. Broadcast sends are individual and do not disclose recipients to each other.
6. **User IDs and export:** Firebase UIDs are immutable internal IDs. Add an admin-only CSV export with access logging and minimum necessary fields before claiming historical account export; do not publish a user directory. Provide account deletion and retention controls.
7. **Dashboard:** implement Advanced and Simple modes over the same validated API and database. Use server-side role checks, CSRF protections, rate limiting, safe uploads, file-size/type limits and audit logs.

## Checks run / follow-up

After edits, validate JSON parsing and JavaScript syntax, then start the app and exercise all routes and API responses. Browser QA should cover Arabic/English, RTL/LTR, theme persistence, guest cookies, verified Firebase registration for each provider, profile editing/logout, admin login/CRUD, and each year/semester folder path. Production checks must also verify Firebase configuration on Render and email delivery without sending test messages to real student recipients.

This guide records the current implementation and known gaps; Email/Password and Firestore are enabled in Firebase, and the web config/domain are set, but production registration remains inactive until Render receives the Admin key. Google OAuth and SMS remain disabled.
