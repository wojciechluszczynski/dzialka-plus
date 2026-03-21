import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname

  // Public routes
  const isInviteRoute = pathname.startsWith('/invite/')
  const isAuthRoute = pathname.startsWith('/auth')
  const isPublic = isInviteRoute || isAuthRoute || pathname === '/'

  // If no session and not public → redirect to login
  if (!session && !isPublic) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If has session and on auth page → redirect to app
  // Exception: workspace-setup must stay reachable for users who just signed in
  // but have no workspace yet (anonymous or first magic-link login).
  const isWorkspaceSetup = pathname.startsWith('/auth/workspace-setup')
  if (session && isAuthRoute && !isWorkspaceSetup) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/app'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
