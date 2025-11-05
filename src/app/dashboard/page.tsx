import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Unified Dashboard Router
 *
 * Automatically redirects users to their role-specific dashboard:
 * - Customers → /customer/dashboard
 * - Mechanics → /mechanic/dashboard
 * - Admins → /admin/dashboard
 * - Workshop members → /workshop/dashboard
 * - Corporate members → /corporate/dashboard
 *
 * This provides a single entry point for all authenticated users.
 */
export default async function DashboardPage() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not authenticated - redirect to home
  if (!user) {
    redirect('/')
  }

  // Get user profile to determine role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Check for role-specific redirects
  if (profile?.role === 'admin') {
    redirect('/admin/dashboard')
  }

  if (profile?.role === 'mechanic') {
    redirect('/mechanic/dashboard')
  }

  // Check for workshop membership
  if (supabaseAdmin) {
    const { data: workshopMembership } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        organizations!inner (
          organization_type
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    const org = workshopMembership?.organizations as any

    if (org?.organization_type === 'workshop') {
      redirect('/workshop/dashboard')
    }

    if (org?.organization_type === 'corporate') {
      redirect('/corporate/dashboard')
    }
  }

  // Default: Customer dashboard
  redirect('/customer/dashboard')
}

export const dynamic = 'force-dynamic'
