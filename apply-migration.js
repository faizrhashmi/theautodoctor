const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('🔄 Applying migration: 99999999999_safe_fix_auth_function.sql')

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '99999999999_safe_fix_auth_function.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // If exec_sql doesn't exist, try direct query
      const lines = sql.split(';').filter(line => line.trim())

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('--')) continue

        console.log(`Executing: ${trimmed.substring(0, 80)}...`)
        const result = await supabase.from('_migrations').select('*').limit(1) // Dummy query to get connection
        // We need to use raw SQL execution which isn't directly available
        // Let's use a different approach
      }
    })

    // Alternative: Use pg library directly
    console.log('⚠️  Direct SQL execution not available through Supabase client')
    console.log('📋 Please run this migration manually:')
    console.log('')
    console.log('1. Open Supabase Dashboard → SQL Editor')
    console.log('2. Copy the contents of: supabase/migrations/99999999999_safe_fix_auth_function.sql')
    console.log('3. Paste and execute in SQL Editor')
    console.log('')
    console.log('Or use psql:')
    console.log(`psql postgresql://postgres:local123@127.0.0.1:54322/postgres -f "${migrationPath}"`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

applyMigration()
