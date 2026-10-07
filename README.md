# Capital Science Faculty

Bilingual student resource site for the Capital Faculty of Science community. Read [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for architecture, data sources, deployment, email/phone verification, profile edits, privacy constraints and setup steps.

## Run locally

```sh
pnpm install --frozen-lockfile --ignore-scripts
ADMIN_PASSWORD='use-a-long-unique-secret' npm start
```

Open `http://localhost:3000`. Optional registration notification emails use `RESEND_API_KEY` and `RESEND_FROM`; see `.env.example`. Never commit real secrets.

## Routes

`/`, `/subjects`, `/lectures`, `/advising`, `/official`, `/developer`, `/profile`, `/admin`.

## Optional Firebase App Hosting

Render remains the active public deployment. Firebase App Hosting configuration is optional and is only needed if the owner chooses to move hosts; doing so requires billing configuration. The project is prepared for Firebase App Hosting (`apphosting.yaml`). App Hosting serves the existing Node application and static site together; the Admin SDK uses Google Application Default Credentials, and site edits and verified account data persist in Firestore. No Render service-account key is needed. The build creates `public/firebase-config.json` from App Hosting's `FIREBASE_WEBAPP_CONFIG`; it is a public browser config, is ignored by Git, and must never contain private keys.

To use App Hosting, enable the Firebase **Blaze** billing plan, connect this GitHub repository and its `main` branch under Firebase App Hosting, and choose `europe-west4` for the backend. Add the secrets `capital-science-admin-password` and `capital-science-resend-api-key` in Google Secret Manager before the first rollout; App Hosting needs access to both secrets. Then deploy and test the `*.hosted.app` URL. App Hosting requires a billing account; it has included usage limits, but usage beyond them can be billed. Firebase's own documentation recommends a Cloud Run spend cap and budget alerts. Keep Render running until the Firebase URL, account flow, and admin CRUD have been verified; only then switch the public domain.

Configure Firebase Auth providers and authorize the live domain before enabling Google or SMS; SMS verification can incur charges. Version 2 intentionally clears old local-only profile cookies once but leaves Firebase accounts and Firestore profiles intact. Registration and profile notices require Resend sender setup. Never commit service-account keys, Resend keys, or student data. See [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for full setup and limitations.
