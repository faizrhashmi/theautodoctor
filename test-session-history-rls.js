const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local file
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1]] = match[2]
  }
})

// Test with CLIENT (what browser uses - subject to RLS)
const clientSupabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Test with ADMIN (bypasses RLS)
const adminSupabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

async function testSessionHistoryRLS() {
  const mechanicId = '1daec681-04cf-4640-9b98-d5369361e366'

  console.log('🔍 Testing Session History RLS Permissions\n')
  console.log('Mechanic ID:', mechanicId)
  console.log('')

  // Test 1: Client (like browser - has RLS)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 1: Client Query (Subject to RLS)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const { data: clientData, error: clientError } = await clientSupabase
    .from('sessions')
    .select('id, status, type, created_at')
    .eq('mechanic_id', mechanicId)
    .in('status', ['completed', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(5)

  if (clientError) {
    console.log('❌ CLIENT QUERY FAILED (RLS blocked it)')
    console.log('Error:', clientError.message)
    console.log('Code:', clientError.code)
    console.log('')
    console.log('💡 This is why session history is empty in browser!')
  } else if (clientData && clientData.length > 0) {
    console.log(`✅ CLIENT QUERY SUCCESS - Found ${clientData.length} sessions`)
    console.log('Session history should be visible in browser')
    console.log('')
  } else {
    console.log('⚠️  CLIENT QUERY RETURNED 0 RESULTS')
    console.log('RLS might be allowing query but filtering all results')
    console.log('')
  }

  // Test 2: Admin (bypasses RLS)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 2: Admin Query (Bypasses RLS)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const { data: adminData, error: adminError } = await adminSupabase
    .from('sessions')
    .select('id, status, type, created_at')
    .eq('mechanic_id', mechanicId)
    .in('status', ['completed', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(5)

  if (adminError) {
    console.log('❌ ADMIN QUERY FAILED (unexpected!)')
    console.log('Error:', adminError.message)
    console.log('')
  } else if (adminData && adminData.length > 0) {
    console.log(`✅ ADMIN QUERY SUCCESS - Found ${adminData.length} sessions`)
    adminData.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.type} - ${s.status} (${new Date(s.created_at).toLocaleString()})`)
    })
    console.log('')
    console.log('Data exists but RLS might be blocking browser access')
  } else {
    console.log('⚠️  ADMIN QUERY RETURNED 0 RESULTS')
    console.log('No completed sessions exist for this mechanic')
    console.log('')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('DIAGNOSIS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (clientError && !adminError && adminData.length > 0) {
    console.log('🔴 RLS POLICY IS BLOCKING SESSION HISTORY')
    console.log('')
    console.log('The sessions table RLS policy is preventing the browser')
    console.log('from reading completed/cancelled sessions.')
    console.log('')
    console.log('FIX: Update Supabase RLS policy to allow mechanics to')
    console.log('     read their own sessions.')
  } else if (!clientError && clientData.length > 0) {
    console.log('✅ RLS IS WORKING CORRECTLY')
    console.log('Session history should be visible. Try refreshing browser.')
  } else if (!adminError && adminData.length === 0) {
    console.log('ℹ️  NO COMPLETED SESSIONS FOUND')
    console.log('Session history is empty because no sessions have been')
    console.log('completed yet for this mechanic.')
  }
}

testSessionHistoryRLS()
  .catch(console.error)
  .finally(() => process.exit())
