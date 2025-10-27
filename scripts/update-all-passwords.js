// Update all test user passwords to 12345678
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Simple password hashing
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

const NEW_PASSWORD = '12345678'

const USERS_TO_UPDATE = {
  admins: [
    'admin1@askautodoctor.com',
    'admin2@askautodoctor.com',
    'admin3@askautodoctor.com'
  ],
  mechanics: [
    'sarah.mechanic@askautodoctor.com',
    'mike.mechanic@askautodoctor.com',
    'emily.mechanic@askautodoctor.com',
    'david.mechanic@askautodoctor.com',
    'lisa.mechanic@askautodoctor.com',
    'james.mechanic@askautodoctor.com'
  ]
}

async function updateAllPasswords() {
  console.log('='.repeat(80))
  console.log('UPDATING ALL TEST USER PASSWORDS')
  console.log('='.repeat(80))
  console.log(`\nNew password for all users: ${NEW_PASSWORD}`)
  console.log()

  const results = {
    admins: { updated: 0, errors: 0 },
    mechanics: { updated: 0, errors: 0 }
  }

  // ============================================
  // 1. UPDATE ADMIN PASSWORDS (Supabase Auth)
  // ============================================
  console.log('👑 Updating Admin Passwords...')
  console.log('─'.repeat(80))

  // Get all auth users
  const { data: authData } = await supabase.auth.admin.listUsers()
  const authUsers = authData?.users || []

  for (const adminEmail of USERS_TO_UPDATE.admins) {
    try {
      const authUser = authUsers.find(u => u.email === adminEmail)

      if (!authUser) {
        console.log(`⚠️  ${adminEmail} - Not found in auth`)
        results.admins.errors++
        continue
      }

      // Update password using admin API
      const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: NEW_PASSWORD
      })

      if (error) throw error

      console.log(`✅ ${adminEmail} - Password updated`)
      results.admins.updated++

    } catch (error) {
      console.error(`❌ ${adminEmail} - Error: ${error.message}`)
      results.admins.errors++
    }
  }

  // ============================================
  // 2. UPDATE MECHANIC PASSWORDS (mechanics table)
  // ============================================
  console.log('\n\n👨‍🔧 Updating Mechanic Passwords...')
  console.log('─'.repeat(80))

  const newPasswordHash = hashPassword(NEW_PASSWORD)

  for (const mechanicEmail of USERS_TO_UPDATE.mechanics) {
    try {
      const { data, error } = await supabase
        .from('mechanics')
        .update({ password_hash: newPasswordHash })
        .eq('email', mechanicEmail)
        .select('id, email, name')
        .single()

      if (error) throw error

      console.log(`✅ ${data.name || mechanicEmail} - Password updated`)
      results.mechanics.updated++

    } catch (error) {
      console.error(`❌ ${mechanicEmail} - Error: ${error.message}`)
      results.mechanics.errors++
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\n' + '='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log()
  console.log(`👑 Admins updated: ${results.admins.updated}/${USERS_TO_UPDATE.admins.length}`)
  console.log(`👨‍🔧 Mechanics updated: ${results.mechanics.updated}/${USERS_TO_UPDATE.mechanics.length}`)
  console.log()
  console.log(`Total updated: ${results.admins.updated + results.mechanics.updated}`)
  console.log(`Total errors: ${results.admins.errors + results.mechanics.errors}`)

  // ============================================
  // NEW CREDENTIALS
  // ============================================
  console.log('\n\n' + '='.repeat(80))
  console.log('🔑 UPDATED LOGIN CREDENTIALS')
  console.log('='.repeat(80))
  console.log(`\n⚠️  ALL PASSWORDS ARE NOW: ${NEW_PASSWORD}`)
  console.log()

  console.log('👑 ADMIN USERS (login at /admin/login):')
  console.log('─'.repeat(80))
  USERS_TO_UPDATE.admins.forEach((email, i) => {
    console.log(`${i + 1}. ${email}`)
  })

  console.log('\n\n👨‍🔧 MECHANICS (login at /mechanic/login):')
  console.log('─'.repeat(80))
  USERS_TO_UPDATE.mechanics.forEach((email, i) => {
    console.log(`${i + 1}. ${email}`)
  })

  console.log('\n\n' + '='.repeat(80))
  console.log(`Password for ALL users: ${NEW_PASSWORD}`)
  console.log('='.repeat(80))
  console.log()

  if (results.admins.updated + results.mechanics.updated ===
      USERS_TO_UPDATE.admins.length + USERS_TO_UPDATE.mechanics.length) {
    console.log('✅ All passwords updated successfully!')
  } else {
    console.log('⚠️  Some passwords could not be updated. Check errors above.')
  }

  console.log()
}

updateAllPasswords().catch(console.error)
