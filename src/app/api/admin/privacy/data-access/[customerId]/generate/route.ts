import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { customerId: string } }
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

    const { customerId } = params

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Collect all customer data (PIPEDA requirement)
    const customerData: any = {
      personal_information: {},
      service_history: {},
      communication_history: {},
      consents: {},
      generated_at: new Date().toISOString(),
      generated_by: 'TheAutoDoctor Admin',
      export_format: 'JSON',
    }

    // 1. Personal Information
    customerData.personal_information = {
      id: customer.id,
      email: customer.email,
      full_name: customer.full_name,
      role: customer.role,
    }

    // 2. Customer Consents
    const { data: consents } = await supabase
      .from('customer_consents')
      .select('*')
      .eq('customer_id', customerId)

    customerData.consents = consents || []

    // 3. Session Requests
    const { data: sessionRequests } = await supabase
      .from('session_requests')
      .select('*')
      .eq('customer_id', customerId)

    customerData.service_history.session_requests = sessionRequests || []

    // 4. Virtual Sessions
    const { data: virtualSessions } = await supabase
      .from('virtual_sessions')
      .select('*')
      .eq('customer_id', customerId)

    customerData.service_history.virtual_sessions = virtualSessions || []

    // 5. Intakes
    const { data: intakes } = await supabase
      .from('intakes')
      .select('*')
      .eq('customer_id', customerId)

    customerData.service_history.intakes = intakes || []

    // 6. Privacy Audit Log (customer's own events)
    const { data: auditLog } = await supabase
      .from('privacy_audit_log')
      .select('*')
      .eq('customer_id', customerId)
      .order('event_timestamp', { ascending: false })
      .limit(100)

    customerData.privacy_audit_log = auditLog || []

    // 7. Account Deletion Requests (if any)
    const { data: deletionRequests } = await supabase
      .from('account_deletion_queue')
      .select('*')
      .eq('customer_id', customerId)

    customerData.account_deletion_requests = deletionRequests || []

    // Log the data download generation in privacy audit log
    await supabase.from('privacy_audit_log').insert({
      customer_id: customerId,
      event_type: 'data_download_generated',
      user_id: user.id,
      user_role: 'admin',
      event_details: {
        generated_by_admin: user.id,
        data_categories_included: [
          'personal_information',
          'consents',
          'session_requests',
          'virtual_sessions',
          'intakes',
          'privacy_audit_log',
          'account_deletion_requests',
        ],
        record_count: {
          consents: consents?.length || 0,
          session_requests: sessionRequests?.length || 0,
          virtual_sessions: virtualSessions?.length || 0,
          intakes: intakes?.length || 0,
          audit_log_entries: auditLog?.length || 0,
        },
      },
      legal_basis: 'legal_obligation',
      data_categories_accessed: [
        'profiles',
        'customer_consents',
        'session_requests',
        'virtual_sessions',
        'intakes',
        'privacy_audit_log',
        'account_deletion_queue',
      ],
    })

    // In a production environment, you would:
    // 1. Generate a secure download link
    // 2. Store the data package temporarily
    // 3. Send email notification to customer with download link
    // 4. Set expiration on the download link (e.g., 7 days)

    // For now, return the data package
    return NextResponse.json({
      success: true,
      message: 'Data download package generated successfully',
      customer_email: customer.email,
      customer_name: customer.full_name,
      data_summary: {
        total_consents: consents?.length || 0,
        total_session_requests: sessionRequests?.length || 0,
        total_virtual_sessions: virtualSessions?.length || 0,
        total_intakes: intakes?.length || 0,
        total_audit_log_entries: auditLog?.length || 0,
      },
      // In production, this would be a secure download URL
      // For demo purposes, including the actual data
      data_package: customerData,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Data access generation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
