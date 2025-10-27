// Update specific user to admin role
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const USER_EMAIL = 'faizhashmi@me.com'

async function updateUserToAdmin() {
  try {
    console.log(`\n🔍 Looking for user: ${USER_EMAIL}`)

    // Get the user from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error fetching auth users:', authError)
      return
    }

    const user = authUsers.users.find(u => u.email === USER_EMAIL)

    if (!user) {
      console.error(`❌ User ${USER_EMAIL} not found in auth.users`)
      return
    }

    console.log(`✅ Found user: ${user.id}`)

    // Check current profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError)
      return
    }

    console.log(`\n📊 Current profile:`)
    console.log(`   Role: ${currentProfile.role}`)
    console.log(`   Email: ${currentProfile.email}`)
    console.log(`   Name: ${currentProfile.full_name}`)

    if (currentProfile.role === 'admin') {
      console.log('\n✅ User is already an admin!')
      return
    }

    // Update profile to admin
    console.log(`\n🔄 Updating ${USER_EMAIL} to admin...`)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error updating profile:', updateError)
      return
    }

    // Update user metadata
    const { error: metadataError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          role: 'admin'
        }
      }
    )

    if (metadataError) {
      console.error('⚠️  Warning: Could not update user metadata:', metadataError)
    }

    // Verify the update
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log(`\n✅ Successfully updated user to admin!`)
    console.log(`\n📊 Updated profile:`)
    console.log(`   Role: ${updatedProfile.role}`)
    console.log(`   Email: ${updatedProfile.email}`)
    console.log(`   Name: ${updatedProfile.full_name}`)

    console.log(`\n🎉 ${USER_EMAIL} is now an admin!`)
    console.log(`\n💡 Please try logging in again.`)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

updateUserToAdmin()
