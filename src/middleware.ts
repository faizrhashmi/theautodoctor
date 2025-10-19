import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /dashboard/* (for admins and signed-in mechanics)
  if (pathname.startsWith('/dashboard')) {
    const isAdmin = req.cookies.get('aad_admin')?.value === '1';
    const mechToken = req.cookies.get('aad_mech')?.value;
    if (!isAdmin && !mechToken) {
      const url = req.nextUrl.clone();
      url.pathname = '/mechanic/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Keep /admin/* compatibility for now (redirect to dashboard)
  if (pathname === '/admin/intakes') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard/intakes';
    url.searchParams.set('from', 'admin');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/intakes'],
};
