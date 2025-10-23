// @ts-nocheck
// src/app/api/admin/errors/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, resolution_notes } = body

    const updateData: any = {}
    if (status) updateData.status = status
    if (resolution_notes !== undefined) updateData.resolution_notes = resolution_notes

    const { data, error } = await supabase
      .from('admin_errors')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating error:', error)
    return NextResponse.json(
      { error: 'Failed to update error', message: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('admin_errors')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting error:', error)
    return NextResponse.json(
      { error: 'Failed to delete error', message: error.message },
      { status: 500 }
    )
  }
}
