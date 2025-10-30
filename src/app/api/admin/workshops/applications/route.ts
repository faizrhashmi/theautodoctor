// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { ensureAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  // Check admin auth
  const adminCheck = await ensureAdmin()
  if (!adminCheck.ok) return adminCheck.res

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  try {
    let query = supabaseAdmin
      .from('organizations')
      .select(`
        id,
        created_at,
        organization_type,
        name,
        slug,
        email,
        phone,
        status,
        verification_status,
        business_registration_number,
        tax_id,
        website,
        industry,
        address,
        city,
        province,
        postal_code,
        coverage_postal_codes,
        service_radius_km,
        mechanic_capacity,
        commission_rate,
        stripe_account_id,
        stripe_account_status,
        created_by
      `)
      .eq('organization_type', 'workshop')
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: applications, error } = await query

    if (error) {
      console.error('[ADMIN WORKSHOPS] Error fetching applications:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch contact names from auth users
    const applicationsWithContacts = await Promise.all(
      applications.map(async (app) => {
        let contactName = 'N/A'
        if (app.created_by) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(app.created_by)
          if (userData?.user?.user_metadata?.full_name) {
            contactName = userData.user.user_metadata.full_name
          }
        }
        return { ...app, contact_name: contactName }
      })
    )

    return NextResponse.json({
      success: true,
      applications: applicationsWithContacts,
    })
  } catch (e: any) {
    console.error('[ADMIN WORKSHOPS] Error:', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
