import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists (optional - for security, you might want to always return success)
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = users.users.some(u => u.email === email)

    if (!userExists) {
      // For security, return success even if user doesn't exist
      // This prevents email enumeration attacks
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a reset link has been sent',
      })
    }

    // Send password reset email
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/customer/reset-password`,
    })

    if (error) {
      console.error('[forgot-password] Error:', error)
      return NextResponse.json(
        { error: 'Failed to send reset email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent',
    })
  } catch (error: any) {
    console.error('[forgot-password] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
