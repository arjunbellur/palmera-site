import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  // If no locale cookie set, default to French
  if (!request.cookies.get('locale')) {
    response.cookies.set('locale', 'fr', { path: '/', maxAge: 60 * 60 * 24 * 365 })
  }
  return response
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
