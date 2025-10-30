// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { encryptPII } from '@/lib/encryption'
import { requireMechanicAPI } from '@/lib/auth/guards'

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured', 500)

  try {
    // ✅ SECURITY: Require mechanic authentication
    const authResult = await requireMechanicAPI(req)
    if (authResult.error) return authResult.error

    const mechanic = authResult.data
    const mechanicId = mechanic.id

    // Get request body
    const body = await req.json()
    const { sin } = body

    console.log('[SIN COLLECTION] SIN collection request for mechanic:', mechanicId)

    // Validate SIN
    if (!sin || typeof sin !== 'string') {
      return bad('SIN is required', 400)
    }

    // Remove any formatting and validate it's 9 digits
    const sinDigits = sin.replace(/\D/g, '')

    if (sinDigits.length !== 9) {
      return bad('SIN must be 9 digits', 400)
    }

    // Basic Luhn algorithm validation for Canadian SIN
    const validateSIN = (sinValue: string): boolean => {
      const checkDigit = parseInt(sinValue[8])
      let sum = 0

      for (let i = 0; i < 8; i++) {
        let digit = parseInt(sinValue[i])

        // Double every second digit
        if (i % 2 === 1) {
          digit *= 2
          // If result is two digits, add them together
          if (digit > 9) {
            digit = Math.floor(digit / 10) + (digit % 10)
          }
        }

        sum += digit
      }

      const calculatedCheckDigit = (10 - (sum % 10)) % 10
      return calculatedCheckDigit === checkDigit
    }

    if (!validateSIN(sinDigits)) {
      return bad('Invalid SIN number', 400)
    }

    // Get current mechanic data
    const { data: mechanicData, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, account_type, requires_sin_collection, sin_encrypted')
      .eq('id', mechanicId)
      .single()

    if (mechanicError || !mechanicData) {
      console.error('[SIN COLLECTION] Mechanic not found:', mechanicError)
      return bad('Mechanic not found', 404)
    }

    // Verify this is an independent mechanic who requires SIN
    if (mechanicData.account_type !== 'individual_mechanic') {
      return bad('SIN collection is only required for independent mechanics', 400)
    }

    if (!mechanicData.requires_sin_collection) {
      return bad('SIN has already been collected', 400)
    }

    // Encrypt the SIN
    console.log('[SIN COLLECTION] Encrypting SIN...')
    const sinEncrypted = encryptPII(sinDigits)

    // Update mechanic record
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({
        sin_encrypted: sinEncrypted,
        requires_sin_collection: false,
        sin_collection_completed_at: new Date().toISOString(),
      })
      .eq('id', mechanicId)

    if (updateError) {
      console.error('[SIN COLLECTION] Failed to update mechanic:', updateError)
      return bad('Failed to save SIN', 500)
    }

    // Log admin action
    await supabaseAdmin.from('mechanic_admin_actions').insert({
      mechanic_id: mechanicId,
      admin_id: 'system',
      action_type: 'sin_collected',
      notes: 'SIN collected and encrypted by mechanic via self-service',
      metadata: {
        collected_at: new Date().toISOString(),
        collection_method: 'self_service_modal',
      },
    })

    console.log('[SIN COLLECTION] Successfully collected and encrypted SIN for mechanic:', mechanicId)

    return NextResponse.json({
      success: true,
      message: 'SIN collected successfully',
    })
  } catch (e: any) {
    console.error('[SIN COLLECTION] Error:', e)
    return bad(e.message || 'Failed to collect SIN', 500)
  }
}
