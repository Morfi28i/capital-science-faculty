import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const root = process.cwd(),
  dbPath = path.join(root, 'data/site.json'),
  driveCatalogPath = path.join(root, 'data/drive-catalog.json');
const emailCheckRate = new Map(),
  contactCheckRate = new Map(),
  adminLoginRate = new Map();
// Rate-limit buckets live in memory; prune expired entries so they cannot grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const bucket of [emailCheckRate, contactCheckRate, adminLoginRate])
    for (const [key, times] of bucket) {
      const recent = times.filter((time) => now - time < 60 * 60_000);
      if (recent.length) bucket.set(key, recent);
      else bucket.delete(key);
    }
}, 10 * 60_000).unref();
await mkdir(path.join(root, 'uploads'), { recursive: true });
await mkdir(path.join(root, 'public', 'uploads'), { recursive: true });
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json',
};
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
const json = (res, code, obj) => {
  res.writeHead(code, {
    ...securityHeaders,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(obj));
};
const httpError = (status, message) => Object.assign(new Error(message), { status });
async function body(req, limit = 2_000_000) {
  let b = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > limit) throw Error('Request too large');
    b.push(c);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(b).toString() || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw httpError(400, 'Request body must be a JSON object.');
  }
}
const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0]
    .trim();
// Allow a request only when its rolling one-hour window still has room.
function withinRate(bucket, key, max, windowMs = 60 * 60_000) {
  const now = Date.now(),
    times = (bucket.get(key) || []).filter((time) => now - time < windowMs);
  if (times.length >= max) return false;
  times.push(now);
  bucket.set(key, times);
  return true;
}
// Browsers send Origin on cross-site POST/PUT/DELETE. Rejecting a foreign Origin blocks CSRF
// even if a SameSite cookie is relaxed by an older browser.
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
// Stricter variant for new state-changing endpoints: the Origin header must be present and match the host.
function strictSameOrigin(req) {
  try {
    return Boolean(req.headers.origin) && new URL(req.headers.origin).host === req.headers.host;
  } catch {
    return false;
  }
}

// ---------- Drive sync (GitHub Actions workflow ⇄ site) ----------
const SYNC_WORKFLOW = 'drive-sync.yml';
const SYNC_SCHEDULE_HOURS_UTC = [3, 11, 19];
const SYNC_RUNS_KEPT = 100;
const SYNC_LIST_LIMIT = 25;
const syncBuckets = ['added', 'removed', 'renamed', 'moved', 'changed'];
const digest = (value) => crypto.createHash('sha256').update(String(value)).digest();
// Bearer-token check for the workflow's calls; compares fixed-length digests in constant time.
const syncRepo = () =>
  /^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_REPO || '')
    ? process.env.GITHUB_REPO
    : 'Morfi28i/capital-science-faculty';
// GitHub Actions can mint a signed OIDC token for each run. Verifying it against GitHub's public keys
// proves the call comes from this repository's drive-sync workflow on main, with no shared secret.
const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
const SYNC_OIDC_AUDIENCE = 'capital-science-faculty-sync';
let githubKeys = { at: 0, keys: [] };
async function githubJwks(force = false) {
  if (!force && githubKeys.keys.length && Date.now() - githubKeys.at < 60 * 60_000) return githubKeys.keys;
  const response = await fetch(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`GitHub JWKS returned HTTP ${response.status}`);
  githubKeys = { at: Date.now(), keys: (await response.json()).keys || [] };
  return githubKeys.keys;
}
async function githubOidcValid(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  let header, claims;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  if (header.alg !== 'RS256' || !header.kid) return false;
  let jwk = (await githubJwks()).find((key) => key.kid === header.kid);
  if (!jwk) jwk = (await githubJwks(true)).find((key) => key.kid === header.kid);
  if (!jwk) return false;
  const signed = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    crypto.createPublicKey({ key: jwk, format: 'jwk' }),
    Buffer.from(parts[2], 'base64url'),
  );
  const now = Math.floor(Date.now() / 1000),
    repo = syncRepo(),
    audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  return (
    signed &&
    claims.iss === GITHUB_OIDC_ISSUER &&
    audiences.includes(SYNC_OIDC_AUDIENCE) &&
    claims.repository === repo &&
    claims.ref === 'refs/heads/main' &&
    String(claims.workflow_ref || '').startsWith(`${repo}/.github/workflows/${SYNC_WORKFLOW}@`) &&
    Number(claims.exp) > now - 30 &&
    Number(claims.nbf || 0) <= now + 30
  );
}
// The workflow proves itself with a GitHub OIDC token; SYNC_REPORT_TOKEN remains an optional alternative.
async function syncCallerValid(req) {
  const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!given) return false;
  const expected = process.env.SYNC_REPORT_TOKEN;
  if (expected && crypto.timingSafeEqual(digest(given), digest(expected))) return true;
  try {
    return await githubOidcValid(given);
  } catch (error) {
    console.error('GitHub OIDC check failed:', error.message);
    return false;
  }
}
const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');
const int = (value, max = 1_000_000) => (Number.isInteger(value) && value >= 0 && value <= max ? value : 0);
const isoText = (value) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value.slice(0, 40) : null;
function syncItem(item) {
  if (!item || typeof item !== 'object') return null;
  const clean = {
    id: text(item.id, 80),
    title: text(item.title, 200),
    type: item.type === 'folder' ? 'folder' : 'file',
    note: text(item.note, 300),
  };
  if (typeof item.from === 'string') clean.from = text(item.from, 200);
  if (typeof item.fromNote === 'string') clean.fromNote = text(item.fromNote, 300);
  return clean.id ? clean : null;
}
// Validate and bound a report posted by the workflow. Returns null when the shape is wrong.
function cleanSyncReport(raw) {
  if (!raw || typeof raw !== 'object' || raw.schemaVersion !== 1) return null;
  const status = ['paused', 'skipped', 'success', 'failure'].includes(raw.status) ? raw.status : null;
  const mode = ['dry-run', 'write'].includes(raw.mode) ? raw.mode : null;
  const runId = text(raw.runId, 80).replace(/[^A-Za-z0-9_-]/g, '-');
  if (!status || !mode || !runId) return null;
  const years = {};
  for (const [category, year] of Object.entries(
    raw.years && typeof raw.years === 'object' ? raw.years : {},
  ).slice(0, 6)) {
    if (!/^\d{4}\/\d{4}$/.test(category) || !year || typeof year !== 'object') continue;
    const counts = {};
    for (const name of syncBuckets) counts[name] = int(year.counts?.[name]);
    const clean = { before: int(year.before), after: int(year.after), counts };
    for (const name of syncBuckets)
      clean[name] = (Array.isArray(year[name]) ? year[name] : [])
        .slice(0, SYNC_LIST_LIMIT)
        .map(syncItem)
        .filter(Boolean);
    clean.stale = (Array.isArray(year.stale) ? year.stale : []).slice(0, SYNC_LIST_LIMIT).map((s) => ({
      id: text(s?.id, 80),
      note: text(s?.note, 300),
      reason: text(s?.reason, 200),
      kept: int(s?.kept),
    }));
    clean.problems = (Array.isArray(year.problems) ? year.problems : [])
      .slice(0, SYNC_LIST_LIMIT)
      .map((p) => text(p, 300));
    years[category] = clean;
  }
  const totals = {};
  for (const name of [...syncBuckets, 'stale']) totals[name] = int(raw.totals?.[name]);
  return {
    runId,
    runUrl:
      typeof raw.runUrl === 'string' && raw.runUrl.startsWith('https://github.com/')
        ? text(raw.runUrl, 200)
        : null,
    trigger: text(raw.trigger, 40) || 'unknown',
    status,
    mode,
    startedAt: isoText(raw.startedAt),
    finishedAt: isoText(raw.finishedAt),
    durationSec: int(raw.durationSec, 86_400),
    ok: raw.ok === true,
    changed: raw.changed === true,
    wrote: raw.wrote === true,
    commit: typeof raw.commit === 'string' && /^[0-9a-f]{7,40}$/.test(raw.commit) ? raw.commit : null,
    rows: { before: int(raw.rows?.before), after: int(raw.rows?.after) },
    totals,
    gates: (Array.isArray(raw.gates) ? raw.gates : []).slice(0, 20).map((g) => ({
      code: text(g?.code, 40).replace(/[^a-z_]/g, ''),
      message: text(g?.message, 300),
      details: (Array.isArray(g?.details) ? g.details : []).slice(0, 10).map((d) => text(String(d), 200)),
    })),
    years,
  };
}
// Summary of a run without the per-item lists, for the history table and syncState/latest.
const syncRunSummary = (run) => {
  const { years, ...rest } = run;
  return { ...rest, gateCodes: run.gates.map((g) => g.code) };
};
function nextSyncRun(now = new Date()) {
  for (let day = 0; day < 2; day++)
    for (const hour of SYNC_SCHEDULE_HOURS_UTC) {
      const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + day, hour));
      if (at > now) return at.toISOString();
    }
  return null;
}
const firestoreTime = (value) => (value?.toDate ? value.toDate().toISOString() : value || null);
// The GitHub token for the dashboard's Run buttons: GITHUB_DISPATCH_TOKEN in the environment, or one the
// admin pasted into the dashboard (Firestore syncSecrets/github, server-only, never sent back to a browser).
let dashboardToken = { at: 0, value: null };
async function dispatchToken() {
  if (process.env.GITHUB_DISPATCH_TOKEN) return { token: process.env.GITHUB_DISPATCH_TOKEN, source: 'env' };
  if (!firebaseConfigured()) return { token: null, source: null };
  if (Date.now() - dashboardToken.at > 5 * 60_000) {
    const doc = await firebase().db.collection('syncSecrets').doc('github').get();
    dashboardToken = { at: Date.now(), value: doc.exists ? doc.data() : null };
  }
  const saved = dashboardToken.value;
  return saved?.token
    ? { token: saved.token, source: 'dashboard', last4: saved.last4 }
    : { token: null, source: null };
}
const githubHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'capital-science-faculty',
  'Content-Type': 'application/json',
});
// Record dashboard actions that change sync behaviour. Never blocks the action itself.
async function audit(req, action, detail = {}) {
  try {
    await firebase()
      .db.collection('audit')
      .add({ action, ip: clientIp(req), at: FieldValue.serverTimestamp(), ...detail });
  } catch (error) {
    console.error('Audit log write failed:', error.message);
  }
}

const readLocalDB = async () => JSON.parse(await readFile(dbPath, 'utf8'));
const siteContentRef = () => firebase().db.collection('site').doc('content');
async function readDB() {
  if (!firebaseConfigured()) return readLocalDB();
  const ref = siteContentRef(),
    snapshot = await ref.get();
  if (snapshot.exists) return snapshot.data();
  // Seed Firestore once from the checked-in catalog. Transactions prevent two
  // cold starts from overwriting an edit made during the first request.
  const initial = await readLocalDB();
  return firebase().db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    if (current.exists) return current.data();
    tx.set(ref, initial);
    return initial;
  });
}
async function saveDB(d) {
  if (firebaseConfigured()) {
    await siteContentRef().set(d);
    return;
  }
  await writeFile(dbPath, JSON.stringify(d, null, 2));
}
const emailNotificationsEnabled = () => Boolean(process.env.RESEND_API_KEY);
// The generated config only changes at build time, so read it once instead of on every request.
let generatedWebConfig;
function firebaseWebConfig() {
  if (generatedWebConfig === undefined) {
    try {
      generatedWebConfig = JSON.parse(
        readFileSync(path.join(root, 'public', 'firebase-config.json'), 'utf8'),
      );
    } catch {
      generatedWebConfig = {};
    }
  }
  const generated = generatedWebConfig;
  let appHosting = {};
  try {
    appHosting = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG || '{}');
  } catch {}
  const project = { ...generated, ...appHosting };
  return {
    apiKey: project.apiKey || process.env.FIREBASE_API_KEY,
    authDomain: project.authDomain || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: project.projectId || process.env.FIREBASE_PROJECT_ID,
    appId: project.appId || process.env.FIREBASE_APP_ID,
    messagingSenderId: project.messagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID,
  };
}
const firebaseServiceAccountFile = () =>
  process.env.FIREBASE_SERVICE_ACCOUNT_FILE || '/etc/secrets/firebase-service-account.json';
const firebaseCredentialsAvailable = () =>
  Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
  existsSync(firebaseServiceAccountFile()) ||
  Boolean(process.env.FIREBASE_CONFIG) ||
  Boolean(process.env.K_SERVICE);
const firebaseConfigured = () =>
  Object.values(firebaseWebConfig()).every(Boolean) && firebaseCredentialsAvailable();
function firebase() {
  if (!firebaseConfigured()) throw new Error('Firebase is not fully configured.');
  let app = getApps()[0];
  if (!app) {
    let projectId = process.env.FIREBASE_PROJECT_ID || '';
    try {
      projectId = projectId || JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId || '';
    } catch {}
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || existsSync(firebaseServiceAccountFile())) {
      let serviceAccount;
      try {
        serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
          : JSON.parse(readFileSync(firebaseServiceAccountFile(), 'utf8'));
      } catch {
        throw new Error('Firebase Admin service-account secret must contain valid JSON.');
      }
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id,
      });
    } else app = initializeApp({ credential: applicationDefault(), ...(projectId ? { projectId } : {}) });
  }
  return { auth: getAuth(app), db: getFirestore(app) };
}
async function verifiedFirebaseUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Sign in to continue.'), { status: 401 });
  const { auth } = firebase();
  return auth.verifyIdToken(token, true);
}
const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
async function sendRegistrationEmail(profile, isUpdate = false, photoAttachment = null, changedFields = []) {
  const isDataPicture = String(profile.picture || '').startsWith('data:image/');
  const picture = isDataPicture
    ? ''
    : escapeHtml(
        String(profile.picture || '').startsWith('/avatars/')
          ? new URL(
              profile.picture,
              process.env.PUBLIC_URL || 'https://capital-science-faculty.onrender.com',
            ).toString()
          : profile.picture,
      );
  const pictureDescription = isDataPicture ? 'Attached to this email' : profile.picture || 'Not supplied';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: ['essamsidek123@gmail.com'],
      subject: isUpdate
        ? 'Capital Science Faculty profile updated'
        : 'New Capital Science Faculty registration',
      text: `${isUpdate ? 'Profile update' : 'New registration'}\nAccount ID: ${profile.id}\nFirst name: ${profile.firstName || ''}\nFather's name: ${profile.fatherName || ''}\nFamily name: ${profile.lastName || ''}\nFull name: ${profile.name}\nEmail: ${profile.email || 'Not supplied'}\nPhone: ${profile.phone || 'Not supplied'}\nGender: ${profile.gender}\nPicture: ${pictureDescription}${isUpdate ? `\nChanged values: ${changedFields.join(', ') || 'None'}` : ''}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#24362c"><h2>${isUpdate ? 'Student profile updated' : 'New student registration'}</h2>${isUpdate ? `<p><b>Changed values:</b> ${escapeHtml(changedFields.join(', ') || 'None')}</p>` : ''}<p><b>Account ID:</b> ${escapeHtml(profile.id)}</p><p><b>First name:</b> ${escapeHtml(profile.firstName || '')}</p><p><b>Father’s name:</b> ${escapeHtml(profile.fatherName || '')}</p><p><b>Family name:</b> ${escapeHtml(profile.lastName || '')}</p><p><b>Full name:</b> ${escapeHtml(profile.name)}</p><p><b>Email:</b> ${escapeHtml(profile.email || 'Not supplied')}</p><p><b>Phone:</b> ${escapeHtml(profile.phone || 'Not supplied')}</p><p><b>Gender:</b> ${escapeHtml(profile.gender)}</p><p><b>Profile picture:</b> ${isDataPicture ? 'Attached to this email' : picture ? `<a href="${picture}">View portrait</a>` : 'Not supplied'}</p></div>`,
      ...(photoAttachment ? { attachments: [photoAttachment] } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(
      `Email provider returned HTTP ${response.status}${result.message ? `: ${result.message}` : ''}`,
    );
  }
  return response.json();
}
async function sendManagedEmail(to, subject, message) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: [to],
      subject: subject.slice(0, 180),
      text: message.slice(0, 10000),
      html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(message.slice(0, 10000))}</div>`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`);
  return response.json();
}
const ADMIN_SESSION_MS = 8 * 60 * 60_000;
// A dedicated secret lets the admin password rotate without being the signing key.
const adminSigningKey = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
function signAdminToken(token) {
  return crypto.createHmac('sha256', adminSigningKey()).update(token).digest('hex');
}
function session(req) {
  const c = req.headers.cookie || '';
  const m = c.match(/(?:^|; )admin_session=([^;]+)/);
  if (!m || !process.env.ADMIN_PASSWORD) return null;
  const [token, issued, signature] = m[1].split('.');
  if (!token || !issued || !signature) return null;
  if (!(Date.now() - Number(issued) < ADMIN_SESSION_MS)) return null;
  const expected = signAdminToken(`${token}.${issued}`);
  const a = Buffer.from(signature),
    b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? token : null;
}
const secureCookie = () => (process.env.NODE_ENV === 'production' || process.env.K_SERVICE ? '; Secure' : '');
const contentFields = [
  'title',
  'titleAr',
  'titleEn',
  'url',
  'category',
  'categoryEn',
  'note',
  'noteEn',
  'kind',
];
// Store only known content fields so a dashboard edit cannot smuggle arbitrary data into the site JSON.
function cleanContentItem(item, existing = {}) {
  const clean = { ...existing };
  for (const key of contentFields) {
    if (!(key in item)) continue;
    const value = String(item[key] ?? '').trim();
    if (value) clean[key] = value.slice(0, key === 'url' ? 2000 : key.startsWith('note') ? 600 : 180);
    else delete clean[key];
  }
  if (!['whatsapp', 'facebook', 'telegram', 'drive', 'link'].includes(clean.kind)) clean.kind = 'link';
  return clean;
}
function safeUrl(u) {
  try {
    const x = new URL(u);
    return ['https:', 'http:'].includes(x.protocol);
  } catch {
    return false;
  }
}
async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/firebase-config')
    return json(res, 200, {
      enabled: firebaseConfigured(),
      firebase: firebaseConfigured() ? firebaseWebConfig() : null,
    });
  if (req.method === 'POST' && url.pathname === '/api/auth/check-email') {
    try {
      if (!firebaseConfigured()) return json(res, 503, { error: 'Email verification is unavailable.' });
      const d = await body(req, 12000),
        email = String(d.email || '')
          .trim()
          .toLowerCase(),
        ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
          .split(',')[0]
          .trim(),
        now = Date.now(),
        checks = (emailCheckRate.get(ip) || []).filter((time) => now - time < 60 * 60_000);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return json(res, 400, { error: 'Enter a valid email address.' });
      if (checks.length >= 15)
        return json(res, 429, { error: 'Too many checks. Please wait before trying again.' });
      checks.push(now);
      emailCheckRate.set(ip, checks);
      try {
        await firebase().auth.getUserByEmail(email);
        return json(res, 200, { exists: true });
      } catch (error) {
        if (error.code === 'auth/user-not-found') return json(res, 200, { exists: false });
        throw error;
      }
    } catch (error) {
      return json(res, error.status || 500, {
        error: error.status ? error.message : 'Could not check this email address.',
      });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/check-contact') {
    try {
      if (!firebaseConfigured()) return json(res, 503, { error: 'Contact verification is unavailable.' });
      const decoded = await verifiedFirebaseUser(req),
        d = await body(req, 12000),
        email = String(d.email || '')
          .trim()
          .toLowerCase(),
        phone = String(d.phone || '').trim(),
        ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
          .split(',')[0]
          .trim(),
        now = Date.now(),
        times = (contactCheckRate.get(ip) || []).filter((time) => now - time < 60 * 60_000);
      if (times.length >= 20)
        return json(res, 429, { error: 'Too many checks. Please wait before trying again.' });
      times.push(now);
      contactCheckRate.set(ip, times);
      if (email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          return json(res, 400, { error: 'Enter a valid email address.' });
        try {
          const found = await firebase().auth.getUserByEmail(email);
          if (found.uid !== decoded.uid)
            return json(res, 409, { error: 'This email is already linked to another account.' });
          return json(res, 200, { ok: true, available: true });
        } catch (error) {
          if (error.code === 'auth/user-not-found') return json(res, 200, { ok: true, available: true });
          throw error;
        }
      }
      if (!/^\+[1-9]\d{7,14}$/.test(phone))
        return json(res, 400, { error: 'Enter a valid international phone number.' });
      try {
        const found = await firebase().auth.getUserByPhoneNumber(phone);
        if (found.uid !== decoded.uid)
          return json(res, 409, { error: 'This phone number is already linked to another account.' });
        return json(res, 200, { ok: true, available: true });
      } catch (error) {
        if (error.code === 'auth/user-not-found') return json(res, 200, { ok: true, available: true });
        throw error;
      }
    } catch (error) {
      return json(res, error.status || 401, {
        error: error.status ? error.message : 'Could not check this contact value.',
      });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/site') {
    const db = await readDB();
    let driveFiles = [];
    try {
      driveFiles = JSON.parse(await readFile(driveCatalogPath, 'utf8'));
    } catch {
      driveFiles = db.lectures || [];
    }
    // Year roots come from the Drive catalog with fixed names and order (see scripts/update-drive-catalog.py).
    // A dashboard lecture entry that points at one of those roots is the same folder, so it is not listed twice.
    const rootUrls = new Set(
      driveFiles
        .filter((item) => item.type === 'folder' && ['المجلد الرئيسي', 'Year root'].includes(item.note))
        .map((item) => item.url),
    );
    const mergedRoots = new Set(
      (db.lectures || []).filter((item) => rootUrls.has(item.url)).map((item) => item.id),
    );
    const extraLectures = (db.lectures || []).filter(
      (item) => !Array.isArray(item.folders) && !mergedRoots.has(item.id),
    );
    driveFiles.push(
      ...extraLectures.map((item) => ({
        ...item,
        id: item.id || item.url,
        type: 'file',
        file: true,
        categoryEn: item.categoryEn || item.category || '',
      })),
    );
    return json(res, 200, {
      ...db,
      driveFiles,
      emailNotificationsEnabled: emailNotificationsEnabled(),
      firebaseAuthEnabled: firebaseConfigured(),
      contentStoragePersistent: firebaseConfigured(),
      // Firebase SMS needs the paid Blaze plan; keep phone sign-in hidden unless explicitly enabled.
      phoneAuthEnabled: firebaseConfigured() && process.env.PHONE_AUTH_ENABLED === 'true',
    });
  }
  if (url.pathname.startsWith('/api/firebase/')) {
    if (!firebaseConfigured())
      return json(res, 503, {
        error: 'Firebase is not configured. Connect the Firebase web app and Admin SDK credentials.',
      });
    try {
      const decoded = await verifiedFirebaseUser(req),
        { db } = firebase(),
        ref = db.collection('users').doc(decoded.uid);
      if (req.method === 'GET' && url.pathname === '/api/firebase/profile') {
        const snap = await ref.get();
        return json(res, 200, { profile: snap.exists ? snap.data() : null });
      }
      if (req.method === 'GET' && url.pathname === '/api/firebase/messages') {
        const snap = await ref.collection('messages').orderBy('createdAt', 'desc').limit(100).get();
        return json(res, 200, { messages: snap.docs.map((x) => ({ id: x.id, ...x.data() })) });
      }
      const readMessage = url.pathname.match(/^\/api\/firebase\/messages\/([A-Za-z0-9_-]+)\/read$/);
      if (req.method === 'POST' && readMessage) {
        const message = ref.collection('messages').doc(readMessage[1]);
        if (!(await message.get()).exists) return json(res, 404, { error: 'Message not found.' });
        await message.update({ readAt: FieldValue.serverTimestamp() });
        return json(res, 200, { ok: true });
      }
      if (
        (req.method === 'POST' &&
          ['/api/firebase/register', '/api/firebase/profile'].includes(url.pathname)) ||
        (req.method === 'PUT' && url.pathname === '/api/firebase/profile')
      ) {
        if (!decoded.email_verified && !decoded.phone_number)
          return json(res, 403, { error: 'Verify your email or phone before saving a profile.' });
        const d = await body(req, 5_000_000);
        if (!String(d.name || '').trim() || !['male', 'female', 'other'].includes(d.gender))
          return json(res, 400, { error: 'Please complete your name and gender.' });
        const picture = String(d.picture || '').slice(0, 700_000);
        if (
          picture &&
          !(
            /^\/avatars\/art-(0[1-9]|10)\.svg$/.test(picture) ||
            /^data:image\/(png|jpeg|webp);base64,/.test(picture) ||
            /^https:\/\//.test(picture)
          )
        )
          return json(res, 400, { error: 'Unsupported profile image.' });
        const before = await ref.get(),
          profile = {
            id: decoded.uid,
            name: String(d.name).trim().slice(0, 160),
            firstName: String(d.firstName || '')
              .trim()
              .slice(0, 60),
            fatherName: String(d.fatherName || '')
              .trim()
              .slice(0, 60),
            lastName: String(d.lastName || '')
              .trim()
              .slice(0, 60),
            gender: d.gender,
            email: decoded.email || null,
            phone: decoded.phone_number || null,
            picture,
            providers: decoded.firebase?.sign_in_provider ? [decoded.firebase.sign_in_provider] : [],
            createdAt: before.exists ? before.get('createdAt') : FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
        const changedFields = before.exists
          ? ['name', 'firstName', 'fatherName', 'lastName', 'gender', 'email', 'phone', 'picture'].filter(
              (key) => String(before.get(key) || '') !== String(profile[key] || ''),
            )
          : [];
        await ref.set(profile, { merge: true });
        let emailSent = false;
        if ((!before.exists || changedFields.length) && emailNotificationsEnabled()) {
          try {
            let photoAttachment = null;
            const match = profile.picture.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
            if (match) {
              const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
              photoAttachment = { filename: `student-profile.${ext}`, content: match[2] };
            }
            await sendRegistrationEmail(profile, before.exists, photoAttachment, changedFields);
            emailSent = true;
          } catch (error) {
            console.error('Profile notification email failed:', error.message);
          }
        }
        return json(res, before.exists ? 200 : 201, {
          ok: true,
          emailSent,
          profile: { ...profile, createdAt: undefined, updatedAt: undefined },
        });
      }
    } catch (error) {
      return json(res, error.status || 401, {
        error: error.status ? error.message : 'Firebase authentication failed.',
      });
    }
  }
  // Machine endpoints for the Drive sync workflow: Bearer SYNC_REPORT_TOKEN, no cookies, no browser access.
  if (url.pathname.startsWith('/api/sync/')) {
    if (!(await syncCallerValid(req))) return json(res, 401, { error: 'Invalid sync credentials.' });
    if (req.method === 'POST' && url.pathname === '/api/sync/report') {
      const run = cleanSyncReport(await body(req, 200_000));
      if (!run) return json(res, 400, { error: 'Report does not match the expected schema.' });
      if (!firebaseConfigured()) return json(res, 503, { error: 'Firebase is not configured.' });
      const { db } = firebase();
      await db
        .collection('syncRuns')
        .doc(run.runId)
        .set({ ...run, receivedAt: FieldValue.serverTimestamp() });
      await db
        .collection('syncState')
        .doc('latest')
        .set({ lastRun: syncRunSummary(run), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      // Keep only the newest runs so the collection stays small.
      const old = await db
        .collection('syncRuns')
        .orderBy('receivedAt', 'desc')
        .offset(SYNC_RUNS_KEPT)
        .limit(100)
        .get();
      if (!old.empty) {
        const batch = db.batch();
        old.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      return json(res, 200, { ok: true, runId: run.runId });
    }
    if (req.method === 'GET' && url.pathname === '/api/sync/state') {
      if (!firebaseConfigured()) return json(res, 503, { error: 'Firebase is not configured.' });
      const state = await firebase().db.collection('syncState').doc('latest').get();
      return json(res, 200, { paused: state.exists && state.get('paused') === true });
    }
    return json(res, 404, { error: 'Not found' });
  }
  if (req.method === 'POST' && ['/api/register', '/api/profile/update'].includes(url.pathname)) {
    return json(res, 503, { error: 'Verified registration is available only through Firebase Auth.' });
  }
  if (url.pathname.startsWith('/api/admin')) {
    if (req.method !== 'GET' && !sameOrigin(req))
      return json(res, 403, { error: 'Cross-site request blocked.' });
    if (req.method === 'POST' && url.pathname === '/api/admin/login') {
      if (!process.env.ADMIN_PASSWORD)
        return json(res, 503, {
          error: 'Admin password is not configured. Set ADMIN_PASSWORD before starting the server.',
        });
      if (!withinRate(adminLoginRate, clientIp(req), 8, 15 * 60_000))
        return json(res, 429, { error: 'Too many sign-in attempts. Wait 15 minutes and try again.' });
      const d = await body(req, 4000);
      // Compare fixed-length digests so the comparison time does not reveal the password length.
      const digest = (value) => crypto.createHash('sha256').update(String(value)).digest();
      if (!crypto.timingSafeEqual(digest(d.password || ''), digest(process.env.ADMIN_PASSWORD)))
        return json(res, 401, { error: 'Incorrect password' });
      const token = crypto.randomBytes(32).toString('hex'),
        issued = String(Date.now()),
        signed = `${token}.${issued}.${signAdminToken(`${token}.${issued}`)}`;
      res.setHeader(
        'Set-Cookie',
        `admin_session=${signed}; HttpOnly; SameSite=Strict; Path=/${secureCookie()}`,
      );
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
      res.setHeader(
        'Set-Cookie',
        `admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookie()}`,
      );
      return json(res, 200, { ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/session')
      return json(res, 200, { authenticated: Boolean(session(req)) });
    if (!session(req)) return json(res, 401, { error: 'Sign in required' });
    if (req.method === 'GET' && url.pathname === '/api/admin/users') {
      if (!firebaseConfigured())
        return json(res, 503, { error: 'Firebase must be configured before accounts can be managed.' });
      const query = (url.searchParams.get('q') || '').trim().toLocaleLowerCase(),
        { auth, db } = firebase(),
        accounts = [];
      // listUsers returns at most 1,000 accounts per page; follow the page token so search covers everyone.
      let pageToken;
      do {
        const page = await auth.listUsers(1000, pageToken);
        accounts.push(...page.users);
        pageToken = page.pageToken;
      } while (pageToken && accounts.length < 20_000);
      const profiles = await db.collection('users').get();
      const byId = new Map(profiles.docs.map((x) => [x.id, x.data()]));
      const matches = accounts
        .map((u) => {
          const p = byId.get(u.uid) || {};
          return {
            id: u.uid,
            name: p.name || u.displayName || '',
            email: u.email || '',
            phone: u.phoneNumber || '',
            gender: p.gender || '',
            picture: p.picture || '',
            createdAt: u.metadata.creationTime || '',
          };
        })
        .filter(
          (u) =>
            !query ||
            [u.id, u.name, u.email, u.phone].some((v) => String(v).toLocaleLowerCase().includes(query)),
        );
      return json(res, 200, {
        users: matches.slice(0, 200),
        total: accounts.length,
        matched: matches.length,
      });
    }
    if (url.pathname.startsWith('/api/admin/sync/')) {
      if (req.method !== 'GET' && !strictSameOrigin(req))
        return json(res, 403, { error: 'Cross-site request blocked.' });
      const dispatch = await dispatchToken();
      const dispatchConfigured = Boolean(dispatch.token);
      if (req.method === 'GET' && url.pathname === '/api/admin/sync/status') {
        const config = {
          dispatchConfigured,
          dispatchSource: dispatch.source,
          dispatchLast4: dispatch.last4 || null,
          reportConfigured: true,
          workflowUrl: `https://github.com/${syncRepo()}/actions/workflows/${SYNC_WORKFLOW}`,
          firebaseConfigured: firebaseConfigured(),
          schedule: '0 3,11,19 * * * (UTC)',
          nextRun: nextSyncRun(),
        };
        if (!firebaseConfigured())
          return json(res, 200, { ...config, paused: false, latest: null, runs: [] });
        const { db } = firebase();
        const [state, runs] = await Promise.all([
          db.collection('syncState').doc('latest').get(),
          db.collection('syncRuns').orderBy('receivedAt', 'desc').limit(20).get(),
        ]);
        const all = runs.docs.map((doc) => ({
          ...doc.data(),
          receivedAt: firestoreTime(doc.get('receivedAt')),
        }));
        return json(res, 200, {
          ...config,
          paused: state.exists && state.get('paused') === true,
          latest: all[0] || null,
          runs: all.map(syncRunSummary),
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/sync/run') {
        if (!dispatchConfigured)
          return json(res, 503, { error: 'GitHub is not connected yet.', code: 'not_connected' });
        const d = await body(req, 2000);
        const dryRun = d.dryRun !== false,
          allowRemovals = d.allowRemovals === true;
        const response = await fetch(
          `https://api.github.com/repos/${syncRepo()}/actions/workflows/${SYNC_WORKFLOW}/dispatches`,
          {
            method: 'POST',
            headers: githubHeaders(dispatch.token),
            body: JSON.stringify({
              ref: 'main',
              inputs: {
                dry_run: String(dryRun),
                allow_removals: String(allowRemovals),
                allow_large: 'false',
              },
            }),
            signal: AbortSignal.timeout(15000),
          },
        );
        if (response.status !== 204)
          return json(res, 502, {
            error: `GitHub refused the run request (HTTP ${response.status}).`,
            code: `github_${response.status}`,
          });
        await audit(req, 'sync.run', { dryRun, allowRemovals });
        return json(res, 200, { ok: true, dryRun, allowRemovals });
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/sync/github-token') {
        if (!firebaseConfigured()) return json(res, 503, { error: 'Firebase is not configured.' });
        const d = await body(req, 2000),
          token = String(d.token || '').trim();
        if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,250}$/.test(token))
          return json(res, 400, { error: 'This does not look like a GitHub token.', code: 'bad_format' });
        // Check the token can see this workflow before saving it.
        const check = await fetch(
          `https://api.github.com/repos/${syncRepo()}/actions/workflows/${SYNC_WORKFLOW}`,
          { headers: githubHeaders(token), signal: AbortSignal.timeout(15000) },
        );
        if (check.status !== 200)
          return json(res, 400, {
            error: `GitHub rejected the token (HTTP ${check.status}).`,
            code: `github_${check.status}`,
          });
        await firebase()
          .db.collection('syncSecrets')
          .doc('github')
          .set({ token, last4: token.slice(-4), savedAt: FieldValue.serverTimestamp() });
        dashboardToken = { at: 0, value: null };
        await audit(req, 'sync.github_token.save');
        return json(res, 200, { ok: true, last4: token.slice(-4) });
      }
      if (req.method === 'DELETE' && url.pathname === '/api/admin/sync/github-token') {
        if (!firebaseConfigured()) return json(res, 503, { error: 'Firebase is not configured.' });
        await firebase().db.collection('syncSecrets').doc('github').delete();
        dashboardToken = { at: 0, value: null };
        await audit(req, 'sync.github_token.remove');
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/sync/pause') {
        if (!firebaseConfigured()) return json(res, 503, { error: 'Firebase is not configured.' });
        const d = await body(req, 2000);
        if (typeof d.paused !== 'boolean') return json(res, 400, { error: 'paused must be true or false.' });
        await firebase()
          .db.collection('syncState')
          .doc('latest')
          .set({ paused: d.paused, pausedChangedAt: FieldValue.serverTimestamp() }, { merge: true });
        await audit(req, d.paused ? 'sync.pause' : 'sync.resume');
        return json(res, 200, { ok: true, paused: d.paused });
      }
      return json(res, 404, { error: 'Not found' });
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/audience') {
      if (!firebaseConfigured()) return json(res, 503, { error: 'Firebase is not configured.' });
      const count = await firebase().db.collection('users').count().get();
      return json(res, 200, { profiles: count.data().count, broadcastLimit: 500 });
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/email') {
      if (!emailNotificationsEnabled()) return json(res, 503, { error: 'Resend email is not configured.' });
      if (!firebaseConfigured())
        return json(res, 503, { error: 'Firebase must be configured before targeting accounts.' });
      const d = await body(req),
        subject = String(d.subject || '').trim(),
        message = String(d.message || '').trim();
      if (!subject || !message) return json(res, 400, { error: 'Subject and message are required.' });
      const { db } = firebase();
      let targets = [];
      if (d.mode === 'all')
        targets = (await db.collection('users').limit(500).get()).docs.map((x) => ({
          id: x.id,
          ...x.data(),
        }));
      else {
        const target = String(d.target || '').trim();
        if (!target) return json(res, 400, { error: 'Enter a user ID, verified email, or phone number.' });
        let snapshot;
        if (target.includes('@'))
          snapshot = await db.collection('users').where('email', '==', target.toLowerCase()).limit(1).get();
        else if (target.startsWith('+'))
          snapshot = await db.collection('users').where('phone', '==', target).limit(1).get();
        else {
          const doc = await db.collection('users').doc(target).get();
          snapshot = { docs: doc.exists ? [doc] : [] };
        }
        targets = snapshot.docs.map((x) => ({ id: x.id, ...x.data() }));
      }
      if (!targets.length) return json(res, 404, { error: 'No matching account was found.' });
      let emailSent = 0,
        emailFailed = 0,
        inAppDelivered = 0;
      for (const target of targets) {
        try {
          await db
            .collection('users')
            .doc(target.id)
            .collection('messages')
            .add({ subject, message, from: 'Morfi', createdAt: FieldValue.serverTimestamp(), readAt: null });
          inAppDelivered++;
        } catch {
          continue;
        }
        const address = String(target.email || '')
          .trim()
          .toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
          try {
            await sendManagedEmail(address, subject, message);
            emailSent++;
          } catch {
            emailFailed++;
          }
        }
      }
      return json(res, 200, {
        ok: true,
        matched: targets.length,
        inAppDelivered,
        emailSent,
        emailFailed,
        limit: d.mode === 'all' ? 500 : 1,
      });
    }
    const match = url.pathname.match(/^\/api\/admin\/(subjects|lectures|advising|official)(?:\/([^/]+))?$/);
    if (match) {
      const [, key, id] = match,
        db = await readDB();
      db[key] = Array.isArray(db[key]) ? db[key] : [];
      if (req.method === 'GET') return json(res, 200, db[key]);
      if (req.method === 'POST' || req.method === 'PUT') {
        const item = await body(req),
          index = id ? db[key].findIndex((x) => x.id === id) : -1;
        if (id && index < 0) return json(res, 404, { error: 'Not found' });
        const obj = { ...cleanContentItem(item, id ? db[key][index] : {}), id: id || crypto.randomUUID() };
        if (!obj.title || !obj.url || !safeUrl(obj.url))
          return json(res, 400, { error: 'A title and valid http(s) URL are required' });
        // Reject a link that another item already uses, but only when the link is new or being changed,
        // so older items that already share a link can still be edited.
        const previousUrl = id ? db[key][index].url : null;
        if (obj.url !== previousUrl && db[key].some((x) => x.id !== obj.id && x.url === obj.url))
          return json(res, 409, { error: 'This link already exists in this section.' });
        if (id) db[key][index] = obj;
        else db[key].unshift(obj);
        await saveDB(db);
        return json(res, 200, obj);
      }
      if (req.method === 'DELETE' && id) {
        if (!db[key].some((x) => x.id === id)) return json(res, 404, { error: 'Not found' });
        db[key] = db[key].filter((x) => x.id !== id);
        await saveDB(db);
        return json(res, 200, { ok: true });
      }
    }
  }
  return json(res, 404, { error: 'Not found' });
}
const appRoutes = ['/', '/subjects', '/lectures', '/advising', '/official', '/developer', '/profile'];
const publicRoot = path.join(root, 'public');
async function sendFile(res, file, status = 200, extraHeaders = {}) {
  const ext = path.extname(file);
  // Code and pages must revalidate so a new deploy shows up at once; images rarely change and can be cached.
  const cache = ['.svg', '.png', '.jpg', '.webp'].includes(ext) ? 'public, max-age=86400' : 'no-cache';
  res.writeHead(status, {
    ...securityHeaders,
    'Content-Type': mime[ext] || 'application/octet-stream',
    'Cache-Control': cache,
    ...extraHeaders,
  });
  res.end(await readFile(file));
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' });
    const route = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    if (route === '/admin') {
      res.setHeader(
        'Set-Cookie',
        `admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookie()}`,
      );
      return sendFile(res, path.join(publicRoot, 'admin.html'), 200, { 'Cache-Control': 'no-store' });
    }
    if (appRoutes.includes(route)) return sendFile(res, path.join(publicRoot, 'index.html'));
    if (route === '/favicon.ico') return sendFile(res, path.join(publicRoot, 'favicon.svg'));
    let rel;
    try {
      rel = decodeURIComponent(route);
    } catch {
      return json(res, 400, { error: 'Malformed URL' });
    }
    const file = path.resolve(publicRoot, `.${rel}`);
    const info = file.startsWith(publicRoot + path.sep) ? await stat(file).catch(() => null) : null;
    if (info?.isFile()) return sendFile(res, file);
    // Unknown pages get the app shell with a 404 status so the browser shows the designed not-found page.
    if (!path.extname(rel)) return sendFile(res, path.join(publicRoot, 'index.html'), 404);
    res.writeHead(404, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  } catch (e) {
    if (res.headersSent) return res.end();
    json(res, e.message === 'Request too large' ? 413 : e.status || 500, {
      error: e.message === 'Request too large' ? 'Request too large' : e.status ? e.message : 'Server error',
    });
  }
});
server.listen(Number(process.env.PORT || 3000), () =>
  console.log(`Capital Science Faculty is running on http://localhost:${process.env.PORT || 3000}`),
);
