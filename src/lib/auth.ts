import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  User,
} from 'firebase/auth'
import { auth } from './firebase'

export const signUp = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password)

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
