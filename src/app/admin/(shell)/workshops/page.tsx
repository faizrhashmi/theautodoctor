// @ts-nocheck
// src/app/admin/(shell)/workshops/page.tsx
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { redirect } from 'next/navigation'
import WorkshopManagement from './WorkshopManagement'

export const dynamic = 'force-dynamic'

interface Workshop {
  id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  status: 'pending' | 'approved' | 'suspended' | 'rejected'
  stripe_connect_account_id: string | null
  stripe_onboarding_completed: boolean
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
  platform_fee_percentage: number
  custom_fee_agreement: boolean
  created_at: string
  updated_at: string
  mechanics_count: number
  total_sessions: number
  total_revenue: number
  pending_payouts: number
}

async function getWorkshopData() {
  // Fetch all workshops with their stats
  const { data: workshops, error: workshopsError } = await supabaseAdmin
    .from('organizations')
    .select(`
      *,
      mechanics:mechanics(count),
      workshop_earnings:workshop_earnings(
        gross_amount_cents,
        workshop_net_cents,
        payout_status
      )
    `)
    .eq('organization_type', 'workshop')
    .order('created_at', { ascending: false })

  if (workshopsError) {
    console.error('Error fetching workshops:', workshopsError)
    throw new Error(workshopsError.message)
  }

  // Process workshop data with calculated stats
  const processedWorkshops = workshops?.map((workshop) => {
    const earnings = workshop.workshop_earnings || []
    const totalRevenue = earnings.reduce((sum, e) => sum + (e.gross_amount_cents || 0), 0) / 100
    const pendingPayouts = earnings
      .filter(e => e.payout_status === 'pending')
      .reduce((sum, e) => sum + (e.workshop_net_cents || 0), 0) / 100

    return {
      id: workshop.id,
      name: workshop.name || 'Unknown Workshop',
      email: workshop.email || '',
      phone: workshop.phone || '',
      address: workshop.address || '',
      city: workshop.city || '',
      state: workshop.state || '',
      zip: workshop.zip || '',
      status: workshop.status || 'pending',
      stripe_connect_account_id: workshop.stripe_connect_account_id,
      stripe_onboarding_completed: workshop.stripe_onboarding_completed || false,
      stripe_charges_enabled: workshop.stripe_charges_enabled || false,
      stripe_payouts_enabled: workshop.stripe_payouts_enabled || false,
      platform_fee_percentage: workshop.platform_fee_percentage || 20,
      custom_fee_agreement: workshop.custom_fee_agreement || false,
      created_at: workshop.created_at,
      updated_at: workshop.updated_at || workshop.created_at,
      mechanics_count: workshop.mechanics?.[0]?.count || 0,
      total_sessions: earnings.length,
      total_revenue: totalRevenue,
      pending_payouts: pendingPayouts,
    }
  }) || []

  // Fetch pending workshop applications
  const { data: pendingApplications, count: pendingCount } = await supabaseAdmin
    .from('organizations')
    .select('*', { count: 'exact', head: false })
    .eq('organization_type', 'workshop')
    .eq('status', 'pending')

  // Fetch mechanics not assigned to any workshop (available for assignment)
  const { data: availableMechanics } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, rating, completed_sessions')
    .is('workshop_id', null)
    .eq('application_status', 'approved')
    .order('rating', { ascending: false })

  // Calculate summary stats
  const stats = {
    total_workshops: processedWorkshops.length,
    pending_applications: pendingCount || 0,
    active_workshops: processedWorkshops.filter(w => w.status === 'approved').length,
    suspended_workshops: processedWorkshops.filter(w => w.status === 'suspended').length,
    total_revenue: processedWorkshops.reduce((sum, w) => sum + w.total_revenue, 0),
    total_pending_payouts: processedWorkshops.reduce((sum, w) => sum + w.pending_payouts, 0),
    stripe_connected: processedWorkshops.filter(w => w.stripe_onboarding_completed).length,
    available_mechanics: availableMechanics?.length || 0,
  }

  return {
    workshops: processedWorkshops,
    pendingApplications: pendingApplications || [],
    availableMechanics: availableMechanics || [],
    stats,
  }
}

export default async function WorkshopsPage() {
  const supabase = getSupabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/admin/login')
  }

  try {
    const data = await getWorkshopData()

    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workshop Management</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage workshop registrations, mechanics assignments, and revenue splits
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Total Workshops</p>
                <p className="text-2xl font-bold text-slate-900">{data.stats.total_workshops}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {data.stats.active_workshops} active, {data.stats.suspended_workshops} suspended
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Pending Applications</p>
                <p className="text-2xl font-bold text-amber-600">{data.stats.pending_applications}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Awaiting review</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ${data.stats.total_revenue.toFixed(2)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">All workshops combined</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Pending Payouts</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${data.stats.total_pending_payouts.toFixed(2)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {data.stats.stripe_connected} connected to Stripe
            </p>
          </div>
        </div>

        {/* Workshop Management Component */}
        <WorkshopManagement
          initialWorkshops={data.workshops}
          pendingApplications={data.pendingApplications}
          availableMechanics={data.availableMechanics}
        />
      </div>
    )
  } catch (error) {
    console.error('Workshops page error:', error)
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Error Loading Workshops</h1>
        <p className="text-red-600">Failed to load workshop data. Please try again later.</p>
        <pre className="mt-4 p-4 bg-red-50 text-red-900 rounded">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    )
  }
}