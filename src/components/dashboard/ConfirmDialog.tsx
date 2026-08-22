'use client'
import React from 'react'
import { useLocale } from '@/lib/use-locale'
import { useEscape } from '@/lib/use-escape'

const STR = {
  fr: { cancel: 'Annuler', confirm: 'Confirmer', busy: 'En cours…' },
  en: { cancel: 'Cancel', confirm: 'Confirm', busy: 'Working…' },
}

interface ConfirmDialogProps {
  title: string
  children: React.ReactNode          // main message body
  note?: string                      // smaller secondary note
  error?: string
  confirmLabel?: string
  busyLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Admin is English-only; pass 'en' so a fr cookie can't flip these buttons. */
  locale?: 'fr' | 'en'
}

/**
 * Shared confirmation modal for the dashboard. Uses the opaque `--db-bg-modal`
 * token (not the translucent `--db-bg-card`) so it never appears see-through.
 * Single source of truth — don't hand-roll new confirm modals.
 */
export default function ConfirmDialog({
  title,
  children,
  note,
  error,
  confirmLabel,
  busyLabel,
  busy = false,
  onConfirm,
  onCancel,
  locale: forcedLocale,
}: ConfirmDialogProps) {
  const cookieLocale = useLocale()
  const s = STR[forcedLocale || cookieLocale]
  useEscape(busy ? undefined : onCancel)
  const confirmText = confirmLabel || s.confirm
  const busyText = busyLabel || s.busy
  return (
    <div
      onClick={() => { if (!busy) onCancel() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--db-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '26rem', background: 'var(--db-bg-modal)', border: '1px solid var(--db-border)', borderRadius: '0.75rem', padding: '1.75rem', boxShadow: '0 1.5rem 3rem rgba(0,0,0,0.45)' }}
      >
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.125rem', fontWeight: 400, margin: '0 0 0.75rem' }}>{title}</h2>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text-muted)', fontSize: '0.8125rem', lineHeight: 1.6, margin: '0 0 0.5rem' }}>{children}</p>
        {note && (
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text-faint)', fontSize: '0.6875rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>{note}</p>
        )}
        {error && <p style={{ fontSize: '0.75rem', color: 'var(--db-alert)', fontFamily: 'var(--font-sans)', margin: '0 0 0.75rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{ background: 'transparent', border: '1px solid var(--db-border)', color: 'var(--db-text-muted)', padding: '0.5rem 1rem', borderRadius: '0.25rem', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: busy ? 'default' : 'pointer' }}
          >
            {s.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{ background: 'var(--db-alert)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.25rem', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.02em', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}
          >
            {busy ? busyText : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
