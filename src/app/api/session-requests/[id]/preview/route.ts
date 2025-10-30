import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/session-requests/[id]/preview
 *
 * Returns read-only preview of a session request for mechanics
 * Includes signed URLs for attachments (valid for 60 minutes)
 *
 * Auth: Mechanics only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id

    // Get the authenticated user
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Verify user is a mechanic
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'mechanic') {
      return NextResponse.json(
        { error: 'Only mechanics can preview requests' },
        { status: 403 }
      )
    }

    // Fetch the session request with related data
    const { data: sessionRequest, error: requestError } = await supabaseAdmin
      .from('session_requests')
      .select(`
        id,
        created_at,
        updated_at,
        customer_id,
        mechanic_id,
        session_type,
        plan_code,
        status,
        customer_name,
        customer_email,
        notes,
        metadata,
        vehicle_id,
        vehicles (
          id,
          make,
          model,
          year,
          vin,
          color,
          mileage,
          plate,
          nickname
        )
      `)
      .eq('id', requestId)
      .eq('status', 'pending') // Only allow preview of pending requests
      .single()

    if (requestError || !sessionRequest) {
      return NextResponse.json(
        { error: 'Request not found or not available for preview' },
        { status: 404 }
      )
    }

    // Parse metadata for intake fields
    const metadata = sessionRequest.metadata || {}
    const urgent = metadata.urgent || false
    const concern = metadata.concern || metadata.notes || ''
    const city = metadata.city || ''
    const phone = metadata.phone || ''

    // Vehicle info (from linked vehicle or metadata)
    const vehicle = sessionRequest.vehicles || {
      make: metadata.make || '',
      model: metadata.model || '',
      year: metadata.year || '',
      vin: metadata.vin || '',
      mileage: metadata.odometer || metadata.mileage || '',
      plate: metadata.plate || '',
    }

    // Fetch attachments from storage
    // Attachments are stored at: request-attachments/<requestId>/*
    const { data: files, error: filesError } = await supabaseAdmin
      .storage
      .from('session-files')
      .list(`request-attachments/${requestId}`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'asc' }
      })

    let attachments: Array<{ name: string; url: string; size: number }> = []

    if (!filesError && files && files.length > 0) {
      // Generate signed URLs for each attachment (valid for 60 minutes)
      attachments = await Promise.all(
        files.map(async (file) => {
          const { data: signedData } = await supabaseAdmin
            .storage
            .from('session-files')
            .createSignedUrl(`request-attachments/${requestId}/${file.name}`, 3600) // 60 minutes

          return {
            name: file.name,
            url: signedData?.signedUrl || '',
            size: file.metadata?.size || 0
          }
        })
      )
    }

    // Build preview response
    const preview = {
      id: sessionRequest.id,
      createdAt: sessionRequest.created_at,
      updatedAt: sessionRequest.updated_at,
      status: sessionRequest.status,
      sessionType: sessionRequest.session_type,
      planCode: sessionRequest.plan_code,
      urgent,

      // Customer info
      customer: {
        id: sessionRequest.customer_id,
        name: sessionRequest.customer_name || '',
        email: sessionRequest.customer_email || '',
        phone,
        city
      },

      // Vehicle info
      vehicle: {
        id: sessionRequest.vehicle_id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        mileage: vehicle.mileage,
        plate: vehicle.plate,
        nickname: vehicle.nickname || null
      },

      // Issue details
      concern,
      notes: sessionRequest.notes || concern,

      // Attachments with signed URLs
      attachments
    }

    return NextResponse.json({ preview })

  } catch (error: any) {
    console.error('[Preview API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
