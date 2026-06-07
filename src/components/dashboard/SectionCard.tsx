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
  incomplete: { label: 'Not started', color: 'rgba(223,201,166,0.25)', dot: 'rgba(223,201,166,0.3)' },
  in_progress: { label: 'In progress', color: 'rgba(190,154,86,0.2)', dot: '#be9a56' },
  complete: { label: 'Complete', color: 'rgba(158,118,59,0.15)', dot: '#9e763b' },
}

const priorityConfig = {
  must_have: { label: 'Required to list', color: '#be9a56' },
  first_month: { label: 'First month', color: 'rgba(223,201,166,0.5)' },
  before_payments: { label: 'Before payments', color: 'rgba(223,201,166,0.5)' },
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
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${status === 'complete' ? 'rgba(158,118,59,0.3)' : 'rgba(223,201,166,0.1)'}`,
        borderRadius: '8px',
        padding: '20px 24px',
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.4 : 1,
        transition: 'border-color 0.2s, background 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!locked) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={e => {
        if (!locked) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'
      }}
    >
      {status === 'complete' && (
        <div style={{
          position: 'absolute',
          top: 0, right: 0,
          width: '3px',
          height: '100%',
          background: '#9e763b',
          borderRadius: '0 8px 8px 0',
        }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          color: 'var(--color-tan)',
          fontSize: '16px',
          fontWeight: 400,
          margin: 0,
          letterSpacing: '0.02em',
        }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.dot }} />
          <span style={{ fontSize: '11px', color: 'rgba(223,201,166,0.6)', fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }}>
            {s.label}
          </span>
        </div>
      </div>

      <p style={{
        fontSize: '13px',
        color: 'rgba(223,201,166,0.5)',
        margin: '0 0 14px',
        fontFamily: 'var(--font-sans)',
        lineHeight: 1.5,
      }}>
        {description}
      </p>

      <span style={{
        fontSize: '10px',
        color: p.color,
        fontFamily: 'var(--font-sans)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        border: `1px solid ${p.color}`,
        padding: '2px 8px',
        borderRadius: '2px',
      }}>
        {p.label}
      </span>

      {locked && (
        <span style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          fontSize: '16px',
          opacity: 0.4,
        }}>🔒</span>
      )}
    </div>
  )
}
