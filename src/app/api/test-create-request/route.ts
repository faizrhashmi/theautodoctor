import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { broadcastSessionRequest } from '@/lib/realtimeChannels'

// Prevent this from being called during build/static generation
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  // Only allow in development mode to prevent ghost requests in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'Test endpoint disabled in production'
    }, { status: 403 })
  }

  try {
    // Get a customer ID from the database
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .limit(1)
      .single()

    if (!profiles) {
      return NextResponse.json({ error: 'No profiles found' }, { status: 404 })
    }

    // Delete any existing pending requests for this customer
    await supabaseAdmin
      .from('session_requests')
      .delete()
      .eq('customer_id', profiles.id)
      .eq('status', 'pending')

    // Create a new test session request
    const { data: newRequest, error } = await supabaseAdmin
      .from('session_requests')
      .insert({
        customer_id: profiles.id,
        session_type: 'chat',
        plan_code: 'chat10',
        status: 'pending',
        customer_name: profiles.full_name || 'Test Customer',
        customer_email: 'test@example.com',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create test request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Test session_request created:', newRequest)

    // Broadcast it
    await broadcastSessionRequest('new_request', { request: newRequest })

    return NextResponse.json({
      success: true,
      message: 'Test session_request created successfully',
      request: newRequest
    })
  } catch (error: any) {
    console.error('Error creating test request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
