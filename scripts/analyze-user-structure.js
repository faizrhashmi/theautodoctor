// Analyze user structure to understand what fields are needed
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function analyzeUserStructure() {
  console.log('='.repeat(80))
  console.log('USER STRUCTURE ANALYSIS')
  console.log('='.repeat(80))
  console.log()

  // Check profiles table
  console.log('📊 PROFILES TABLE (for customers/admins)')
  console.log('─'.repeat(80))
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, account_type, created_at')
    .limit(3)

  if (profilesError) {
    console.log('❌ Error querying profiles:', profilesError.message)
  } else {
    console.log(`Found ${profiles.length} existing profiles`)
    if (profiles.length > 0) {
      console.log('\nSample profile structure:')
      console.log(JSON.stringify(profiles[0], null, 2))
    }
  }

  // Check mechanics table
  console.log('\n\n📊 MECHANICS TABLE (for mechanic accounts)')
  console.log('─'.repeat(80))
  const { data: mechanics, error: mechanicsError } = await supabase
    .from('mechanics')
    .select('id, email, name, workshop_id, service_tier, account_type, application_status')
    .limit(3)

  if (mechanicsError) {
    console.log('❌ Error querying mechanics:', mechanicsError.message)
  } else {
    console.log(`Found ${mechanics.length} existing mechanics`)
    if (mechanics.length > 0) {
      console.log('\nSample mechanic structure:')
      console.log(JSON.stringify(mechanics[0], null, 2))
    }
  }

  // Check organizations table
  console.log('\n\n📊 ORGANIZATIONS TABLE (for workshops)')
  console.log('─'.repeat(80))
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('*')
    .limit(3)

  if (orgsError) {
    console.log('❌ Error querying organizations:', orgsError.message)
    if (orgsError.message.includes('not find the table')) {
      console.log('⚠️  Table does not exist - will need to create it')
    }
  } else {
    console.log(`Found ${orgs.length} existing organizations`)
    if (orgs.length > 0) {
      console.log('\nSample organization structure:')
      console.log(JSON.stringify(orgs[0], null, 2))
      console.log('\nAll columns:', Object.keys(orgs[0]))
    } else {
      console.log('⚠️  Table exists but is empty')
    }
  }

  // Check auth.users table (Supabase auth)
  console.log('\n\n📊 AUTH SYSTEM')
  console.log('─'.repeat(80))

  // Try to understand the auth setup
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.log('❌ Error accessing auth.users:', authError.message)
  } else {
    console.log(`Found ${authUsers.users.length} auth users`)
    if (authUsers.users.length > 0) {
      console.log('\nSample auth user:')
      const sample = authUsers.users[0]
      console.log({
        id: sample.id,
        email: sample.email,
        created_at: sample.created_at,
        user_metadata: sample.user_metadata
      })
    }
  }

  console.log('\n\n' + '='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log('\nUser Types in System:')
  console.log('1. Admins → profiles table (role = "admin")')
  console.log('2. Customers → profiles table (role = "customer")')
  console.log('3. Mechanics → mechanics table')
  console.log('   - Virtual-only: service_tier = "virtual_only", workshop_id = null')
  console.log('   - Workshop-affiliated: service_tier = "workshop_partner", workshop_id = <org_id>')
  console.log('4. Workshops → organizations table (organization_type = "workshop")')
  console.log()
}

analyzeUserStructure().catch(console.error)
