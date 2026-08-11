// Dev-only smoke test for the Resend setup:
//   curl -X POST http://localhost:3000/api/email/test
// Refuses to run in production — a public send endpoint is a spam vector;
// real sends belong in purpose-built routes with their own auth.
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'test route is dev-only' }, { status: 403 })
  }
  try {
    const result = await sendEmail({
      to: 'palmeraexp@gmail.com',
      subject: 'Hello World',
      html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
    })
    return NextResponse.json({ ok: true, id: result.data?.id ?? null, error: result.error ?? null })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
