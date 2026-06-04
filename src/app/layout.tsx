import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Palmera Experience',
  description: 'Ease into a space where plans feel lighter and moments feel shared. Curated experiences, effortless group planning, and seamless bookings.',
  openGraph: {
    title: 'The Palmera Experience',
    description: 'Ease into a space where plans feel lighter and moments feel shared. Curated experiences, effortless group planning, and seamless bookings.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Palmera Experience',
    description: 'Ease into a space where plans feel lighter and moments feel shared.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="shortcut icon" href="/images/favicon.png" type="image/x-icon" />
      </head>
      <body>{children}</body>
    </html>
  )
}
