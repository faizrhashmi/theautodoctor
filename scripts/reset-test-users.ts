// Script to reset all users and create test accounts
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const TEST_USERS = [
  // Customers
  { email: 'cust1@test.com', role: 'customer' },
  { email: 'cust2@test.com', role: 'customer' },
  { email: 'cust3@test.com', role: 'customer' },
  { email: 'cust4@test.com', role: 'customer' },

  // Admins
  { email: 'admin@test.com', role: 'admin' },
  { email: 'admin2@test.com', role: 'admin' },
  { email: 'admin3@test.com', role: 'admin' },
  { email: 'admin4@test.com', role: 'admin' },

  // Mechanics
  { email: 'mech@test.com', role: 'mechanic' },
  { email: 'mech2@test.com', role: 'mechanic' },
  { email: 'mech3@test.com', role: 'mechanic' },
  { email: 'mech4@test.com', role: 'mechanic' },
]

const PASSWORD = '12345678'

// Users to preserve (not delete)
const PRESERVE_USERS = [
  'aafiahashmi@gmail.com',
  'faizandnas@gmail.com',
  'katrinaflores000@gmail.com'
]

async function deleteAllUsers() {
  console.log('🗑️  Deleting all existing users...')

  try {
    // Get all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      throw listError
    }

    console.log(`   Found ${users?.length || 0} users total`)
    console.log(`   Preserving users: ${PRESERVE_USERS.join(', ')}`)

    let deletedCount = 0
    let preservedCount = 0

    // Delete each user except preserved ones
    for (const user of users || []) {
      if (PRESERVE_USERS.includes(user.email || '')) {
        console.log(`   ⏭️  Skipping preserved user: ${user.email}`)
        preservedCount++
        continue
      }

      // Try to delete user - if it fails, try with shouldSoftDelete: false
      let { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

      if (deleteError) {
        console.log(`   ⚠️  Soft delete failed for ${user.email}, trying force delete...`)
        const result = await supabase.auth.admin.deleteUser(user.id, true) // Force delete
        if (result.error) {
          console.error(`   ❌ Force delete also failed for ${user.email}:`, result.error.message)
        } else {
          console.log(`   ✅ Force deleted user: ${user.email}`)
          deletedCount++
        }
      } else {
        console.log(`   ✅ Deleted user: ${user.email}`)
        deletedCount++
      }
    }

    console.log(`✅ Deleted ${deletedCount} users, preserved ${preservedCount} users\n`)
  } catch (error) {
    console.error('Error during user deletion:', error)
    throw error
  }
}

async function clearRelatedTables() {
  console.log('🗑️  Clearing related data tables (except preserved users)...')

  // Get IDs of preserved users
  const { data: preservedUsers } = await supabase.auth.admin.listUsers()
  const preservedUserIds = preservedUsers?.users
    .filter(u => PRESERVE_USERS.includes(u.email || ''))
    .map(u => u.id) || []

  console.log(`   Preserving data for ${preservedUserIds.length} users`)

  const tables = [
    'profiles',
    'mechanics',
    'mechanic_sessions',
    'sessions',
    'session_requests',
    'chat_rooms',
    'chat_messages',
    'reviews',
    'waiver_signatures',
    'contact_requests'
  ]

  for (const table of tables) {
    try {
      // Delete records not belonging to preserved users
      let query = supabase.from(table).delete()

      // Add filter to exclude preserved users
      if (preservedUserIds.length > 0) {
        // For user-related tables, preserve their data
        if (['profiles', 'mechanics'].includes(table)) {
          query = query.not('id', 'in', `(${preservedUserIds.join(',')})`)
        }
      }

      query = query.neq('id', '00000000-0000-0000-0000-000000000000')

      const { error } = await query
      if (error && error.code !== 'PGRST116') { // PGRST116 means table is empty or doesn't exist
        console.log(`   ⚠️  Warning clearing ${table}:`, error.message)
      } else {
        console.log(`   ✅ Cleared table: ${table}`)
      }
    } catch (error: any) {
      console.log(`   ⚠️  Warning clearing ${table}:`, error.message)
    }
  }

  console.log('✅ Related tables cleared\n')
}

async function createTestUser(email: string, role: 'customer' | 'admin' | 'mechanic') {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: role,
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)
      }
    })

    if (authError) {
      console.error(`   ❌ Failed to create auth user ${email}:`, authError.message)
      return false
    }

    const userId = authData.user.id
    const name = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)

    // Create role-specific records
    if (role === 'customer') {
      // Create customer profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: name,
          role: 'customer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error(`   ❌ Failed to create profile for ${email}:`, profileError.message)
        return false
      }
    } else if (role === 'admin') {
      // Create admin profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: name,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error(`   ❌ Failed to create admin profile for ${email}:`, profileError.message)
        return false
      }
    } else if (role === 'mechanic') {
      // Create mechanic record with minimal required fields
      const { error: mechanicError } = await supabase
        .from('mechanics')
        .insert({
          id: userId,
          email: email,
          name: name,
          password_hash: 'hashed_' + PASSWORD, // Placeholder hash
          specializations: ['general'],
          application_status: 'approved',
          approved_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      if (mechanicError) {
        console.error(`   ❌ Failed to create mechanic for ${email}:`, mechanicError.message)
        return false
      }
    }

    console.log(`   ✅ Created ${role}: ${email}`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error creating ${email}:`, error.message)
    return false
  }
}

async function createAllTestUsers() {
  console.log('👥 Creating test users...\n')

  let successCount = 0
  let failCount = 0

  for (const user of TEST_USERS) {
    const success = await createTestUser(user.email, user.role as any)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Successfully created: ${successCount} users`)
  console.log(`   ❌ Failed: ${failCount} users`)
  console.log(`   🔑 Password for all users: ${PASSWORD}`)
}

async function main() {
  console.log('🚀 Starting user reset process...\n')

  try {
    // Step 1: Delete all existing users
    await deleteAllUsers()

    // Step 2: Clear related tables
    await clearRelatedTables()

    // Step 3: Create new test users
    await createAllTestUsers()

    console.log('\n✅ User reset completed successfully!')
    console.log('\n📝 Test Users Created:')
    console.log('   Customers: cust1@test.com - cust4@test.com')
    console.log('   Admins: admin@test.com, admin2-4@test.com')
    console.log('   Mechanics: mech@test.com, mech2-4@test.com')
    console.log(`   Password: ${PASSWORD}`)

  } catch (error: any) {
    console.error('\n❌ Error during reset process:', error.message)
    process.exit(1)
  }
}

main()
