'use client'
import { useRef } from 'react'
import type { AgreementBlock, AgreementContent, AgreementLocale, AgreementSignatures } from '@/lib/partner-agreement'
import { SIGNATURE_LABELS } from '@/lib/partner-agreement'

interface AgreementDocumentProps {
  content: AgreementContent
  locale: AgreementLocale
  /** When provided, renders the executed signature block at the end. */
  signatures?: AgreementSignatures
  /** Fires once when the reader scrolls to (near) the bottom. */
  onScrolledToEnd?: () => void
  /** Max height of the scroll area; omit for natural height (print / admin). */
  maxHeight?: string
}

const body: React.CSSProperties = {
  fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)',
  fontSize: '0.875rem', lineHeight: 1.65, margin: '0 0 0.625rem',
}

function Blocks({ blocks, keyPrefix }: { blocks: AgreementBlock[]; keyPrefix: string }) {
  return (
    <>
      {blocks.map((b, i) => {
        const k = `${keyPrefix}-${i}`
        if (b.kind === 'h') {
          return (
            <h4 key={k} style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text)', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.04em', margin: '1rem 0 0.375rem' }}>
              {b.text}
            </h4>
          )
        }
        if (b.kind === 'ul') {
          return (
            <ul key={k} style={{ margin: '0 0 0.75rem', paddingLeft: '1.125rem' }}>
              {b.items.map((it, j) => (
                <li key={`${k}-${j}`} style={{ ...body, margin: '0 0 0.25rem', listStyleType: 'disc' }}>{it}</li>
              ))}
            </ul>
          )
        }
        return <p key={k} style={body}>{b.text}</p>
      })}
    </>
  )
}

function SignatureField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: '0.625rem' }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ fontFamily: 'var(--font-serif)', color: value ? 'var(--db-text)' : 'var(--db-text-ghost)', fontSize: '0.9375rem', borderBottom: '1px solid var(--db-border-subtle)', paddingBottom: '0.25rem', marginTop: '0.1875rem' }}>
        {value || '—'}
      </div>
    </div>
  )
}

/**
 * Read-only renderer for the Palmera Provider Partnership Agreement. Shared by
 * the partner sign-off page and the admin detail view so both render identical
 * text. The body carries no partner data; only the signature block does.
 */
export default function AgreementDocument({ content, locale, signatures, onScrolledToEnd, maxHeight }: AgreementDocumentProps) {
  const firedRef = useRef(false)
  const L = SIGNATURE_LABELS[locale] ?? SIGNATURE_LABELS.fr

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (firedRef.current || !onScrolledToEnd) return
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      firedRef.current = true
      onScrolledToEnd()
    }
  }

  return (
    <div
      onScroll={onScrolledToEnd ? handleScroll : undefined}
      // Lenis (root-layout smooth scroll, see src/components/SmoothScroll.tsx)
      // intercepts wheel/touch globally and otherwise hijacks scrolling inside
      // this box, so the reader can never reach the natural end. Same fix as
      // ListingModal's overlay.
      data-lenis-prevent={maxHeight ? true : undefined}
      style={{
        background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)',
        borderRadius: '0.5rem', padding: '1.5rem 1.75rem',
        maxHeight, overflowY: maxHeight ? 'auto' : 'visible',
      }}
    >
      <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.125rem', fontWeight: 400, letterSpacing: '0.03em', margin: '0 0 0.75rem' }}>
        {content.title}
      </h2>

      {signatures && (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-faint)', letterSpacing: '0.04em', margin: '0 0 1rem' }}>
          {L.effectiveDate}: <span style={{ color: 'var(--db-text-muted)' }}>{signatures.effectiveDate}</span>
        </p>
      )}

      <Blocks blocks={content.intro} keyPrefix="intro" />

      {content.sections.map((sec, i) => (
        <section key={`sec-${i}`} style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text)', fontSize: '0.8125rem', fontWeight: 500, letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
            {sec.heading}
          </h3>
          <Blocks blocks={sec.blocks} keyPrefix={`sec-${i}`} />
        </section>
      ))}

      {signatures && (
        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--db-border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))', gap: '1.5rem 2.5rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text)', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>{L.palmeraHeading}</p>
            {signatures.palmeraPending ? (
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--db-text-ghost)', fontSize: '0.875rem', margin: 0 }}>
                {L.awaitingCountersignature}
              </p>
            ) : (
              <>
                <SignatureField label={L.representative} value={signatures.palmera.name} />
                <SignatureField label={L.title} value={signatures.palmera.title} />
                <SignatureField label={L.date} value={signatures.palmera.date} />
              </>
            )}
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text)', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>{L.providerHeading}</p>
            <SignatureField label={L.businessName} value={signatures.provider.businessName} />
            <SignatureField label={L.representative} value={signatures.provider.name} />
            <SignatureField label={L.title} value={signatures.provider.title} />
            <SignatureField label={L.date} value={signatures.provider.date} />
          </div>
        </div>
      )}
    </div>
  )
}
