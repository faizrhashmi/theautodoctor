import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { password } = await req.json()

    if (!password || password !== process.env.ADMIN_DASH_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set('aad_admin', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // set false on localhost if needed
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
