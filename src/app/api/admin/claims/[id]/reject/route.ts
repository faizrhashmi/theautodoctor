/**
 * F2: SATISFACTION CLAIMS - Reject claim
 *
 * POST /api/admin/claims/[id]/reject
 *
 * Rejects a satisfaction claim with admin notes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const claimId = params.id

  try {
    const body = await req.json()
    const { resolution } = body as { resolution: string }

    if (!resolution) {
      return NextResponse.json({ error: 'Resolution notes are required' }, { status: 400 })
    }

    // FETCH CLAIM
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('satisfaction_claims')
      .select('*')
      .eq('id', claimId)
      .eq('status', 'open')
      .maybeSingle()

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found or already processed' }, { status: 404 })
    }

    // UPDATE CLAIM STATUS
    const { error: updateError } = await supabaseAdmin
      .from('satisfaction_claims')
      .update({
        status: 'rejected',
        resolution,
        reviewed_at: new Date().toISOString(),
        // TODO: Add reviewed_by_admin_id if you have admin auth
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId)

    if (updateError) {
      console.error('[claim:reject] Error updating claim:', updateError)
      return NextResponse.json({ error: 'Failed to update claim status' }, { status: 500 })
    }

    console.log('[claim:reject] ✓ Claim rejected:', claimId)

    return NextResponse.json({
      success: true,
      claim: {
        id: claimId,
        status: 'rejected',
        resolution,
      },
    })
  } catch (error: any) {
    console.error('[claim:reject] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to reject claim',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
