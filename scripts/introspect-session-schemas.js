/**
 * Introspect session table schemas
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function introspectTable(tableName) {
  console.log(`\nTable: ${tableName}`)
  console.log('-'.repeat(80))

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1)

  if (error) {
    console.error(`Error querying ${tableName}:`, error.message)
    return null
  }

  if (!data || data.length === 0) {
    console.log(`(Table is empty - cannot introspect columns from sample row)`)

    // Try to get table structure from information_schema
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: tableName })
      .catch(() => null)

    if (!schemaData) {
      console.log('Unable to retrieve schema information')
    }
    return null
  }

  const sampleRow = data[0]
  console.log('Columns:')
  Object.keys(sampleRow).forEach(key => {
    const value = sampleRow[key]
    const type = typeof value
    console.log(`  - ${key}: ${type} ${value === null ? '(null)' : ''}`)
  })

  return sampleRow
}

async function main() {
  console.log('='.repeat(80))
  console.log('Session Table Schema Introspection')
  console.log('='.repeat(80))

  await introspectTable('sessions')
  await introspectTable('diagnostic_sessions')

  console.log()
  console.log('='.repeat(80))
}

main().catch(console.error)
