// Debug script to check session role assignments
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local file
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1]] = match[2]
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSessionRoles() {
  console.log('🔍 Checking session role assignments...\n')

  // Get all waiting or live sessions
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, type, status, mechanic_id, customer_user_id, created_at')
    .in('status', ['waiting', 'live'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!sessions || sessions.length === 0) {
    console.log('✅ No active sessions found')
    return
  }

  console.log(`Found ${sessions.length} active session(s):\n`)

  for (const session of sessions) {
    console.log(`Session: ${session.id}`)
    console.log(`  Type: ${session.type}`)
    console.log(`  Status: ${session.status}`)
    console.log(`  Created: ${new Date(session.created_at).toLocaleString()}`)

    // Check if mechanic_id is actually a customer user ID
    if (session.mechanic_id) {
      const { data: mechanic } = await supabase
        .from('mechanics')
        .select('id, name, email')
        .eq('id', session.mechanic_id)
        .maybeSingle()

      const { data: user } = await supabase.auth.admin.getUserById(session.mechanic_id)

      if (mechanic) {
        console.log(`  ✅ Mechanic ID: ${session.mechanic_id} (${mechanic.name || mechanic.email})`)
      } else if (user) {
        console.log(`  ❌ PROBLEM: mechanic_id is a CUSTOMER user ID!`)
        console.log(`     Value: ${session.mechanic_id}`)
        console.log(`     Should be in mechanics table, but found in auth.users`)
      } else {
        console.log(`  ⚠️  Mechanic ID: ${session.mechanic_id} (NOT FOUND in mechanics or users table)`)
      }
    } else {
      console.log(`  ⚠️  Mechanic ID: null (no mechanic assigned yet)`)
    }

    // Check customer_user_id
    if (session.customer_user_id) {
      const { data: user } = await supabase.auth.admin.getUserById(session.customer_user_id)
      if (user) {
        console.log(`  ✅ Customer ID: ${session.customer_user_id} (${user.email})`)
      } else {
        console.log(`  ⚠️  Customer ID: ${session.customer_user_id} (NOT FOUND)`)
      }
    } else {
      console.log(`  ⚠️  Customer ID: null`)
    }

    console.log('')
  }
}

debugSessionRoles()
  .catch(console.error)
  .finally(() => process.exit())
