// app/mechanic/profile/page.tsx
import 'server-only'
import { requireMechanic } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'
import { MechanicProfileClient } from './MechanicProfileClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

/**
 * Mechanic Profile Page
 * UPDATED: Now uses unified Supabase Auth via requireMechanic guard
 */
export default async function MechanicProfilePage() {
  // ✅ Use unified auth guard (server component)
  const authMechanic = await requireMechanic()

  console.log('[Mechanic Profile] Valid session for mechanic:', authMechanic.id)

  // Fetch mechanic profile from mechanics table using admin client to bypass RLS
  // Only select columns that actually exist in the schema (types/supabase.ts)
  const { data: mechanic, error: mechanicError} = await supabaseAdmin
    .from('mechanics')
    .select(`
      id,
      name,
      email,
      phone,
      is_brand_specialist,
      brand_specializations,
      service_keywords,
      specialist_tier,
      country,
      city,
      state_province,
      timezone,
      certification_documents,
      years_of_experience,
      red_seal_certified,
      red_seal_number,
      red_seal_province,
      red_seal_expiry_date,
      specializations,
      shop_affiliation,
      profile_completion_score,
      can_accept_sessions,
      rating,
      completed_sessions,
      workshop_id,
      account_type
    `)
    .eq('id', authMechanic.id)
    .single()

  if (mechanicError) {
    console.error('[Mechanic Profile] Fetch error:', mechanicError)

    // If mechanic not found, might be a new user
    if (mechanicError.code === 'PGRST116') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-2xl font-bold text-white mb-4">Profile Not Found</h1>
            <p className="text-slate-400 mb-6">
              We couldn't find a mechanic profile for your account. Please complete onboarding first.
            </p>
            <a
              href="/mechanic/onboarding"
              className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition"
            >
              Complete Onboarding
            </a>
          </div>
        </div>
      )
    }

    // Other errors
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Failed to Load Profile</h1>
          <p className="text-slate-400 mb-2">{mechanicError.message}</p>
          <p className="text-slate-500 text-sm">Code: {mechanicError.code}</p>
        </div>
      </div>
    )
  }

  if (!mechanic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-white mb-4">Profile Not Found</h1>
          <p className="text-slate-400">No mechanic profile found for this account.</p>
        </div>
      </div>
    )
  }

  console.log('[Mechanic Profile] Successfully loaded profile for:', mechanic.email)

  // Determine mechanic type
  let mechanicType: 'virtual_only' | 'independent_workshop' | 'workshop_affiliated' = 'virtual_only'
  if (mechanic.workshop_id) {
    if (mechanic.account_type === 'workshop_mechanic') {
      mechanicType = 'workshop_affiliated'
    } else {
      mechanicType = 'independent_workshop'
    }
  }

  // Build profile object with all fields the client expects
  // Provide defaults for fields that don't exist in the DB schema
  const profileForClient = {
    id: mechanic.id,
    name: mechanic.name ?? '',
    email: mechanic.email,
    phone: mechanic.phone ?? '',
    about_me: '', // Field doesn't exist in DB - provide empty default
    is_brand_specialist: mechanic.is_brand_specialist ?? false,
    brand_specializations: mechanic.brand_specializations ?? [],
    service_keywords: mechanic.service_keywords ?? [],
    specialist_tier: (mechanic.specialist_tier as 'general' | 'brand' | 'master') ?? 'general',
    country: mechanic.country ?? '',
    city: mechanic.city ?? '',
    state_province: mechanic.state_province ?? '',
    timezone: mechanic.timezone ?? 'America/Toronto',
    years_of_experience: mechanic.years_of_experience ?? 0,
    red_seal_certified: mechanic.red_seal_certified ?? false,
    red_seal_number: mechanic.red_seal_number ?? '',
    red_seal_province: mechanic.red_seal_province ?? '',
    red_seal_expiry_date: mechanic.red_seal_expiry_date ?? '',
    hourly_rate: 0, // Field doesn't exist in DB - provide zero default
    specializations: mechanic.specializations ?? [],
    profile_completion_score: mechanic.profile_completion_score ?? 0,
    can_accept_sessions: mechanic.can_accept_sessions ?? false,
    shop_affiliation: mechanic.shop_affiliation ?? '',
  }

  return <MechanicProfileClient
    initialProfile={profileForClient}
    mechanicId={authMechanic.id}
    mechanicType={mechanicType}
  />
}
