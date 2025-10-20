// If you have this file, update it too
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { IntakeStatus } from '@/types/supabase'

export async function POST(req: NextRequest) {
  try {
    const { id, status } = await req.json() as { id: string; status: IntakeStatus }

    const { error } = await supabase
      .from('intakes')
      .update({ status })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}