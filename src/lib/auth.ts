import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendEmailVerification,
  User,
} from 'firebase/auth'
import { auth } from './firebase'

// Accounts created from this date must verify their email before using any
// surface (Dashboard Time call, 2026-08-19). Older accounts are grandfathered
// so no existing partner gets locked out by a policy they never saw.
export const VERIFY_CUTOFF = new Date('2026-08-22T00:00:00Z')

export const signUp = async (email: string, password: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  auth.languageCode = 'fr'
  await sendEmailVerification(cred.user).catch((e) => console.error('verification email failed:', e))
  return cred
}

export const resendVerification = async () => {
  if (!auth.currentUser) throw new Error('not-signed-in')
  auth.languageCode = 'fr'
  await sendEmailVerification(auth.currentUser)
}

/** Re-fetches the user record so a just-clicked verification link is seen. */
export const refreshVerified = async (): Promise<boolean> => {
  if (!auth.currentUser) return false
  await auth.currentUser.reload()
  return auth.currentUser.emailVerified
}

export const needsEmailVerification = (user: User) => {
  if (user.emailVerified) return false
  const created = user.metadata.creationTime ? new Date(user.metadata.creationTime) : null
  return !!created && created >= VERIFY_CUTOFF
}

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export const logOut = () => signOut(auth)

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback)

/** Forgot password: Firebase emails a reset link. Always resolves the same way
 * for unknown emails (Firebase throws user-not-found; callers should show a
 * neutral "if this email exists…" message either way — no account probing). */
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

/**
 * Change password for the signed-in user. Firebase requires a RECENT login for
 * this, so we always reauthenticate with the current password first — which
 * doubles as proof the person at the keyboard knows it.
 */
export const changePassword = async (currentPassword: string, newPassword: string) => {
  const user = auth.currentUser
  if (!user?.email) throw new Error('not-signed-in')
  const cred = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, cred)
  await updatePassword(user, newPassword)
}
