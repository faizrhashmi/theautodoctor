import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/debug/check-mechanic?mechanicId=xxx
 *
 * Check mechanic record to see user_id mapping
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mechanicId = searchParams.get('mechanicId')

    if (!mechanicId) {
      return NextResponse.json({ error: 'mechanicId required' }, { status: 400 })
    }

    // Get mechanic record
    const { data: mechanic, error } = await supabaseAdmin
      .from('mechanics')
      .select('id, name, email, user_id')
      .eq('id', mechanicId)
      .maybeSingle()

    if (error || !mechanic) {
      return NextResponse.json({
        error: 'Mechanic not found',
        mechanicId,
        details: error?.message
      }, { status: 404 })
    }

    // Check if user_id exists in auth.users
    let authUser = null
    if (mechanic.user_id) {
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(mechanic.user_id)
      authUser = user?.user || null
    }

    return NextResponse.json({
      mechanic: {
        id: mechanic.id,
        name: mechanic.name,
        email: mechanic.email,
        user_id: mechanic.user_id,
      },
      authUser: authUser ? {
        id: authUser.id,
        email: authUser.email,
      } : null,
      hasUserIdSet: !!mechanic.user_id,
      userIdMatchesAuth: authUser?.id === mechanic.user_id,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
