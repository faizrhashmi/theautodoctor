// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAdmin = pathname.startsWith('/admin')
  const isLogin = pathname.startsWith('/admin/login')
  const isLogout = pathname.startsWith('/admin/logout')
  const cookie = req.cookies.get('aad_admin')?.value

  if (isAdmin && !isLogin && !isLogout && cookie !== '1') {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
