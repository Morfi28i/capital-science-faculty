import { mkdir, writeFile } from 'node:fs/promises';

let config = {};
try {
  config = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG || '{}');
} catch {
  throw new Error('FIREBASE_WEBAPP_CONFIG must be valid JSON when provided.');
}

config = {
  apiKey: config.apiKey || process.env.FIREBASE_API_KEY,
  authDomain: config.authDomain || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: config.projectId || process.env.FIREBASE_PROJECT_ID,
  appId: config.appId || process.env.FIREBASE_APP_ID,
  messagingSenderId: config.messagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID,
};

if (Object.values(config).every(Boolean)) {
  await mkdir('public', { recursive: true });
  await writeFile('public/firebase-config.json', JSON.stringify(config));
} else {
  console.warn('Firebase web config was not supplied; verified account features will stay disabled.');
}
