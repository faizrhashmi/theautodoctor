import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  try {
    // Fetch session with mechanic and customer info
    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select('id, status, mechanic_id, customer_user_id')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    let mechanicName: string | null = null
    let mechanicUserId: string | null = null
    let customerName: string | null = null

    // Fetch mechanic name and user_id if assigned
    if (session.mechanic_id) {
      const { data: mechanic } = await supabaseAdmin
        .from('mechanics')
        .select('name, user_id')
        .eq('id', session.mechanic_id)
        .maybeSingle()

      mechanicName = mechanic?.name || null
      mechanicUserId = mechanic?.user_id || null
    }

    // Fetch customer name
    if (session.customer_user_id) {
      // Try profiles first
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', session.customer_user_id)
        .maybeSingle()

      if (profile?.full_name) {
        customerName = profile.full_name
      } else {
        // Fallback to auth.users metadata or email
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(session.customer_user_id)
        if (user?.user_metadata?.name) {
          customerName = user.user_metadata.name
        } else if (user?.email) {
          customerName = user.email.split('@')[0] || null
        }
      }
    }

    return NextResponse.json({
      status: session.status,
      mechanicId: mechanicUserId,  // Use user_id (auth ID) not mechanic_id (profile ID)
      customerId: session.customer_user_id,
      mechanicName,
      customerName,
    })
  } catch (error: any) {
    console.error('Error fetching session info:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
