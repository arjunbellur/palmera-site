'use client'
// Full-screen gate for unverified accounts (created after VERIFY_CUTOFF):
// resend the link, re-check after clicking it, or sign out. Shared by the
// onboarding portal, the partner dashboard and the supplier portal.
import { useState } from 'react'
import { resendVerification, refreshVerified, logOut } from '@/lib/auth'
import { MailCheck } from 'lucide-react'

const STR = {
  fr: {
    title: 'Vérifiez votre adresse e-mail', body: 'Nous avons envoyé un lien de confirmation à',
    hint: 'Cliquez sur le lien dans l’e-mail, puis revenez ici. Pensez à vérifier vos spams.',
    check: 'J’ai cliqué sur le lien', resend: 'Renvoyer l’e-mail', sent: 'E-mail renvoyé.', notyet: 'Pas encore vérifié — réessayez dans un instant.', signout: 'Se déconnecter',
  },
  en: {
    title: 'Verify your email address', body: 'We sent a confirmation link to',
    hint: 'Click the link in the email, then come back here. Check your spam folder too.',
    check: 'I clicked the link', resend: 'Resend email', sent: 'Email resent.', notyet: 'Not verified yet — try again in a moment.', signout: 'Sign out',
  },
}

export default function VerifyEmailGate({ email, locale = 'fr', onVerified }: { email: string; locale?: 'fr' | 'en'; onVerified: () => void }) {
  const s = STR[locale]
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const check = async () => { setBusy(true); setMsg(''); const ok = await refreshVerified(); setBusy(false); if (ok) onVerified(); else setMsg(s.notyet) }
  const resend = async () => { setBusy(true); setMsg(''); try { await resendVerification(); setMsg(s.sent) } catch { setMsg('…') } setBusy(false) }
  const btn: React.CSSProperties = { padding: '10px 18px', borderRadius: '10px', fontFamily: 'var(--font-sans)', fontSize: '13px', cursor: 'pointer' }
  return (
    <div style={{ minHeight: '100vh', background: 'var(--pf-bg, #0a0e18)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="pf-glass" style={{ width: 'min(420px, 100%)', borderRadius: '18px', padding: '30px', textAlign: 'center', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))' }}>
        <div style={{ width: '54px', height: '54px', borderRadius: '50%', border: '1px solid var(--pf-gold, #be9a56)', display: 'grid', placeItems: 'center', color: 'var(--pf-gold, #be9a56)', margin: '0 auto 16px' }}><MailCheck size={22} strokeWidth={1.75} /></div>
        <h1 style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head, #f3ebd8)', fontSize: '20px', fontWeight: 500, margin: '0 0 8px' }}>{s.title}</h1>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-muted, #bdb7a6)', fontSize: '13px', lineHeight: 1.55, margin: '0 0 4px' }}>{s.body}</p>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-text, #e9e4d6)', fontSize: '14px', margin: '0 0 14px', wordBreak: 'break-all' }}>{email}</p>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-faint, #8a8577)', fontSize: '12px', lineHeight: 1.5, margin: '0 0 20px' }}>{s.hint}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={check} disabled={busy} style={{ ...btn, background: 'var(--pf-gold-deep, #9e763b)', border: 'none', color: '#ebe8db', opacity: busy ? 0.6 : 1 }}>{s.check}</button>
          <button onClick={resend} disabled={busy} style={{ ...btn, background: 'transparent', border: '1px solid var(--pf-border-strong, rgba(190,154,86,0.4))', color: 'var(--pf-gold, #be9a56)' }}>{s.resend}</button>
          {msg && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-muted, #bdb7a6)', margin: 0 }}>{msg}</p>}
          <button onClick={() => logOut()} style={{ background: 'none', border: 'none', color: 'var(--pf-faint, #8a8577)', fontFamily: 'var(--font-sans)', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>{s.signout}</button>
        </div>
      </div>
    </div>
  )
}
