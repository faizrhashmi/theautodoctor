/**
 * Create Test Customer Account
 *
 * Usage: npx tsx scripts/create-test-customer.ts
 *
 * This script creates a test customer account with:
 * - Email: test-customer@example.com
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

async function createTestCustomer() {
  const email = 'test-customer@example.com'
  const password = 'testpass123'
  const fullName = 'Test Customer'

  console.log('👤 Creating test customer account...')
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
        role: 'customer'
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
        await updateExistingCustomer(existingUser.id)
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
        role: 'customer',
        full_name: fullName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (userError && !userError.message.includes('duplicate key')) {
      throw userError
    }
    console.log('✅ User record created')

    // Success!
    console.log('\n🎉 Test customer created successfully!')
    console.log('\n📋 Login credentials:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   Login URL: http://localhost:3000/login`)
    console.log(`\n   User ID: ${userId}`)

  } catch (error) {
    console.error('\n❌ Error creating test customer:', error)
    process.exit(1)
  }
}

async function updateExistingCustomer(userId: string) {
  console.log('\n📝 Updating existing customer...')

  // Update user record
  await supabase
    .from('users')
    .upsert({
      id: userId,
      email: 'test-customer@example.com',
      role: 'customer',
      full_name: 'Test Customer',
      updated_at: new Date().toISOString()
    })

  console.log('✅ Customer updated')
  console.log('\n📋 Login credentials:')
  console.log(`   Email: test-customer@example.com`)
  console.log(`   Password: testpass123`)
  console.log(`   Login URL: http://localhost:3000/login`)
}

// Run the script
createTestCustomer()
