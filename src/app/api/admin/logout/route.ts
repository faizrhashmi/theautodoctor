import { NextResponse } from 'next/server'

function clearCookie(res: NextResponse) {
  res.cookies.set('aad_admin', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // set false on localhost if needed
    expires: new Date(0),
    path: '/',
  })
  return res
}

// Hitting the URL directly in the browser? Redirect to /admin/login
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url))
  return clearCookie(res)
}

// Called from a client fetch() in your Logout button
export async function POST() {
  const res = NextResponse.json({ ok: true })
  return clearCookie(res)
}
