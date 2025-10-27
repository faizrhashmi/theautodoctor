import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/mechanics/clients
 *
 * Add a new client to CRM
 *
 * Body:
 * {
 *   customer_name: string
 *   phone: string
 *   email?: string
 *   address?: string
 *   vehicle_make?: string
 *   vehicle_model?: string
 *   vehicle_year?: number
 *   vehicle_vin?: string
 *   notes?: string
 *   preferred_contact_method?: 'phone' | 'email' | 'text'
 * }
 */
export async function POST(req: NextRequest) {
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

    // Parse request body
    const body = await req.json()
    const {
      customer_name,
      phone,
      email,
      address,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_vin,
      notes,
      preferred_contact_method
    } = body

    // Validation
    if (!customer_name || !phone) {
      return NextResponse.json({
        error: 'customer_name and phone are required'
      }, { status: 400 })
    }

    // Check if client already exists with this phone
    const { data: existingClient } = await supabaseAdmin
      .from('mechanic_clients')
      .select('id')
      .eq('mechanic_id', session.mechanic_id)
      .eq('phone', phone)
      .single()

    if (existingClient) {
      return NextResponse.json({
        error: 'A client with this phone number already exists in your CRM'
      }, { status: 400 })
    }

    // Create client
    const clientData = {
      mechanic_id: session.mechanic_id,
      customer_name,
      phone,
      email: email || null,
      address: address || null,
      vehicle_info: vehicle_make || vehicle_model || vehicle_year
        ? {
            make: vehicle_make,
            model: vehicle_model,
            year: vehicle_year,
            vin: vehicle_vin
          }
        : null,
      notes: notes || null,
      preferred_contact_method: preferred_contact_method || 'phone',
      total_jobs: 0,
      total_revenue: 0,
      last_service_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: client, error: clientError } = await supabaseAdmin
      .from('mechanic_clients')
      .insert(clientData)
      .select()
      .single()

    if (clientError) {
      console.error('[CLIENTS API] Create error:', clientError)
      return NextResponse.json({ error: 'Failed to add client' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      client
    })

  } catch (error) {
    console.error('[CLIENTS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/mechanics/clients
 *
 * Get all clients in CRM
 * Query params:
 *   - search: string (search by name, phone, or email)
 *   - sort_by: 'name' | 'last_service' | 'total_revenue' (default: 'name')
 *   - limit: number (default: 100)
 */
export async function GET(req: NextRequest) {
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

    // Query params
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort_by') || 'name'
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get clients
    let query = supabaseAdmin
      .from('mechanic_clients')
      .select('*')
      .eq('mechanic_id', session.mechanic_id)

    // Apply sorting
    if (sortBy === 'last_service') {
      query = query.order('last_service_date', { ascending: false, nullsFirst: false })
    } else if (sortBy === 'total_revenue') {
      query = query.order('total_revenue', { ascending: false })
    } else {
      query = query.order('customer_name', { ascending: true })
    }

    const { data: clients, error: clientsError } = await query.limit(limit)

    if (clientsError) {
      console.error('[CLIENTS API] Fetch error:', clientsError)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    // Apply search filter in memory (since we need to search across multiple fields)
    let filteredClients = clients || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredClients = filteredClients.filter(client =>
        client.customer_name.toLowerCase().includes(searchLower) ||
        client.phone.includes(searchLower) ||
        (client.email && client.email.toLowerCase().includes(searchLower))
      )
    }

    return NextResponse.json({
      clients: filteredClients
    })

  } catch (error) {
    console.error('[CLIENTS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
