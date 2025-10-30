/**
 * Script to reactivate test mechanics as fully approved
 * Usage: npx tsx scripts/reactivate-mechanics.ts
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

async function reactivateMechanics() {
  console.log('🔧 Reactivating test mechanics...\n')

  const emails = ['mech@test.com', 'mech1@test.com']

  for (const email of emails) {
    console.log(`\n📧 Processing: ${email}`)

    // Check current status
    const { data: mechanic, error: fetchError } = await supabaseAdmin
      .from('mechanics')
      .select('id, email, name, service_tier, application_status, can_accept_sessions, is_available, user_id')
      .eq('email', email)
      .single()

    if (fetchError || !mechanic) {
      console.log(`❌ Mechanic not found: ${email}`)
      console.log('Error:', fetchError)
      continue
    }

    console.log('Current status:')
    console.log(`  - ID: ${mechanic.id}`)
    console.log(`  - Name: ${mechanic.name}`)
    console.log(`  - Service Tier: ${mechanic.service_tier}`)
    console.log(`  - Application Status: ${mechanic.application_status}`)
    console.log(`  - Can Accept Sessions: ${mechanic.can_accept_sessions}`)
    console.log(`  - Is Available: ${mechanic.is_available}`)
    console.log(`  - User ID: ${mechanic.user_id}`)

    // Update to fully approved mechanic
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({
        service_tier: 'approved_full_service',  // Full service mechanic
        application_status: 'approved',
        can_accept_sessions: true,
        is_available: true,
        stripe_payouts_enabled: true  // Enable payouts
      })
      .eq('email', email)

    if (updateError) {
      console.log(`❌ Failed to update: ${email}`)
      console.log('Error:', updateError)
      continue
    }

    console.log(`✅ Successfully reactivated: ${email}`)
    console.log('New status:')
    console.log(`  - Service Tier: approved_full_service`)
    console.log(`  - Application Status: approved`)
    console.log(`  - Can Accept Sessions: true`)
    console.log(`  - Is Available: true`)
    console.log(`  - Stripe Payouts Enabled: true`)
  }

  console.log('\n✅ Reactivation complete!\n')
}

reactivateMechanics().catch(console.error)
