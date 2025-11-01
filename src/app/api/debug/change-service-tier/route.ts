import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withDebugAuth } from '@/lib/debugAuth'


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * POST /api/debug/change-service-tier
 *
 * Change workshop.mechanic@test.com service_tier from "virtual_only" to "hybrid"
 * This allows them to access /mechanic/dashboard instead of being redirected to /mechanic/dashboard/virtual
 */
async function postHandler(req: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    email: 'workshop.mechanic@test.com',
    steps: [],
  }

  try {
    // Get user
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const user = authUsers.users.find(u => u.email === 'workshop.mechanic@test.com')

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    results.steps.push({
      step: 1,
      action: 'Found user',
      user_id: user.id,
    })

    // Get current mechanic record
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, service_tier, account_type')
      .eq('user_id', user.id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({
        error: 'Mechanic record not found',
        details: mechanicError,
      }, { status: 404 })
    }

    results.steps.push({
      step: 2,
      action: 'Found mechanic record',
      mechanic_id: mechanic.id,
      current_service_tier: mechanic.service_tier,
      account_type: mechanic.account_type,
    })

    // Update service_tier from "virtual_only" to "workshop_partner"
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({
        service_tier: 'workshop_partner',
      })
      .eq('id', mechanic.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to update service_tier',
        details: updateError,
      }, { status: 500 })
    }

    results.steps.push({
      step: 3,
      action: 'Updated service_tier',
      old_service_tier: mechanic.service_tier,
      new_service_tier: updated.service_tier,
    })

    results.success = true
    results.message = '✅ Updated service_tier from "virtual_only" to "hybrid"'
    results.impact = {
      before: 'Redirected to /mechanic/dashboard/virtual',
      after: 'Can access /mechanic/dashboard (full dashboard)',
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    console.error('[change-service-tier] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      steps: results.steps,
    }, { status: 500 })
  }
}

/**
 * GET /api/debug/change-service-tier
 *
 * Check current service_tier
 */
async function getHandler(req: NextRequest) {
  try {
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const user = authUsers.users.find(u => u.email === 'workshop.mechanic@test.com')

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('id, service_tier, account_type, workshop_id')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      mechanic: mechanic,
      dashboard_redirect: mechanic?.service_tier === 'virtual_only'
        ? '/mechanic/dashboard → redirects to → /mechanic/dashboard/virtual'
        : '/mechanic/dashboard (no redirect)',
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// P0-1 FIX: Protect debug endpoint with authentication
export const POST = withDebugAuth(postHandler)
export const GET = withDebugAuth(getHandler)
