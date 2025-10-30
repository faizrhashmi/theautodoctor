/**
 * Migration Script: Link Test Mechanics to Supabase Auth
 *
 * This script creates Supabase Auth users for test mechanics and links them.
 * Usage: npx tsx scripts/migrate-test-mechanics.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface MechanicToMigrate {
  email: string
  password: string
  name: string
}

const TEST_MECHANICS: MechanicToMigrate[] = [
  {
    email: 'mech@test.com',
    password: 'password123',
    name: 'Mechanic 1'
  },
  {
    email: 'mech1@test.com',
    password: 'password123',
    name: 'Mechanic 2'
  }
]

async function migrateMechanic(mechanic: MechanicToMigrate) {
  console.log(`\n🔧 Migrating: ${mechanic.email}`)

  // Step 1: Check if mechanic exists in database
  const { data: existingMechanic, error: fetchError } = await supabaseAdmin
    .from('mechanics')
    .select('id, email, name, user_id, service_tier, application_status')
    .eq('email', mechanic.email)
    .single()

  if (fetchError || !existingMechanic) {
    console.log(`❌ Mechanic not found in database: ${mechanic.email}`)
    return
  }

  console.log(`Found mechanic record: ${existingMechanic.id}`)
  console.log(`  - Current user_id: ${existingMechanic.user_id || 'NULL'}`)
  console.log(`  - Service tier: ${existingMechanic.service_tier}`)
  console.log(`  - Application status: ${existingMechanic.application_status}`)

  // Step 2: Check if Supabase Auth user already exists
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

  if (listError) {
    console.log(`❌ Error listing users:`, listError)
    return
  }

  const existingAuthUser = users.find(u => u.email === mechanic.email)

  let authUserId: string

  if (existingAuthUser) {
    console.log(`✅ Supabase Auth user already exists: ${existingAuthUser.id}`)
    authUserId = existingAuthUser.id

    // Check if already linked
    if (existingMechanic.user_id === authUserId) {
      console.log(`✅ Mechanic already linked to Supabase Auth`)
      console.log(`✅ All good - no migration needed!`)
      return
    }
  } else {
    // Step 3: Create Supabase Auth user
    console.log(`Creating Supabase Auth user...`)

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: mechanic.email,
      password: mechanic.password,
      email_confirm: true,  // Auto-confirm for test users
      user_metadata: {
        full_name: mechanic.name,
        role: 'mechanic'
      }
    })

    if (authError || !authData.user) {
      console.log(`❌ Failed to create Supabase Auth user:`, authError)
      return
    }

    authUserId = authData.user.id
    console.log(`✅ Created Supabase Auth user: ${authUserId}`)
  }

  // Step 4: Update profiles table with role
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: authUserId,
      full_name: mechanic.name,
      role: 'mechanic',
      updated_at: new Date().toISOString()
    })

  if (profileError) {
    console.log(`⚠️ Warning: Could not update profile:`, profileError)
  } else {
    console.log(`✅ Updated profile with role='mechanic'`)
  }

  // Step 5: Link mechanic record to Supabase Auth user
  const { error: linkError } = await supabaseAdmin
    .from('mechanics')
    .update({
      user_id: authUserId,
      password_hash: null  // Clear old password hash
    })
    .eq('id', existingMechanic.id)

  if (linkError) {
    console.log(`❌ Failed to link mechanic to Supabase Auth:`, linkError)
    return
  }

  console.log(`✅ Successfully linked mechanic to Supabase Auth!`)
  console.log(`   - Mechanic ID: ${existingMechanic.id}`)
  console.log(`   - Supabase Auth User ID: ${authUserId}`)
  console.log(`   - Email: ${mechanic.email}`)
  console.log(`   - Password: ${mechanic.password}`)
  console.log(`   - Role: mechanic`)
}

async function migrateAllTestMechanics() {
  console.log('🚀 Starting Test Mechanic Migration to Supabase Auth...\n')
  console.log('=' .repeat(60))

  for (const mechanic of TEST_MECHANICS) {
    try {
      await migrateMechanic(mechanic)
    } catch (error) {
      console.error(`❌ Error migrating ${mechanic.email}:`, error)
    }
    console.log('=' .repeat(60))
  }

  console.log('\n✅ Migration Complete!\n')
  console.log('Test these credentials:')
  TEST_MECHANICS.forEach(m => {
    console.log(`  - Email: ${m.email}`)
    console.log(`    Password: ${m.password}`)
    console.log(`    Login at: http://localhost:3003/mechanic/login`)
    console.log('')
  })
}

migrateAllTestMechanics().catch(console.error)
