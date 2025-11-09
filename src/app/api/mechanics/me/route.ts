import { NextRequest, NextResponse } from 'next/server'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * GET /api/mechanics/me
 * Get current authenticated mechanic's profile
 * UPDATED: Now uses Supabase Auth (unified system)
 */
export async function GET(req: NextRequest) {
  console.log('[MECHANIC ME API] Checking mechanic authentication...')

  // Use unified auth guard
  const result = await requireMechanicAPI(req)
  if (result.error) {
    console.log('[MECHANIC ME API] Auth failed')
    return result.error
  }

  const mechanic = result.data
  console.log('[MECHANIC ME API] Mechanic authenticated:', mechanic.id)

  return NextResponse.json({
    id: mechanic.id,
    user_id: mechanic.userId,
    name: mechanic.name,
    email: mechanic.email,
    stripeConnected: !!mechanic.stripeAccountId,
    payoutsEnabled: !!mechanic.stripePayoutsEnabled,
    service_tier: mechanic.serviceTier || 'virtual_only',
    account_type: mechanic.accountType || null, // CRITICAL: For access control
    workshop_id: mechanic.workshopId || null,   // CRITICAL: For access control
    partnership_type: mechanic.partnershipType || null, // For owner/operator detection
    sinCollected: false, // Default to false
  })
}
