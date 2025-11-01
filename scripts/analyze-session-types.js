/**
 * Analyze session types in sessions table
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
  console.log('Session Types Analysis')
  console.log('='.repeat(80))
  console.log()

  // Get distinct plan values
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('plan, type, duration_minutes')

  if (error) {
    console.error('Error querying sessions:', error.message)
    return
  }

  console.log(`Total sessions: ${sessions.length}`)
  console.log()

  // Group by plan
  const planCounts = {}
  sessions.forEach(s => {
    planCounts[s.plan] = (planCounts[s.plan] || 0) + 1
  })

  console.log('Sessions by PLAN:')
  Object.entries(planCounts).sort((a, b) => b[1] - a[1]).forEach(([plan, count]) => {
    console.log(`  ${plan}: ${count}`)
  })
  console.log()

  // Group by type
  const typeCounts = {}
  sessions.forEach(s => {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1
  })

  console.log('Sessions by TYPE:')
  Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`)
  })
  console.log()

  // Duration analysis
  const durationsWithPlan = {}
  sessions.forEach(s => {
    const key = `${s.plan}`
    if (!durationsWithPlan[key]) durationsWithPlan[key] = []
    durationsWithPlan[key].push(s.duration_minutes)
  })

  console.log('Duration minutes by PLAN:')
  Object.entries(durationsWithPlan).forEach(([plan, durations]) => {
    const validDurations = durations.filter(d => d !== null && d !== undefined)
    if (validDurations.length > 0) {
      const avg = validDurations.reduce((a, b) => a + b, 0) / validDurations.length
      const min = Math.min(...validDurations)
      const max = Math.max(...validDurations)
      console.log(`  ${plan}: avg=${avg.toFixed(1)}, min=${min}, max=${max}`)
    } else {
      console.log(`  ${plan}: no duration data`)
    }
  })
  console.log()

  // Mapping analysis - what would be "micro" vs "full"?
  console.log('Potential Micro/Full Session Mapping:')
  console.log('Based on plan names:')
  console.log('  Micro sessions (<=15 min): chat_10, message_only')
  console.log('  Full sessions (>15 min): video_15, diagnostic_30, standard, extended')
  console.log()

  // Count how many would be micro vs full
  const microPlans = ['chat_10', 'message_only']
  const fullPlans = ['video_15', 'diagnostic_30', 'standard', 'extended']

  const microCount = sessions.filter(s => microPlans.includes(s.plan)).length
  const fullCount = sessions.filter(s => fullPlans.includes(s.plan)).length
  const otherCount = sessions.length - microCount - fullCount

  console.log('Session counts if we use plan-based mapping:')
  console.log(`  Micro: ${microCount}`)
  console.log(`  Full: ${fullCount}`)
  console.log(`  Other: ${otherCount}`)

  console.log()
  console.log('='.repeat(80))
}

main().catch(console.error)
