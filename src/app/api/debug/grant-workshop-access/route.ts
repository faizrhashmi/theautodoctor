import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * POST /api/debug/grant-workshop-access
 *
 * Grant workshop dashboard access to workshop.mechanic@test.com
 * This adds them to organization_members table
 */
export async function POST(req: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    email: 'workshop.mechanic@test.com',
    steps: [],
  }

  try {
    // Step 1: Get user ID from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json({ error: 'Failed to list users', details: authError }, { status: 500 })
    }

    const user = authUsers.users.find(u => u.email === 'workshop.mechanic@test.com')

    if (!user) {
      return NextResponse.json({ error: 'User workshop.mechanic@test.com not found in auth.users' }, { status: 404 })
    }

    results.steps.push({
      step: 1,
      action: 'Found user in auth.users',
      user_id: user.id,
      email: user.email,
    })

    // Step 2: Get mechanic record to find workshop
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, workshop_id, email, service_tier, account_type')
      .eq('user_id', user.id)
      .maybeSingle()

    if (mechanicError || !mechanic) {
      return NextResponse.json({
        error: 'Mechanic record not found',
        details: mechanicError,
        user_id: user.id,
      }, { status: 404 })
    }

    if (!mechanic.workshop_id) {
      return NextResponse.json({
        error: 'Mechanic is not affiliated with any workshop (workshop_id is NULL)',
        mechanic_id: mechanic.id,
      }, { status: 400 })
    }

    results.steps.push({
      step: 2,
      action: 'Found mechanic record',
      mechanic_id: mechanic.id,
      workshop_id: mechanic.workshop_id,
      service_tier: mechanic.service_tier,
      account_type: mechanic.account_type,
    })

    // Step 3: Verify workshop exists
    const { data: workshop, error: workshopError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, organization_type, email, status')
      .eq('id', mechanic.workshop_id)
      .maybeSingle()

    if (workshopError || !workshop) {
      return NextResponse.json({
        error: 'Workshop organization not found',
        details: workshopError,
        workshop_id: mechanic.workshop_id,
      }, { status: 404 })
    }

    if (workshop.organization_type !== 'workshop') {
      return NextResponse.json({
        error: 'Organization is not a workshop type',
        organization_type: workshop.organization_type,
      }, { status: 400 })
    }

    results.steps.push({
      step: 3,
      action: 'Verified workshop organization',
      workshop: {
        id: workshop.id,
        name: workshop.name,
        type: workshop.organization_type,
        status: workshop.status,
      },
    })

    // Step 4: Check if membership already exists
    const { data: existingMembership, error: checkError } = await supabaseAdmin
      .from('organization_members')
      .select('id, role, status, joined_at')
      .eq('organization_id', mechanic.workshop_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({
        error: 'Failed to check existing membership',
        details: checkError,
      }, { status: 500 })
    }

    if (existingMembership) {
      // Update existing membership
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('organization_members')
        .update({
          status: 'active',
          role: 'admin',
          joined_at: existingMembership.joined_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMembership.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({
          error: 'Failed to update existing membership',
          details: updateError,
        }, { status: 500 })
      }

      results.steps.push({
        step: 4,
        action: 'Updated existing membership to active admin',
        membership_id: existingMembership.id,
        old_status: existingMembership.status,
        old_role: existingMembership.role,
        new_status: updated.status,
        new_role: updated.role,
      })
    } else {
      // Create new membership
      const { data: newMembership, error: createError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: mechanic.workshop_id,
          user_id: user.id,
          role: 'admin',
          status: 'active',
          joined_at: new Date().toISOString(),
          invited_by: user.id, // Self-invited for this upgrade
          invited_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({
          error: 'Failed to create membership',
          details: createError,
        }, { status: 500 })
      }

      results.steps.push({
        step: 4,
        action: 'Created new admin membership',
        membership_id: newMembership.id,
        role: newMembership.role,
        status: newMembership.status,
      })
    }

    // Step 5: Verify the membership is active
    const { data: finalMembership, error: verifyError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        organizations (
          id,
          name,
          organization_type
        )
      `)
      .eq('organization_id', mechanic.workshop_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (verifyError || !finalMembership) {
      return NextResponse.json({
        error: 'Failed to verify membership was created',
        details: verifyError,
      }, { status: 500 })
    }

    results.steps.push({
      step: 5,
      action: 'Verified membership is active',
      membership: finalMembership,
    })

    results.success = true
    results.message = '✅ SUCCESS: workshop.mechanic@test.com can now access /workshop/dashboard'
    results.summary = {
      user_email: user.email,
      user_id: user.id,
      workshop_id: mechanic.workshop_id,
      workshop_name: workshop.name,
      membership_role: finalMembership.role,
      membership_status: finalMembership.status,
      access_granted: ['/mechanic/dashboard', '/workshop/dashboard'],
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    console.error('[grant-workshop-access] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      steps: results.steps,
    }, { status: 500 })
  }
}

/**
 * GET /api/debug/grant-workshop-access
 *
 * Check current access status for workshop.mechanic@test.com
 */
export async function GET(req: NextRequest) {
  try {
    // Get user
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const user = authUsers.users.find(u => u.email === 'workshop.mechanic@test.com')

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check mechanic record
    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('id, workshop_id, service_tier, account_type, can_accept_sessions')
      .eq('user_id', user.id)
      .maybeSingle()

    // Check organization membership
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        organizations (
          id,
          name,
          organization_type
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      mechanic: mechanic || null,
      workshop_membership: membership || null,
      access: {
        mechanic_dashboard: !!mechanic,
        workshop_dashboard: !!membership,
      },
      portals: [
        mechanic ? '/mechanic/dashboard' : null,
        membership ? '/workshop/dashboard' : null,
      ].filter(Boolean),
    })

  } catch (error: any) {
    console.error('[grant-workshop-access GET] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
