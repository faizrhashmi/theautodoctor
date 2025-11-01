/**
 * Phase 2 Schema Introspection - Mechanics Table
 * Checks for about_me and hourly_rate columns
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
  console.log('Phase 2 Schema Introspection - Mechanics Table')
  console.log('='.repeat(80))
  console.log()

  // Try direct select on one mechanic to see columns
  const { data: sampleMechanic, error: sampleError } = await supabase
    .from('mechanics')
    .select('*')
    .limit(1)
    .single()

  if (sampleError) {
    console.error('Error querying mechanics:', sampleError.message)
    return
  }

  if (sampleMechanic) {
    console.log('Mechanics table columns (from sample row):')
    console.log('-'.repeat(80))

    const columnNames = Object.keys(sampleMechanic)
    columnNames.forEach(col => {
      const value = sampleMechanic[col]
      const type = typeof value
      console.log(`  ${col}: ${type} ${value === null ? '(null)' : ''}`)
    })

    console.log()
    console.log('Target columns check:')
    console.log('-'.repeat(80))

    const hasAboutMe = columnNames.includes('about_me')
    const hasHourlyRate = columnNames.includes('hourly_rate')

    console.log(`  about_me:    ${hasAboutMe ? '✅ EXISTS' : '❌ MISSING'}`)
    console.log(`  hourly_rate: ${hasHourlyRate ? '✅ EXISTS' : '❌ MISSING'}`)
    console.log()

    if (hasAboutMe && hasHourlyRate) {
      console.log('✅ Both columns exist - NO SQL MIGRATION REQUIRED')
    } else if (!hasAboutMe && !hasHourlyRate) {
      console.log('❌ Both columns missing - SQL MIGRATION REQUIRED')
    } else {
      console.log('⚠️  One column exists - SQL MIGRATION REQUIRED for missing column')
    }
  }

  console.log()
  console.log('='.repeat(80))
}

main().catch(console.error)
