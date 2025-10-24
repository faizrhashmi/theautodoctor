/**
 * Create Test Mechanic Account
 *
 * Usage: npx tsx scripts/create-test-mechanic.ts
 *
 * This script creates a test mechanic account with:
 * - Email: test-mechanic@example.com
 * - Password: testpass123
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestMechanic() {
  const email = 'test-mechanic@example.com'
  const password = 'testpass123'
  const fullName = 'Test Mechanic'

  console.log('🔧 Creating test mechanic account...')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)

  try {
    // Step 1: Create auth user
    console.log('\n📝 Step 1: Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        role: 'mechanic'
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists, fetching existing user...')
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users.users.find(u => u.email === email)

        if (!existingUser) {
          throw new Error('User exists but could not be found')
        }

        console.log(`✅ Found existing user: ${existingUser.id}`)
        await updateExistingMechanic(existingUser.id)
        return
      }
      throw authError
    }

    const userId = authData.user.id
    console.log(`✅ Auth user created: ${userId}`)

    // Step 2: Create user record
    console.log('\n📝 Step 2: Creating user record...')
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        role: 'mechanic',
        full_name: fullName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (userError && !userError.message.includes('duplicate key')) {
      throw userError
    }
    console.log('✅ User record created')

    // Step 3: Create mechanic profile
    console.log('\n📝 Step 3: Creating mechanic profile...')
    const { error: mechanicError } = await supabase
      .from('mechanic_profiles')
      .insert({
        user_id: userId,
        onboarding_completed: true,
        stripe_onboarding_completed: false,
        is_available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (mechanicError && !mechanicError.message.includes('duplicate key')) {
      throw mechanicError
    }
    console.log('✅ Mechanic profile created')

    // Success!
    console.log('\n🎉 Test mechanic created successfully!')
    console.log('\n📋 Login credentials:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   Login URL: http://localhost:3000/mechanic/login`)
    console.log(`\n   User ID: ${userId}`)

  } catch (error) {
    console.error('\n❌ Error creating test mechanic:', error)
    process.exit(1)
  }
}

async function updateExistingMechanic(userId: string) {
  console.log('\n📝 Updating existing mechanic...')

  // Update user record
  await supabase
    .from('users')
    .upsert({
      id: userId,
      email: 'test-mechanic@example.com',
      role: 'mechanic',
      full_name: 'Test Mechanic',
      updated_at: new Date().toISOString()
    })

  // Update mechanic profile
  await supabase
    .from('mechanic_profiles')
    .upsert({
      user_id: userId,
      onboarding_completed: true,
      stripe_onboarding_completed: false,
      is_available: true,
      updated_at: new Date().toISOString()
    })

  console.log('✅ Mechanic updated')
  console.log('\n📋 Login credentials:')
  console.log(`   Email: test-mechanic@example.com`)
  console.log(`   Password: testpass123`)
  console.log(`   Login URL: http://localhost:3000/mechanic/login`)
}

// Run the script
createTestMechanic()
