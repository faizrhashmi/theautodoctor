import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * DELETE /api/customer/favorites/[favoriteId]
 *
 * Remove a provider from favorites
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { favoriteId: string } }
) {
  try {
    const favoriteId = params.favoriteId

    // Delete the favorite
    const { error } = await supabaseAdmin
      .from('customer_favorites')
      .delete()
      .eq('id', favoriteId)

    if (error) {
      console.error('Error deleting favorite:', error)
      return NextResponse.json(
        { error: 'Failed to remove favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Provider removed from favorites'
    })

  } catch (error: any) {
    console.error('Error in DELETE favorite:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove favorite' },
      { status: 500 }
    )
  }
}
