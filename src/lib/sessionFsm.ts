/**
 * SESSION LIFECYCLE FINITE STATE MACHINE (FSM)
 *
 * Purpose: Enforce valid state transitions for sessions at the server level.
 * This prevents illegal state jumps like pending → live without going through accepted.
 *
 * Usage:
 *   import { assertTransition, canTransition, nextStates } from '@/lib/sessionFsm'
 *
 *   // Check if transition is valid
 *   if (!canTransition('pending', 'accepted')) {
 *     return res.status(409).json({ error: 'Invalid state transition' })
 *   }
 *
 *   // Assert transition (throws error if invalid)
 *   assertTransition(currentStatus, newStatus) // throws SessionTransitionError
 */

import type { SessionStatus } from '@/types/session'

// ============================================================================
// TYPES
// ============================================================================

export type SessionState = SessionStatus

export class SessionTransitionError extends Error {
  constructor(
    public from: SessionState,
    public to: SessionState,
    message?: string
  ) {
    super(
      message ||
      `Invalid session state transition: ${from} → ${to}. ` +
      `Valid transitions from ${from}: ${nextStates(from).join(', ') || 'none'}`
    )
    this.name = 'SessionTransitionError'
  }
}

// ============================================================================
// STATE MACHINE DEFINITION
// ============================================================================

/**
 * Finite State Machine: Maps each state to its valid next states
 *
 * States:
 * - scheduled: Session is scheduled for a future time
 * - waiting: Mechanic has accepted, waiting to start
 * - live: Session is actively happening
 * - completed: Session ended successfully
 * - cancelled: Session was cancelled by either party
 * - expired: Session expired (timeout/no-show)
 * - refunded: Session was refunded
 * - archived: Session is archived (historical record)
 */
const STATE_TRANSITIONS: Record<SessionState, SessionState[]> = {
  // PENDING - initial state before scheduling
  pending: ['scheduled', 'cancelled', 'expired', 'unattended'],

  // SCHEDULED - can move to accepted/waiting, go live directly, cancel, or expire
  scheduled: ['accepted', 'waiting', 'live', 'cancelled', 'expired'],

  // ACCEPTED - mechanic accepted but not started yet
  accepted: ['waiting', 'live', 'cancelled', 'expired', 'reconnecting'],

  // WAITING - mechanic accepted, waiting to start
  waiting: ['live', 'cancelled', 'expired'],

  // RECONNECTING - temporary state while participants reconnect
  reconnecting: ['live', 'cancelled', 'expired'],

  // LIVE - active session
  live: ['completed', 'cancelled', 'expired'],

  // COMPLETED - may proceed to refund or archive
  completed: ['refunded', 'archived'],

  // CANCELLED - may proceed to refund or archive
  cancelled: ['refunded', 'archived'],

  // UNATTENDED - follow-up for sessions never started
  unattended: ['refunded', 'archived'],

  // EXPIRED - timed out session
  expired: ['refunded', 'archived'],

  // REFUNDED - only archived afterwards
  refunded: ['archived'],

  // ARCHIVED - terminal state
  archived: [],
}// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check if a state transition is valid
 * @param from - Current state
 * @param to - Target state
 * @returns true if transition is allowed, false otherwise
 */
export function canTransition(from: SessionState, to: SessionState): boolean {
  // Allow staying in same state (idempotent updates)
  if (from === to) return true

  // Check if 'to' is in the list of valid next states for 'from'
  const validNextStates = STATE_TRANSITIONS[from]
  if (!validNextStates) return false

  return validNextStates.includes(to)
}

/**
 * Assert that a state transition is valid (throws if not)
 * Use this in API routes to enforce state machine rules
 *
 * @param from - Current state
 * @param to - Target state
 * @throws SessionTransitionError if transition is invalid
 */
export function assertTransition(from: SessionState, to: SessionState): void {
  if (!canTransition(from, to)) {
    throw new SessionTransitionError(from, to)
  }
}

/**
 * Get the list of valid next states from a given state
 * @param from - Current state
 * @returns Array of valid next states
 */
export function nextStates(from: SessionState): SessionState[] {
  return STATE_TRANSITIONS[from] || []
}

/**
 * Check if a state is terminal (no more transitions possible)
 * @param state - State to check
 * @returns true if state is terminal
 */
export function isTerminalState(state: SessionState): boolean {
  return nextStates(state).length === 0
}

/**
 * Get all states that can transition to a given state
 * @param to - Target state
 * @returns Array of states that can transition to 'to'
 */
export function previousStates(to: SessionState): SessionState[] {
  return (Object.keys(STATE_TRANSITIONS) as SessionState[]).filter(from =>
    STATE_TRANSITIONS[from].includes(to)
  )
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a state transition and return detailed error info
 * @param from - Current state
 * @param to - Target state
 * @returns Validation result with error details if invalid
 */
export function validateTransition(from: SessionState, to: SessionState): {
  valid: boolean
  error?: string
  allowedStates?: SessionState[]
} {
  if (from === to) {
    return { valid: true }
  }

  const allowed = nextStates(from)

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
export function getTransitionMessage(from: SessionState, to: SessionState): string {
  const validation = validateTransition(from, to)

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
 * Check if session can be started (transition to live)
 */
export function canStart(currentState: SessionState): boolean {
  return canTransition(currentState, 'live')
}

/**
 * Check if session can be cancelled
 */
export function canCancel(currentState: SessionState): boolean {
  return canTransition(currentState, 'cancelled')
}

/**
 * Check if session can be completed
 */
export function canComplete(currentState: SessionState): boolean {
  return canTransition(currentState, 'completed')
}

/**
 * Check if session can be refunded
 */
export function canRefund(currentState: SessionState): boolean {
  return canTransition(currentState, 'refunded')
}

