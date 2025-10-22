import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyPassword, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Get the mechanic from database
    const { data: mech, error } = await supabaseAdmin
      .from('mechanics')
      .select('id, email, password_hash')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!mech) {
      return NextResponse.json({
        found: false,
        message: 'No mechanic found with this email'
      })
    }

    // Test password verification
    const isValid = verifyPassword(password, mech.password_hash)

    // Also create a new hash for comparison
    const newHash = hashPassword(password)

    return NextResponse.json({
      found: true,
      mechanicId: mech.id,
      email: mech.email,
      passwordValid: isValid,
      storedHashFormat: mech.password_hash?.includes(':') ? 'correct (salt:hash)' : 'incorrect',
      storedHashLength: mech.password_hash?.length || 0,
      testNewHash: newHash,
      testNewHashVerify: verifyPassword(password, newHash),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
