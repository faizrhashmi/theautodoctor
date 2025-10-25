// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hashPassword } from '@/lib/auth'

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

// Helper function to generate URL-safe slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured', 500)

  try {
    const body = await req.json()
    const {
      workshopName,
      contactName,
      email,
      phone,
      password,
      businessRegistrationNumber,
      taxId,
      website,
      industry,
      address,
      city,
      province,
      postalCode,
      coveragePostalCodes,
      serviceRadiusKm,
      mechanicCapacity,
      commissionRate,
    } = body

    console.log('[WORKSHOP SIGNUP] New application from:', email)

    // Validate required fields
    if (!workshopName || !contactName || !email || !password) {
      return bad('Workshop name, contact name, email, and password are required')
    }

    if (!businessRegistrationNumber || !taxId) {
      return bad('Business registration number and tax ID are required')
    }

    if (!address || !city || !province || !postalCode) {
      return bad('Complete address is required')
    }

    if (!coveragePostalCodes || coveragePostalCodes.length === 0) {
      return bad('At least one coverage postal code is required')
    }

    // Hash password for the admin user
    const password_hash = hashPassword(password)

    // Generate unique slug from workshop name
    let baseSlug = generateSlug(workshopName)
    let slug = baseSlug
    let counter = 1

    // Check for slug uniqueness
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!existing) break

      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Create admin user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email verification
      user_metadata: {
        full_name: contactName,
        phone,
        role: 'workshop_admin',
      },
    })

    if (authError) {
      console.error('[WORKSHOP SIGNUP] Auth error:', authError)
      if (authError.message?.includes('already registered')) {
        return bad('Email already registered', 409)
      }
      return bad(authError.message || 'Failed to create account', 500)
    }

    if (!authData.user) {
      return bad('Failed to create user', 500)
    }

    console.log('[WORKSHOP SIGNUP] Created auth user:', authData.user.id)

    // Create organization record
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        organization_type: 'workshop',
        name: workshopName,
        slug,
        email,
        phone,
        website: website || null,
        address,
        city,
        province,
        postal_code: postalCode,
        country: 'Canada',
        business_registration_number: businessRegistrationNumber,
        tax_id: taxId,
        industry,
        coverage_postal_codes: coveragePostalCodes,
        service_radius_km: serviceRadiusKm || 25,
        mechanic_capacity: mechanicCapacity || 10,
        commission_rate: commissionRate || 10.0,
        subscription_status: 'none', // Workshops don't have subscriptions
        status: 'pending', // Requires admin approval
        verification_status: 'pending',
        created_by: authData.user.id,
      })
      .select('id, slug')
      .single()

    if (orgError) {
      console.error('[WORKSHOP SIGNUP] Organization creation error:', orgError)
      // Cleanup: delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return bad(orgError.message, 500)
    }

    console.log('[WORKSHOP SIGNUP] Created organization:', org.id)

    // Create organization membership (owner role)
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: authData.user.id,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString(),
        invited_by: authData.user.id,
      })

    if (memberError) {
      console.error('[WORKSHOP SIGNUP] Membership creation error:', memberError)
      // Note: Don't fail the whole signup if membership creation fails
      // Admin can manually fix this
    }

    // Create profile record for the admin user
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: contactName,
        phone,
        role: 'workshop_admin',
        email,
        account_type: 'workshop_customer', // Workshop admin is a type of customer
        organization_id: org.id,
        source: 'direct',
      })

    if (profileError) {
      console.error('[WORKSHOP SIGNUP] Profile creation error:', profileError)
      // Don't fail - profile might be created by trigger
    }

    console.log('[WORKSHOP SIGNUP] Application submitted successfully:', org.id)

    // TODO: Send confirmation email to workshop
    // TODO: Send notification to admin team for review

    return NextResponse.json({
      success: true,
      organizationId: org.id,
      slug: org.slug,
      message:
        'Application submitted successfully! You will receive an email once your application is reviewed (typically 2-3 business days).',
    })
  } catch (e: any) {
    console.error('[WORKSHOP SIGNUP] Error:', e)
    return bad(e.message || 'Signup failed', 500)
  }
}
