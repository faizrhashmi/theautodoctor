import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * GET /api/mechanic/diagnostic-pricing
 * Fetch mechanic's diagnostic pricing tiers (chat, video, in-person)
 */
export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Fetch mechanic's diagnostic pricing
    const { data: pricing, error: pricingError } = await supabaseAdmin
      .from('mechanic_diagnostic_pricing')
      .select('*')
      .eq('mechanic_id', mechanic.id)
      .single()

    if (pricingError && pricingError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected if not set yet)
      console.error('[MECHANIC DIAGNOSTIC PRICING API] Error:', pricingError)
      return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 })
    }

    // Return pricing or null if not set
    return NextResponse.json({
      pricing: pricing || null,
    })
  } catch (error) {
    console.error('[MECHANIC DIAGNOSTIC PRICING API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/mechanic/diagnostic-pricing
 * Set or update mechanic's diagnostic pricing tiers
 *
 * Request body:
 * {
 *   chat_diagnostic_price: 25,
 *   video_diagnostic_price: 50,
 *   in_person_diagnostic_price: 75,
 *   chat_diagnostic_description: "Text-based diagnosis...",
 *   video_diagnostic_description: "30-minute live video call...",
 *   in_person_diagnostic_description: "Comprehensive shop inspection..."
 * }
 */
export async function POST(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const {
      chat_diagnostic_price,
      video_diagnostic_price,
      in_person_diagnostic_price,
      chat_diagnostic_description,
      video_diagnostic_description,
      in_person_diagnostic_description,
    } = body

    // ✅ VALIDATION: Check required fields
    if (!chat_diagnostic_price || !video_diagnostic_price || !in_person_diagnostic_price) {
      return NextResponse.json({
        error: 'All diagnostic prices are required (chat, video, in-person)',
      }, { status: 400 })
    }

    // ✅ VALIDATION: Check minimum prices
    if (chat_diagnostic_price < 19) {
      return NextResponse.json({
        error: 'Chat diagnostic price must be at least $19',
      }, { status: 400 })
    }

    if (video_diagnostic_price < 39) {
      return NextResponse.json({
        error: 'Video diagnostic price must be at least $39',
      }, { status: 400 })
    }

    if (in_person_diagnostic_price < 50) {
      return NextResponse.json({
        error: 'In-person diagnostic price must be at least $50',
      }, { status: 400 })
    }

    // ✅ VALIDATION: Check pricing hierarchy (video >= chat, in-person >= video)
    if (video_diagnostic_price < chat_diagnostic_price) {
      return NextResponse.json({
        error: 'Video diagnostic price must be greater than or equal to chat diagnostic price',
      }, { status: 400 })
    }

    if (in_person_diagnostic_price < video_diagnostic_price) {
      return NextResponse.json({
        error: 'In-person diagnostic price must be greater than or equal to video diagnostic price',
      }, { status: 400 })
    }

    // Upsert pricing (insert or update)
    const { data: pricing, error: upsertError } = await supabaseAdmin
      .from('mechanic_diagnostic_pricing')
      .upsert({
        mechanic_id: mechanic.id,
        chat_diagnostic_price,
        video_diagnostic_price,
        in_person_diagnostic_price,
        chat_diagnostic_description: chat_diagnostic_description || null,
        video_diagnostic_description: video_diagnostic_description || null,
        in_person_diagnostic_description: in_person_diagnostic_description || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'mechanic_id',
      })
      .select()
      .single()

    if (upsertError) {
      console.error('[MECHANIC DIAGNOSTIC PRICING API] Upsert error:', upsertError)
      return NextResponse.json({
        error: 'Failed to save pricing. Please ensure pricing hierarchy is correct.',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pricing,
    })
  } catch (error) {
    console.error('[MECHANIC DIAGNOSTIC PRICING API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
