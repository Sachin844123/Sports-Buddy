// js/auth.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { doc, getDoc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { auth, db } from './firebase.js';
import { logAction } from './logger.js';

const PASSWORD_MIN_LENGTH = 6;

export function validateCredentials(email, password) {
  const errors = [];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Enter a valid email address.');
  }
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  return errors;
}

export async function registerUser({ email, password, displayName = '', skillLevel = 'casual' }) {
  const validationErrors = validateCredentials(email, password);
  if (validationErrors.length) {
    throw new Error(validationErrors.join(' '));
  }

  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await sendEmailVerification(userCred.user);
  } catch (err) {
    console.warn('Email verification not sent:', err.message);
  }

  const userRef = doc(db, 'users', userCred.user.uid);

  // ALWAYS write new user data (fixes the issue permanently)
  await setDoc(userRef, {
    uid: userCred.user.uid,
    email,
    role: 'user',
    displayName: displayName || '',
    skillLevel: skillLevel || 'casual',
    createdAt: serverTimestamp()
  }, { merge: true });
  await logAction(userCred.user.uid, 'register', { email });
  return { user: userCred.user, profile: await fetchUserProfile(userCred.user.uid) };
}

async function ensureUserDocument(user) {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        role: 'user',
        displayName: '',
        skillLevel: 'casual',
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error("ensureUserDocument failed:", err);
  }
}

export async function loginUser(email, password) {
  const validationErrors = validateCredentials(email, password);
  if (validationErrors.length) {
    throw new Error(validationErrors.join(' '));
  }
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDocument(userCred.user);
  await logAction(userCred.user.uid, 'login', { email });
  return { user: userCred.user, profile: await fetchUserProfile(userCred.user.uid) };
}

export async function logoutUser() {
  const uid = auth.currentUser?.uid || null;
  await signOut(auth);
  await logAction(uid, 'logout', {});
}

export async function requestPasswordReset(email) {
  if (!email) {
    throw new Error('Enter your email to reset password.');
  }
  await sendPasswordResetEmail(auth, email);
  await logAction(auth.currentUser?.uid || null, 'reset_password_request', { email });
}

export async function fetchUserProfile(uid) {
  if (!uid) return null;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? { id: uid, ...snap.data() } : null;
}

// Export onAuthStateChanged so pages can use it
export { onAuthStateChanged };
