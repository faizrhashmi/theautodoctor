// Fix admin users creation with correct account_type
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ADMIN_USERS = [
  { email: 'admin1@askautodoctor.com', full_name: 'Admin One', password: 'Admin123!@#' },
  { email: 'admin2@askautodoctor.com', full_name: 'Admin Two', password: 'Admin123!@#' },
  { email: 'admin3@askautodoctor.com', full_name: 'Admin Three', password: 'Admin123!@#' }
]

async function fixAdminUsers() {
  console.log('='.repeat(80))
  console.log('CREATING ADMIN USERS')
  console.log('='.repeat(80))
  console.log()

  // First, check what account_type values are allowed
  console.log('🔍 Checking existing profiles to understand account_type values...')
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('account_type')
    .limit(5)

  if (existingProfiles && existingProfiles.length > 0) {
    const accountTypes = [...new Set(existingProfiles.map(p => p.account_type))]
    console.log(`   Found account_types: ${accountTypes.join(', ')}`)
    console.log()
  }

  const results = {
    created: [],
    errors: []
  }

  // Try creating admins with different account_type values
  const accountTypesToTry = ['individual_customer', 'platform_admin', 'admin_user']

  for (const admin of ADMIN_USERS) {
    let created = false

    // Try to create auth user
    let authUser = null
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: admin.email,
        password: admin.password,
        email_confirm: true,
        user_metadata: {
          full_name: admin.full_name,
          role: 'admin'
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️  ${admin.email} - Auth user already exists, fetching...`)
          const { data: users } = await supabase.auth.admin.listUsers()
          authUser = users.users.find(u => u.email === admin.email)
        } else {
          throw error
        }
      } else {
        authUser = data.user
        console.log(`✅ Created auth user: ${admin.email}`)
      }

    } catch (error) {
      console.error(`❌ Error creating auth user ${admin.email}:`, error.message)
      results.errors.push({ email: admin.email, error: error.message })
      continue
    }

    if (!authUser) {
      console.error(`❌ Could not get auth user for ${admin.email}`)
      continue
    }

    // Try different account_type values
    for (const accountType of accountTypesToTry) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authUser.id,
            email: admin.email,
            full_name: admin.full_name,
            role: 'admin',
            account_type: accountType,
            email_verified: true
          }, { onConflict: 'id' })
          .select()
          .single()

        if (profileError) {
          console.log(`   ⚠️  Failed with account_type="${accountType}": ${profileError.message}`)
          continue
        }

        console.log(`   ✅ Created profile with account_type="${accountType}"`)
        console.log(`      ID: ${authUser.id}`)
        console.log(`      Name: ${admin.full_name}`)
        results.created.push({ ...admin, id: authUser.id, account_type: accountType })
        created = true
        break

      } catch (error) {
        console.log(`   ⚠️  Error with account_type="${accountType}": ${error.message}`)
      }
    }

    if (!created) {
      console.error(`❌ Could not create profile for ${admin.email} with any account_type`)
      results.errors.push({ email: admin.email, error: 'No valid account_type found' })
    }

    console.log()
  }

  // SUMMARY
  console.log('='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log()
  console.log(`✅ Admins created: ${results.created.length}`)
  console.log(`❌ Errors: ${results.errors.length}`)

  if (results.created.length > 0) {
    console.log('\n' + '='.repeat(80))
    console.log('ADMIN LOGIN CREDENTIALS')
    console.log('='.repeat(80))

    results.created.forEach((admin, i) => {
      console.log(`\n${i + 1}. ${admin.full_name}`)
      console.log(`   Email: ${admin.email}`)
      console.log(`   Password: ${admin.password}`)
      console.log(`   ID: ${admin.id}`)
      console.log(`   Account Type: ${admin.account_type}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log(`\n✅ Login at: http://localhost:3000/admin/login`)
    console.log('='.repeat(80))
  }

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors:')
    results.errors.forEach(err => {
      console.log(`   - ${err.email}: ${err.error}`)
    })
  }
}

fixAdminUsers().catch(console.error)
