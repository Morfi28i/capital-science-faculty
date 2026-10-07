# Capital Science Faculty

Bilingual student resource site for the Capital Faculty of Science community. Read [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for architecture, data sources, deployment, privacy constraints, setup steps and the current feature checklist.

## Run locally

```sh
pnpm install --frozen-lockfile --ignore-scripts
ADMIN_PASSWORD='use-a-long-unique-secret' npm start
```

Open `http://localhost:3000`. Optional registration notification emails use `RESEND_API_KEY` and `RESEND_FROM`; see `.env.example`. Never commit real secrets.

## Routes

`/`, `/subjects`, `/lectures`, `/advising`, `/official`, `/developer`, `/profile`, `/admin`.

## Important deployment note

The current Render service is a free web service with an ephemeral filesystem. The Firebase web app configuration and production domain are configured on Render/Firebase, and Email/Password is enabled in Firebase. Verified account flows, profile sync, admin user lookup, and in-app mail remain unavailable until the private `FIREBASE_SERVICE_ACCOUNT_JSON` key is installed in Render. Google sign-in awaits a public OAuth support-email decision; phone sign-in remains disabled pending SMS cost approval. Existing browser-only profiles cannot be centrally listed or reset, and historical registration data is not a complete roster. Never commit service-account keys or student data. See the guide for details.
