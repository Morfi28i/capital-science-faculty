# Capital Science Faculty

Bilingual student resource site for the Capital Faculty of Science community. Read [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for architecture, data sources, deployment, email/phone verification, profile edits, privacy constraints and setup steps.

## Run locally

```sh
pnpm install --frozen-lockfile --ignore-scripts
ADMIN_PASSWORD='use-a-long-unique-secret' npm start
```

Open `http://localhost:3000`. Firebase Email Link sends verification links. Optional owner notifications use `RESEND_API_KEY` and `RESEND_FROM`; see `.env.example`. Never commit real secrets.

## Routes

`/`, `/subjects`, `/lectures`, `/advising`, `/official`, `/developer`, `/profile`, `/admin`.

## Optional Firebase App Hosting

Render remains the active public deployment. Firebase App Hosting configuration is optional and is only needed if the owner chooses to move hosts; doing so requires billing configuration. The project is prepared for Firebase App Hosting (`apphosting.yaml`). App Hosting serves the existing Node application and static site together; the Admin SDK uses Google Application Default Credentials, and site edits and verified account data persist in Firestore. No Render service-account key is needed. The build creates `public/firebase-config.json` from App Hosting's `FIREBASE_WEBAPP_CONFIG`; it is a public browser config, is ignored by Git, and must never contain private keys.

To use App Hosting, enable the Firebase **Blaze** billing plan, connect this GitHub repository and its `main` branch under Firebase App Hosting, and choose `europe-west4` for the backend. Add the secrets `capital-science-admin-password` and `capital-science-resend-api-key` in Google Secret Manager before the first rollout; App Hosting needs access to both secrets. Then deploy and test the `*.hosted.app` URL. App Hosting requires a billing account; it has included usage limits, but usage beyond them can be billed. Firebase's own documentation recommends a Cloud Run spend cap and budget alerts. Keep Render running until the Firebase URL, account flow, and admin CRUD have been verified; only then switch the public domain.

Enable Email/Password and Email Link in Firebase Auth, and authorize the Render domain. Google and SMS require provider setup; SMS verification can incur charges. Version 2 intentionally clears old local-only profile cookies once but leaves Firebase accounts and Firestore profiles intact. Owner notices require Resend; reliable sending to arbitrary recipients requires a verified sender domain. Never commit service-account keys, Resend keys, or student data. See [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for full setup and limitations.

## Drive sync

Lecture files come from three public Google Drive folders (the year roots in `YEAR_ROOTS`, `scripts/update-drive-catalog.py`). They are mirrored into `data/drive-catalog.json`, which `/api/site` reads on every request. Render's disk is temporary, so the only way to publish a new catalog is a commit to `main`, which Render deploys automatically.

### Pieces

| Piece | What it does |
|---|---|
| `scripts/update-drive-catalog.py` | Crawls the 3 roots (4 folders at a time, same breadth-first order every run), keeps a folder's previous subtree when Drive fails to list it ("stale"), writes a JSON report, and rewrites the catalog only when the set of `(id, parentId, title, type, url)` changed. Flags: `--dry-run`, `--report PATH`, `--candidate PATH`, `--allow-removals`, `--allow-large`. Exit `0` ok, `2` a gate failed, `1` crash. |
| `scripts/validate-catalog.py` | The gates: valid JSON array, the 3 fixed roots in order, unique ids, every `parentId` exists and leads to a root, nothing from the removed 2025 source, a year may lose at most max(10 rows, 3%) without `--allow-removals`, at most 400 new rows without `--allow-large`, no empty year. Usable alone: `python3 scripts/validate-catalog.py data/drive-catalog.json`. |
| `scripts/tests/` | `python3 -m unittest discover -s scripts/tests` (stdlib only, no network). |
| `.github/workflows/drive-sync.yml` | Runs the tests, checks the pause flag, crawls, commits only `data/drive-catalog.json` as `sync: +N -M (UTC time)` when there is a real change, keeps the report and candidate as artifacts for 14 days, and posts the report to the site. Manual runs default to dry run. The schedule (03:00, 11:00, 19:00 UTC) is **commented out** until the owner turns it on. |
| `POST /api/sync/report`, `GET /api/sync/state` | Called by the workflow with `Authorization: Bearer $SYNC_REPORT_TOKEN`. Reports go to Firestore `syncRuns/{runId}` (newest 100 kept) and `syncState/latest`. |
| `/api/admin/sync/status`, `/run`, `/pause` | Behind the admin session. `run` triggers the workflow through the GitHub API with `GITHUB_DISPATCH_TOKEN` (never sent to the browser). Every state-changing call needs a same-origin `Origin` header and is written to Firestore `audit`. |
| Dashboard tab "مزامنة Drive" | Last run, next run, counts, additions, removals, moves, stale folders, gate failures in Arabic, the last 20 runs, and the buttons Run now / Dry-run / Pause. |

### Setup

1. **Report token.** Generate one value and store it in two places:
   ```sh
   openssl rand -hex 32
   ```
   - Render → the service → Environment → `SYNC_REPORT_TOKEN`
   - GitHub → the repository → Settings → Secrets and variables → Actions → New repository secret → `SYNC_REPORT_TOKEN`
2. **Dispatch token** (for the dashboard's Run buttons). On GitHub go to Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
   - Resource owner: `Morfi28i`.
   - Repository access: *Only select repositories* → `capital-science-faculty`.
   - Repository permissions: **Actions: Read and write** (Metadata read-only is added automatically).
   - Expiration: up to one year; put the expiry date in your calendar.
   - Save it in Render as `GITHUB_DISPATCH_TOKEN`. It is never needed in GitHub secrets.
3. **Repository name.** Set `GITHUB_REPO=Morfi28i/capital-science-faculty` in Render (already declared in `render.yaml`).
4. Optional: a repository *variable* `SITE_URL` if the site moves (default `https://capital-science-faculty.onrender.com`).
5. If `main` ever gets branch protection that blocks direct pushes, the workflow's push (made with the built-in `GITHUB_TOKEN`) will fail. Allow GitHub Actions to push, or switch the workflow to opening a pull request.

Which secret goes where:

| Name | Render env | GitHub secret |
|---|---|---|
| `SYNC_REPORT_TOKEN` | yes | yes (same value) |
| `GITHUB_DISPATCH_TOKEN` | yes | no |
| `GITHUB_REPO` | yes | no |
| `GITHUB_TOKEN` | no | automatic, nothing to create |

### First runs

1. GitHub → Actions → **Drive sync** → Run workflow, with *dry run* left checked. Check the job log, the `drive-sync-…` artifact, and the dashboard tab.
2. Check that the crawler got real folder listings from GitHub's servers: the report must show rows and no flood of "stale" folders. If Drive refuses GitHub's IP addresses, the run stops at the `empty_year` gate and nothing is written.
3. Run once with *dry run* unchecked. If Drive changed, a `sync:` commit appears on `main`, and Render should start a deploy within a minute.
4. Only after that, enable the schedule by removing the `#` in front of `schedule:` and the `cron` line in `.github/workflows/drive-sync.yml`.

### Pause and roll back

- **Pause:** dashboard → مزامنة Drive → إيقاف مؤقت. Scheduled and manual runs then exit right after the pause check.
- **Roll back a sync:** pause first, otherwise the next run brings the same Drive state back. Then revert the sync commit and push:
  ```sh
  git revert <sync-commit-sha>
  git push origin main
  ```
  Render redeploys the previous catalog. Resume the sync after the cause is fixed on Drive.
- Secrets and tokens must never be committed, printed in logs or pasted into issues. The workflow only reads them from `secrets.*`.
