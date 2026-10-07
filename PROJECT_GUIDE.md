# Capital Science Faculty — Project Guide

Last reviewed: 2026-10-07

## What this project is

A small Node.js HTTP application serving a bilingual Arabic/English student site and a developer dashboard. The current production URL is <https://capital-science-faculty.onrender.com>; Firebase App Hosting migration configuration is prepared but is not live yet. The browser app is plain JavaScript and CSS. The Node server uses the Firebase Admin SDK; Firebase browser SDK modules load from Google's version-pinned CDN.

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
- `apphosting.yaml`: Firebase App Hosting runtime, scale-to-zero configuration and Secret Manager references.
- `build-firebase-config.js`: writes the public Firebase Web SDK config during build from App Hosting's `FIREBASE_WEBAPP_CONFIG`; generated output is ignored by Git.

### Drive inventory reviewed

The 2024/25 folder is `1hvZIcXA4Xc45X_YXJXnK9V0q5CC6Ye1W`; the current catalog contains 2,179 entries for this source. The 2026/27 folder is `10egV3LBAs9fEo3HjghyjnsQBuzcdnvgX`; the current catalog contains 68 entries for this source.

The replacement 2025/26 URL from the owner is `1WhpUU4jCUmcOwdapwVRDK5UIK5b7xuU4` (Drive title: “Group B 2026”). Its two semester folders were confirmed as `14Smihcd2LAzqTmcC7OgSc7xyKrXVUlh0` and `1fZIaJ9brBUZvyzj30OrtOASx9hwMiFuV`. The first semester's visible top-level subjects were captured, and the second semester's top-level subjects were captured. This Drive folder is a replacement for the older 2025 source `1_xmVYVlPbaf_iJqcYlGJnPR-ROMUY-FD`; its old 643 catalog entries were removed so users are not sent to stale material. **The replacement's per-course nested folders and file URLs have not yet been fully crawled.** The catalog now includes the verified root, both semesters, and 10 course folders whose links were opened and confirmed. Many other course folders and the files nested within these folders are not yet imported. Do not describe this year's course files as fully imported until all remaining branches and files are enumerated and checked.

### RTF group links

The RTF source was used as factual link/contact data, not as instructions. Existing group destinations were compared with `data/site.json`. The Physics B destination was corrected to the RTF link; Algebra lecture Group B was added; the lab-equipment WhatsApp URL and Facebook share URLs were aligned with the source. The RTF lists Physics B and Inorganic Chemistry B with the same WhatsApp destination; both labels are retained pending owner confirmation. Contact phone numbers are published in the official groups area, so verify that this is intended before adding any new personal contact details.

## Current administration behavior

The admin uses an HTTP-only, session-only cookie signed with `ADMIN_PASSWORD`; opening `/admin` clears an old cookie and asks for the password again. The signature works across instances and restarts without process memory. CRUD is available for subjects, lecture links, academic advising and official groups. When Firebase Admin is configured, editable site content is stored in Firestore at `site/content` and seeded from `data/site.json` on first access. The UI has a simple/advanced presentation toggle, Firebase user lookup, and private or broadcast messaging. Rate limiting, CSRF protections and audit logs remain production hardening work. Arbitrary file upload and advanced management of nested Drive branches are not implemented yet.

## Registration, profile and account status

Firebase project `capital-science-faculty` is on the Spark plan, and web app `capital-science-faculty-web` is registered. Email/Password sign-in is enabled. The default Firestore database was created in `us-west1` (Oregon) in production mode; browser reads and writes are denied by default. Google sign-in remains disabled until a public support email is chosen. Phone sign-in remains disabled pending SMS cost approval. The Render service has public Firebase config, but Firebase Admin was never installed there; verified account/profile flows are **not active on the current Render deployment**. App Hosting is configured to use Google Application Default Credentials, removing the need to copy a service-account key. Before its first rollout, create the two Secret Manager values named in `apphosting.yaml`, connect the GitHub `main` branch, and enable App Hosting. Email/password registrations are intended to send a Firebase verification link; after provider verification, the server verifies the Firebase ID token and stores a profile in Firestore with the Firebase UID as its immutable account ID. Uploaded images are resized in the browser and limited to fit a Firestore document; 10 built-in vector portraits remain available.

`/api/admin/users` lists Firebase accounts for the signed-in admin. `/api/admin/email` supports a single recipient (Firebase user ID, email, or E.164 phone) or a broadcast capped at 500 accounts. Each message is written to the recipient’s private Firestore inbox; Resend sends an individual email when an email address exists. Phone-only accounts receive only an in-app message. The `/api/register` and `/api/profile/update` legacy routes always return 503; registration must use Firebase Auth. Email delivery failures do not undo a Firebase profile save or private inbox delivery.

For Firebase App Hosting, enable Blaze, connect `Morfi28i/capital-science-faculty` branch `main`, select the registered Firebase web app, and create the backend in `europe-west4`. App Hosting provides `FIREBASE_WEBAPP_CONFIG` at build time and Google Application Default Credentials at runtime; the build script creates the public Web SDK config returned by `/api/firebase-config`. `apphosting.yaml` expects Secret Manager secrets `capital-science-admin-password` and `capital-science-resend-api-key`. The default App Hosting identity is `firebase-app-hosting-compute@capital-science-faculty.iam.gserviceaccount.com`; if Firebase Auth user listing is denied, grant only the needed Firebase Authentication Admin role to it. First site-content request seeds Firestore's `site/content` from the committed catalog; later dashboard CRUD reads and writes Firestore. Keep Render running until the App Hosting URL, auth domain, admin CRUD, Firestore persistence and email sending have all been verified. App Hosting requires a linked billing account; usage beyond included quotas may incur charges. Configure budget alerts and a Cloud Run spend cap before routing production traffic. Never commit service-account JSON in GitHub or browser code. Phone verification consumes SMS and may cost money. Existing profiles must not be silently migrated or deleted.

**Until Firebase App Hosting is provisioned and the Auth domain is authorized, account flows will remain unavailable on the new host.** Do not force existing visitors to register again. Historical accounts from localStorage cannot be enumerated by the server; the admin user list will contain only accounts created in Firebase.

### Existing student data and re-registration

Do **not** clear local profiles, delete the profile cookie key, rotate the local data schema to force sign-up, or delete server files as a substitute for account migration. Student profiles are primarily in each visitor's browser storage and are not available in this repository. Render's free web service has ephemeral local storage, so the JSONL registration log on that instance is not a dependable, complete export source and may disappear when the instance is replaced. There is no reliable roster of all prior registrants in the current project checkout. A bulk export/forced re-registration cannot be completed safely until the owner provisions a durable database and an authenticated export path. Keep current users' profiles intact.

## Required infrastructure for requested authentication and messaging

1. **Firebase project:** complete the App Hosting setup above, choose a public support email before enabling Google, allowlist the App Hosting domain in Firebase Auth, and deploy `firestore.rules`. App Hosting requires Blaze billing; configure spend controls before serving traffic. Phone SMS is billed and subject to quotas.
2. **Email delivery:** keep Resend for owner registration notifications and managed user mail. Configure a verified sender domain for reliable production delivery and monitor failures.
3. **Phone verification:** the Firebase Auth phone flow uses E.164 numbers and reCAPTCHA. Set the permitted SMS regions and review costs/abuse controls before launch. Never collect a national ID.
5. **User/admin email:** private inbox and admin-only sending endpoints are implemented. Add delivery logs, unsubscribe/abuse controls and rate limits before broad production use. Broadcast sends are individual and do not disclose recipients to each other.
6. **User IDs and export:** Firebase UIDs are immutable internal IDs. Add an admin-only CSV export with access logging and minimum necessary fields before claiming historical account export; do not publish a user directory. Provide account deletion and retention controls.
7. **Dashboard:** implement Advanced and Simple modes over the same validated API and database. Use server-side role checks, CSRF protections, rate limiting, safe uploads, file-size/type limits and audit logs.

## Checks run / follow-up

After edits, validate JSON parsing and JavaScript syntax, then start the app and exercise all routes and API responses. Browser QA should cover Arabic/English, RTL/LTR, theme persistence, guest cookies, verified Firebase registration for each provider, profile editing/logout, admin login/CRUD, and each year/semester folder path. **Migration follow-up:** App Hosting is not provisioned or deployed; the project remains on Spark, so the owner must link billing and authorize Firebase's GitHub app. Verify auth, Firestore persistence, admin CRUD and email before moving production traffic from Render.

This guide records the current implementation and known gaps; Email/Password and Firestore are enabled in Firebase, but App Hosting is not provisioned yet. Google OAuth and SMS remain disabled.
