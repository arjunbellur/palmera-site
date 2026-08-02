// Client-side admin allowlist — the single source for every surface guard.
// The server-side truth lives in firestore.rules (isAdmin()); keep the two in
// step when an admin is added. Rules are shared with the iOS app — never edit
// them casually.
export const ADMIN_EMAILS = ['palmeraexp@gmail.com']
export const isAdminEmail = (email?: string | null) => ADMIN_EMAILS.includes(email || '')
