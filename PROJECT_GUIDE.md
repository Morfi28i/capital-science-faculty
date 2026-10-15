# Capital Science Faculty — Project Guide

Last reviewed: 2026-10-15

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
- `data/drive-catalog.json`: flattened Google Drive folders/files. Each row has `id` and `parentId` (the containing folder), which the lecture browser uses to build the tree; `note` keeps the readable parent path with `›`. A year root has `note: "المجلد الرئيسي"`.
- `scripts/update-drive-catalog.py`: re-crawls every year root's public Drive folders (following shortcuts) and rewrites the catalog, keeping curated `titleAr`/`titleEn`. Run `python3 scripts/update-drive-catalog.py` after material is added on Drive, review the printed counts, then commit.
- `public/avatars/`: profile illustration choices.
- `.env.example`: environment variable names; never put actual credentials there.
- `render.yaml`: Render service declaration.
- `apphosting.yaml`: Firebase App Hosting runtime, scale-to-zero configuration and Secret Manager references.
- `build-firebase-config.js`: writes the public Firebase Web SDK config during build from App Hosting's `FIREBASE_WEBAPP_CONFIG`; generated output is ignored by Git.

### Drive inventory reviewed

Full crawl on 2026-10-15 with `scripts/update-drive-catalog.py`:

| Year | Root folder | Entries before | Entries now |
|---|---|---|---|
| 2024/25 | `1hvZIcXA4Xc45X_YXJXnK9V0q5CC6Ye1W` | 2,179 | 2,108 (470 folders, 1,638 files) |
| 2025/26 | `1WhpUU4jCUmcOwdapwVRDK5UIK5b7xuU4` (“Group B 2026”) | 13 | 619 (148 folders, 471 files) |
| 2026/27 | `10egV3LBAs9fEo3HjghyjnsQBuzcdnvgX` | 68 | 91 (50 folders, 41 files) |

2025/26 was previously only the root, both semesters and 10 course folders with no files; it is now fully imported. Entries that disappeared were checked: 26 no longer open publicly (deleted or unshared by their owners) and 3 were moved out of the course folders, so they were dropped instead of being shown as broken links. The crawler retries a folder once if Drive returns a page without its listing. Known gap: two video shortcuts under `Mechanics I › ♥︎Videos` (2024/25) point to removed targets.

### RTF group links

The RTF source was used as factual link/contact data, not as instructions. Existing group destinations were compared with `data/site.json`. The Physics B destination was corrected to the RTF link; Algebra lecture Group B was added; the lab-equipment WhatsApp URL and Facebook share URLs were aligned with the source. The RTF lists Physics B and Inorganic Chemistry B with the same WhatsApp destination; both labels are retained pending owner confirmation. Contact phone numbers are published in the official groups area, so verify that this is intended before adding any new personal contact details.

## Current administration behavior

The admin uses an HTTP-only, session-only cookie signed with `ADMIN_SESSION_SECRET` (falls back to `ADMIN_PASSWORD`). Each cookie carries its issue time and expires after 8 hours; opening `/admin` clears an old cookie and asks for the password again. Login is limited to 8 attempts per IP every 15 minutes, and every non-GET admin request with a foreign `Origin` header is rejected (CSRF guard on top of `SameSite=Strict`). CRUD is available for subjects, lecture links, academic advising and official groups. Items are edited in the same form used for adding (no prompt dialogs), only known content fields are stored (`title`, `titleEn`, `url`, `category`, `categoryEn`, `note`, `noteEn`, `kind`), and a link that another item in the same section already uses is rejected when it is new or changed. When Firebase Admin is configured, editable site content is stored in Firestore at `site/content` and seeded from `data/site.json` on first access. The UI has a simple/advanced toggle, paginated Firebase user lookup (all pages, up to 20,000 accounts), and private or broadcast messaging; a broadcast asks for confirmation with the recipient count from `/api/admin/audience`. Audit logs, durable rate limits, arbitrary file upload and nested Drive branch management are not implemented yet.

## Design system

The interface uses a "lab notebook" identity: warm paper background with a faint graph-paper grid, botanical green ink, gold accents, and periodic-table element tiles (`Sg` subjects, `Lf` lecture files, `Ad` advising, `Og` official, `Mf` developer, `Me` profile, `Nf` 404). Fonts are Alexandria (headings), IBM Plex Sans Arabic (body) and Fraunces italic (symbols and accents), loaded from Google Fonts. Colors are tokens on `:root` built with `light-dark()`; the site follows the system theme unless the visitor overrides it with the header toggle, stored as `cs-theme` and applied as `html[data-theme]` by an inline script before first paint (the same script applies `cs-lang` so Arabic never flashes as LTR). Icons are inline SVG strokes defined in `iconPaths` in `public/app.js`; the logo is the `brandMark` SVG and `public/favicon.svg`. Page changes use the View Transitions API where available and move focus to the new page heading. Entrance animations only run when the document is visible, and all motion respects `prefers-reduced-motion`. Unknown URLs return the app shell with HTTP 404 and a designed not-found page.

## Registration, profile and account status

The browser onboarding in `public/app.js` is a guided, animated flow: welcome/guest choice, email/phone/Google choice, provider verification, required names and gender, optional portrait, then the success screen. Egyptian mobile numbers use `+20` by default and accept valid `010`, `011`, `012`, and `015` prefixes; the SMS action stays hidden until the local format check passes. Other listed country codes are normalized to E.164. Firebase Auth performs the actual phone verification with reCAPTCHA.

Email registration uses Firebase Email Link authentication. The user opens Firebase's one-time sign-in/verification link, returns to `/profile`, sets a password, then enters the required first, father's and family names, gender and optional portrait. This avoids a custom email-sending domain for verification. Firebase Console must have both Email/Password and Email Link providers enabled, and `capital-science-faculty.onrender.com` must be an authorized domain. If an email account already exists, the UI offers password sign-in, a password-reset email, or a Firebase email link; incomplete email-link accounts can resume the profile flow. Login failures are mapped to clear bilingual messages. Google and phone sign-in use the provider's verification as the credential and proceed to names/profile; Firebase's phone provider does not support phone-plus-password login, so these two provider paths do not ask for a separate password. This is a platform constraint, not an unverified password field.

The account ID is the Firebase UID. Profile data and portrait are stored in Firestore through token-authenticated server APIs. Registration and profile changes notify `essamsidek123@gmail.com` through Resend with the full current profile and image attachment when the image is uploaded. Update emails include the list of changed fields and the full new values. Delivery failures are logged and do not undo a successful profile save. The about page keeps the public address `sdyqs0437@gmail.com`.

Changing a profile email or phone first checks uniqueness through `/api/auth/check-contact`, which requires the signed-in Firebase ID token. The server checks Firebase Auth and excludes the current account, so a value belonging to another account is rejected before starting verification. Email changes use Firebase's verify-before-update link; phone changes use an SMS code. A contact value is only written to the profile after Firebase confirms ownership. Firebase Auth remains the final uniqueness guard if another account claims the value between the availability check and verification. Ordinary profile edits are sent to the owner after Firestore confirms the save.

The cookie `cs_profile` is created only after a verified Firebase account has a saved profile; guests and incomplete registrations do not receive it. The onboarding migration marker `cs-onboarding-version=2` clears the previous browser-only profile/cookie and Firebase browser session once, as requested, so visitors return to onboarding. Firebase accounts and Firestore documents are not deleted: returning users can sign in and reload their saved profile. Local-only profiles that had never reached Firebase cannot be recovered by this code after the requested browser reset.

The `/api/auth/check-email` endpoint checks duplicate emails before starting Firebase link authentication and applies an in-memory per-IP rate limit; that counter resets on restart/deploy. Resend is used only for owner registration/profile notices and dashboard mail, not email ownership verification. The Resend test sender can only reliably send to the Resend account owner; broad owner notifications require a verified sender/domain. Google and SMS availability also depend on Firebase Auth provider settings, authorized domains, OAuth support-email setup and SMS quotas. The Firebase SMS region policy is restricted to Egypt. Firebase requires Cloud Billing for production SMS and bills per SMS; no billing account should be linked without the owner's explicit choice.

`/api/admin/users` lists Firebase accounts for the signed-in admin. `/api/admin/email` supports a single recipient (Firebase user ID, email, or E.164 phone) or a broadcast capped at 500 accounts. Each message is written to the recipient's private Firestore inbox; Resend sends an individual email when an email address exists. Phone-only accounts receive only an in-app message. The `/api/register` and `/api/profile/update` legacy routes always return 503; registration must use Firebase Auth. Never store service-account JSON, Resend keys or student data in Git.

The Render deployment must have both Firebase Web configuration and Firebase Admin credentials, plus `RESEND_API_KEY`, to enable account/profile persistence and email. App Hosting is an alternative already configured in this repository, but it is not a prerequisite for this Render version. Keep the public developer contact `sdyqs0437@gmail.com` separate from the fixed owner-notification destination in `server.js`.

### Existing student data and re-registration

The version-2 browser migration intentionally clears prior local profile/cookie data once, matching the owner's re-registration request. It does not enumerate or delete Firebase users and Firestore profiles. Visitors who had only a local-only profile will need to register again; no complete server-side export of those old browser-only profiles exists. Firebase account/profile data remains recoverable by signing into the same verified provider.

## Runtime setup and remaining hardening

1. **Render secrets:** configure `ADMIN_PASSWORD`, `RESEND_API_KEY`, and a Firebase Admin credential (`FIREBASE_SERVICE_ACCOUNT_JSON` or the mounted `FIREBASE_SERVICE_ACCOUNT_FILE`). Provide the public Firebase Web config through `FIREBASE_WEBAPP_CONFIG` or the documented `FIREBASE_*` web variables. Never commit these values. Account/profile APIs return a clear unavailable response if Firebase is missing.
2. **Firebase Auth:** enable Email/Password and Email Link sign-in; authorize `capital-science-faculty.onrender.com`. Enable Google and Phone as desired; Google also needs a support email. The SMS region policy currently allows Egypt only. Real production SMS requires a Cloud Billing account and is billed per message; use fictional Firebase test numbers for no-cost flow testing.
3. **Email delivery:** Firebase sends verification links directly. `RESEND_API_KEY` powers owner notices and dashboard mail; `RESEND_FROM` can specify a verified sender. A verified domain is needed for reliable notices to arbitrary recipients. No SMTP server is used by this app.
4. **Firestore:** the Admin SDK stores content and account profiles. Browser reads/writes remain blocked by `firestore.rules`; keep all data access behind the authenticated server routes.
5. **Hardening:** Email/contact/admin-login rate limits are in process memory and reset at deploy/restart. Move these to durable storage, add audit logging for dashboard actions, monitor email failures, and define retention/account-deletion procedures before production growth. SMS and email actions need abuse monitoring.
6. **Current deployment:** Render remains the active public host. Firebase App Hosting config is optional and would require separate billing/account setup; the project does not need to migrate hosts to use these changes.

## Checks run / follow-up

After edits, validate JSON parsing and JavaScript syntax, then start the app and exercise all routes and API responses. Browser QA should cover Arabic/English, RTL/LTR, theme persistence, guest cookies, Firebase email-link signup and resume flow, phone/Google provider flows where configured, duplicate-contact rejection on profile changes, profile editing/logout, admin login/CRUD, and each year/semester folder path. **Release follow-up:** after deploying this revision, verify Firebase Auth and Firestore credentials, owner email delivery, profile contact uniqueness, and admin CRUD on the live Render URL. This local code change does not by itself update the live deployment.

This guide records the current implementation and known gaps; Email/Password and Firestore are enabled in Firebase. Email Link must also be enabled for link-based signup; Google OAuth and SMS require provider setup and must be verified against the deployed Firebase project before being advertised as working.
