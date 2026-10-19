let appPromise;
const phoneVerifiers = new WeakMap();

async function services() {
  if (!appPromise)
    appPromise = (async () => {
      const response = await fetch('/api/firebase-config', {
        cache: 'no-store',
      });
      const config = await response.json();
      if (!response.ok || !config.enabled) throw new Error('Firebase is not configured on the server yet.');
      const [appSdk, authSdk] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
      ]);
      const app = appSdk.initializeApp(config.firebase);
      const auth = authSdk.getAuth(app);
      await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
      // Wait for the saved sign-in to load, otherwise currentUser is still null right after a page load.
      await auth.authStateReady();
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

export async function checkEmailExists(email) {
  const response = await fetch('/api/auth/check-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not check this email address.');
  return result.exists === true;
}

export async function sendEmailSignInLink(email) {
  const { auth, authSdk } = await services();
  try {
    await authSdk.sendSignInLinkToEmail(auth, email, {
      url: `${window.location.origin}/profile`,
      handleCodeInApp: true,
    });
  } catch (error) {
    if (error.code === 'auth/operation-not-allowed')
      throw new Error('Enable Email Link sign-in in Firebase Authentication.');
    if (error.code === 'auth/unauthorized-continue-uri' || error.code === 'auth/unauthorized-domain')
      throw new Error(`Add ${location.hostname} to Firebase Auth authorized domains.`);
    throw error;
  }
  // localStorage, not sessionStorage: the link usually opens in a new tab, which has its own session.
  localStorage.setItem('cs-pending-email-link', email);
}

export async function isEmailSignInLink(url = window.location.href) {
  const { auth, authSdk } = await services();
  return authSdk.isSignInWithEmailLink(auth, url);
}

export async function completeEmailSignInLink(email, url = window.location.href) {
  const { auth, authSdk } = await services();
  const result = await authSdk.signInWithEmailLink(auth, email, url);
  localStorage.removeItem('cs-pending-email-link');
  sessionStorage.removeItem('cs-pending-email-link');
  await result.user.reload();
  return result.user;
}

export async function setEmailPassword(email, password) {
  const { auth, authSdk } = await services();
  if (!auth.currentUser) throw new Error('Sign in before setting a password.');
  const passwordLinked = auth.currentUser.providerData.some((provider) => provider.providerId === 'password');
  if (passwordLinked) await authSdk.updatePassword(auth.currentUser, password);
  else
    await authSdk.linkWithCredential(auth.currentUser, authSdk.EmailAuthProvider.credential(email, password));
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export async function sendPasswordReset(email) {
  const { auth, authSdk } = await services();
  await authSdk.sendPasswordResetEmail(auth, email);
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken(true)}`,
    },
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
  const verifier = await createPhoneVerifier(auth, authSdk, recaptchaContainer);
  try {
    const provider = new authSdk.PhoneAuthProvider(auth);
    const verificationId = await provider.verifyPhoneNumber(phone, verifier);
    return { verificationId, verifier };
  } catch (error) {
    clearPhoneVerifier(recaptchaContainer, verifier);
    throw error;
  }
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
    try {
      await authSdk.sendEmailVerification(result.user);
    } finally {
      await authSdk.signOut(auth);
    }
    const error = new Error('Email verification is required. A new verification link was sent.');
    error.code = 'auth/email-not-verified';
    throw error;
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
  const verifier = await createPhoneVerifier(auth, authSdk, recaptchaContainer);
  try {
    const confirmation = await authSdk.signInWithPhoneNumber(auth, phone, verifier);
    return { confirmation, verifier };
  } catch (error) {
    clearPhoneVerifier(recaptchaContainer, verifier);
    throw error;
  }
}

async function createPhoneVerifier(auth, authSdk, container) {
  const element = typeof container === 'string' ? document.getElementById(container) : container;
  if (!(element instanceof HTMLElement) || !element.isConnected) {
    throw new Error('Phone verification is not ready. Reopen the phone sign-in step and try again.');
  }
  const previous = phoneVerifiers.get(element);
  if (previous) clearPhoneVerifier(element, previous);
  element.replaceChildren();
  const verifier = new authSdk.RecaptchaVerifier(auth, element, {
    size: 'normal',
  });
  phoneVerifiers.set(element, verifier);
  return verifier;
}

function clearPhoneVerifier(container, verifier) {
  const element = typeof container === 'string' ? document.getElementById(container) : container;
  try {
    verifier.clear();
  } catch {}
  if (element instanceof HTMLElement) {
    if (phoneVerifiers.get(element) === verifier) phoneVerifiers.delete(element);
    element.replaceChildren();
  }
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
  const response = await fetch('/api/firebase/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Profile could not be loaded.');
  return result.profile;
}

export async function loadMessages() {
  const { auth } = await services();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to read your messages.');
  const response = await fetch('/api/firebase/messages', {
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
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

export async function sendMessage(message) {
  const { auth } = await services();
  const user = auth.currentUser;
  if (!user) throw new Error('سجّل الدخول الأول.');
  const response = await fetch('/api/firebase/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ message }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'تعذر إرسال الرسالة.');
  return result;
}

export async function signOutFirebase() {
  const { auth, authSdk } = await services();
  await authSdk.signOut(auth);
}

export async function currentFirebaseUser() {
  const { auth, authSdk } = await services();
  return new Promise((resolve) => {
    const off = authSdk.onAuthStateChanged(auth, (user) => {
      off();
      resolve(user);
    });
  });
}
