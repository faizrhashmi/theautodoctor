/**
 * Feature Flag API Route
 *
 * Returns the status of a feature flag.
 * Used by client-side hooks to check flag status without exposing env vars.
 *
 * @route GET /api/feature-flags/:flag
 */

import { NextResponse } from 'next/server'
import { isFeatureEnabled, type FeatureFlagKey } from '@/lib/flags'
import { FEATURE_FLAGS } from '@/config/featureFlags'

export async function GET(
  request: Request,
  { params }: { params: { flag: string } }
) {
  const flag = params.flag as FeatureFlagKey

  // Validate flag exists
  if (!(flag in FEATURE_FLAGS)) {
    return NextResponse.json(
      { error: 'Invalid feature flag' },
      { status: 400 }
    )
  }

  const enabled = isFeatureEnabled(flag)

  return NextResponse.json({ enabled })
}
