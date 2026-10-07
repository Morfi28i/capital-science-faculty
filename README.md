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

## Firebase deployment

The project is prepared for Firebase App Hosting (`apphosting.yaml`). App Hosting serves the existing Node application and static site together; the Admin SDK uses Google Application Default Credentials, and site edits and verified account data persist in Firestore. No Render service-account key is needed. The build creates `public/firebase-config.json` from App Hosting's `FIREBASE_WEBAPP_CONFIG`; it is a public browser config, is ignored by Git, and must never contain private keys.

To activate the backend, enable the Firebase **Blaze** billing plan, connect this GitHub repository and its `main` branch under Firebase App Hosting, and choose `europe-west4` for the backend. Add the secrets `capital-science-admin-password` and `capital-science-resend-api-key` in Google Secret Manager before the first rollout; App Hosting needs access to both secrets. Then deploy and test the `*.hosted.app` URL. App Hosting requires a billing account; it has included usage limits, but usage beyond them can be billed. Firebase's own documentation recommends a Cloud Run spend cap and budget alerts. Keep Render running until the Firebase URL, account flow, and admin CRUD have been verified; only then switch the public domain.

Google sign-in still requires choosing a public OAuth support email, and SMS verification may incur charges. Existing browser-only profiles cannot be centrally listed or reset; do not delete them or force a re-registration. Never commit service-account keys, SMTP/Resend keys, or student data. See [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for deployment and remaining feature details.
