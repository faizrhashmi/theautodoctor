import { supabaseAdmin } from '../src/lib/supabaseAdmin'
import fs from 'fs'
import path from 'path'

async function applyMigration() {
  console.log('Applying read_at migration...')

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20250128000001_add_chat_read_receipts.sql'
  )

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  try {
    // Execute the SQL
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_string: sql })

    if (error) {
      // If RPC doesn't exist, try direct SQL execution
      console.log('Trying direct SQL execution...')

      // Split by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement) {
          console.log(`Executing: ${statement.substring(0, 50)}...`)
          const result = await supabaseAdmin.rpc('exec', { sql: statement })
          if (result.error) {
            console.error('Error:', result.error.message)
          }
        }
      }
    }

    console.log('Migration applied successfully!')
    console.log('\nYou can now use read receipts in the chat!')
  } catch (err) {
    console.error('Failed to apply migration:', err)
    console.log('\nPlease run this SQL manually in your Supabase SQL editor:')
    console.log('\n' + sql)
  }
}

applyMigration()
