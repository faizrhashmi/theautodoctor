import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/debug/reset-mechanic-password
 *
 * Reset a mechanic's password for testing
 * Body: { email: string, newPassword: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'email and newPassword required' },
        { status: 400 }
      )
    }

    console.log(`[RESET PASSWORD] Attempting to reset password for ${email}`)

    // First check if user exists in auth
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      return NextResponse.json({
        error: 'Failed to list users',
        details: listError.message
      }, { status: 500 })
    }

    const user = authUsers.users.find(u => u.email === email)

    if (!user) {
      return NextResponse.json({
        error: 'User not found in auth.users',
        email,
        suggestion: 'User might need to be created first'
      }, { status: 404 })
    }

    console.log(`[RESET PASSWORD] Found user ${user.id}`)

    // Check profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    // Check if mechanic exists
    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('id, name, email')
      .eq('user_id', user.id)
      .maybeSingle()

    // Reset password
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to reset password',
        details: updateError.message
      }, { status: 500 })
    }

    console.log(`[RESET PASSWORD] ✅ Password reset successful for ${email}`)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        role: profile?.role || 'unknown',
      },
      mechanic: mechanic ? {
        id: mechanic.id,
        name: mechanic.name,
      } : null,
    })
  } catch (error: any) {
    console.error('[RESET PASSWORD] Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * GET /api/debug/reset-mechanic-password?email=xxx
 *
 * Check mechanic account status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    // Check auth.users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const user = authUsers.users.find(u => u.email === email)

    if (!user) {
      return NextResponse.json({
        exists: false,
        email,
        message: 'User not found in auth.users',
      })
    }

    // Check profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    // Check mechanic
    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('id, name, email, service_tier')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      exists: true,
      user: {
        id: user.id,
        email: user.email,
        confirmed_at: user.confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
      },
      profile: profile ? {
        role: profile.role,
        full_name: profile.full_name,
      } : null,
      mechanic: mechanic ? {
        id: mechanic.id,
        name: mechanic.name,
        service_tier: mechanic.service_tier,
      } : null,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
