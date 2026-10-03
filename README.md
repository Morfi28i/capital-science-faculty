# Capital Science · Student Commons

A small, responsive, bilingual (Arabic/English) student website and protected content dashboard. It uses a dependency-light Node HTTP server, a JSON content store, and plain browser JavaScript/CSS animations. The Arabic group directory is populated from the supplied RTF file.

## Run locally

1. Install Node.js 18 or newer.
2. In this project folder, run `npm install`.
3. Copy `.env.example` to `.env` and set `ADMIN_PASSWORD` to a strong private password. Configure SMTP variables if registration email notifications are wanted.
4. Load the environment variables, then run `npm start` and open `http://localhost:3000`.

The server itself does not load `.env` files. For local development, load them in your shell (for example, `set -a; source .env; set +a; npm start`). On a host, configure environment variables in its deployment settings. Never commit real credentials.

## Routes

- `/` — landing page
- `/subjects` — subject and section group directory
- `/lectures` — lecture files; initially empty
- `/advising` — official cohort groups, adviser links, contacts, and faculty pages
- `/developer` — developer information
- `/admin` — password-protected content dashboard

The admin dashboard provides create, read, update, and delete for subject groups, lecture links, and advising/official groups. Lecture items are added as links (for example, a hosted PDF URL); the server does not provide binary file uploads.

## Registration and email

First visit shows a welcome and optional registration. Guest continuation is available. Registration asks for name, gender, Gmail address, and an optional photo. If omitted, the saved profile gets a gender-themed generated vector avatar. Profile data is kept in browser local storage and a first-party cookie; uploaded photo data is kept in local storage. The browser verifies the saved cookie against local storage after registration and on load. The browser sends registration fields to `/api/register`; the server saves the photo in `public/uploads/` and appends the profile and photo URL to `data/registrations.jsonl`. Configure `PUBLIC_URL` to the public HTTPS origin so the emailed photo link works outside the local machine. Configure SMTP to notify `essamsidek123@gmail.com`. Email notification is disabled until SMTP variables are configured. Uploaded images are capped at 3.5 MB.

The registration UI explains data submission before consent. Run this behind HTTPS in production. Registration details and email/password secrets are sensitive; restrict access and retention of server logs and registration files.

## Content data

`data/site.json` is the editable seed database. Updates made from the admin dashboard are written back to this file. `data/registrations.jsonl` is created at runtime. The seven cohort application contacts and the supplied WhatsApp/Facebook destinations are included in the seed data. The source lists two main cohort groups and explicitly says to join only one; the site preserves this warning.
