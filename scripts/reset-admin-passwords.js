// Reset all admin passwords to a known value
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

// NEW STANDARDIZED PASSWORD
const NEW_PASSWORD = '12345678'  // Simple for testing

async function resetAdminPasswords() {
  console.log('='.repeat(80))
  console.log('🔐 RESETTING ADMIN PASSWORDS')
  console.log('='.repeat(80))
  console.log(`📝 New password will be: ${NEW_PASSWORD}`)
  console.log()

  // Get all admin users from profiles
  const { data: adminProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'admin')

  if (profileError) {
    console.error(`❌ Error fetching admin profiles: ${profileError.message}`)
    process.exit(1)
  }

  if (!adminProfiles || adminProfiles.length === 0) {
    console.log('❌ No admin profiles found in database!')
    console.log('   Run: node scripts/fix-admin-users-v2.js')
    process.exit(1)
  }

  console.log(`Found ${adminProfiles.length} admin profiles\n`)

  const results = {
    success: [],
    failed: []
  }

  for (const admin of adminProfiles) {
    try {
      console.log(`Processing: ${admin.email || admin.id}`)

      // Update password in auth.users
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        admin.id,
        {
          password: NEW_PASSWORD,
          email_confirm: true,
          user_metadata: {
            full_name: admin.full_name,
            role: 'admin'
          }
        }
      )

      if (updateError) {
        throw updateError
      }

      console.log(`   ✅ Password updated successfully`)
      results.success.push(admin)

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`)
      results.failed.push({ admin, error: error.message })
    }
    console.log()
  }

  // SUMMARY
  console.log('='.repeat(80))
  console.log('📊 SUMMARY')
  console.log('='.repeat(80))
  console.log()
  console.log(`✅ Successfully updated: ${results.success.length}`)
  console.log(`❌ Failed: ${results.failed.length}`)
  console.log()

  if (results.success.length > 0) {
    console.log('='.repeat(80))
    console.log('🔑 ADMIN LOGIN CREDENTIALS (UPDATED)')
    console.log('='.repeat(80))
    console.log()

    results.success.forEach((admin, i) => {
      console.log(`${i + 1}. ${admin.full_name || 'Admin User'}`)
      console.log(`   Email:    ${admin.email}`)
      console.log(`   Password: ${NEW_PASSWORD}`)
      console.log(`   User ID:  ${admin.id}`)
      console.log()
    })

    console.log('='.repeat(80))
    console.log('🌐 LOGIN URL: http://localhost:3000/admin/login')
    console.log('='.repeat(80))
    console.log()
  }

  if (results.failed.length > 0) {
    console.log('⚠️  Failed to update:')
    results.failed.forEach(({ admin, error }) => {
      console.log(`   - ${admin.email}: ${error}`)
    })
    console.log()
  }
}

resetAdminPasswords().catch(console.error)
