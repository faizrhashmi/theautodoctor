import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: { id: string }
}

/**
 * 🔀 PHASE 2: DIAGNOSTIC ROUTE REDIRECT SHIM
 *
 * This route now redirects to /video/[id] which handles both video and diagnostic sessions.
 *
 * Why keep this file?
 * - Backward compatibility: Existing links/bookmarks continue to work
 * - Safe migration: No 404s for users with old URLs
 * - Telemetry: We can monitor redirect volume
 *
 * When to remove?
 * - After confirming all UI updated to use /video/[id]
 * - After monitoring shows minimal redirects
 * - Phase 3 or later
 */
export default async function DiagnosticRedirect({ params }: PageProps) {
  const sessionId = params.id

  // Log redirect for monitoring (can be removed later)
  console.log(`[DIAGNOSTIC REDIRECT] Redirecting session ${sessionId} to /video/${sessionId}`)

  // Permanent redirect to consolidated video route
  redirect(`/video/${sessionId}`)
}
