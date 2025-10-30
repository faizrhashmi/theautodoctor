// @ts-nocheck
// If you have this file, update it too
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'
import { IntakeStatus } from '@/types/supabase'

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    const body = await req.json() as { id?: string; ids?: string[]; status: IntakeStatus }
    const { id, ids, status } = body

    // Support both single and bulk updates
    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Bulk update
      const { error } = await supabase
        .from('intakes')
        .update({ status })
        .in('id', ids)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.info('[admin/intakes/update-status] bulk update', {
        admin: admin.email ?? auth.user?.id ?? 'unknown',
        count: ids.length,
        status,
      })

      return NextResponse.json({ success: true, updated: ids.length })
    } else if (id) {
      // Single update (backward compatible)
      const { error } = await supabase
        .from('intakes')
        .update({ status })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.info('[admin/intakes/update-status] single update', {
        admin: admin.email ?? auth.user?.id ?? 'unknown',
        id,
        status,
      })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Either id or ids must be provided' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
