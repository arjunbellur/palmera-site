import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Partner with Palmera — List Your Experience',
  description:
    'Join the Palmera network. List your luxury experience, villa, yacht, or concierge service and connect with high-intent travellers across West Africa.',
}

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
