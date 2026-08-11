// Server-side Firebase Admin (API routes only — never import from client
// code). Credentials, in priority order:
//   - FIREBASE_SERVICE_ACCOUNT_B64: the service-account JSON base64-encoded
//     (preferred on Vercel — a single unbreakable token that survives any
//     copy/paste), or
//   - FIREBASE_SERVICE_ACCOUNT: the raw JSON as an env string, or
//   - GOOGLE_APPLICATION_CREDENTIALS: a file path (local dev, same var the
//     admin scripts use).
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export function adminDb() {
  if (getApps().length === 0) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
    const raw = b64 ? Buffer.from(b64, 'base64').toString('utf8') : process.env.FIREBASE_SERVICE_ACCOUNT
    initializeApp(raw ? { credential: cert(JSON.parse(raw)) } : { credential: applicationDefault() })
  }
  return getFirestore()
}
