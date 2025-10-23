const fs = require('fs')

const filePath = 'c:/Users/Faiz Hashmi/theautodoctor/src/lib/sessionCleanup.ts'
let content = fs.readFileSync(filePath, 'utf8')

// Add new function before runFullCleanup
const newFunction = `/**
 * Mark pending sessions that were never started as unattended/expired
 *
 * BUSINESS RULE: Sessions stuck in 'pending' status should be cleaned up
 * - After 5 minutes → mark as 'unattended'
 * - After 120 minutes → mark as 'expired'
 *
 * @param unattendedMinutes - Minutes until unattended (default: 5)
 * @param expiredMinutes - Minutes until expired (default: 120)
 * @returns Number of sessions marked
 */
export async function markPendingSessions(
  unattendedMinutes: number = 5,
  expiredMinutes: number = 120
): Promise<number> {
  const unattendedCutoff = new Date(Date.now() - unattendedMinutes * 60 * 1000).toISOString()
  const expiredCutoff = new Date(Date.now() - expiredMinutes * 60 * 1000).toISOString()

  // Mark as expired (>120 min, never started)
  const { data: expiredSessions } = await supabaseAdmin
    .from('sessions')
    .select('id')
    .eq('status', 'pending')
    .is('started_at', null)
    .lt('created_at', expiredCutoff)

  if (expiredSessions && expiredSessions.length > 0) {
    console.log(\`[sessionCleanup] Marking \${expiredSessions.length} pending session(s) as expired (older than \${expiredMinutes} minutes)\`)

    await supabaseAdmin
      .from('sessions')
      .update({
        status: 'expired',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('status', 'pending')
      .is('started_at', null)
      .lt('created_at', expiredCutoff)
  }

  // Mark as unattended (>5 min but <120 min, never started)
  const { data: unattendedSessions } = await supabaseAdmin
    .from('sessions')
    .select('id')
    .eq('status', 'pending')
    .is('started_at', null)
    .gte('created_at', expiredCutoff)
    .lt('created_at', unattendedCutoff)

  if (unattendedSessions && unattendedSessions.length > 0) {
    console.log(\`[sessionCleanup] Marking \${unattendedSessions.length} pending session(s) as unattended (\${unattendedMinutes}-\${expiredMinutes} minutes old)\`)

    await supabaseAdmin
      .from('sessions')
      .update({
        status: 'unattended',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'pending')
      .is('started_at', null)
      .gte('created_at', expiredCutoff)
      .lt('created_at', unattendedCutoff)
  }

  return (expiredSessions?.length || 0) + (unattendedSessions?.length || 0)
}

`

// Insert before runFullCleanup function
const insertPoint = '/**\n * Comprehensive cleanup - runs all cleanup operations'
content = content.replace(insertPoint, newFunction + insertPoint)

// Update runFullCleanup to call the new function
content = content.replace(
  'const [unattendedCount, expiredTokens, acceptedCount, orphanedCount] = await Promise.all([\n    markUnattendedRequests(5), // 5 minutes - mark as unattended for admin assignment\n    expireOldStripeTokens(120), // 120 minutes (2 hours) - expire Stripe payment tokens\n    cleanupAcceptedRequests(30), // 30 minutes - accepted requests that customers never joined\n    cleanupOrphanedSessions(60), // 60 minutes - orphaned waiting sessions\n  ])',
  'const [unattendedCount, expiredTokens, acceptedCount, orphanedCount, pendingCount] = await Promise.all([\n    markUnattendedRequests(5), // 5 minutes - mark requests as unattended for admin assignment\n    expireOldStripeTokens(120), // 120 minutes (2 hours) - expire Stripe payment tokens\n    cleanupAcceptedRequests(30), // 30 minutes - accepted requests that customers never joined\n    cleanupOrphanedSessions(60), // 60 minutes - orphaned waiting sessions\n    markPendingSessions(5, 120), // 5→unattended, 120→expired for pending sessions\n  ])'
)

// Update stats to include pending count
content = content.replace(
  'totalCleaned: unattendedCount + expiredTokens + acceptedCount + orphanedCount,',
  'totalCleaned: unattendedCount + expiredTokens + acceptedCount + orphanedCount + pendingCount,'
)

// Update the comment in runFullCleanup
content = content.replace(
  ' * - Pending requests → unattended: 5 minutes (no mechanic accepted, needs admin assignment)\n * - Unattended → expired: 120 minutes (Stripe token expires, customer must re-request)\n * - Accepted requests: 30 minutes (if customer doesn\\'t join, free up mechanic)\n * - Orphaned sessions: 60 minutes (waiting sessions without valid requests)',
  ' * - Pending requests → unattended: 5 minutes (no mechanic accepted, needs admin assignment)\n * - Pending sessions → unattended/expired: 5/120 minutes (never started, cleanup)\n * - Unattended → expired: 120 minutes (Stripe token expires, customer must re-request)\n * - Accepted requests: 30 minutes (if customer doesn\\'t join, free up mechanic)\n * - Orphaned sessions: 60 minutes (waiting sessions without valid requests)'
)

fs.writeFileSync(filePath, content, 'utf8')
console.log('✅ Added markPendingSessions() function to sessionCleanup.ts')
console.log('   Pending sessions will now be marked as unattended/expired')
console.log('   - After 5 min → unattended')
console.log('   - After 120 min → expired')
