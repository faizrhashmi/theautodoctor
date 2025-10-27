import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/admin/users/[id]/free-session-override
 *
 * Toggle free session override for a customer (B2C only)
 * This allows admins to grant/revoke free session access for testing or customer support
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  // Verify admin authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { enabled } = await req.json()
    const userId = params.id

    // Get customer profile to verify account type
    const { data: customerProfile } = await supabaseAdmin
      .from('profiles')
      .select('account_type, email')
      .eq('id', userId)
      .single()

    if (!customerProfile) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Only allow toggle for B2C customers (individual account type)
    const isB2C = customerProfile.account_type === 'individual' || !customerProfile.account_type

    if (!isB2C) {
      return NextResponse.json(
        { error: 'Free session override only applies to B2C customers' },
        { status: 400 }
      )
    }

    // Update the free_session_override field
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ free_session_override: enabled })
      .eq('id', userId)

    if (updateError) {
      console.error('[ADMIN] Error updating free session override:', updateError)
      return NextResponse.json(
        { error: 'Failed to update free session override' },
        { status: 500 }
      )
    }

    // Log the admin action
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: user.id,
      target_user_id: userId,
      action_type: enabled ? 'grant_free_session_override' : 'revoke_free_session_override',
      admin_email: user.email,
      metadata: {
        customer_email: customerProfile.email,
        enabled,
      },
    })

    return NextResponse.json({
      success: true,
      message: enabled
        ? 'Free session override granted'
        : 'Free session override revoked',
    })
  } catch (error) {
    console.error('[ADMIN] Error toggling free session override:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
