// Diagnose admin login issues
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function diagnoseAdminLogin() {
  console.log('='.repeat(80))
  console.log('🔍 ADMIN LOGIN DIAGNOSTICS')
  console.log('='.repeat(80))
  console.log()

  // 1. Check auth.users table
  console.log('1️⃣  Checking auth.users table...')
  const { data: authData } = await supabase.auth.admin.listUsers()
  const adminAuthUsers = authData?.users?.filter(u =>
    u.email?.includes('@askautodoctor.com')
  ) || []

  console.log(`   Found ${adminAuthUsers.length} auth users with @askautodoctor.com emails\n`)

  adminAuthUsers.forEach((user, i) => {
    console.log(`   ${i + 1}. ${user.email}`)
    console.log(`      - ID: ${user.id}`)
    console.log(`      - Created: ${user.created_at}`)
    console.log(`      - Email confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`)
    console.log(`      - User metadata:`, user.user_metadata)
    console.log()
  })

  // 2. Check profiles table
  console.log('2️⃣  Checking profiles table...')
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'admin')

  if (profileError) {
    console.error(`   ❌ Error fetching profiles: ${profileError.message}\n`)
  } else {
    console.log(`   Found ${profiles?.length || 0} admin profiles\n`)

    profiles?.forEach((profile, i) => {
      console.log(`   ${i + 1}. ${profile.email || 'NO EMAIL'}`)
      console.log(`      - ID: ${profile.id}`)
      console.log(`      - Full Name: ${profile.full_name || 'NOT SET'}`)
      console.log(`      - Role: ${profile.role}`)
      console.log(`      - Account Type: ${profile.account_type || 'NOT SET'}`)
      console.log(`      - Email Verified: ${profile.email_verified ? 'YES' : 'NO'}`)
      console.log()
    })
  }

  // 3. Cross-check matching
  console.log('3️⃣  Cross-checking auth users with profiles...')
  const authIds = new Set(adminAuthUsers.map(u => u.id))
  const profileIds = new Set(profiles?.map(p => p.id) || [])

  console.log(`   Auth users: ${authIds.size}`)
  console.log(`   Profiles: ${profileIds.size}`)

  const onlyInAuth = [...authIds].filter(id => !profileIds.has(id))
  const onlyInProfiles = [...profileIds].filter(id => !authIds.has(id))

  if (onlyInAuth.length > 0) {
    console.log(`   ⚠️  ${onlyInAuth.length} auth users WITHOUT matching profiles:`)
    onlyInAuth.forEach(id => {
      const user = adminAuthUsers.find(u => u.id === id)
      console.log(`      - ${user?.email} (${id})`)
    })
  }

  if (onlyInProfiles.length > 0) {
    console.log(`   ⚠️  ${onlyInProfiles.length} profiles WITHOUT matching auth users:`)
    onlyInProfiles.forEach(id => {
      const profile = profiles?.find(p => p.id === id)
      console.log(`      - ${profile?.email} (${id})`)
    })
  }

  if (onlyInAuth.length === 0 && onlyInProfiles.length === 0) {
    console.log(`   ✅ All auth users have matching profiles!\n`)
  }

  // 4. Test login for each admin
  console.log('='.repeat(80))
  console.log('🔑 CURRENT ADMIN CREDENTIALS TO TRY')
  console.log('='.repeat(80))
  console.log()

  const possiblePasswords = [
    'Admin123!@#',    // From fix-admin-users-v2.js
    'Admin1234!',     // From createTestAdmins.mjs
    '12345678',       // From TEST_USERS_CREDENTIALS.md
    'Admin123!',
    'admin123'
  ]

  console.log('📋 Emails to try:')
  adminAuthUsers.forEach((user, i) => {
    console.log(`   ${i + 1}. ${user.email}`)
  })

  console.log('\n🔐 Passwords to try (in order of likelihood):')
  possiblePasswords.forEach((pwd, i) => {
    console.log(`   ${i + 1}. ${pwd}`)
  })

  console.log('\n' + '='.repeat(80))
  console.log('💡 RECOMMENDATION')
  console.log('='.repeat(80))
  console.log()
  console.log('If none of these work, run this command to reset passwords:')
  console.log('   node scripts/reset-admin-passwords.js')
  console.log()
}

diagnoseAdminLogin().catch(console.error)
