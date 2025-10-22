/**
 * Centralized Authentication Guards
 *
 * SECURITY: These functions enforce role-based access control across the application.
 * All protected routes and API endpoints MUST use these guards.
 *
 * @module auth/guards
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getSupabaseServer } from '@/lib/supabaseServer'

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

// ============================================================================
// SERVER COMPONENT GUARDS (for pages using Next.js server components)
// ============================================================================

/**
 * Require mechanic authentication in server component
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
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) {
    const loginUrl = `/mechanic/login${redirectTo ? `?redirect=${redirectTo}` : ''}`
    redirect(loginUrl)
  }

  // Verify session is valid and not expired
  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    const loginUrl = `/mechanic/login${redirectTo ? `?redirect=${redirectTo}` : ''}`
    redirect(loginUrl)
  }

  // Load full mechanic profile
  const { data: mechanic, error } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, stripe_account_id, stripe_payouts_enabled')
    .eq('id', session.mechanic_id)
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
    const loginUrl = `/customer/login${redirectTo ? `?redirect=${redirectTo}` : ''}`
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
  _req: NextRequest
): Promise<
  | { data: AuthenticatedMechanic; error: null }
  | { data: null; error: NextResponse }
> {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Unauthorized - No mechanic token' },
        { status: 401 }
      ),
    }
  }

  // Verify session
  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Invalid or expired token' },
        { status: 401 }
      ),
    }
  }

  // Load mechanic profile
  const { data: mechanic, error } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, stripe_account_id, stripe_payouts_enabled')
    .eq('id', session.mechanic_id)
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current mechanic without requiring authentication (returns null if not authenticated)
 * Useful for optional authentication scenarios
 */
export async function getCurrentMechanic(): Promise<AuthenticatedMechanic | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) return null

  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return null

  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, stripe_account_id, stripe_payouts_enabled')
    .eq('id', session.mechanic_id)
    .maybeSingle()

  if (!mechanic) return null

  return {
    id: mechanic.id,
    name: mechanic.name,
    email: mechanic.email,
    stripeAccountId: mechanic.stripe_account_id,
    stripePayoutsEnabled: mechanic.stripe_payouts_enabled ?? false,
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
