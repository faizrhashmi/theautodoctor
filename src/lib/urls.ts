/**
 * Centralized URL builders for session routes
 *
 * This prevents scattered URL logic across the codebase and ensures
 * consistent routing as we evolve the architecture.
 *
 * Current architecture:
 * - Chat sessions → /chat/[id]
 * - Video sessions → /video/[id]
 * - Diagnostic sessions → /video/[id] (consolidated)
 */

export type SessionType = 'chat' | 'video' | 'diagnostic'

/**
 * Build the correct URL for a session based on its type
 *
 * @param type - Session type from database
 * @param id - Session ID
 * @returns Route path for the session
 *
 * @example
 * sessionUrl('chat', '123') → '/chat/123'
 * sessionUrl('video', '456') → '/video/456'
 * sessionUrl('diagnostic', '789') → '/video/789' (consolidated)
 */
export function sessionUrl(type: SessionType, id: string): string {
  if (type === 'chat') {
    return `/chat/${id}`
  }

  // Both 'video' and 'diagnostic' use the /video route
  // Diagnostic is a plan type, not a route type (as of Phase 2)
  return `/video/${id}`
}

/**
 * Build dashboard URL based on user role
 *
 * @param role - User role ('customer' or 'mechanic')
 * @returns Dashboard route path
 */
export function dashboardUrl(role: 'customer' | 'mechanic'): string {
  return `/${role}/dashboard`
}
