// Test which column names work in mechanic_availability table
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function testColumns() {
  console.log('Testing column names in mechanic_availability table...\n')

  // Test 1: Try with old column names (weekday, is_active)
  console.log('Test 1: Trying column names used in API (weekday, is_active)')
  const { data: test1, error: error1 } = await supabase
    .from('mechanic_availability')
    .select('id, weekday, start_time, end_time, is_active')
    .limit(1)

  if (error1) {
    console.log('❌ Failed:', error1.message)
  } else {
    console.log('✓ Success! These column names exist in the database.')
    console.log('Data:', test1)
  }

  console.log('\n---\n')

  // Test 2: Try with migration column names (day_of_week, is_available)
  console.log('Test 2: Trying column names from migration (day_of_week, is_available)')
  const { data: test2, error: error2 } = await supabase
    .from('mechanic_availability')
    .select('id, day_of_week, start_time, end_time, is_available')
    .limit(1)

  if (error2) {
    console.log('❌ Failed:', error2.message)
  } else {
    console.log('✓ Success! These column names exist in the database.')
    console.log('Data:', test2)
  }

  console.log('\n---\n')

  // Test 3: Try selecting all columns to see what's actually there
  console.log('Test 3: Selecting all columns (*)')
  const { data: test3, error: error3 } = await supabase
    .from('mechanic_availability')
    .select('*')
    .limit(1)

  if (error3) {
    console.log('❌ Failed:', error3.message)
  } else {
    console.log('✓ Success!')
    if (test3 && test3.length > 0) {
      console.log('Column names found:', Object.keys(test3[0]))
      console.log('Sample data:', test3[0])
    } else {
      console.log('No records in table. Let me check with empty result set...')

      // Even with no data, we can see the structure from the types
      const { data: emptyTest } = await supabase
        .from('mechanic_availability')
        .select('*')
        .limit(0)

      console.log('Empty query result:', emptyTest)
    }
  }

  console.log('\n---\n')

  // Test 4: Try to order by both column name variants
  console.log('Test 4: Testing ORDER BY with different column names')

  const { error: orderTest1 } = await supabase
    .from('mechanic_availability')
    .select('id')
    .order('weekday', { ascending: true })
    .limit(1)

  console.log('ORDER BY weekday:', orderTest1 ? `❌ ${orderTest1.message}` : '✓ Works')

  const { error: orderTest2 } = await supabase
    .from('mechanic_availability')
    .select('id')
    .order('day_of_week', { ascending: true })
    .limit(1)

  console.log('ORDER BY day_of_week:', orderTest2 ? `❌ ${orderTest2.message}` : '✓ Works')

  console.log('\n=== SUMMARY ===')
  console.log('Based on the tests above, the correct column names are:')
  if (!error2 && !orderTest2) {
    console.log('✓ day_of_week (NOT weekday)')
    console.log('✓ is_available (NOT is_active)')
    console.log('\n✅ The API has been updated to use the correct column names.')
  } else if (!error1 && !orderTest1) {
    console.log('✓ weekday (NOT day_of_week)')
    console.log('✓ is_active (NOT is_available)')
    console.log('\n⚠️  The migration file may be out of sync with the database!')
  } else {
    console.log('❓ Could not determine column names. Check results above.')
  }
}

testColumns().catch(console.error)
