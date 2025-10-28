/**
 * Foreign Key Validation Utilities
 *
 * This module provides validation functions to check the existence of foreign key
 * references before INSERT operations. This prevents foreign key constraint violations
 * and orphaned records in the database.
 *
 * PHASE 3.2: Pre-insert validation to prevent data integrity issues
 * Date: 2025-10-27
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export class ForeignKeyValidationError extends Error {
  constructor(
    message: string,
    public readonly entity: string,
    public readonly id: string
  ) {
    super(message)
    this.name = 'ForeignKeyValidationError'
  }
}

/**
 * Validates that a customer (user profile) exists
 */
export async function validateCustomerExists(customerId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', customerId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to validate customer: ${error.message}`)
  }

  if (!data) {
    throw new ForeignKeyValidationError(
      `Customer with ID ${customerId} does not exist`,
      'customer',
      customerId
    )
  }
}

/**
 * Validates that a workshop (organization) exists
 */
export async function validateWorkshopExists(workshopId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('id', workshopId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to validate workshop: ${error.message}`)
  }

  if (!data) {
    throw new ForeignKeyValidationError(
      `Workshop with ID ${workshopId} does not exist`,
      'workshop',
      workshopId
    )
  }
}

/**
 * Validates that a session exists
 */
export async function validateSessionExists(sessionId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to validate session: ${error.message}`)
  }

  if (!data) {
    throw new ForeignKeyValidationError(
      `Session with ID ${sessionId} does not exist`,
      'session',
      sessionId
    )
  }
}

/**
 * Validates that a mechanic exists
 * Checks both auth.users (for authenticated users) and mechanics table
 */
export async function validateMechanicExists(mechanicId: string): Promise<void> {
  // Check mechanics table first (main source of truth for mechanics)
  const { data: mechanicData, error: mechanicError } = await supabaseAdmin
    .from('mechanics')
    .select('id')
    .eq('id', mechanicId)
    .maybeSingle()

  if (mechanicError) {
    throw new Error(`Failed to validate mechanic: ${mechanicError.message}`)
  }

  if (!mechanicData) {
    throw new ForeignKeyValidationError(
      `Mechanic with ID ${mechanicId} does not exist`,
      'mechanic',
      mechanicId
    )
  }
}

/**
 * Validates that a user exists in auth.users
 * This is for references to authenticated users (customer or mechanic)
 */
export async function validateUserExists(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to validate user: ${error.message}`)
  }

  if (!data) {
    throw new ForeignKeyValidationError(
      `User with ID ${userId} does not exist`,
      'user',
      userId
    )
  }
}

/**
 * Validates chat message sender
 * Sender can be either a user (auth.users) or a mechanic (mechanics table)
 * This handles the polymorphic foreign key in chat_messages.sender_id
 */
export async function validateChatSender(senderId: string): Promise<{ type: 'user' | 'mechanic' }> {
  // Check auth.users first
  const { data: userData } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', senderId)
    .maybeSingle()

  if (userData) {
    return { type: 'user' }
  }

  // Check mechanics table
  const { data: mechanicData } = await supabaseAdmin
    .from('mechanics')
    .select('id')
    .eq('id', senderId)
    .maybeSingle()

  if (mechanicData) {
    return { type: 'mechanic' }
  }

  throw new ForeignKeyValidationError(
    `Sender with ID ${senderId} does not exist in auth.users or mechanics`,
    'sender',
    senderId
  )
}

/**
 * Batch validation for creating session requests
 * Validates all required foreign keys in a single function
 */
export async function validateSessionRequestReferences(params: {
  customerId: string
  workshopId?: string | null
}): Promise<void> {
  const validations: Promise<void>[] = []

  // Always validate customer
  validations.push(validateCustomerExists(params.customerId))

  // Validate workshop if provided
  if (params.workshopId) {
    validations.push(validateWorkshopExists(params.workshopId))
  }

  try {
    await Promise.all(validations)
  } catch (error) {
    if (error instanceof ForeignKeyValidationError) {
      throw error
    }
    throw new Error(`Foreign key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Batch validation for creating session participants
 */
export async function validateSessionParticipantReferences(params: {
  sessionId: string
  userId: string
}): Promise<void> {
  try {
    await Promise.all([
      validateSessionExists(params.sessionId),
      validateUserExists(params.userId)
    ])
  } catch (error) {
    if (error instanceof ForeignKeyValidationError) {
      throw error
    }
    throw new Error(`Foreign key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
