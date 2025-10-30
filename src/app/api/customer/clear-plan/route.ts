import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  // ✅ SECURITY: Require customer authentication
  const authResult = await requireCustomerAPI(req)
  if (authResult.error) return authResult.error

  const customer = authResult.data
  console.log(`[CUSTOMER] ${customer.email} clearing plan`)

  // Clear the preferred_plan using admin client for proper permissions
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ preferred_plan: null })
    .eq('id', customer.id)

  if (error) {
    console.error('Failed to clear plan:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(new URL('/customer/dashboard', req.url))
}
