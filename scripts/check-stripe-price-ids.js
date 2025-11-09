/**
 * Verification Script: Check Stripe Price IDs in Database
 *
 * This script checks which service plans have Stripe Price IDs configured
 * and identifies any plans that need Price IDs to be set in Stripe.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStripePriceIds() {
  console.log('🔍 Checking Stripe Price IDs in service_plans table...\n')

  const { data: plans, error } = await supabase
    .from('service_plans')
    .select('slug, name, price, plan_type, stripe_price_id, stripe_subscription_price_id, is_active')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('❌ Database error:', error)
    process.exit(1)
  }

  console.log(`Found ${plans.length} service plans:\n`)

  let needsConfiguration = []

  plans.forEach((plan) => {
    const active = plan.is_active ? '✅ Active' : '⚠️  Inactive'
    console.log(`${active} | ${plan.slug} - ${plan.name} ($${plan.price})`)
    console.log(`   Type: ${plan.plan_type}`)

    if (plan.plan_type === 'payg') {
      if (plan.stripe_price_id) {
        console.log(`   ✅ Stripe Price ID: ${plan.stripe_price_id}`)
      } else if (plan.price > 0) {
        console.log(`   ❌ Missing Stripe Price ID (required for paid plans)`)
        needsConfiguration.push({
          slug: plan.slug,
          name: plan.name,
          price: plan.price,
          type: 'One-time payment'
        })
      } else {
        console.log(`   ℹ️  No Stripe Price ID (free plan)`)
      }
    }

    if (plan.plan_type === 'subscription') {
      if (plan.stripe_subscription_price_id) {
        console.log(`   ✅ Stripe Subscription Price ID: ${plan.stripe_subscription_price_id}`)
      } else {
        console.log(`   ❌ Missing Stripe Subscription Price ID`)
        needsConfiguration.push({
          slug: plan.slug,
          name: plan.name,
          price: plan.price,
          type: 'Subscription'
        })
      }
    }

    console.log('')
  })

  if (needsConfiguration.length > 0) {
    console.log('\n⚠️  ATTENTION: Plans Missing Stripe Configuration\n')
    console.log('The following plans need Stripe Price IDs to accept payments:\n')
    needsConfiguration.forEach((plan) => {
      console.log(`📋 ${plan.name} (${plan.slug})`)
      console.log(`   Price: $${plan.price}`)
      console.log(`   Type: ${plan.type}`)
      console.log(`   Action: Create a Price in Stripe Dashboard and update via /admin/plans\n`)
    })

    console.log('\n📖 How to add Stripe Price IDs:')
    console.log('1. Go to https://dashboard.stripe.com/prices')
    console.log('2. Create a new Price for each plan above')
    console.log('3. Copy the Price ID (starts with "price_")')
    console.log('4. Go to /admin/plans in your app')
    console.log('5. Edit the plan and paste the Stripe Price ID')
    console.log('6. The admin UI will validate the Price ID with Stripe before saving\n')
  } else {
    console.log('✅ All active paid plans have Stripe Price IDs configured!')
  }
}

checkStripePriceIds().catch(console.error)
