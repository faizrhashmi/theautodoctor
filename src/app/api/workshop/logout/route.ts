import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[workshop-logout] Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Clear all cookies and redirect to homepage
    const redirectUrl = new URL('/', req.nextUrl.origin)
    const response = NextResponse.redirect(redirectUrl, 303)

    // Clear Supabase auth cookies
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')

    return response
  } catch (error: any) {
    console.error('[workshop-logout] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
