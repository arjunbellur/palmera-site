// Server-side Firebase Admin (API routes only — never import from client
// code). Credentials come from either:
//   - FIREBASE_SERVICE_ACCOUNT: the service-account JSON as an env string
//     (hosting platforms like Vercel), or
//   - GOOGLE_APPLICATION_CREDENTIALS: a file path (local dev, same var the
//     admin scripts use).
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export function adminDb() {
  if (getApps().length === 0) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT
    initializeApp(json ? { credential: cert(JSON.parse(json)) } : { credential: applicationDefault() })
  }
  return getFirestore()
}
