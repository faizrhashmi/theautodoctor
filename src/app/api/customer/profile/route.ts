import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

export async function GET(request: NextRequest) {
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch profile from database
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone, city, email, preferred_plan')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError)
    // Return user data even if profile doesn't exist yet
    return NextResponse.json({
      profile: {
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        city: '',
      }
    })
  }

  return NextResponse.json({
    profile: {
      full_name: profile.full_name || '',
      email: profile.email || user.email || '',
      phone: profile.phone || '',
      city: profile.city || '',
    }
  })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  const update: ProfileInsert = {
    id: user.id,
    role: 'customer',
    // Set email_verified to true if user's email is confirmed
    email_verified: !!user.email_confirmed_at,
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
  } else if (user.user_metadata?.full_name) {
    update.full_name = String(user.user_metadata.full_name)
  }

  if (phoneInput) {
    update.phone = phoneInput
  } else if (user.user_metadata?.phone) {
    update.phone = String(user.user_metadata.phone)
  }

  if (cityInput) {
    update.city = cityInput
  }

  if (vehicleInput) {
    update.vehicle_hint = vehicleInput
  } else if (user.user_metadata?.vehicle_hint) {
    update.vehicle_hint = String(user.user_metadata.vehicle_hint)
  }

  if (dobInput) {
    update.date_of_birth = dobInput
  } else if (user.user_metadata?.date_of_birth) {
    update.date_of_birth = String(user.user_metadata.date_of_birth)
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
