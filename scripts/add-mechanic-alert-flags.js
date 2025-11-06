/**
 * Add Mechanic Alert System Feature Flags to Database
 *
 * Run with: node scripts/add-mechanic-alert-flags.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const mechanicAlertFlags = [
  {
    flag_key: 'mech_new_request_alerts',
    flag_name: 'Mechanic New Request Alerts',
    description: 'Master flag for multi-tier mechanic alert system (Tiers 1-4: Toast, Audio, Browser, Visual indicators)',
    is_enabled: true,
    enabled_for_roles: ['mechanic', 'admin'],
    rollout_percentage: 100,
    metadata: {
      category: 'mechanic_ux',
      tiers: ['toast', 'audio', 'browser', 'visual'],
      version: '1.0',
    }
  },
  {
    flag_key: 'mech_audio_alerts',
    flag_name: 'Mechanic Audio Alerts',
    description: 'Tier 2: Play notification sound when new session request arrives (requires user gesture)',
    is_enabled: true,
    enabled_for_roles: ['mechanic', 'admin'],
    rollout_percentage: 100,
    metadata: {
      category: 'mechanic_ux',
      tier: 2,
      parent_flag: 'mech_new_request_alerts',
      sound_file: '/sounds/new-request.mp3',
    }
  },
  {
    flag_key: 'mech_browser_notifications',
    flag_name: 'Mechanic Browser Notifications',
    description: 'Tier 3: Show native browser notifications when tab is inactive/background (requires permission)',
    is_enabled: true,
    enabled_for_roles: ['mechanic', 'admin'],
    rollout_percentage: 100,
    metadata: {
      category: 'mechanic_ux',
      tier: 3,
      parent_flag: 'mech_new_request_alerts',
      requires_permission: true,
    }
  },
  {
    flag_key: 'mech_visual_indicators',
    flag_name: 'Mechanic Visual Indicators',
    description: 'Tier 4: Show persistent visual badges and update tab title with new request count',
    is_enabled: true,
    enabled_for_roles: ['mechanic', 'admin'],
    rollout_percentage: 100,
    metadata: {
      category: 'mechanic_ux',
      tier: 4,
      parent_flag: 'mech_new_request_alerts',
      indicators: ['badge', 'tab_title'],
    }
  },
]

async function addFlags() {
  console.log('🚀 Adding Mechanic Alert System Feature Flags...\n')

  for (const flag of mechanicAlertFlags) {
    console.log(`Processing: ${flag.flag_key}`)

    // Check if flag already exists
    const { data: existing } = await supabase
      .from('feature_flags')
      .select('id, flag_key')
      .eq('flag_key', flag.flag_key)
      .single()

    if (existing) {
      console.log(`   ⚠️  Flag already exists, skipping...`)
      continue
    }

    // Insert new flag
    const { data, error } = await supabase
      .from('feature_flags')
      .insert(flag)
      .select()
      .single()

    if (error) {
      console.error(`   ❌ Error:`, error.message)
    } else {
      console.log(`   ✅ Added successfully (ID: ${data.id})`)
    }
  }

  console.log('\n✨ Done! Visit /admin/feature-flags to manage these flags.')
}

addFlags()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
