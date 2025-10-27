// Apply all missing migrations to Supabase using REST API
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE credentials in .env.local')
  process.exit(1)
}

// List of migrations to apply (in order)
const MIGRATIONS_TO_APPLY = [
  '20251027000000_add_mechanic_time_off.sql'
]

async function executeSQLviaPG(sql) {
  // Use Supabase's PostgREST /rpc endpoint
  // Note: This requires a function to be created in Supabase first
  // Or we output the SQL for manual application

  console.log('\n📝 SQL to execute:')
  console.log('─'.repeat(80))
  console.log(sql)
  console.log('─'.repeat(80))

  return { success: false, message: 'Manual application required' }
}

async function applyMigrations() {
  console.log('='.repeat(80))
  console.log('APPLYING MISSING MIGRATIONS TO SUPABASE')
  console.log('='.repeat(80))
  console.log(`\nDatabase: ${SUPABASE_URL}`)
  console.log(`Migrations to apply: ${MIGRATIONS_TO_APPLY.length}\n`)

  const results = []

  for (const migrationFile of MIGRATIONS_TO_APPLY) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📄 Processing: ${migrationFile}`)
    console.log('='.repeat(80))

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)

    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`)
      results.push({ file: migrationFile, success: false, error: 'File not found' })
      continue
    }

    const sql = fs.readFileSync(migrationPath, 'utf8')
    const result = await executeSQLviaPG(sql)

    results.push({ file: migrationFile, ...result })
  }

  // Output all SQL for manual application
  console.log('\n\n' + '='.repeat(80))
  console.log('MIGRATION APPLICATION INSTRUCTIONS')
  console.log('='.repeat(80))

  console.log('\n⚠️  AUTOMATIC SQL EXECUTION NOT SUPPORTED')
  console.log('The Supabase JavaScript client does not support raw SQL execution.')
  console.log('You must apply migrations manually using the Supabase Dashboard.\n')

  console.log('📋 STEPS TO APPLY MIGRATIONS:\n')

  console.log('1. Open Supabase SQL Editor:')
  console.log(`   https://supabase.com/dashboard/project/${SUPABASE_URL.split('.')[0].split('//')[1]}/sql/new\n`)

  console.log('2. Copy and paste the SQL from each migration file:\n')

  for (const migrationFile of MIGRATIONS_TO_APPLY) {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)
    if (fs.existsSync(migrationPath)) {
      console.log(`   📄 ${migrationFile}`)
      const sql = fs.readFileSync(migrationPath, 'utf8')

      // Write to individual file
      const outputPath = path.join(__dirname, '..', `APPLY_${migrationFile}`)
      fs.writeFileSync(outputPath, sql)
      console.log(`   ✅ SQL saved to: APPLY_${migrationFile}\n`)
    }
  }

  console.log('3. After applying each migration, verify it worked by running:')
  console.log('   node scripts/full-schema-audit.js\n')

  console.log('4. Check that the missing tables now exist in the audit results.\n')

  console.log('='.repeat(80))
  console.log('ALTERNATIVE: Use psql Command Line')
  console.log('='.repeat(80))
  console.log('\nIf you have PostgreSQL psql installed and your Supabase connection string:')
  console.log('\n   psql "your-connection-string" < supabase/migrations/20251027000000_add_mechanic_time_off.sql\n')

  console.log('Connection string format:')
  console.log('   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres\n')

  console.log('Get your connection string from:')
  console.log('   Supabase Dashboard → Project Settings → Database → Connection String\n')

  console.log('='.repeat(80))
}

applyMigrations().catch(console.error)
