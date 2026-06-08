'use client'
import Navbar from './Navbar'

export default function NavbarWrapper({ messages }: { messages: Record<string, string> }) {
  return <Navbar messages={messages} />
}
