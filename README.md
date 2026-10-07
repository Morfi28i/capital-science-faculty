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

The current Render service is a free web service with an ephemeral filesystem. Firebase Email/Password and a production-mode Firestore database are configured in the Firebase project, but verified account flows remain unavailable until the Firebase web configuration and Admin service-account JSON are added to Render. Google sign-in awaits a public support-email choice; phone sign-in stays off until SMS costs are approved. Do not commit service-account keys or claim a complete historical user export is available. See the guide for details.
