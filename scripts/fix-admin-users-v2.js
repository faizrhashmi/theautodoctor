// Fix admin users - handle existing auth users
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ADMIN_USERS = [
  { email: 'admin1@askautodoctor.com', full_name: 'Admin One', password: '12345678' },
  { email: 'admin2@askautodoctor.com', full_name: 'Admin Two', password: '12345678' },
  { email: 'admin3@askautodoctor.com', full_name: 'Admin Three', password: '12345678' }
]

async function fixAdminUsers() {
  console.log('='.repeat(80))
  console.log('FIXING ADMIN USERS')
  console.log('='.repeat(80))
  console.log()

  // Get all existing auth users
  console.log('🔍 Fetching existing auth users...')
  const { data: authData } = await supabase.auth.admin.listUsers()
  const existingAuthUsers = authData?.users || []

  console.log(`   Found ${existingAuthUsers.length} total auth users`)
  console.log()

  const results = {
    created: [],
    updated: [],
    errors: []
  }

  for (const admin of ADMIN_USERS) {
    try {
      console.log(`Processing: ${admin.email}`)

      // Find existing auth user
      let authUser = existingAuthUsers.find(u => u.email === admin.email)

      if (!authUser) {
        // Create new auth user
        const { data, error } = await supabase.auth.admin.createUser({
          email: admin.email,
          password: admin.password,
          email_confirm: true,
          user_metadata: {
            full_name: admin.full_name,
            role: 'admin'
          }
        })

        if (error) throw error
        authUser = data.user
        console.log(`   ✅ Created auth user`)
      } else {
        console.log(`   ℹ️  Auth user exists (ID: ${authUser.id})`)

        // Update password to ensure we know it
        await supabase.auth.admin.updateUserById(authUser.id, {
          password: admin.password,
          email_confirm: true,
          user_metadata: {
            ...authUser.user_metadata,
            full_name: admin.full_name,
            role: 'admin'
          }
        })
        console.log(`   ✅ Updated auth user password`)
      }

      // Now create/update profile with account_type='individual_customer'
      // (using existing valid value) but role='admin'
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          email: admin.email,
          full_name: admin.full_name,
          role: 'admin', // This is what matters for admin access
          account_type: 'individual_customer', // Use valid constraint value
          email_verified: true
        }, { onConflict: 'id' })
        .select()
        .single()

      if (profileError) {
        console.error(`   ❌ Profile error: ${profileError.message}`)
        results.errors.push({ email: admin.email, error: profileError.message })
        continue
      }

      console.log(`   ✅ Created/updated profile`)
      console.log(`   📋 ID: ${authUser.id}`)
      console.log(`   📋 Role: admin`)
      console.log()

      results.created.push({
        ...admin,
        id: authUser.id
      })

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`)
      results.errors.push({ email: admin.email, error: error.message })
      console.log()
    }
  }

  // SUMMARY
  console.log('='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log()
  console.log(`✅ Admin users ready: ${results.created.length}`)
  console.log(`❌ Errors: ${results.errors.length}`)

  if (results.created.length > 0) {
    console.log('\n' + '='.repeat(80))
    console.log('🔑 ADMIN LOGIN CREDENTIALS')
    console.log('='.repeat(80))

    results.created.forEach((admin, i) => {
      console.log(`\n${i + 1}. ${admin.full_name}`)
      console.log(`   Email:    ${admin.email}`)
      console.log(`   Password: ${admin.password}`)
      console.log(`   User ID:  ${admin.id}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log(`✅ Login URL: http://localhost:3000/admin/login`)
    console.log('='.repeat(80))
  }

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:')
    results.errors.forEach(err => {
      console.log(`   - ${err.email}: ${err.error}`)
    })
  }

  console.log()
}

fixAdminUsers().catch(console.error)
