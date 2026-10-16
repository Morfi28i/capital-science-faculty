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
| `scripts/validate-catalog.py` | The gates: valid JSON array, the 3 fixed roots in order, unique ids, every `parentId` exists and leads to a root, nothing from the removed 2025 source, deletions and additions on Drive are mirrored automatically; only a year losing more than half its rows at once (needs `--allow-removals`) or more than 3000 new rows (needs `--allow-large`) is treated as a Drive glitch and stopped, no empty year. Usable alone: `python3 scripts/validate-catalog.py data/drive-catalog.json`. |
| `scripts/tests/` | `python3 -m unittest discover -s scripts/tests` (stdlib only, no network). |
| `.github/workflows/drive-sync.yml` | A quick check every 15 minutes (minutes 4, 19, 34, 49). It runs a full sync when the last successful one (`syncState/latest.lastSyncAt`) is 8 hours old, or a run requested from the dashboard, and otherwise exits in seconds. Because GitHub delays or drops scheduled runs, the next check that fires catches up. A run tests, crawls, commits only `data/drive-catalog.json` as `sync: +N -M (UTC time)` when there is a real change, keeps the report and candidate as artifacts for 14 days, and posts the report to the site. Manual runs from GitHub default to dry run. |
| `POST /api/sync/report`, `GET /api/sync/state`, `POST /api/sync/claim` | Called by the workflow with its GitHub OIDC token as `Authorization: Bearer …`. `claim` takes a queued dashboard request exactly once. Reports go to Firestore `syncRuns/{runId}` (newest 100 kept) and `syncState/latest`. |
| `/api/admin/sync/status`, `/run`, `/pause` | Behind the admin session. `run` triggers the workflow through the GitHub API with `GITHUB_DISPATCH_TOKEN` (never sent to the browser). Every state-changing call needs a same-origin `Origin` header and is written to Firestore `audit`. |
| Dashboard tab "مزامنة Drive" | Last run, next run, counts, additions, removals, moves, stale folders, gate failures in Arabic, the last 20 runs, and the buttons Run now / Dry-run / Pause. |

### Setup

The workflow proves who it is with a **GitHub OIDC token** (`permissions: id-token: write`). The site verifies its signature against GitHub's public keys and accepts only tokens for this repository, the `drive-sync.yml` workflow and the `main` branch, with audience `capital-science-faculty-sync`. Reports and the pause flag therefore need **no secret in Render or GitHub**.

Optional:

| Name | Where | What it does |
|---|---|---|
| GitHub token for the Run buttons | Dashboard → مزامنة Drive → ربط GitHub (or `GITHUB_DISPATCH_TOKEN` in Render env) | Optional: makes the dashboard's Run buttons start the workflow at once instead of at the next hourly check. A token pasted in the dashboard is checked against GitHub, then stored server-side in Firestore `syncSecrets/github` and never sent back to a browser. Without one, the buttons queue the run in Firestore `syncState/latest.runRequest` and it starts at the next hourly check (cancel it from the dashboard). Create a fine-grained token: Settings → Developer settings → Personal access tokens → Fine-grained → *Only select repositories* → `capital-science-faculty` → **Actions: Read and write**. |
| `GITHUB_REPO` | Render env | Defaults to `Morfi28i/capital-science-faculty`; set it only if the repository moves. |
| `SYNC_REPORT_TOKEN` | Render env + GitHub secret | An alternative shared secret the server also accepts; not needed with OIDC. |
| `SITE_URL` | GitHub repository variable | Only if the site moves from `https://capital-science-faculty.onrender.com`. |

If `main` ever gets branch protection that blocks direct pushes, the workflow's push (made with the built-in `GITHUB_TOKEN`) will fail. Allow GitHub Actions to push, or switch the workflow to opening a pull request.

### First runs

1. GitHub → Actions → **Drive sync** → Run workflow (or the dashboard buttons), with *dry run* left checked. Check the job log, the `drive-sync-…` artifact, and the dashboard tab.
2. Check that the crawler got real folder listings from GitHub's servers: the report must show rows and no flood of "stale" folders. If Drive refuses GitHub's IP addresses, the run stops at the `empty_year` gate and nothing is written.
3. Run once with *dry run* unchecked. If Drive changed, a `sync:` commit appears on `main`, and Render should start a deploy within a minute.
4. The schedule is on (since 2026-10-16). To stop it for a while, use Pause in the dashboard.

### Scheduling notes

- The repository is **public** (since 2026-10-16) because GitHub did not fire scheduled runs for it while it was private on a free account. Public repositories also have unlimited Actions minutes. The full history was checked before the switch: no keys, credentials or student data were ever committed.
- GitHub's `schedule` is best-effort: runs often start 10–45 minutes late and can occasionally be skipped. A push to `main` re-syncs the schedule if it stops.
- In public repositories GitHub disables scheduled workflows after 60 days without any repository activity. If Drive does not change for two months, re-enable the workflow from the Actions tab (GitHub emails a warning first).

### Pause and roll back

- **Pause:** dashboard → مزامنة Drive → إيقاف مؤقت. Scheduled and manual runs then exit right after the pause check.
- **Roll back a sync:** pause first, otherwise the next run brings the same Drive state back. Then revert the sync commit and push:
  ```sh
  git revert <sync-commit-sha>
  git push origin main
  ```
  Render redeploys the previous catalog. Resume the sync after the cause is fixed on Drive.
- Secrets and tokens must never be committed, printed in logs or pasted into issues. The workflow only reads them from `secrets.*`.
