import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// POST /api/admin/plans/[id]/toggle - Toggle plan active status
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add admin authentication check here

    const planId = params.id
    const body = await request.json()
    const { is_active } = body

    if (is_active === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: is_active' },
        { status: 400 }
      )
    }

    const { data: updatedPlan, error } = await supabaseAdmin
      .from('service_plans')
      .update({ is_active })
      .eq('id', planId)
      .select()
      .single()

    if (error) {
      console.error('[POST /api/admin/plans/[id]/toggle] Database error:', error)
      return NextResponse.json({ error: 'Failed to toggle plan' }, { status: 500 })
    }

    if (!updatedPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    return NextResponse.json({
      plan: updatedPlan,
      message: `Plan ${is_active ? 'activated' : 'deactivated'} successfully`
    })
  } catch (error) {
    console.error('[POST /api/admin/plans/[id]/toggle] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
