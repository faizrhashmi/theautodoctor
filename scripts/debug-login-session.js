// Debug login session to see what's happening
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function debugLoginSession() {
  console.log('='.repeat(80))
  console.log('🔍 DEBUG LOGIN SESSION')
  console.log('='.repeat(80))
  console.log()

  const testEmail = 'admin1@askautodoctor.com'
  const testPassword = '12345678'

  console.log(`Testing login for: ${testEmail}`)
  console.log()

  // Step 1: Try to sign in
  console.log('1️⃣  Testing Supabase authentication...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })

  if (authError) {
    console.error(`   ❌ Login failed: ${authError.message}`)
    console.log()
    return
  }

  console.log(`   ✅ Authentication successful`)
  console.log(`   User ID: ${authData.user?.id}`)
  console.log(`   Email: ${authData.user?.email}`)
  console.log()

  // Step 2: Check profile
  console.log('2️⃣  Checking profile in database...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError) {
    console.error(`   ❌ Profile fetch error: ${profileError.message}`)
    console.log()
  } else if (!profile) {
    console.error(`   ❌ NO PROFILE FOUND for user ${authData.user.id}`)
    console.log(`   This is the problem! Profile needs to be created.`)
    console.log()
  } else {
    console.log(`   ✅ Profile found`)
    console.log(`   ID: ${profile.id}`)
    console.log(`   Email: ${profile.email || 'NOT SET'}`)
    console.log(`   Full Name: ${profile.full_name || 'NOT SET'}`)
    console.log(`   Role: ${profile.role || 'NOT SET'} ${profile.role === 'admin' ? '✅' : '❌'}`)
    console.log(`   Account Type: ${profile.account_type || 'NOT SET'}`)
    console.log(`   Email Verified: ${profile.email_verified ? 'YES ✅' : 'NO ❌'}`)
    console.log()

    if (profile.role !== 'admin') {
      console.log('   ⚠️  PROBLEM: Role is NOT "admin"!')
      console.log('   This is why middleware redirects to homepage.')
      console.log()
    }
  }

  // Step 3: What middleware will see
  console.log('3️⃣  What middleware will check...')
  if (!profile) {
    console.log(`   Middleware will see: NO profile`)
    console.log(`   Action: Redirect to homepage ❌`)
  } else if (profile.role !== 'admin') {
    console.log(`   Middleware will see: role='${profile.role}'`)
    console.log(`   Expected: role='admin'`)
    console.log(`   Action: Redirect to homepage ❌`)
  } else {
    console.log(`   Middleware will see: role='admin' ✅`)
    console.log(`   Action: Allow access to /admin ✅`)
  }
  console.log()

  // Cleanup
  await supabase.auth.signOut()
}

debugLoginSession().catch(console.error)
