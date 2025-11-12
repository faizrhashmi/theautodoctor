import { NextRequest, NextResponse } from 'next/server'
import { FEATURE_FLAGS, getAllFeatureFlags } from '@/config/featureFlags'

/**
 * GET /api/admin/feature-flags
 * Returns all feature flags and their current status
 *
 * Note: In production, this should be protected with admin authentication
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // For now, returning flags for development/testing

    const flags = getAllFeatureFlags()

    return NextResponse.json({
      success: true,
      flags,
      environment: process.env.NODE_ENV,
      warning: 'Feature flags are configured in code. To change them, update src/config/featureFlags.ts'
    })
  } catch (error: any) {
    console.error('[feature-flags] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to fetch feature flags' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/feature-flags
 * Note: Feature flags are currently code-based
 * This endpoint is a placeholder for future database-backed flags
 */
export async function POST(req: NextRequest) {
  return NextResponse.json({
    error: 'Feature flags are currently code-based. Update src/config/featureFlags.ts to change flags.',
    info: 'To enable BYPASS_MEDIA_CHECK: Set enabled: true and add expiresAt date in featureFlags.ts'
  }, { status: 501 })
}
