// Check what customers and workshops exist in database
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function checkData() {
  console.log('='.repeat(80))
  console.log('🔍 CHECKING CUSTOMERS & WORKSHOPS DATA')
  console.log('='.repeat(80))
  console.log()

  // Check customers
  console.log('1️⃣  CUSTOMERS (profiles with role=customer)')
  console.log('-'.repeat(80))
  const { data: customers, error: customerError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, account_type, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .limit(10)

  if (customerError) {
    console.error(`   ❌ Error: ${customerError.message}`)
  } else {
    console.log(`   Found: ${customers?.length || 0} customers`)
    console.log()
    if (customers && customers.length > 0) {
      customers.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.full_name || 'NO NAME'}`)
        console.log(`      Email: ${c.email || 'NO EMAIL'}`)
        console.log(`      Role: ${c.role}`)
        console.log(`      Account Type: ${c.account_type || 'NOT SET'}`)
        console.log(`      Created: ${c.created_at}`)
        console.log()
      })
    } else {
      console.log('   ⚠️  NO CUSTOMERS FOUND')
      console.log()
    }
  }

  // Check total profiles
  console.log('2️⃣  ALL PROFILES (any role)')
  console.log('-'.repeat(80))
  const { data: allProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .order('created_at', { ascending: false })
    .limit(20)

  if (profileError) {
    console.error(`   ❌ Error: ${profileError.message}`)
  } else {
    console.log(`   Found: ${allProfiles?.length || 0} total profiles`)
    console.log()

    const roleCount = {}
    allProfiles?.forEach(p => {
      roleCount[p.role] = (roleCount[p.role] || 0) + 1
    })

    console.log('   By Role:')
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`      - ${role}: ${count}`)
    })
    console.log()
  }

  // Check workshops/organizations
  console.log('3️⃣  WORKSHOPS (organizations table)')
  console.log('-'.repeat(80))
  const { data: workshops, error: workshopError } = await supabase
    .from('organizations')
    .select('id, name, email, organization_type, status, created_at')
    .eq('organization_type', 'workshop')
    .order('created_at', { ascending: false })
    .limit(10)

  if (workshopError) {
    console.error(`   ❌ Error: ${workshopError.message}`)
  } else {
    console.log(`   Found: ${workshops?.length || 0} workshops`)
    console.log()
    if (workshops && workshops.length > 0) {
      workshops.forEach((w, i) => {
        console.log(`   ${i + 1}. ${w.name}`)
        console.log(`      Email: ${w.email}`)
        console.log(`      Status: ${w.status}`)
        console.log(`      Created: ${w.created_at}`)
        console.log()
      })
    } else {
      console.log('   ⚠️  NO WORKSHOPS FOUND')
      console.log()
    }
  }

  // Check all organizations
  console.log('4️⃣  ALL ORGANIZATIONS (any type)')
  console.log('-'.repeat(80))
  const { data: allOrgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, organization_type, status')
    .order('created_at', { ascending: false })
    .limit(10)

  if (orgError) {
    console.error(`   ❌ Error: ${orgError.message}`)
  } else {
    console.log(`   Found: ${allOrgs?.length || 0} total organizations`)
    console.log()

    if (allOrgs && allOrgs.length > 0) {
      const orgTypeCount = {}
      allOrgs.forEach(o => {
        orgTypeCount[o.organization_type] = (orgTypeCount[o.organization_type] || 0) + 1
      })

      console.log('   By Type:')
      Object.entries(orgTypeCount).forEach(([type, count]) => {
        console.log(`      - ${type}: ${count}`)
      })
      console.log()
    }
  }

  // Summary
  console.log('='.repeat(80))
  console.log('📊 SUMMARY')
  console.log('='.repeat(80))
  console.log()
  console.log(`Customers in database: ${customers?.length || 0}`)
  console.log(`Workshops in database: ${workshops?.length || 0}`)
  console.log(`Total profiles: ${allProfiles?.length || 0}`)
  console.log(`Total organizations: ${allOrgs?.length || 0}`)
  console.log()

  if ((customers?.length || 0) === 0) {
    console.log('⚠️  NO CUSTOMERS FOUND')
    console.log('   Customers should have role="customer" in profiles table')
    console.log()
  }

  if ((workshops?.length || 0) === 0) {
    console.log('⚠️  NO WORKSHOPS FOUND')
    console.log('   Workshops should have organization_type="workshop" in organizations table')
    console.log()
  }
}

checkData().catch(console.error)
