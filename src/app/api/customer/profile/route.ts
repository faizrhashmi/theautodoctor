import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

export async function GET(request: NextRequest) {
  // ✅ SECURITY: Require customer authentication
  const authResult = await requireCustomerAPI(request)
  if (authResult.error) return authResult.error

  const customer = authResult.data
  console.log(`[CUSTOMER] ${customer.email} fetching profile`)

  // Fetch profile from database
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone, city, email, preferred_plan, country, province, postal_code')
    .eq('id', customer.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError)
    // Return customer data even if profile doesn't exist yet
    return NextResponse.json({
      profile: {
        full_name: '',
        email: customer.email,
        phone: '',
        city: '',
        country: '',
        province: '',
        postal_code: '',
      }
    })
  }

  return NextResponse.json({
    profile: {
      full_name: profile.full_name || '',
      email: profile.email || customer.email,
      phone: profile.phone || '',
      city: profile.city || '',
      country: profile.country || '',
      province: profile.province || '',
      postal_code: profile.postal_code || '',
    }
  })
}

export async function POST(request: NextRequest) {
  // ✅ SECURITY: Require customer authentication
  const authResult = await requireCustomerAPI(request)
  if (authResult.error) return authResult.error

  const customer = authResult.data
  console.log(`[CUSTOMER] ${customer.email} updating profile`)

  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  const update: ProfileInsert = {
    id: customer.id,
    role: 'customer',
    // Set email_verified to true if customer's email is confirmed
    email_verified: customer.emailConfirmed,
  }

  if (typeof body.plan === 'string') {
    update.preferred_plan = body.plan
    console.log('Setting preferred_plan to:', body.plan)
  }

  // Handle both camelCase and snake_case field names for flexibility
  const fullNameInput =
    typeof body.full_name === 'string' ? body.full_name.trim() :
    typeof body.fullName === 'string' ? body.fullName.trim() : undefined

  const phoneInput = typeof body.phone === 'string' ? body.phone.trim() : undefined

  const cityInput = typeof body.city === 'string' ? body.city.trim() : undefined

  const vehicleInput =
    typeof body.vehicle === 'string' ? body.vehicle.trim() : undefined

  const dobInput =
    typeof body.dateOfBirth === 'string' ? body.dateOfBirth.trim() : undefined

  if (fullNameInput) {
    update.full_name = fullNameInput
  }

  if (phoneInput) {
    update.phone = phoneInput
  }

  if (cityInput) {
    update.city = cityInput
  }

  if (vehicleInput) {
    update.vehicle_hint = vehicleInput
  }

  if (dobInput) {
    update.date_of_birth = dobInput
  }

  console.log('Upserting profile with data:', update)

  const { error, data } = await supabaseAdmin
    .from('profiles')
    .upsert(update, { onConflict: 'id' })
    .select()

  if (error) {
    console.error('profiles upsert failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('Profile upsert successful:', data)

  return NextResponse.json({ ok: true })
}
