import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[logout] Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const redirectUrl = new URL('/customer/login', req.nextUrl.origin)
    return NextResponse.redirect(redirectUrl, 303)
  } catch (error: any) {
    console.error('[logout] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
