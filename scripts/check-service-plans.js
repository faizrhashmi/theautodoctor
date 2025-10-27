// Check if service_plans table exists and analyze it
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function checkServicePlans() {
  console.log('='.repeat(80))
  console.log('SERVICE PLANS TABLE CHECK')
  console.log('='.repeat(80))
  console.log()

  // Check if table exists
  console.log('🔍 Checking if service_plans table exists...\n')

  const { data, error, count } = await supabase
    .from('service_plans')
    .select('*', { count: 'exact' })

  if (error) {
    console.log('❌ Table does NOT exist')
    console.log(`   Error: ${error.message}`)
    console.log()
    console.log('📋 RECOMMENDATION:')
    console.log('   The service_plans migration has NOT been applied to Supabase.')
    console.log('   This table would allow dynamic plan management instead of hardcoded config.')
    console.log()
    console.log('   To apply:')
    console.log('   1. Open Supabase SQL Editor')
    console.log('   2. Copy SQL from: supabase/migrations/20251027000000_create_service_plans_table.sql')
    console.log('   3. Execute')
    console.log()
    return
  }

  console.log('✅ Table EXISTS!')
  console.log(`   Total records: ${count}`)
  console.log()

  if (data && data.length > 0) {
    console.log('📊 Current Plans in Database:')
    console.log('─'.repeat(80))

    data.forEach(plan => {
      console.log(`\n🔹 ${plan.name} (${plan.slug})`)
      console.log(`   Price: $${plan.price}`)
      console.log(`   Duration: ${plan.duration_minutes} minutes`)
      console.log(`   Category: ${plan.plan_category}`)
      console.log(`   Routing: ${plan.routing_preference}`)
      console.log(`   Active: ${plan.is_active ? '✓' : '✗'}`)
      if (plan.restricted_brands && plan.restricted_brands.length > 0) {
        console.log(`   Brand Restrictions: ${plan.restricted_brands.join(', ')}`)
      }
    })

    console.log()
    console.log('─'.repeat(80))
    console.log('✅ service_plans table is populated and ready to use')
    console.log()
    console.log('💡 Next Step: Update your code to use service_plans table instead of')
    console.log('   hardcoded PRICING config from src/config/pricing.ts')
  } else {
    console.log('⚠️  Table exists but is EMPTY')
    console.log()
    console.log('📋 The migration creates 4 default plans:')
    console.log('   - Free Session (free)')
    console.log('   - Quick Chat (quick)')
    console.log('   - Standard Video (standard)')
    console.log('   - Full Diagnostic (diagnostic)')
    console.log()
    console.log('These should have been inserted by the migration.')
    console.log('Migration may have been partially applied.')
  }

  console.log()
  console.log('='.repeat(80))
  console.log('PRICING CONFIG vs SERVICE_PLANS COMPARISON')
  console.log('='.repeat(80))
  console.log()
  console.log('Current System: Hardcoded PRICING in src/config/pricing.ts')
  console.log('New System: Dynamic service_plans table')
  console.log()
  console.log('Benefits of service_plans:')
  console.log('  ✓ Admins can add/edit plans without code changes')
  console.log('  ✓ Plan features stored in database')
  console.log('  ✓ Brand specialist routing built-in')
  console.log('  ✓ Stripe price IDs managed centrally')
  console.log('  ✓ Feature flags per plan')
  console.log()
  console.log('Migration Required:')
  console.log('  - Update intake flow to query service_plans')
  console.log('  - Update pricing page to fetch from service_plans')
  console.log('  - Keep PRICING as fallback during transition')
  console.log()
}

checkServicePlans().catch(console.error)
