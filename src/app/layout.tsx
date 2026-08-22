import type { Metadata } from 'next'
import './globals.css'
import Preloader from '@/components/Preloader'
import SmoothScroll from '@/components/SmoothScroll'

export const metadata: Metadata = {
  title: 'The Palmera Experience',
  description: 'Ease into a space where plans feel lighter and moments feel shared.',
  openGraph: {
    title: 'The Palmera Experience',
    description: 'Ease into a space where plans feel lighter and moments feel shared.',
    type: 'website',
  },
}

// Static: no request-time reads here. Locale-aware bits live in
// (marketing)/layout.tsx; app surfaces set their own document language.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="google" content="notranslate" />
        <link rel="shortcut icon" href="/images/favicon.png" type="image/x-icon" />
      </head>
      <body>
        <Preloader />
        <SmoothScroll />
        {children}
      </body>
    </html>
  )
}
