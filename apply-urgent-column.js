/**
 * Quick script to add is_urgent column to session_requests
 * Run: node apply-urgent-column.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('🔄 Adding is_urgent column to session_requests...')

  // Try to query the table to see if column exists
  const { data: test, error: testError } = await supabase
    .from('session_requests')
    .select('is_urgent')
    .limit(1)

  if (!testError) {
    console.log('✅ Column is_urgent already exists!')
    return
  }

  if (testError.code === 'PGRST204' || testError.message?.includes('is_urgent')) {
    console.log('⚠️  Column is_urgent does not exist, needs to be added')
    console.log('')
    console.log('Please run this SQL in your Supabase Dashboard SQL Editor:')
    console.log('')
    console.log('ALTER TABLE public.session_requests')
    console.log('ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE;')
    console.log('')
    console.log('CREATE INDEX IF NOT EXISTS session_requests_urgent_idx')
    console.log('ON public.session_requests(is_urgent)')
    console.log('WHERE is_urgent = TRUE;')
    console.log('')
  } else {
    console.error('❌ Unexpected error:', testError)
  }
}

applyMigration().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
