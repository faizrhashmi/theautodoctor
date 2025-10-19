import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAdmin = pathname.startsWith('/admin')
  const isLogin = pathname.startsWith('/admin/login')
  const isLogout = pathname.startsWith('/admin/logout')
  const cookie = req.cookies.get('aad_admin')?.value

  // Get the correct base URL for redirects
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://www.askautodoctor.com'
    : req.url

  if (isAdmin && !isLogin && !isLogout && cookie !== '1') {
    return NextResponse.redirect(new URL('/admin/login', baseUrl))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}