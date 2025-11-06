/**
 * Script to add mechanic alert feature flags to the database
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const flags = [
  {
    flag_key: 'mech_new_request_alerts',
    flag_name: 'Mechanic New Request Alerts',
    description: 'Enable multi-layer alert system for mechanics when new session requests arrive',
    enabled_for_roles: ['mechanic'],
    metadata: { tier: 'all' }
  },
  {
    flag_key: 'mech_audio_alerts',
    flag_name: 'Mechanic Audio Alerts',
    description: 'Play audio notification sound when new session requests arrive',
    enabled_for_roles: ['mechanic'],
    metadata: { tier: 'all' }
  },
  {
    flag_key: 'mech_browser_notifications',
    flag_name: 'Mechanic Browser Notifications',
    description: 'Show browser notifications when tab is in background',
    enabled_for_roles: ['mechanic'],
    metadata: { tier: 'all' }
  },
  {
    flag_key: 'mech_visual_indicators',
    flag_name: 'Mechanic Visual Indicators',
    description: 'Show badge count and tab title indicators for new requests',
    enabled_for_roles: ['mechanic'],
    metadata: { tier: 'all' }
  }
]

async function addFlags() {
  console.log('🚀 Adding mechanic alert feature flags...\n')

  for (const flag of flags) {
    const { error } = await supabase
      .from('feature_flags')
      .upsert(flag, { onConflict: 'flag_key' })

    if (error) {
      console.error(`❌ Error adding ${flag.flag_key}:`, error)
    } else {
      console.log(`✅ Added/updated ${flag.flag_key}`)
    }
  }

  console.log('\n✅ All mechanic alert flags added successfully!')
}

addFlags().catch(console.error)
