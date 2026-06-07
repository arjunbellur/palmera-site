'use client'
import { useRouter } from 'next/navigation'

type Status = 'incomplete' | 'in_progress' | 'complete'
type Priority = 'must_have' | 'first_month' | 'before_payments'

interface SectionCardProps {
  title: string
  description: string
  status: Status
  priority: Priority
  href: string
  locked?: boolean
}

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

export default function SectionCard({
  title,
  description,
  status,
  priority,
  href,
  locked = false,
}: SectionCardProps) {
  const router = useRouter()
  const s = statusConfig[status]
  const p = priorityConfig[priority]

  return (
    <div
      onClick={() => !locked && router.push(href)}
      style={{
        background: status === 'complete' ? 'rgba(158,118,59,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${status === 'complete' ? 'rgba(158,118,59,0.35)' : 'rgba(223,201,166,0.15)'}`,
        borderRadius: '8px',
        padding: '22px 24px',
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.4 : 1,
        transition: 'border-color 0.2s, background 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!locked) (e.currentTarget as HTMLDivElement).style.background = status === 'complete' ? 'rgba(158,118,59,0.12)' : 'rgba(255,255,255,0.07)'
      }}
      onMouseLeave={e => {
        if (!locked) (e.currentTarget as HTMLDivElement).style.background = status === 'complete' ? 'rgba(158,118,59,0.08)' : 'rgba(255,255,255,0.04)'
      }}
    >
      {status === 'complete' && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: '3px', height: '100%',
          background: '#9e763b',
          borderRadius: '0 8px 8px 0',
        }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          color: '#dfc9a6',
          fontSize: '17px',
          fontWeight: 500,
          margin: 0,
          letterSpacing: '0.02em',
        }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.dot }} />
          <span style={{ fontSize: '12px', color: 'rgba(223,201,166,0.75)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
            {s.label}
          </span>
        </div>
      </div>

      <p style={{
        fontSize: '13px',
        color: 'rgba(223,201,166,0.7)',
        margin: '0 0 16px',
        fontFamily: 'var(--font-sans)',
        lineHeight: 1.6,
      }}>
        {description}
      </p>

      <span style={{
        fontSize: '10px',
        color: p.color,
        fontFamily: 'var(--font-sans)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        border: `1px solid ${p.border}`,
        padding: '3px 9px',
        borderRadius: '3px',
      }}>
        {p.label}
      </span>
    </div>
  )
}
