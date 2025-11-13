// Test script to debug mechanics query issue
// Run with: npx tsx test-mechanics-query.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testQuery() {
  console.log('[TEST] Testing mechanics query...')
  console.log('[TEST] Supabase URL:', supabaseUrl)
  console.log('[TEST] Service key configured:', !!supabaseServiceKey)

  // Test 1: Simple query without join
  console.log('\n[TEST 1] Simple SELECT without join...')
  const { data: simpleData, error: simpleError } = await supabase
    .from('mechanics')
    .select('id, name, email, workshop_id')
    .limit(5)

  if (simpleError) {
    console.error('[TEST 1] ERROR:', simpleError)
  } else {
    console.log('[TEST 1] SUCCESS - Found', simpleData?.length, 'mechanics')
    console.log('[TEST 1] Sample:', simpleData?.[0])
  }

  // Test 2: Check mechanics table schema
  console.log('\n[TEST 2] Check mechanics table schema...')
  const { data: mechData, error: mechError } = await supabase
    .from('mechanics')
    .select('*')
    .limit(1)

  if (mechError) {
    console.error('[TEST 2] ERROR:', mechError)
  } else {
    console.log('[TEST 2] SUCCESS - Mechanics columns:')
    const columns = Object.keys(mechData?.[0] || {})
    columns.forEach((col, i) => {
      if (i % 5 === 0) console.log('')
      process.stdout.write(col.padEnd(30))
    })
    console.log('\n')
  }

  // Test 3: Full query exactly as API uses it
  console.log('\n[TEST 3] Full API query with ALL columns...')
  const { data: fullData, error: fullError } = await supabase
    .from('mechanics')
    .select(`
      id,
      user_id,
      name,
      email,
      rating,
      years_of_experience,
      currently_on_shift,
      last_clock_in,
      is_brand_specialist,
      brand_specializations,
      service_keywords,
      country,
      city,
      postal_code,
      completed_sessions,
      red_seal_certified,
      profile_completion_score,
      certification_expiry_date,
      account_status,
      suspended_until,
      workshop_id,
      shop_affiliation,
      can_perform_physical_work,
      participation_mode,
      organizations:workshop_id (
        id,
        name,
        address,
        city,
        province,
        postal_code,
        country
      )
    `)
    .eq('application_status', 'approved')
    .eq('account_status', 'active')
    .eq('can_accept_sessions', true)
    .gte('profile_completion_score', 80)
    .limit(5)

  if (fullError) {
    console.error('[TEST 3] ERROR:', fullError)
    console.error('[TEST 3] Error message:', fullError.message)
    console.error('[TEST 3] Error code:', fullError.code)
    console.error('[TEST 3] Error details:', fullError.details)
    console.error('[TEST 3] Error hint:', fullError.hint)
  } else {
    console.log('[TEST 3] SUCCESS - Found', fullData?.length, 'mechanics')
    if (fullData && fullData.length > 0) {
      console.log('[TEST 3] Sample mechanic:', JSON.stringify(fullData[0], null, 2))
    }
  }
}

testQuery().then(() => {
  console.log('\n[TEST] Complete')
  process.exit(0)
}).catch((err) => {
  console.error('\n[TEST] Fatal error:', err)
  process.exit(1)
})
