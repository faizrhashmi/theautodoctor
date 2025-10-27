// Script to complete test user setup
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const PASSWORD = '12345678'

const MISSING_USERS = [
  { email: 'cust1@test.com', role: 'customer' },
  { email: 'cust2@test.com', role: 'customer' },
  { email: 'admin@test.com', role: 'admin' },
  { email: 'admin2@test.com', role: 'admin' },
]

const FIX_PROFILES = [
  { email: 'cust3@test.com', id: 'bb36e438-6884-48a0-b796-cb9bc45a6be3', role: 'customer' },
  { email: 'cust4@test.com', id: '274ba4f2-2185-4e7b-bbc1-b0d8aaca2c76', role: 'customer' },
  { email: 'admin3@test.com', id: '89cb6806-0483-4bf7-b056-e2619f141fe4', role: 'admin' },
  { email: 'admin4@test.com', id: '5a424dfe-1326-4757-a27a-1e9e2ac1d3b5', role: 'admin' },
]

async function createMissingProfiles() {
  console.log('🔧 Creating missing profiles...\n')

  for (const user of FIX_PROFILES) {
    const name = user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      console.log(`   ⏭️  Profile already exists for ${user.email}`)
      continue
    }

    const { error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: name,
        role: user.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error(`   ❌ Failed to create profile for ${user.email}:`, error.message)
    } else {
      console.log(`   ✅ Created profile for ${user.email}`)
    }
  }

  console.log('\n')
}

async function createMissingUsers() {
  console.log('👥 Creating missing users...\n')

  for (const user of MISSING_USERS) {
    const name = user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const userExists = existingUsers?.users.find(u => u.email === user.email)

    if (userExists) {
      console.log(`   ⏭️  User already exists: ${user.email}`)
      continue
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: user.role,
        name: name
      }
    })

    if (authError) {
      console.error(`   ❌ Failed to create auth user ${user.email}:`, authError.message)
      // Try again with a small delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      const retry = await supabase.auth.admin.createUser({
        email: user.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          role: user.role,
          name: name
        }
      })

      if (retry.error) {
        console.error(`   ❌ Retry also failed for ${user.email}:`, retry.error.message)
        continue
      }

      authData.user = retry.data.user
    }

    const userId = authData.user.id

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: user.email,
        full_name: name,
        role: user.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error(`   ❌ Failed to create profile for ${user.email}:`, profileError.message)
    } else {
      console.log(`   ✅ Created ${user.role}: ${user.email}`)
    }
  }

  console.log('\n')
}

async function main() {
  console.log('🚀 Completing test user setup...\n')

  try {
    // Step 1: Create missing profiles for existing auth users
    await createMissingProfiles()

    // Step 2: Create missing users
    await createMissingUsers()

    console.log('✅ Test user setup completed!\n')
    console.log('📝 All Test Users:')
    console.log('   Customers: cust1@test.com - cust4@test.com')
    console.log('   Admins: admin@test.com, admin2-4@test.com')
    console.log('   Mechanics: mech@test.com, mech2-4@test.com')
    console.log(`   Password: ${PASSWORD}`)

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
