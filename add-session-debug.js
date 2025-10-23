const fs = require('fs')

const filePath = 'c:/Users/Faiz Hashmi/theautodoctor/src/app/mechanic/dashboard/MechanicDashboardClient.tsx'
let content = fs.readFileSync(filePath, 'utf8')

// Add debugging at the start of loadSessions
content = content.replace(
  'const loadSessions = useCallback(\n    async (options?: { silent?: boolean }) => {\n      if (!mechanicId) return',
  `const loadSessions = useCallback(
    async (options?: { silent?: boolean }) => {
      console.log('[loadSessions] Starting, mechanicId:', mechanicId)
      if (!mechanicId) return`
)

// Add debugging after query
content = content.replace(
  '        const { data, error } = await supabase\n          .from(\'sessions\')\n          .select(\'id, status, plan, type, scheduled_start, scheduled_end, scheduled_for, started_at, ended_at, duration_minutes, metadata\')\n          .eq(\'mechanic_id\', mechanicId)\n          .order(\'scheduled_start\', { ascending: true, nullsFirst: false })\n          .order(\'created_at\', { ascending: false })\n\n        if (!isMountedRef.current) {\n          return\n        }',
  `        const { data, error } = await supabase
          .from('sessions')
          .select('id, status, plan, type, scheduled_start, scheduled_end, scheduled_for, started_at, ended_at, duration_minutes, metadata')
          .eq('mechanic_id', mechanicId)
          .order('scheduled_start', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })

        console.log('[loadSessions] Query result:', { dataCount: data?.length, error })

        if (!isMountedRef.current) {
          console.log('[loadSessions] Component unmounted, aborting')
          return
        }`
)

// Add debugging after mapping
content = content.replace(
  '        } else if (data) {\n          const mapped = data.map(mapSessionRow)\n\n          // Filter sessions by category',
  `        } else if (data) {
          const mapped = data.map(mapSessionRow)
          console.log('[loadSessions] Mapped sessions:', mapped.length)
          console.log('[loadSessions] First 3 sessions:', mapped.slice(0, 3))

          // Filter sessions by category`
)

// Add debugging after filtering session history
content = content.replace(
  '          // Session History: Completed AND Cancelled sessions\n          const history = mapped\n            .filter((session) => session.status === \'completed\' || session.status === \'cancelled\')\n            .sort((a, b) => toTimeValue(b.endedAt ?? b.scheduledEnd) - toTimeValue(a.endedAt ?? a.scheduledEnd))\n\n          setUpcomingSessions(upcoming)\n          setSessionHistory(history)',
  `          // Session History: Completed AND Cancelled sessions
          const history = mapped
            .filter((session) => session.status === 'completed' || session.status === 'cancelled')
            .sort((a, b) => toTimeValue(b.endedAt ?? b.scheduledEnd) - toTimeValue(a.endedAt ?? a.scheduledEnd))

          console.log('[loadSessions] Session history filtered:', history.length)
          console.log('[loadSessions] First 3 history:', history.slice(0, 3))

          setUpcomingSessions(upcoming)
          setSessionHistory(history)
          console.log('[loadSessions] State updated - upcoming:', upcoming.length, 'history:', history.length)`
)

fs.writeFileSync(filePath, content, 'utf8')
console.log('✅ Added debugging to loadSessions function')
console.log('   Open browser console and refresh the page to see logs')
