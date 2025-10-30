import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const timeOffId = params.id

    // Verify time off belongs to this mechanic
    const { data: timeOff, error: fetchError } = await supabaseAdmin
      .from('mechanic_time_off')
      .select('mechanic_id')
      .eq('id', timeOffId)
      .single()

    if (fetchError || !timeOff) {
      return NextResponse.json({ error: 'Time off not found' }, { status: 404 })
    }

    if (timeOff.mechanic_id !== mechanic.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the time off
    const { error: deleteError } = await supabaseAdmin
      .from('mechanic_time_off')
      .delete()
      .eq('id', timeOffId)

    if (deleteError) {
      console.error('[DELETE TIME OFF] Error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete time off' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE TIME OFF API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
