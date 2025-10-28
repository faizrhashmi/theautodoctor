/**
 * SESSION REQUEST FINITE STATE MACHINE (FSM)
 *
 * Purpose: Enforce valid state transitions for session requests.
 * This ensures requests follow proper lifecycle: pending → accepted/expired/cancelled
 *
 * Usage:
 *   import { assertRequestTransition, canRequestTransition } from '@/lib/sessionRequestFsm'
 *
 *   // Check if transition is valid
 *   if (!canRequestTransition('pending', 'accepted')) {
 *     return res.status(409).json({ error: 'Invalid state transition' })
 *   }
 *
 *   // Assert transition (throws error if invalid)
 *   assertRequestTransition(currentStatus, newStatus) // throws SessionRequestTransitionError
 */

// ============================================================================
// TYPES
// ============================================================================

export type SessionRequestStatus = 'pending' | 'accepted' | 'cancelled' | 'unattended' | 'expired'

export class SessionRequestTransitionError extends Error {
  constructor(
    public from: SessionRequestStatus,
    public to: SessionRequestStatus,
    message?: string
  ) {
    super(
      message ||
      `Invalid session request state transition: ${from} → ${to}. ` +
      `Valid transitions from ${from}: ${nextRequestStates(from).join(', ') || 'none'}`
    )
    this.name = 'SessionRequestTransitionError'
  }
}

// ============================================================================
// STATE MACHINE DEFINITION
// ============================================================================

/**
 * Finite State Machine: Maps each request state to its valid next states
 *
 * States:
 * - pending: Request is waiting for mechanic to accept (initial state)
 * - accepted: Mechanic has accepted the request
 * - expired: Request timed out (no mechanic responded within timeout period)
 * - cancelled: Request was cancelled by customer or system
 * - unattended: Request was not attended to (legacy status)
 */
const REQUEST_STATE_TRANSITIONS: Record<SessionRequestStatus, SessionRequestStatus[]> = {
  // PENDING - can be accepted, expire, or be cancelled
  pending: ['accepted', 'expired', 'cancelled'],

  // ACCEPTED - terminal state (request fulfilled)
  accepted: [],

  // EXPIRED - terminal state (request timed out)
  expired: [],

  // CANCELLED - terminal state (request cancelled)
  cancelled: [],

  // UNATTENDED - terminal state (legacy, no longer used)
  unattended: [],
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check if a request state transition is valid
 * @param from - Current state
 * @param to - Target state
 * @returns true if transition is allowed, false otherwise
 */
export function canRequestTransition(from: SessionRequestStatus, to: SessionRequestStatus): boolean {
  // Allow staying in same state (idempotent updates)
  if (from === to) return true

  // Check if 'to' is in the list of valid next states for 'from'
  const validNextStates = REQUEST_STATE_TRANSITIONS[from]
  if (!validNextStates) return false

  return validNextStates.includes(to)
}

/**
 * Assert that a request state transition is valid (throws if not)
 * Use this in API routes to enforce state machine rules
 *
 * @param from - Current state
 * @param to - Target state
 * @throws SessionRequestTransitionError if transition is invalid
 */
export function assertRequestTransition(from: SessionRequestStatus, to: SessionRequestStatus): void {
  if (!canRequestTransition(from, to)) {
    throw new SessionRequestTransitionError(from, to)
  }
}

/**
 * Get the list of valid next states from a given state
 * @param from - Current state
 * @returns Array of valid next states
 */
export function nextRequestStates(from: SessionRequestStatus): SessionRequestStatus[] {
  return REQUEST_STATE_TRANSITIONS[from] || []
}

/**
 * Check if a state is terminal (no more transitions possible)
 * @param state - State to check
 * @returns true if state is terminal
 */
export function isRequestTerminalState(state: SessionRequestStatus): boolean {
  return nextRequestStates(state).length === 0
}

/**
 * Get all states that can transition to a given state
 * @param to - Target state
 * @returns Array of states that can transition to 'to'
 */
export function previousRequestStates(to: SessionRequestStatus): SessionRequestStatus[] {
  return (Object.keys(REQUEST_STATE_TRANSITIONS) as SessionRequestStatus[]).filter(from =>
    REQUEST_STATE_TRANSITIONS[from].includes(to)
  )
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a request state transition and return detailed error info
 * @param from - Current state
 * @param to - Target state
 * @returns Validation result with error details if invalid
 */
export function validateRequestTransition(from: SessionRequestStatus, to: SessionRequestStatus): {
  valid: boolean
  error?: string
  allowedStates?: SessionRequestStatus[]
} {
  if (from === to) {
    return { valid: true }
  }

  const allowed = nextRequestStates(from)

  if (!allowed.includes(to)) {
    return {
      valid: false,
      error: `Cannot transition from ${from} to ${to}`,
      allowedStates: allowed,
    }
  }

  return { valid: true }
}

/**
 * Get human-readable transition validation message
 * @param from - Current state
 * @param to - Target state
 * @returns Human-readable message
 */
export function getRequestTransitionMessage(from: SessionRequestStatus, to: SessionRequestStatus): string {
  const validation = validateRequestTransition(from, to)

  if (validation.valid) {
    return `Transition ${from} → ${to} is valid`
  }

  const allowed = validation.allowedStates || []
  if (allowed.length === 0) {
    return `State ${from} is terminal. No transitions allowed.`
  }

  return `Cannot transition ${from} → ${to}. Valid options: ${allowed.join(', ')}`
}

// ============================================================================
// COMMON STATE CHECKS
// ============================================================================

/**
 * Check if request can be accepted
 */
export function canAcceptRequest(currentState: SessionRequestStatus): boolean {
  return canRequestTransition(currentState, 'accepted')
}

/**
 * Check if request can be cancelled
 */
export function canCancelRequest(currentState: SessionRequestStatus): boolean {
  return canRequestTransition(currentState, 'cancelled')
}

/**
 * Check if request can expire
 */
export function canExpireRequest(currentState: SessionRequestStatus): boolean {
  return canRequestTransition(currentState, 'expired')
}

/**
 * Check if request is in a state where it's awaiting mechanic action
 */
export function isRequestAwaitingMechanic(state: SessionRequestStatus): boolean {
  return state === 'pending'
}

/**
 * Check if request has been resolved (accepted, expired, or cancelled)
 */
export function isRequestResolved(state: SessionRequestStatus): boolean {
  return isRequestTerminalState(state)
}
