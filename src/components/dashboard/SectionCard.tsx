'use client'
import { useRouter } from 'next/navigation'

type Status = 'incomplete' | 'in_progress' | 'complete'
type Priority = 'must_have' | 'first_month' | 'before_payments'

const statusConfig = {
  incomplete: { label: 'Not started', dot: 'rgba(223,201,166,0.4)' },
  in_progress: { label: 'In progress', dot: '#be9a56' },
  complete: { label: 'Complete', dot: '#9e763b' },
}

const priorityConfig = {
  must_have: { label: 'Required to list', color: '#be9a56', border: 'rgba(190,154,86,0.5)' },
  first_month: { label: 'First month', color: '#dfc9a6', border: 'rgba(223,201,166,0.35)' },
  before_payments: { label: 'Before payments', color: '#dfc9a6', border: 'rgba(223,201,166,0.35)' },
}

export default function SectionCard({ title, description, status, priority, href, locked = false }: {
  title: string; description: string; status: Status; priority: Priority; href: string; locked?: boolean
}) {
  const router = useRouter()
  const s = statusConfig[status]
  const p = priorityConfig[priority]

  return (
    <div onClick={() => !locked && router.push(href)}
      style={{ background: status === 'complete' ? 'rgba(158,118,59,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${status === 'complete' ? 'rgba(158,118,59,0.3)' : 'rgba(223,201,166,0.12)'}`, borderRadius: '0.5rem', padding: '1.375rem 1.5rem', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.4 : 1, transition: 'background 0.2s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => { if (!locked) (e.currentTarget as HTMLDivElement).style.background = status === 'complete' ? 'rgba(158,118,59,0.12)' : 'rgba(255,255,255,0.07)' }}
      onMouseLeave={e => { if (!locked) (e.currentTarget as HTMLDivElement).style.background = status === 'complete' ? 'rgba(158,118,59,0.08)' : 'rgba(255,255,255,0.04)' }}>
      {status === 'complete' && <div style={{ position: 'absolute', top: 0, right: 0, width: '3px', height: '100%', background: '#9e763b', borderRadius: '0 0.5rem 0.5rem 0' }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', color: '#dfc9a6', fontSize: '1.0625rem', fontWeight: 500, margin: 0, letterSpacing: '0.02em' }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0, marginLeft: '0.75rem' }}>
          <div style={{ width: '0.4375rem', height: '0.4375rem', borderRadius: '50%', background: s.dot }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(223,201,166,0.75)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>{s.label}</span>
        </div>
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'rgba(223,201,166,0.72)', margin: '0 0 1rem', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>{description}</p>
      <span style={{ fontSize: '0.625rem', color: p.color, fontFamily: 'var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', border: `1px solid ${p.border}`, padding: '0.1875rem 0.5625rem', borderRadius: '0.1875rem' }}>{p.label}</span>
    </div>
  )
}
