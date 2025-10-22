import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  const supabaseClient = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the user is a participant in this session
  const { data: participant } = await supabaseClient
    .from('session_participants')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!participant) {
    return NextResponse.json({ error: 'Not authorized to end this session' }, { status: 403 })
  }

  // Update session status to completed
  const { error: updateError } = await supabaseClient
    .from('sessions')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Check if this is a fetch request (JSON) or form POST (redirect)
  const contentType = req.headers.get('content-type')
  const acceptHeader = req.headers.get('accept')

  // If the request accepts JSON or has no specific accept header, return JSON
  // Otherwise redirect (for form submissions)
  if (acceptHeader?.includes('application/json') || contentType?.includes('application/json')) {
    return NextResponse.json({ success: true, message: 'Session ended successfully' })
  }

  // Redirect back to dashboard for form submissions
  return NextResponse.redirect(new URL('/customer/dashboard', req.nextUrl.origin))
}
