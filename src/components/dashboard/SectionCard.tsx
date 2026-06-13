'use client'
import { useRouter } from 'next/navigation'

type Status = 'incomplete' | 'in_progress' | 'complete'
type Priority = 'must_have' | 'first_month' | 'before_payments'

const statusConfig = {
  incomplete: { label: 'Not started', dot: 'var(--db-text-faint)' },
  in_progress: { label: 'In progress', dot: '#be9a56' },
  complete: { label: 'Complete', dot: '#9e763b' },
}

const priorityConfig = {
  must_have: { label: 'Required to list', color: '#be9a56', border: 'rgba(190,154,86,0.5)' },
  first_month: { label: 'First month', color: 'var(--db-text)', border: 'var(--db-border-subtle)' },
  before_payments: { label: 'Before payments', color: 'var(--db-text)', border: 'var(--db-border-subtle)' },
}

export default function SectionCard({ title, description, status, priority, href, locked = false }: {
  title: string; description: string; status: Status; priority: Priority; href: string; locked?: boolean
}) {
  const router = useRouter()
  const s = statusConfig[status]
  const p = priorityConfig[priority]
  const bgBase = status === 'complete' ? 'var(--db-bg-card-active)' : 'var(--db-bg-card)'
  const bgHover = status === 'complete' ? 'var(--db-bg-card-active-hover)' : 'var(--db-bg-card-hover)'

  return (
    <div onClick={() => !locked && router.push(href)}
      style={{ background: bgBase, border: `1px solid ${status === 'complete' ? 'rgba(158,118,59,0.3)' : 'var(--db-border-dashed)'}`, borderRadius: '0.5rem', padding: '1.375rem 1.5rem', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.4 : 1, transition: 'background 0.2s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => { if (!locked) (e.currentTarget as HTMLDivElement).style.background = bgHover }}
      onMouseLeave={e => { if (!locked) (e.currentTarget as HTMLDivElement).style.background = bgBase }}>
      {status === 'complete' && <div style={{ position: 'absolute', top: 0, right: 0, width: '3px', height: '100%', background: '#9e763b', borderRadius: '0 0.5rem 0.5rem 0' }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.0625rem', fontWeight: 500, margin: 0, letterSpacing: '0.02em' }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0, marginLeft: '0.75rem' }}>
          <div style={{ width: '0.4375rem', height: '0.4375rem', borderRadius: '50%', background: s.dot }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>{s.label}</span>
        </div>
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: '0 0 1rem', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>{description}</p>
      <span style={{ fontSize: '0.625rem', color: p.color, fontFamily: 'var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', border: `1px solid ${p.border}`, padding: '0.1875rem 0.5625rem', borderRadius: '0.1875rem' }}>{p.label}</span>
    </div>
  )
}
