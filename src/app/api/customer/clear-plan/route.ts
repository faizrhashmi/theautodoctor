import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/customer/login', req.url))
  }

  // Clear the preferred_plan using admin client for proper permissions
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ preferred_plan: null })
    .eq('id', user.id)

  if (error) {
    console.error('Failed to clear plan:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(new URL('/customer/dashboard', req.url))
}
