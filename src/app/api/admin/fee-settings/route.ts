import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'
import { getPlatformFees, clearPlatformFeesCache } from '@/lib/platformFees'

/**
 * GET /api/admin/fee-settings
 *
 * Get global platform fee settings
 */
export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require admin authentication
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  try {
    const fees = await getPlatformFees()

    return NextResponse.json({ fees })
  } catch (error) {
    console.error('[admin/fee-settings] GET error:', error)
    return NextResponse.json({ error: 'Failed to load fee settings' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/fee-settings
 *
 * Update global platform fee settings
 */
export async function PUT(req: NextRequest) {
  // ✅ SECURITY: Require admin authentication
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const admin = authResult.data

  try {
    const body = await req.json()

    const {
      sessionMechanicPercent,
      sessionPlatformPercent,
      referralFeePercent,
      workshopQuotePlatformFee,
      escrowHoldDays,
      highValueThresholdCents,
      highValueEscrowHoldDays,
      enableAutoRelease,
      requireManualApprovalOverThreshold,
    } = body

    // Validate session split totals 100%
    if (Math.abs((sessionMechanicPercent + sessionPlatformPercent) - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Session split must total 100%' },
        { status: 400 }
      )
    }

    // Update platform fee settings
    const { error: updateError } = await supabaseAdmin
      .from('platform_fee_settings')
      .update({
        default_session_mechanic_percent: sessionMechanicPercent,
        default_session_platform_percent: sessionPlatformPercent,
        default_referral_fee_percent: referralFeePercent,
        default_workshop_quote_platform_fee: workshopQuotePlatformFee,
        default_escrow_hold_days: escrowHoldDays,
        high_value_threshold_cents: highValueThresholdCents,
        high_value_escrow_hold_days: highValueEscrowHoldDays,
        enable_auto_release: enableAutoRelease,
        require_manual_approval_over_threshold: requireManualApprovalOverThreshold,
        updated_by: admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', '00000000-0000-0000-0000-000000000001')

    if (updateError) {
      console.error('[admin/fee-settings] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update fee settings' }, { status: 500 })
    }

    // Clear cache to force reload
    clearPlatformFeesCache()

    console.log('[admin/fee-settings] Updated by admin:', admin.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/fee-settings] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update fee settings' }, { status: 500 })
  }
}
