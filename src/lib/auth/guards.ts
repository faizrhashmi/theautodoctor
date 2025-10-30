/**
 * Centralized Authentication Guards
 *
 * SECURITY: These functions enforce role-based access control across the application.
 * All protected routes and API endpoints MUST use these guards.
 *
 * UPDATED: Unified authentication - mechanics now use Supabase Auth
 *
 * @module auth/guards
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type UserRole = 'customer' | 'mechanic' | 'admin'

export interface AuthenticatedMechanic {
  id: string
  name: string | null
  email: string
  stripeAccountId: string | null
  stripePayoutsEnabled: boolean
  serviceTier?: string | null
  userId?: string | null
}

export interface AuthenticatedCustomer {
  id: string
  email: string
  emailConfirmed: boolean
  role: string | null
}

export interface AuthenticatedAdmin {
  id: string
  email: string
  role: string
}

export interface AuthenticatedWorkshop {
  userId: string
  organizationId: string
  organizationName: string
  role: string
  email: string
}

// ============================================================================
// SERVER COMPONENT GUARDS (for pages using Next.js server components)
// ============================================================================

/**
 * Require mechanic authentication in server component
 * UPDATED: Now uses Supabase Auth (unified system)
 *
 * @throws Redirects to login if not authenticated
 * @returns Authenticated mechanic data
 *
 * @example
 * export default async function MechanicDashboard() {
 *   const mechanic = await requireMechanic()
 *   // ...
 * }
 */
export async function requireMechanic(
  redirectTo?: string
): Promise<AuthenticatedMechanic> {
  const supabase = getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = `/mechanic/login${redirectTo ? `?redirect=${redirectTo}` : ''}`
    redirect(loginUrl)
  }

  // Check if user is a mechanic by checking profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'mechanic') {
    console.log('[requireMechanic] User is not a mechanic, redirecting...')
    redirect('/mechanic/login')
  }

  // Load full mechanic profile using user_id
  const { data: mechanic, error } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, stripe_account_id, stripe_payouts_enabled, service_tier, user_id')
    .eq('user_id', user.id)
    .single()

  if (error || !mechanic) {
    console.error('[requireMechanic] Failed to load mechanic profile:', error)
    redirect('/mechanic/login')
  }

  return {
    id: mechanic.id,
    name: mechanic.name,
    email: mechanic.email,
    stripeAccountId: mechanic.stripe_account_id,
    stripePayoutsEnabled: mechanic.stripe_payouts_enabled ?? false,
    serviceTier: mechanic.service_tier,
    userId: mechanic.user_id,
  }
}

/**
 * Require customer authentication in server component
 *
 * @throws Redirects to login if not authenticated or email not verified
 * @returns Authenticated customer data
 *
 * @example
 * export default async function CustomerDashboard() {
 *   const customer = await requireCustomer()
 *   // ...
 * }
 */
export async function requireCustomer(
  redirectTo?: string
): Promise<AuthenticatedCustomer> {
  const supabase = getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = `/signup${redirectTo ? `?redirect=${redirectTo}` : ''}`
    redirect(loginUrl)
  }

  // Check email verification
  if (!user.email_confirmed_at) {
    redirect('/customer/verify-email')
  }

  // Verify user role is customer (not admin or mechanic)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // If profile has a role and it's not customer, reject access
  if (profile?.role && profile.role !== 'customer') {
    redirect('/')
  }

  return {
    id: user.id,
    email: user.email ?? '',
    emailConfirmed: Boolean(user.email_confirmed_at),
    role: profile?.role ?? null,
  }
}

/**
 * Require admin authentication in server component
 *
 * @throws Redirects to login if not authenticated or not admin
 * @returns Authenticated admin data
 */
export async function requireAdmin(
  redirectTo?: string
): Promise<AuthenticatedAdmin> {
  const supabase = getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = `/admin/login${redirectTo ? `?next=${redirectTo}` : ''}`
    redirect(loginUrl)
  }

  // Verify user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    console.error('[requireAdmin] Unauthorized admin access attempt by user:', user.id)
    redirect('/')
  }

  return {
    id: user.id,
    email: user.email ?? '',
    role: profile.role,
  }
}

// ============================================================================
// API ROUTE GUARDS (for Next.js API routes/route handlers)
// ============================================================================

/**
 * Require mechanic authentication in API route
 * UPDATED: Now uses Supabase Auth (unified system)
 *
 * @returns Authenticated mechanic data or error response
 *
 * @example
 * export async function GET(req: NextRequest) {
 *   const result = await requireMechanicAPI(req)
 *   if (result.error) return result.error
 *
 *   const mechanic = result.data
 *   // ...
 * }
 */
export async function requireMechanicAPI(
  req: NextRequest
): Promise<
  | { data: AuthenticatedMechanic; error: null }
  | { data: null; error: NextResponse }
> {
  const supabaseClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Not authenticated' },
        { status: 401 }
      ),
    }
  }

  // Check if user is a mechanic
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'mechanic') {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Forbidden - Mechanic access required' },
        { status: 403 }
      ),
    }
  }

  // Load mechanic profile using user_id
  const { data: mechanic, error } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, stripe_account_id, stripe_payouts_enabled, service_tier, user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !mechanic) {
    console.error('[requireMechanicAPI] Failed to load mechanic:', error)
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Mechanic not found' },
        { status: 401 }
      ),
    }
  }

  return {
    data: {
      id: mechanic.id,
      name: mechanic.name,
      email: mechanic.email,
      stripeAccountId: mechanic.stripe_account_id,
      stripePayoutsEnabled: mechanic.stripe_payouts_enabled ?? false,
      serviceTier: mechanic.service_tier,
      userId: mechanic.user_id,
    },
    error: null,
  }
}

/**
 * Require customer authentication in API route
 *
 * @returns Authenticated customer data or error response
 *
 * @example
 * export async function POST(req: NextRequest) {
 *   const result = await requireCustomerAPI(req)
 *   if (result.error) return result.error
 *
 *   const customer = result.data
 *   // ...
 * }
 */
export async function requireCustomerAPI(
  _req: NextRequest
): Promise<
  | { data: AuthenticatedCustomer; error: null }
  | { data: null; error: NextResponse }
> {
  const supabase = getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Not authenticated' },
        { status: 401 }
      ),
    }
  }

  // Verify role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // Reject if user has wrong role
  if (profile?.role && profile.role !== 'customer') {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Forbidden - Customer access required' },
        { status: 403 }
      ),
    }
  }

  return {
    data: {
      id: user.id,
      email: user.email ?? '',
      emailConfirmed: Boolean(user.email_confirmed_at),
      role: profile?.role ?? null,
    },
    error: null,
  }
}

/**
 * Require admin authentication in API route
 *
 * @returns Authenticated admin data or error response
 */
export async function requireAdminAPI(
  _req: NextRequest
): Promise<
  | { data: AuthenticatedAdmin; error: null }
  | { data: null; error: NextResponse }
> {
  const supabase = getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Not authenticated' },
        { status: 401 }
      ),
    }
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    console.error('[requireAdminAPI] Unauthorized admin API access by:', user.id)
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    }
  }

  return {
    data: {
      id: user.id,
      email: user.email ?? '',
      role: profile.role,
    },
    error: null,
  }
}

/**
 * Require workshop authentication in API route
 *
 * @returns Authenticated workshop data or error response
 *
 * @example
 * export async function GET(req: NextRequest) {
 *   const result = await requireWorkshopAPI(req)
 *   if (result.error) return result.error
 *
 *   const workshop = result.data
 *   // ...
 * }
 */
export async function requireWorkshopAPI(
  req: NextRequest
): Promise<
  | { data: AuthenticatedWorkshop; error: null }
  | { data: null; error: NextResponse }
> {
  const supabaseClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Not authenticated' },
        { status: 401 }
      ),
    }
  }

  // Check if user is a workshop member via organization_members table
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select(`
      user_id,
      organization_id,
      role,
      organizations!inner (
        id,
        name,
        type
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError || !membership) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Forbidden - Workshop membership required' },
        { status: 403 }
      ),
    }
  }

  // Verify the organization is a workshop
  const organization = membership.organizations as any
  if (!organization || organization.type !== 'workshop') {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Forbidden - Workshop access required' },
        { status: 403 }
      ),
    }
  }

  return {
    data: {
      userId: user.id,
      organizationId: membership.organization_id,
      organizationName: organization.name,
      role: membership.role,
      email: user.email ?? '',
    },
    error: null,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current mechanic without requiring authentication (returns null if not authenticated)
 * UPDATED: Now uses Supabase Auth (unified system)
 * Useful for optional authentication scenarios
 */
export async function getCurrentMechanic(): Promise<AuthenticatedMechanic | null> {
  const supabase = getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Check if user is a mechanic
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'mechanic') return null

  // Load mechanic profile
  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, stripe_account_id, stripe_payouts_enabled, service_tier, user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mechanic) return null

  return {
    id: mechanic.id,
    name: mechanic.name,
    email: mechanic.email,
    stripeAccountId: mechanic.stripe_account_id,
    stripePayoutsEnabled: mechanic.stripe_payouts_enabled ?? false,
    serviceTier: mechanic.service_tier,
    userId: mechanic.user_id,
  }
}

/**
 * Get current customer without requiring authentication (returns null if not authenticated)
 * Useful for optional authentication scenarios
 */
export async function getCurrentCustomer(): Promise<AuthenticatedCustomer | null> {
  const supabase = getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return {
    id: user.id,
    email: user.email ?? '',
    emailConfirmed: Boolean(user.email_confirmed_at),
    role: profile?.role ?? null,
  }
}
