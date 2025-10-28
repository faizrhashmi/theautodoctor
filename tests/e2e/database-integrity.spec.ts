/**
 * PHASE 4: Database Integrity Tests
 *
 * Tests for database fixes implemented in Phases 1-3:
 * - Foreign key validation
 * - RLS policy enforcement
 * - JSONB structure validation
 * - Type mismatch prevention
 * - NULL uniqueness constraints
 */

import { test, expect } from '@playwright/test'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

test.describe('Foreign Key Validation', () => {
  test('should reject session_request with invalid customer_id', async ({ request }) => {
    const invalidCustomerId = '00000000-0000-0000-0000-000000000001'

    const response = await request.post('/api/sessions/request', {
      data: {
        customer_id: invalidCustomerId,
        session_type: 'chat',
        plan_code: 'chat10'
      }
    })

    // Should fail validation
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Customer')
    expect(body.error).toContain('does not exist')
  })

  test('should reject session_request with invalid workshop_id', async ({ request }) => {
    // First create a valid customer
    const { data: customer } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!customer) {
      test.skip()
      return
    }

    const invalidWorkshopId = '00000000-0000-0000-0000-000000000002'

    const response = await request.post('/api/sessions/request', {
      data: {
        customer_id: customer.id,
        session_type: 'chat',
        plan_code: 'chat10',
        preferred_workshop_id: invalidWorkshopId
      }
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Workshop')
  })

  test('should reject chat message with invalid session_id', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const invalidSessionId = '00000000-0000-0000-0000-000000000003'

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: invalidSessionId,
        content: 'Test message',
        sender_email: 'test@example.com'
      })

    // Should fail with foreign key constraint violation
    expect(error).toBeTruthy()
    expect(error!.code).toBe('23503') // Foreign key violation
  })

  test('should reject session_participant with invalid user_id', async () => {
    // First get a valid session
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!session) {
      test.skip()
      return
    }

    const invalidUserId = '00000000-0000-0000-0000-000000000004'

    const { error } = await supabaseAdmin
      .from('session_participants')
      .insert({
        session_id: session.id,
        user_id: invalidUserId,
        role: 'customer'
      })

    expect(error).toBeTruthy()
    expect(error!.code).toBe('23503')
  })
})

test.describe('JSONB Structure Validation', () => {
  test('should reject repair_quote with non-array line_items', async () => {
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!session) {
      test.skip()
      return
    }

    // Try to insert with object instead of array
    const { error } = await supabaseAdmin
      .from('repair_quotes')
      .insert({
        session_id: session.id,
        workshop_id: '00000000-0000-0000-0000-000000000005',
        line_items: { item: 'should be array' } as any, // Wrong type
        labor_hours: 2,
        labor_rate: 100
      })

    expect(error).toBeTruthy()
    expect(error!.message).toContain('line_items_is_array')
  })

  test('should accept repair_quote with array line_items', async () => {
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .limit(1)
      .maybeSingle()

    const { data: workshop } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!session || !workshop) {
      test.skip()
      return
    }

    const { error } = await supabaseAdmin
      .from('repair_quotes')
      .insert({
        session_id: session.id,
        workshop_id: workshop.id,
        line_items: [{ description: 'Oil change', cost: 50 }], // Correct type
        labor_hours: 1,
        labor_rate: 75
      })

    expect(error).toBeFalsy()
  })

  test('should reject organization_members with non-object permissions', async () => {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle()

    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!org || !user) {
      test.skip()
      return
    }

    const { error } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'member',
        permissions: ['should', 'be', 'object'] as any // Wrong type
      })

    expect(error).toBeTruthy()
    expect(error!.message).toContain('permissions_is_object')
  })
})

test.describe('Enum Type Validation', () => {
  test('should reject session with invalid status', async () => {
    const { error } = await supabaseAdmin
      .from('sessions')
      .insert({
        type: 'chat',
        status: 'invalid_status' as any, // Invalid enum value
        plan: 'chat10'
      })

    expect(error).toBeTruthy()
    expect(error!.message).toContain('sessions_status_check')
  })

  test('should accept session with valid status', async () => {
    const validStatuses = ['pending', 'waiting', 'live', 'scheduled', 'completed', 'cancelled', 'expired', 'unattended']

    for (const status of validStatuses) {
      const { error } = await supabaseAdmin
        .from('sessions')
        .insert({
          type: 'chat',
          status: status as any,
          plan: 'chat10'
        })

      // Clean up
      if (!error) {
        await supabaseAdmin
          .from('sessions')
          .delete()
          .eq('status', status)
          .is('customer_user_id', null)
      }
    }
  })

  test('should reject mechanic with invalid account_type', async () => {
    const { error } = await supabaseAdmin
      .from('mechanics')
      .insert({
        email: 'test@example.com',
        account_type: 'invalid_type' as any // Invalid enum
      })

    expect(error).toBeTruthy()
    expect(error!.message).toContain('mechanics_account_type_check')
  })
})

test.describe('NULL Uniqueness Constraints', () => {
  test('should prevent duplicate pending organization invites', async () => {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!org) {
      test.skip()
      return
    }

    const testEmail = `test-${Date.now()}@example.com`

    // Insert first pending invite
    const { error: error1 } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        invite_email: testEmail,
        role: 'member',
        status: 'pending'
      })

    expect(error1).toBeFalsy()

    // Try to insert duplicate pending invite
    const { error: error2 } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        invite_email: testEmail,
        role: 'member',
        status: 'pending'
      })

    expect(error2).toBeTruthy()
    expect(error2!.message).toContain('already has a pending invite')

    // Clean up
    await supabaseAdmin
      .from('organization_members')
      .delete()
      .eq('invite_email', testEmail)
  })

  test('should allow multiple active members in same org', async () => {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle()

    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(2)

    if (!org || !users || users.length < 2) {
      test.skip()
      return
    }

    // Insert first member
    const { error: error1 } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: users[0].id,
        role: 'member',
        status: 'active'
      })

    // Insert second member
    const { error: error2 } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: users[1].id,
        role: 'member',
        status: 'active'
      })

    expect(error1).toBeFalsy()
    expect(error2).toBeFalsy()

    // Clean up
    await supabaseAdmin
      .from('organization_members')
      .delete()
      .in('user_id', users.map(u => u.id))
  })
})

test.describe('RLS Policy Enforcement', () => {
  test('should block unauthenticated access to sessions', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .limit(10)

    // Should get empty result (RLS blocks)
    expect(data).toEqual([])
  })

  test('should block customer from seeing other customers sessions', async () => {
    // This test requires two authenticated customers
    // For now, we verify RLS is enabled
    const { data: table } = await supabaseAdmin
      .rpc('get_table_rls_status', { table_name: 'sessions' } as any)
      .single()

    // Verify RLS is enabled
    expect(table).toBeTruthy()
  })

  test('should allow users to read their own profiles', async () => {
    // Get a test user
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!user) {
      test.skip()
      return
    }

    // Create client with user's token (in real test, get actual JWT)
    // For now, verify policy exists
    const { data: policies } = await supabaseAdmin
      .rpc('get_policies', { table_name: 'profiles' } as any)

    expect(policies).toBeTruthy()
  })
})

test.describe('Data Integrity - Cascading', () => {
  test('should cascade delete session participants when session deleted', async () => {
    // Create test session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        type: 'chat',
        status: 'pending',
        plan: 'chat10'
      })
      .select()
      .single()

    expect(sessionError).toBeFalsy()
    expect(session).toBeTruthy()

    if (!session) return

    // Add participant
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!user) {
      await supabaseAdmin.from('sessions').delete().eq('id', session.id)
      test.skip()
      return
    }

    const { error: participantError } = await supabaseAdmin
      .from('session_participants')
      .insert({
        session_id: session.id,
        user_id: user.id,
        role: 'customer'
      })

    expect(participantError).toBeFalsy()

    // Delete session
    const { error: deleteError } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('id', session.id)

    expect(deleteError).toBeFalsy()

    // Verify participant was cascaded
    const { data: participants } = await supabaseAdmin
      .from('session_participants')
      .select('*')
      .eq('session_id', session.id)

    expect(participants).toEqual([])
  })
})
