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
  const { data: profile, error: profileError} = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone, city, email, preferred_plan, country, state_province, postal_zip_code, address_line1, address_line2')
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
        address_line1: '',
        address_line2: '',
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
      province: profile.state_province || '',
      postal_code: profile.postal_zip_code || '',
      address_line1: profile.address_line1 || '',
      address_line2: profile.address_line2 || '',
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

  const countryInput = typeof body.country === 'string' ? body.country.trim() : undefined

  const provinceInput = typeof body.province === 'string' ? body.province.trim() : undefined

  const postalCodeInput =
    typeof body.postal_code === 'string' ? body.postal_code.trim() :
    typeof body.postalCode === 'string' ? body.postalCode.trim() : undefined

  const vehicleInput =
    typeof body.vehicle === 'string' ? body.vehicle.trim() : undefined

  const dobInput =
    typeof body.dateOfBirth === 'string' ? body.dateOfBirth.trim() : undefined

  const addressLine1Input =
    typeof body.address_line1 === 'string' ? body.address_line1.trim() :
    typeof body.addressLine1 === 'string' ? body.addressLine1.trim() : undefined

  const addressLine2Input =
    typeof body.address_line2 === 'string' ? body.address_line2.trim() :
    typeof body.addressLine2 === 'string' ? body.addressLine2.trim() : undefined

  if (fullNameInput) {
    update.full_name = fullNameInput
  }

  if (phoneInput) {
    update.phone = phoneInput
  }

  if (cityInput) {
    update.city = cityInput
  }

  if (countryInput) {
    update.country = countryInput
  }

  if (provinceInput) {
    update.state_province = provinceInput
  }

  if (postalCodeInput) {
    update.postal_zip_code = postalCodeInput
  }

  if (vehicleInput) {
    update.vehicle_hint = vehicleInput
  }

  if (dobInput) {
    update.date_of_birth = dobInput
  }

  if (addressLine1Input) {
    update.address_line1 = addressLine1Input
  }

  if (addressLine2Input) {
    update.address_line2 = addressLine2Input
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
