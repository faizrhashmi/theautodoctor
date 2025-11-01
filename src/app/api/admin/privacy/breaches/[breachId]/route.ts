import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET single breach
export async function GET(
  req: NextRequest,
  { params }: { params: { breachId: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { breachId } = params

    // Get breach details
    const { data: breach, error: breachError } = await supabase
      .from('data_breach_log')
      .select('*')
      .eq('id', breachId)
      .single()

    if (breachError || !breach) {
      return NextResponse.json(
        { error: 'Breach not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      breach,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Breach detail API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH update breach
export async function PATCH(
  req: NextRequest,
  { params }: { params: { breachId: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { breachId } = params
    const updates = await req.json()

    // Allowed fields to update
    const allowedFields = [
      'breach_title',
      'breach_description',
      'severity',
      'breach_cause',
      'response_status',
      'affected_customer_count',
      'data_types_affected',
      'remediation_steps',
      'handled_by',
      'contained_at',
      'remediated_at',
    ]

    const filteredUpdates: any = {}
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key]
      }
    })

    filteredUpdates.updated_at = new Date().toISOString()

    // Update breach
    const { error: updateError } = await supabase
      .from('data_breach_log')
      .update(filteredUpdates)
      .eq('id', breachId)

    if (updateError) {
      console.error('Error updating breach:', updateError)
      return NextResponse.json(
        { error: 'Failed to update breach' },
        { status: 500 }
      )
    }

    // Log the update
    await supabase.from('privacy_audit_log').insert({
      customer_id: null,
      event_type: 'admin_modified_customer_data',
      user_id: user.id,
      user_role: 'admin',
      event_details: {
        action: 'update_breach',
        breach_id: breachId,
        updated_fields: Object.keys(filteredUpdates),
      },
      legal_basis: 'legal_obligation',
      data_categories_accessed: ['data_breach_log'],
    })

    return NextResponse.json({
      success: true,
      message: 'Breach updated successfully',
    })
  } catch (error) {
    console.error('Breach update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
