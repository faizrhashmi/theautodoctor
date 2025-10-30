import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
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
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} removing favorite ${params.favoriteId}`)

    const favoriteId = params.favoriteId

    // Delete the favorite (only if it belongs to the customer)
    const { error } = await supabaseAdmin
      .from('customer_favorites')
      .delete()
      .eq('id', favoriteId)
      .eq('customer_id', customer.id)

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
