// Browser-side trigger for dashboard-originated mails (staff invite,
// agreement countersigned, payout sent). Fire-and-forget: the Firestore
// write the mail announces has already succeeded, and a mail hiccup must
// never surface as a failed invite or countersignature. The server
// re-authorises from the ID token and reads addresses itself — the body
// only names the record.
import { auth } from './firebase'

export type DashboardMail =
  | { kind: 'staff_invite'; companyId: string; email: string; name?: string | null }
  | { kind: 'agreement_countersigned'; providerId: string }
  | { kind: 'payout_sent'; payoutId: string }

export async function notifyDashboard(body: DashboardMail): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken()
    if (!token) return
    const res = await fetch('/api/notify/dashboard', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      keepalive: true, // survives the page navigating away right after the write
    })
    if (!res.ok) console.warn(`notify/dashboard ${body.kind}: HTTP ${res.status}`)
  } catch (e) {
    console.warn(`notify/dashboard ${body.kind} failed:`, e)
  }
}
