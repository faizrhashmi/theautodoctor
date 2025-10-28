/**
 * PHASE 4: Unit Tests for Foreign Key Validator
 *
 * Tests the validation helper functions created in Phase 3.2
 */

import { test, expect } from '@playwright/test'
import {
  validateCustomerExists,
  validateWorkshopExists,
  validateSessionExists,
  validateMechanicExists,
  validateUserExists,
  validateChatSender,
  validateSessionRequestReferences,
  validateSessionParticipantReferences,
  ForeignKeyValidationError
} from '@/lib/validation/foreignKeyValidator'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

test.describe('validateCustomerExists', () => {
  test('should pass for valid customer ID', async () => {
    const { data: customer } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!customer) {
      test.skip()
      return
    }

    await expect(validateCustomerExists(customer.id)).resolves.not.toThrow()
  })

  test('should throw ForeignKeyValidationError for invalid customer ID', async () => {
    const invalidId = '00000000-0000-0000-0000-000000000001'

    await expect(validateCustomerExists(invalidId))
      .rejects
      .toThrow(ForeignKeyValidationError)

    try {
      await validateCustomerExists(invalidId)
    } catch (error) {
      expect(error).toBeInstanceOf(ForeignKeyValidationError)
      expect((error as ForeignKeyValidationError).entity).toBe('customer')
      expect((error as ForeignKeyValidationError).id).toBe(invalidId)
    }
  })
})

test.describe('validateWorkshopExists', () => {
  test('should pass for valid workshop ID', async () => {
    const { data: workshop } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!workshop) {
      test.skip()
      return
    }

    await expect(validateWorkshopExists(workshop.id)).resolves.not.toThrow()
  })

  test('should throw ForeignKeyValidationError for invalid workshop ID', async () => {
    const invalidId = '00000000-0000-0000-0000-000000000002'

    await expect(validateWorkshopExists(invalidId))
      .rejects
      .toThrow(ForeignKeyValidationError)

    try {
      await validateWorkshopExists(invalidId)
    } catch (error) {
      expect(error).toBeInstanceOf(ForeignKeyValidationError)
      expect((error as ForeignKeyValidationError).entity).toBe('workshop')
    }
  })
})

test.describe('validateSessionExists', () => {
  test('should pass for valid session ID', async () => {
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!session) {
      test.skip()
      return
    }

    await expect(validateSessionExists(session.id)).resolves.not.toThrow()
  })

  test('should throw ForeignKeyValidationError for invalid session ID', async () => {
    const invalidId = '00000000-0000-0000-0000-000000000003'

    await expect(validateSessionExists(invalidId))
      .rejects
      .toThrow(ForeignKeyValidationError)

    try {
      await validateSessionExists(invalidId)
    } catch (error) {
      expect(error).toBeInstanceOf(ForeignKeyValidationError)
      expect((error as ForeignKeyValidationError).entity).toBe('session')
    }
  })
})

test.describe('validateMechanicExists', () => {
  test('should pass for valid mechanic ID', async () => {
    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!mechanic) {
      test.skip()
      return
    }

    await expect(validateMechanicExists(mechanic.id)).resolves.not.toThrow()
  })

  test('should throw ForeignKeyValidationError for invalid mechanic ID', async () => {
    const invalidId = '00000000-0000-0000-0000-000000000004'

    await expect(validateMechanicExists(invalidId))
      .rejects
      .toThrow(ForeignKeyValidationError)

    try {
      await validateMechanicExists(invalidId)
    } catch (error) {
      expect(error).toBeInstanceOf(ForeignKeyValidationError)
      expect((error as ForeignKeyValidationError).entity).toBe('mechanic')
    }
  })
})

test.describe('validateUserExists', () => {
  test('should pass for valid user ID', async () => {
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!user) {
      test.skip()
      return
    }

    await expect(validateUserExists(user.id)).resolves.not.toThrow()
  })

  test('should throw ForeignKeyValidationError for invalid user ID', async () => {
    const invalidId = '00000000-0000-0000-0000-000000000005'

    await expect(validateUserExists(invalidId))
      .rejects
      .toThrow(ForeignKeyValidationError)
  })
})

test.describe('validateChatSender', () => {
  test('should return type "user" for valid user sender', async () => {
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!user) {
      test.skip()
      return
    }

    const result = await validateChatSender(user.id)
    expect(result.type).toBe('user')
  })

  test('should return type "mechanic" for valid mechanic sender', async () => {
    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!mechanic) {
      test.skip()
      return
    }

    const result = await validateChatSender(mechanic.id)
    expect(result.type).toBe('mechanic')
  })

  test('should throw ForeignKeyValidationError for invalid sender ID', async () => {
    const invalidId = '00000000-0000-0000-0000-000000000006'

    await expect(validateChatSender(invalidId))
      .rejects
      .toThrow(ForeignKeyValidationError)

    try {
      await validateChatSender(invalidId)
    } catch (error) {
      expect(error).toBeInstanceOf(ForeignKeyValidationError)
      expect((error as ForeignKeyValidationError).entity).toBe('sender')
      expect((error as ForeignKeyValidationError).message).toContain('auth.users or mechanics')
    }
  })
})

test.describe('validateSessionRequestReferences', () => {
  test('should pass for valid customer and workshop IDs', async () => {
    const { data: customer } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    const { data: workshop } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!customer || !workshop) {
      test.skip()
      return
    }

    await expect(
      validateSessionRequestReferences({
        customerId: customer.id,
        workshopId: workshop.id
      })
    ).resolves.not.toThrow()
  })

  test('should pass for valid customer without workshop', async () => {
    const { data: customer } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!customer) {
      test.skip()
      return
    }

    await expect(
      validateSessionRequestReferences({
        customerId: customer.id,
        workshopId: null
      })
    ).resolves.not.toThrow()
  })

  test('should throw for invalid customer ID', async () => {
    const invalidCustomerId = '00000000-0000-0000-0000-000000000007'

    await expect(
      validateSessionRequestReferences({
        customerId: invalidCustomerId,
        workshopId: null
      })
    ).rejects.toThrow(ForeignKeyValidationError)
  })

  test('should throw for invalid workshop ID', async () => {
    const { data: customer } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!customer) {
      test.skip()
      return
    }

    const invalidWorkshopId = '00000000-0000-0000-0000-000000000008'

    await expect(
      validateSessionRequestReferences({
        customerId: customer.id,
        workshopId: invalidWorkshopId
      })
    ).rejects.toThrow(ForeignKeyValidationError)
  })
})

test.describe('validateSessionParticipantReferences', () => {
  test('should pass for valid session and user IDs', async () => {
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .limit(1)
      .maybeSingle()

    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!session || !user) {
      test.skip()
      return
    }

    await expect(
      validateSessionParticipantReferences({
        sessionId: session.id,
        userId: user.id
      })
    ).resolves.not.toThrow()
  })

  test('should throw for invalid session ID', async () => {
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!user) {
      test.skip()
      return
    }

    const invalidSessionId = '00000000-0000-0000-0000-000000000009'

    await expect(
      validateSessionParticipantReferences({
        sessionId: invalidSessionId,
        userId: user.id
      })
    ).rejects.toThrow(ForeignKeyValidationError)
  })

  test('should throw for invalid user ID', async () => {
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!session) {
      test.skip()
      return
    }

    const invalidUserId = '00000000-0000-0000-0000-00000000000a'

    await expect(
      validateSessionParticipantReferences({
        sessionId: session.id,
        userId: invalidUserId
      })
    ).rejects.toThrow(ForeignKeyValidationError)
  })
})

test.describe('ForeignKeyValidationError', () => {
  test('should have correct properties', () => {
    const error = new ForeignKeyValidationError(
      'Test entity not found',
      'test_entity',
      'test-id-123'
    )

    expect(error.name).toBe('ForeignKeyValidationError')
    expect(error.message).toBe('Test entity not found')
    expect(error.entity).toBe('test_entity')
    expect(error.id).toBe('test-id-123')
    expect(error).toBeInstanceOf(Error)
  })
})
