let appPromise;

async function services() {
  if (!appPromise) appPromise = (async () => {
    const response = await fetch('/api/firebase-config', { cache: 'no-store' });
    const config = await response.json();
    if (!response.ok || !config.enabled) throw new Error('Firebase is not configured on the server yet.');
    const [appSdk, authSdk] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
    ]);
    const app = appSdk.initializeApp(config.firebase);
    const auth = authSdk.getAuth(app);
    await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
    return { auth, authSdk };
  })();
  return appPromise;
}

export async function createEmailAccount(email, password) {
  const { auth, authSdk } = await services();
  return (await authSdk.createUserWithEmailAndPassword(auth, email, password)).user;
}

export async function inspectEmail(email) {
  const { auth, authSdk } = await services();
  return authSdk.fetchSignInMethodsForEmail(auth, email);
}

export async function requestEmailCode(email) {
  const response = await fetch('/api/auth/email-code', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'send', email }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not send the verification code.');
  return result;
}

export async function verifyEmailCode(email, code) {
  const response = await fetch('/api/auth/email-code', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', email, code }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'That verification code is not valid.');
  return result;
}

export async function completeEmailVerification(code) {
  const { auth } = await services();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before completing email verification.');
  const response = await fetch('/api/firebase/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken(true)}` },
    body: JSON.stringify({ code }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Email verification could not be completed.');
  await user.reload();
  await user.getIdToken(true);
  return user;
}

export async function requestEmailChange(newEmail) {
  const { auth, authSdk } = await services();
  if (!auth.currentUser) throw new Error('Sign in before changing your email.');
  await authSdk.verifyBeforeUpdateEmail(auth.currentUser, newEmail);
}

export async function checkContactAvailability(contact) {
  const { auth } = await services();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before checking a contact value.');
  const response = await fetch('/api/auth/check-contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken(true)}` },
    body: JSON.stringify(contact),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'Could not check that contact value.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function refreshCurrentUser() {
  const { auth } = await services();
  if (!auth.currentUser) throw new Error('Sign in before refreshing your profile.');
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export async function startPhoneUpdate(phone, recaptchaContainer) {
  const { auth, authSdk } = await services();
  if (!auth.currentUser) throw new Error('Sign in before changing your phone.');
  const verifier = new authSdk.RecaptchaVerifier(auth, recaptchaContainer, { size: 'normal' });
  await verifier.render();
  const provider = new authSdk.PhoneAuthProvider(auth);
  const verificationId = await provider.verifyPhoneNumber(phone, verifier);
  return { verificationId, verifier };
}

export async function finishPhoneUpdate(verificationId, code) {
  const { auth, authSdk } = await services();
  if (!auth.currentUser) throw new Error('Sign in before changing your phone.');
  const credential = authSdk.PhoneAuthProvider.credential(verificationId, code);
  await authSdk.updatePhoneNumber(auth.currentUser, credential);
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export async function signInEmail(email, password) {
  const { auth, authSdk } = await services();
  const result = await authSdk.signInWithEmailAndPassword(auth, email, password);
  if (!result.user.emailVerified) {
    await authSdk.sendEmailVerification(result.user);
    await authSdk.signOut(auth);
    throw new Error('Email verification is required. A new verification link was sent.');
  }
  return result.user;
}

export async function signInGoogle() {
  const { auth, authSdk } = await services();
  const provider = new authSdk.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await authSdk.signInWithPopup(auth, provider);
  if (!result.user.emailVerified) throw new Error('Google did not confirm this email address.');
  return result.user;
}

export async function startPhoneSignIn(phone, recaptchaContainer) {
  const { auth, authSdk } = await services();
  const verifier = new authSdk.RecaptchaVerifier(auth, recaptchaContainer, { size: 'normal' });
  await verifier.render();
  const confirmation = await authSdk.signInWithPhoneNumber(auth, phone, verifier);
  return { confirmation, verifier };
}

export async function confirmPhoneSignIn(confirmation, code) {
  const result = await confirmation.confirm(code);
  return result.user;
}

export async function persistProfile(profile) {
  const { auth } = await services();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before saving your profile.');
  const token = await user.getIdToken(true);
  const response = await fetch('/api/firebase/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(profile),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Profile could not be saved.');
  return { ...result.profile, notificationSent: result.emailSent === true };
}

export async function loadProfile() {
  const { auth } = await services();
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken(true);
  const response = await fetch('/api/firebase/profile', { headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Profile could not be loaded.');
  return result.profile;
}

export async function loadMessages() {
  const { auth } = await services();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to read your messages.');
  const response = await fetch('/api/firebase/messages', {
    headers: { Authorization: `Bearer ${await user.getIdToken(true)}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Messages could not be loaded.');
  return result.messages || [];
}

export async function markMessageRead(id) {
  const { auth } = await services();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to read your messages.');
  const response = await fetch(`/api/firebase/messages/${encodeURIComponent(id)}/read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken(true)}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Message could not be updated.');
  return result;
}

export async function signOutFirebase() {
  const { auth, authSdk } = await services();
  await authSdk.signOut(auth);
}

export async function currentFirebaseUser() {
  const { auth, authSdk } = await services();
  return new Promise(resolve => {
    const off = authSdk.onAuthStateChanged(auth, user => { off(); resolve(user); });
  });
}
