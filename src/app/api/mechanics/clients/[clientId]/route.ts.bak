import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * PATCH /api/mechanics/clients/[clientId]
 *
 * Update client information
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const clientId = params.clientId

    // Get client to verify ownership
    const { data: existingClient, error: fetchError } = await supabaseAdmin
      .from('mechanic_clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (fetchError || !existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (existingClient.mechanic_id !== session.mechanic_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse request body
    const body = await req.json()
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Only update fields that are provided
    if (body.customer_name !== undefined) updateData.customer_name = body.customer_name
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.email !== undefined) updateData.email = body.email
    if (body.address !== undefined) updateData.address = body.address
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.preferred_contact_method !== undefined) updateData.preferred_contact_method = body.preferred_contact_method

    // Update vehicle info if provided
    if (body.vehicle_make !== undefined || body.vehicle_model !== undefined || body.vehicle_year !== undefined || body.vehicle_vin !== undefined) {
      updateData.vehicle_info = {
        make: body.vehicle_make,
        model: body.vehicle_model,
        year: body.vehicle_year,
        vin: body.vehicle_vin
      }
    }

    const { data: client, error: updateError } = await supabaseAdmin
      .from('mechanic_clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single()

    if (updateError) {
      console.error('[CLIENT UPDATE API] Error:', updateError)
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      client
    })

  } catch (error) {
    console.error('[CLIENT UPDATE API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/mechanics/clients/[clientId]
 *
 * Delete a client
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const clientId = params.clientId

    // Get client to verify ownership
    const { data: existingClient, error: fetchError } = await supabaseAdmin
      .from('mechanic_clients')
      .select('mechanic_id')
      .eq('id', clientId)
      .single()

    if (fetchError || !existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (existingClient.mechanic_id !== session.mechanic_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete client
    const { error: deleteError } = await supabaseAdmin
      .from('mechanic_clients')
      .delete()
      .eq('id', clientId)

    if (deleteError) {
      console.error('[CLIENT DELETE API] Error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    })

  } catch (error) {
    console.error('[CLIENT DELETE API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/mechanics/clients/[clientId]
 *
 * Get client details with job history
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const clientId = params.clientId

    // Get client
    const { data: client, error: clientError } = await supabaseAdmin
      .from('mechanic_clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (client.mechanic_id !== session.mechanic_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get job history for this client
    const { data: jobs } = await supabaseAdmin
      .from('partnership_revenue_splits')
      .select('*')
      .eq('mechanic_id', session.mechanic_id)
      .contains('job_details', { customer_name: client.customer_name })
      .order('completed_at', { ascending: false })

    return NextResponse.json({
      client,
      job_history: jobs || []
    })

  } catch (error) {
    console.error('[CLIENT DETAIL API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
