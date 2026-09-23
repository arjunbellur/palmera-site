'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { StoreBadges } from './AppStoreBadge'
export default function Footer() {
  const t = useTranslations('footer')
  return (
    <footer style={{ background: 'var(--bg-1)', paddingTop: 'clamp(3.5rem,5.5vw,5rem)', overflow: 'hidden' }}>
      <div style={{ maxWidth: '75rem', margin: '0 auto', padding: '0 clamp(1.5rem,4.5vw,2.5rem) clamp(3rem,5vw,5rem)' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.6)', marginBottom: '1.25rem' }}>{t('earlyAccess')}</p>
        <StoreBadges variant="dark" />
      </div>
      <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(42,33,25,0.1)', paddingTop: '2.5rem' }}>
        <div className="marquee-track-footer" style={{ display: 'flex', width: 'max-content' }}>
          {Array(4).fill(null).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexShrink: 0, paddingRight: '2rem' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(3.75rem, 10vw, 7.5rem)', fontWeight: 400, letterSpacing: '-0.1875rem', color: 'var(--color-dark)', lineHeight: 1, whiteSpace: 'nowrap' }}>The Palmera Experience</span>
              <img src="/images/PALMERA_cracked.png" alt="" loading="lazy" style={{ height: '5rem', opacity: 0.45, flexShrink: 0 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            </div>
          ))}
        </div>
      </div>
      {/* Legal — the app links to these same /legal/* URLs */}
      <div style={{ maxWidth: '75rem', margin: '0 auto', padding: 'clamp(1.25rem,2vw,1.75rem) clamp(1.5rem,4.5vw,2.5rem) 0.25rem', borderTop: '1px solid rgba(42,33,25,0.1)', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0.625rem 1.375rem' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.12em', color: 'rgba(42,33,25,0.4)', textTransform: 'uppercase' }}>{t('legalHeading')}</span>
        {([
          ['/legal/terms', 'legalTerms'],
          ['/legal/privacy', 'legalPrivacy'],
          ['/legal/refunds', 'legalRefunds'],
          ['/legal/cookies', 'legalCookies'],
          ['/legal/ai-policy', 'legalAi'],
          ['/legal/dmca', 'legalDmca'],
        ] as const).map(([href, key]) => (
          <Link key={href} href={href} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'rgba(42,33,25,0.55)', textDecoration: 'none', letterSpacing: '0.04em' }}>
            {t(key)}
          </Link>
        ))}
      </div>
      <div style={{ maxWidth: '75rem', margin: '0 auto', padding: 'clamp(1rem,1.5vw,1.25rem) clamp(1.5rem,4.5vw,2.5rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', color: 'rgba(42,33,25,0.5)', textTransform: 'uppercase', margin: 0 }}>{t('copyright')}</p>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="https://apps.apple.com/app/palmera/id6784757513" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'rgba(42,33,25,0.5)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>App Store</a>
          <a href="https://play.google.com/store/apps/details?id=com.palmeraexp.app&pcampaignid=web_share" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'rgba(42,33,25,0.5)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Google Play</a>
          <Link href="/dashboard" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'rgba(42,33,25,0.5)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('partner')}</Link>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'rgba(42,33,25,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Palmera®</span>
        </div>
      </div>
    </footer>
  )
}
