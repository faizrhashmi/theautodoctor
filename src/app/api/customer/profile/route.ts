import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

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
  }

  if (typeof body.plan === 'string') {
    update.preferred_plan = body.plan
  }

  const fullNameInput =
    typeof body.fullName === 'string' ? body.fullName.trim() : undefined
  const phoneInput = typeof body.phone === 'string' ? body.phone.trim() : undefined
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

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(update, { onConflict: 'id' })

  if (error) {
    console.error('profiles upsert failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
