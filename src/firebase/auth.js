// ─── Google OAuth autentifikacija ───────────────────────────────────────────
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from './config.js';
import { ensureUserProfile } from './firestore.js';

/** Login Google nalogom — popup na desktopu, redirect fallback na mobitelu. */
export async function loginWithGoogle() {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    await ensureUserProfile(res.user);
    return res.user;
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw e;
  }
}

export function logout() {
  return signOut(auth);
}

/** Slušaj promjene sesije (auto-login na povratku u aplikaciju). */
export function watchAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) await ensureUserProfile(user);
    callback(user);
  });
}
