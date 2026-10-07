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

The browser onboarding in `public/app.js` is a guided, animated flow: welcome/guest choice, email/phone/Google choice, provider verification, required names and gender, optional portrait, then the success screen. Egyptian mobile numbers use `+20` by default and accept valid `010`, `011`, `012`, and `015` prefixes; the SMS action stays hidden until the local format check passes. Other listed country codes are normalized to E.164. Firebase Auth performs the actual phone verification with reCAPTCHA.

Email registration uses a six-digit Resend code (10-minute lifetime, five attempts, and a per-address/IP send limit), then collects a password, first name, father's name, family name, gender and optional illustration/upload. The verified code is bound to the Firebase account before the server marks its email verified. Google and phone sign-in use the provider's verification as the credential and proceed to names/profile; Firebase's phone provider does not support phone-plus-password login, so these two provider paths do not ask for a separate password. This is a platform constraint, not an unverified password field.

The account ID is the Firebase UID. Profile data and portrait are stored in Firestore through token-authenticated server APIs. Registration and profile changes notify `essamsidek123@gmail.com` through Resend with the full current profile and image attachment when the image is uploaded. Update emails include the list of changed fields and the full new values. Delivery failures are logged and do not undo a successful profile save. The about page keeps the public address `sdyqs0437@gmail.com`.

Changing a profile email or phone first checks uniqueness through `/api/auth/check-contact`, which requires the signed-in Firebase ID token. The server checks Firebase Auth and excludes the current account, so a value belonging to another account is rejected before starting verification. Email changes use Firebase's verify-before-update link; phone changes use an SMS code. A contact value is only written to the profile after Firebase confirms ownership. Firebase Auth remains the final uniqueness guard if another account claims the value between the availability check and verification. Ordinary profile edits are sent to the owner after Firestore confirms the save.

The cookie `cs_profile` is created only after a verified Firebase account has a saved profile; guests and incomplete registrations do not receive it. The onboarding migration marker `cs-onboarding-version=2` clears the previous browser-only profile/cookie and Firebase browser session once, as requested, so visitors return to onboarding. Firebase accounts and Firestore documents are not deleted: returning users can sign in and reload their saved profile. Local-only profiles that had never reached Firebase cannot be recovered by this code after the requested browser reset.

Email-code challenges and basic rate-limit counters currently live in server memory. A service restart or deploy invalidates outstanding codes and resets these counters; persistent account/profile data remains in Firebase. For production, persist challenges/rate limits in a durable store and add abuse monitoring. Email codes and owner notices require `RESEND_API_KEY`; a verified sender/domain is needed to reliably send to student addresses. Google and SMS availability also depend on Firebase Auth provider settings, authorized domains, OAuth support-email setup and SMS quotas.

`/api/admin/users` lists Firebase accounts for the signed-in admin. `/api/admin/email` supports a single recipient (Firebase user ID, email, or E.164 phone) or a broadcast capped at 500 accounts. Each message is written to the recipient's private Firestore inbox; Resend sends an individual email when an email address exists. Phone-only accounts receive only an in-app message. The `/api/register` and `/api/profile/update` legacy routes always return 503; registration must use Firebase Auth. Never store service-account JSON, Resend keys or student data in Git.

The Render deployment must have both Firebase Web configuration and Firebase Admin credentials, plus `RESEND_API_KEY`, to enable account/profile persistence and email. App Hosting is an alternative already configured in this repository, but it is not a prerequisite for this Render version. Keep the public developer contact `sdyqs0437@gmail.com` separate from the fixed owner-notification destination in `server.js`.

### Existing student data and re-registration

The version-2 browser migration intentionally clears prior local profile/cookie data once, matching the owner's re-registration request. It does not enumerate or delete Firebase users and Firestore profiles. Visitors who had only a local-only profile will need to register again; no complete server-side export of those old browser-only profiles exists. Firebase account/profile data remains recoverable by signing into the same verified provider.

## Runtime setup and remaining hardening

1. **Render secrets:** configure `ADMIN_PASSWORD`, `RESEND_API_KEY`, and a Firebase Admin credential (`FIREBASE_SERVICE_ACCOUNT_JSON` or the mounted `FIREBASE_SERVICE_ACCOUNT_FILE`). Provide the public Firebase Web config through `FIREBASE_WEBAPP_CONFIG` or the documented `FIREBASE_*` web variables. Never commit these values. Account/profile APIs return a clear unavailable response if Firebase is missing.
2. **Firebase Auth:** enable Email/Password, Google, and Phone providers as desired; authorize the production domain and configure Google's support email. Phone SMS is subject to Firebase quotas and may cost money. Google and SMS must be verified on the deployed domain.
3. **Email delivery:** `RESEND_API_KEY` powers OTPs and owner notices; `RESEND_FROM` can specify a verified sender. A verified domain is required for reliable delivery to arbitrary student addresses. No SMTP server is used by this app.
4. **Firestore:** the Admin SDK stores content and account profiles. Browser reads/writes remain blocked by `firestore.rules`; keep all data access behind the authenticated server routes.
5. **Hardening:** OTP challenges and simple rate limits are in process memory and reset at deploy/restart. Move these to durable storage, add CSRF protection and audit logging for dashboard actions, monitor email failures, and define retention/account-deletion procedures before production growth. SMS and email actions need abuse monitoring.
6. **Current deployment:** Render remains the active public host. Firebase App Hosting config is optional and would require separate billing/account setup; the project does not need to migrate hosts to use these changes.

## Checks run / follow-up

After edits, validate JSON parsing and JavaScript syntax, then start the app and exercise all routes and API responses. Browser QA should cover Arabic/English, RTL/LTR, theme persistence, guest cookies, email-code flow, phone/Google provider flows where configured, duplicate-contact rejection on profile changes, profile editing/logout, admin login/CRUD, and each year/semester folder path. **Release follow-up:** after deploying this revision, verify Firebase Auth and Firestore credentials, owner email delivery, profile contact uniqueness, and admin CRUD on the live Render URL. This local code change does not by itself update the live deployment.

This guide records the current implementation and known gaps; Email/Password and Firestore are enabled in Firebase. Google OAuth and SMS require provider setup and must be verified against the deployed Firebase project before being advertised as working.
