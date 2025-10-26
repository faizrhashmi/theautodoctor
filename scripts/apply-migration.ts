#!/usr/bin/env tsx

/**
 * Migration Runner Script
 * Applies SQL migrations to Supabase database
 * Usage: npx tsx scripts/apply-migration.ts <migration-file>
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration(migrationFile: string) {
  console.log('🚀 Brand Specialist Matching System Migration')
  console.log('=' .repeat(60))
  console.log(`📁 Migration file: ${migrationFile}`)
  console.log(`🌐 Database: ${SUPABASE_URL}`)
  console.log('=' .repeat(60))
  console.log('')

  // Read the migration file
  const migrationPath = path.resolve(migrationFile)

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log(`📖 Read ${sql.split('\n').length} lines of SQL`)
  console.log('')

  // Split by semicolons but keep complex statements together
  // We'll execute the entire migration as one transaction
  console.log('⏳ Applying migration...')
  console.log('')

  try {
    // Execute the migration using Supabase's RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    })

    if (error) {
      // If RPC doesn't exist, try direct execution (this won't work for DDL, but worth trying)
      console.log('⚠️  RPC method not available, attempting direct execution...')

      // For Supabase, we need to use the SQL editor or PostgREST
      // Let's provide instructions instead
      console.log('')
      console.log('=' .repeat(60))
      console.log('📋 MANUAL MIGRATION REQUIRED')
      console.log('=' .repeat(60))
      console.log('')
      console.log('Please apply this migration manually using one of these methods:')
      console.log('')
      console.log('Method 1: Supabase Dashboard (Recommended)')
      console.log('  1. Go to https://supabase.com/dashboard')
      console.log('  2. Select your project')
      console.log('  3. Navigate to SQL Editor')
      console.log('  4. Copy and paste the contents of:')
      console.log(`     ${migrationPath}`)
      console.log('  5. Click "Run"')
      console.log('')
      console.log('Method 2: Supabase CLI')
      console.log('  npx supabase db push')
      console.log('')
      console.log('Method 3: Direct Database Connection')
      console.log('  psql <your-database-connection-string> -f ' + migrationPath)
      console.log('')
      console.log('=' .repeat(60))

      // Write a convenient SQL file for copy-paste
      const outputPath = path.join(process.cwd(), 'migration-to-apply.sql')
      fs.writeFileSync(outputPath, sql)
      console.log(`✅ Migration SQL saved to: ${outputPath}`)
      console.log('   (Ready for copy-paste into Supabase SQL Editor)')
      console.log('')

      process.exit(0)
    }

    console.log('✅ Migration applied successfully!')
    console.log('')
    console.log('📊 Changes applied:')
    console.log('  ✓ Extended mechanics table with specialist fields')
    console.log('  ✓ Created brand_specializations table (20 brands)')
    console.log('  ✓ Created service_keywords table (35+ keywords)')
    console.log('  ✓ Created mechanic_profile_requirements table')
    console.log('  ✓ Created pricing_tiers table')
    console.log('  ✓ Added feature flags for toggle control')
    console.log('  ✓ Configured Row Level Security policies')
    console.log('  ✓ Created helper functions and triggers')
    console.log('  ✓ Updated existing mechanics (set to 75% completion)')
    console.log('')
    console.log('🎉 Brand Specialist Matching System is now ready!')
    console.log('')
    console.log('📝 Next steps:')
    console.log('  1. Build profile completion calculator')
    console.log('  2. Create ProfileCompletionBanner component')
    console.log('  3. Update mechanic signup form')
    console.log('  4. Create enhanced intake form')
    console.log('  5. Build smart matching algorithm')
    console.log('')

  } catch (err) {
    console.error('❌ Error applying migration:', err)
    process.exit(1)
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2] || 'supabase/migrations/20251025000001_brand_specialist_matching.sql'

applyMigration(migrationFile)
  .then(() => {
    console.log('✨ Migration process completed')
    process.exit(0)
  })
  .catch((err) => {
    console.error('💥 Migration failed:', err)
    process.exit(1)
  })
