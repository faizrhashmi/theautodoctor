import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/admin/users/mechanics/[id]/type-history
 * Get mechanic type change history
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require admin authentication
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const mechanicId = params.id

  try {
    // Get type change history
    const { data: history, error: historyError } = await supabaseAdmin
      .from('mechanic_type_change_log')
      .select(`
        *,
        changed_by_profile:changed_by (
          full_name,
          email
        )
      `)
      .eq('mechanic_id', mechanicId)
      .order('created_at', { ascending: false })

    if (historyError) {
      console.error('[ADMIN] Error fetching type history:', historyError)
      return NextResponse.json({
        error: 'Failed to fetch type history'
      }, { status: 500 })
    }

    return NextResponse.json({
      history: history || [],
    })

  } catch (error: any) {
    console.error('[ADMIN] Error in type-history:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error',
    }, { status: 500 })
  }
}
