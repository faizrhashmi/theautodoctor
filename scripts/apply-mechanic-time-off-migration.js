// Apply mechanic_time_off migration to Supabase
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing SUPABASE credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function applyMigration() {
  console.log('=' .repeat(80))
  console.log('APPLYING MECHANIC TIME OFF MIGRATION')
  console.log('='.repeat(80))
  console.log(`\nTarget Database: ${url}\n`)

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251027000000_add_mechanic_time_off.sql')

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  console.log('📄 Migration file loaded')
  console.log(`📍 File: 20251027000000_add_mechanic_time_off.sql`)
  console.log(`📏 Size: ${migrationSQL.length} characters\n`)

  console.log('🔍 Checking if mechanic_time_off table already exists...')

  // Check if table exists
  const { error: checkError } = await supabase
    .from('mechanic_time_off')
    .select('id', { count: 'exact', head: true })

  if (!checkError) {
    console.log('✅ Table already exists! No migration needed.')
    console.log('\n✨ Migration check complete.')
    return
  }

  console.log('❌ Table does not exist. Proceeding with migration...\n')

  // Note: Supabase JS client doesn't support raw SQL execution directly
  // We need to use the SQL endpoint or apply via Supabase dashboard

  console.log('=' .repeat(80))
  console.log('MIGRATION SQL TO APPLY')
  console.log('='.repeat(80))
  console.log(migrationSQL)
  console.log('='.repeat(80))

  console.log('\n⚠️  IMPORTANT: Supabase JS Client cannot execute raw SQL migrations.')
  console.log('📋 Please apply this migration using ONE of these methods:\n')

  console.log('METHOD 1: Supabase Dashboard (Recommended)')
  console.log('  1. Go to: https://supabase.com/dashboard/project/qtkouemogsymqrzkysar/editor')
  console.log('  2. Click "SQL Editor"')
  console.log('  3. Copy the SQL above')
  console.log('  4. Paste and run\n')

  console.log('METHOD 2: Supabase CLI')
  console.log('  supabase db push\n')

  console.log('METHOD 3: Copy SQL file to clipboard')
  console.log('  The SQL has been output above - copy it manually\n')

  // Write to a temporary file for easy copy
  const tempPath = path.join(__dirname, '..', 'APPLY_THIS_MIGRATION.sql')
  fs.writeFileSync(tempPath, migrationSQL)
  console.log(`✅ Migration SQL saved to: APPLY_THIS_MIGRATION.sql`)
  console.log('📋 You can open this file and copy the contents to Supabase SQL Editor\n')

  console.log('After applying the migration, run this script again to verify:')
  console.log('  node scripts/apply-mechanic-time-off-migration.js\n')
}

applyMigration().catch(console.error)
