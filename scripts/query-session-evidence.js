/**
 * Phase 1B Validation - Query Session Evidence
 *
 * Queries database to gather evidence for session table selection decision.
 * Read-only operations.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('='.repeat(80))
  console.log('Phase 1B Validation - Session Table Evidence')
  console.log('='.repeat(80))
  console.log()

  // 1. Count sessions table
  console.log('1. TABLE COUNTS')
  console.log('-'.repeat(80))

  const { count: sessionsCount, error: sessionsError } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })

  if (sessionsError) {
    console.error('Error querying sessions:', sessionsError.message)
  } else {
    console.log(`sessions: ${sessionsCount || 0} rows`)
  }

  const { count: diagSessionsCount, error: diagError } = await supabase
    .from('diagnostic_sessions')
    .select('*', { count: 'exact', head: true })

  if (diagError) {
    console.error('Error querying diagnostic_sessions:', diagError.message)
  } else {
    console.log(`diagnostic_sessions: ${diagSessionsCount || 0} rows`)
  }

  console.log()

  // 2. Get last 5 mechanic shifts with session data
  console.log('2. LAST 5 MECHANIC SHIFTS')
  console.log('-'.repeat(80))

  const { data: shifts, error: shiftsError } = await supabase
    .from('mechanic_shift_logs')
    .select('id, mechanic_id, clock_in_at, clock_out_at, micro_sessions_taken, full_sessions_taken, micro_minutes_used')
    .not('clock_out_at', 'is', null)
    .order('clock_out_at', { ascending: false })
    .limit(5)

  if (shiftsError) {
    console.error('Error querying shifts:', shiftsError.message)
  } else {
    console.log(`Found ${shifts?.length || 0} completed shifts\n`)

    for (const shift of shifts || []) {
      console.log(`Shift ID: ${shift.id}`)
      console.log(`  Mechanic: ${shift.mechanic_id}`)
      console.log(`  Clock In: ${shift.clock_in_at}`)
      console.log(`  Clock Out: ${shift.clock_out_at}`)
      console.log(`  Micro Sessions: ${shift.micro_sessions_taken || 0}`)
      console.log(`  Full Sessions: ${shift.full_sessions_taken || 0}`)
      console.log(`  Micro Minutes: ${shift.micro_minutes_used || 0}`)
      console.log()
    }
  }

  // 3. For the last shift, query actual sessions in both tables
  if (shifts && shifts.length > 0) {
    const lastShift = shifts[0]

    console.log('3. SESSION DATA FOR LAST SHIFT')
    console.log('-'.repeat(80))
    console.log(`Shift: ${lastShift.id}`)
    console.log(`Time Range: ${lastShift.clock_in_at} to ${lastShift.clock_out_at}`)
    console.log()

    // Query sessions table
    const { data: sessionsData, error: sessionsQueryError } = await supabase
      .from('sessions')
      .select('id, mechanic_id, created_at, session_duration_type, status')
      .eq('mechanic_id', lastShift.mechanic_id)
      .gte('created_at', lastShift.clock_in_at)
      .lte('created_at', lastShift.clock_out_at)
      .order('created_at', { ascending: false })

    if (sessionsQueryError) {
      console.error('Error querying sessions for shift:', sessionsQueryError.message)
    } else {
      console.log(`sessions table: ${sessionsData?.length || 0} sessions found`)
      if (sessionsData && sessionsData.length > 0) {
        for (const session of sessionsData) {
          console.log(`  - ${session.id} | ${session.session_duration_type || 'N/A'} | ${session.status} | ${session.created_at}`)
        }
      }
    }
    console.log()

    // Query diagnostic_sessions table
    const { data: diagSessionsData, error: diagQueryError } = await supabase
      .from('diagnostic_sessions')
      .select('id, mechanic_id, created_at, session_duration_type, status')
      .eq('mechanic_id', lastShift.mechanic_id)
      .gte('created_at', lastShift.clock_in_at)
      .lte('created_at', lastShift.clock_out_at)
      .order('created_at', { ascending: false })

    if (diagQueryError) {
      console.error('Error querying diagnostic_sessions for shift:', diagQueryError.message)
    } else {
      console.log(`diagnostic_sessions table: ${diagSessionsData?.length || 0} sessions found`)
      if (diagSessionsData && diagSessionsData.length > 0) {
        for (const session of diagSessionsData) {
          console.log(`  - ${session.id} | ${session.session_duration_type || 'N/A'} | ${session.status} | ${session.created_at}`)
        }
      }
    }
    console.log()

    // 4. Compare counts
    console.log('4. COMPARISON')
    console.log('-'.repeat(80))
    console.log(`Shift log reports:`)
    console.log(`  Micro sessions: ${lastShift.micro_sessions_taken || 0}`)
    console.log(`  Full sessions: ${lastShift.full_sessions_taken || 0}`)
    console.log(`  Total: ${(lastShift.micro_sessions_taken || 0) + (lastShift.full_sessions_taken || 0)}`)
    console.log()
    console.log(`Actual data:`)
    console.log(`  sessions table: ${sessionsData?.length || 0} total`)

    const sessionsMicro = sessionsData?.filter(s => s.session_duration_type === 'micro').length || 0
    const sessionsFull = sessionsData?.filter(s => ['standard', 'extended'].includes(s.session_duration_type)).length || 0
    console.log(`    - Micro: ${sessionsMicro}`)
    console.log(`    - Full: ${sessionsFull}`)

    console.log(`  diagnostic_sessions table: ${diagSessionsData?.length || 0} total`)

    const diagMicro = diagSessionsData?.filter(s => s.session_duration_type === 'micro').length || 0
    const diagFull = diagSessionsData?.filter(s => ['standard', 'extended'].includes(s.session_duration_type)).length || 0
    console.log(`    - Micro: ${diagMicro}`)
    console.log(`    - Full: ${diagFull}`)
    console.log()

    // Determine which matches
    const sessionsMatch = (sessionsMicro === (lastShift.micro_sessions_taken || 0)) && (sessionsFull === (lastShift.full_sessions_taken || 0))
    const diagMatch = (diagMicro === (lastShift.micro_sessions_taken || 0)) && (diagFull === (lastShift.full_sessions_taken || 0))

    console.log(`Match Analysis:`)
    console.log(`  sessions table matches shift log: ${sessionsMatch ? '✅ YES' : '❌ NO'}`)
    console.log(`  diagnostic_sessions table matches shift log: ${diagMatch ? '✅ YES' : '❌ NO'}`)
  }

  console.log()
  console.log('='.repeat(80))
  console.log('Evidence collection complete')
  console.log('='.repeat(80))
}

main().catch(console.error)
