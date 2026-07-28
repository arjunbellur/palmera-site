// Legal pages for the main Palmera site — /legal/terms, /legal/privacy, etc.
// The app links straight to these URLs. Content is auto-generated from the
// source .docx files into src/content/legal/*.json — never hand-edit legal
// text here; replace the source document and regenerate.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import terms from '@/content/legal/terms.json'
import privacy from '@/content/legal/privacy.json'
import refunds from '@/content/legal/refunds.json'
import cookies from '@/content/legal/cookies.json'
import aiPolicy from '@/content/legal/ai-policy.json'
import dmca from '@/content/legal/dmca.json'

interface LegalDoc {
  title: string
  entity?: string
  effective?: string
  blocks: { k: string; t: string }[]
}

const DOCS: Record<string, LegalDoc> = {
  terms, privacy, refunds, cookies, 'ai-policy': aiPolicy, dmca,
}

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const doc = DOCS[slug]
  return { title: doc ? `${doc.title} — Palmera` : 'Palmera' }
}

const dark = 'var(--color-dark, #2a2119)'

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = DOCS[slug]
  if (!doc) notFound()

  return (
    <div style={{ background: 'var(--bg-1, #f5f0ea)', minHeight: '100vh' }}>
      {/* Slim header — logo home link + sibling policies */}
      <header style={{ maxWidth: '50rem', margin: '0 auto', padding: '1.5rem clamp(1.5rem,4.5vw,2.5rem) 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          <img src="/images/PALMERA_cracked.png" alt="" width={30} height={30} style={{ objectFit: 'contain' }} />
          <span style={{ fontFamily: 'var(--font-serif)', color: dark, fontSize: '1rem', letterSpacing: '0.12em' }}>PALMERA</span>
        </Link>
        <Link href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'rgba(42,33,25,0.55)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>← Home</Link>
      </header>

      <main style={{ maxWidth: '50rem', margin: '0 auto', padding: '3rem clamp(1.5rem,4.5vw,2.5rem) 4rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.55)', margin: '0 0 0.75rem' }}>
          {doc.entity || 'Palmera Services LLC'}
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif)', color: dark, fontSize: 'clamp(1.875rem, 5vw, 2.75rem)', fontWeight: 400, letterSpacing: '-0.03125rem', lineHeight: 1.15, margin: '0 0 0.75rem' }}>
          {doc.title}
        </h1>
        {doc.effective && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(42,33,25,0.5)', letterSpacing: '0.04em', margin: 0 }}>{doc.effective}</p>
        )}

        <div style={{ borderTop: '1px solid rgba(42,33,25,0.12)', margin: '2rem 0 2.5rem' }} />

        <article>
          {doc.blocks.map((b, i) => {
            if (b.k === 'h1') return <h2 key={i} style={{ fontFamily: 'var(--font-serif)', color: dark, fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.015625rem', margin: '2.75rem 0 1rem', lineHeight: 1.3 }}>{b.t}</h2>
            if (b.k === 'h2') return <h3 key={i} style={{ fontFamily: 'var(--font-serif)', color: dark, fontSize: '1.1875rem', fontWeight: 500, margin: '2rem 0 0.75rem', lineHeight: 1.35 }}>{b.t}</h3>
            if (b.k === 'h3') return <h4 key={i} style={{ fontFamily: 'var(--font-serif)', color: dark, fontSize: '1.0625rem', fontWeight: 500, margin: '1.5rem 0 0.625rem' }}>{b.t}</h4>
            if (b.k === 'b') return <p key={i} style={{ fontFamily: 'var(--font-serif, serif)', color: dark, fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.7, margin: '0 0 0.875rem' }}>{b.t}</p>
            return <p key={i} style={{ fontFamily: 'var(--font-serif, serif)', color: 'rgba(42,33,25,0.85)', fontSize: '1.0625rem', lineHeight: 1.7, margin: '0 0 0.875rem' }}>{b.t}</p>
          })}
        </article>

        {/* Sibling policies */}
        <div style={{ borderTop: '1px solid rgba(42,33,25,0.12)', marginTop: '3.5rem', paddingTop: '1.75rem' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.5)', margin: '0 0 0.875rem' }}>Palmera policies</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem' }}>
            {Object.entries(DOCS).filter(([s]) => s !== slug).map(([s, d]) => (
              <Link key={s} href={`/legal/${s}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(42,33,25,0.65)', textDecoration: 'underline', textUnderlineOffset: '3px', letterSpacing: '0.03em' }}>
                {d.title}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
