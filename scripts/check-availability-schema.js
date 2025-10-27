// Script to check mechanic_availability table schema
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing SUPABASE credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function checkSchema() {
  console.log('Checking mechanic_availability table schema...\n')

  // Query to get column information
  const { data: columns, error: columnError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM
        information_schema.columns
      WHERE
        table_schema = 'public'
        AND table_name = 'mechanic_availability'
      ORDER BY
        ordinal_position;
    `
  })

  if (columnError) {
    console.error('Error querying schema:', columnError)

    // Alternative: Try direct query
    console.log('\nTrying direct table query...')
    const { data, error, count } = await supabase
      .from('mechanic_availability')
      .select('*', { count: 'exact' })
      .limit(1)

    if (error) {
      console.error('Table query error:', error.message)
      console.error('Details:', error)

      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.error('\n❌ COLUMN NAME MISMATCH DETECTED!')
        console.error('The API is using column names that don\'t exist in the database.')
      }
    } else {
      console.log('✓ Table exists!')
      console.log('Total records:', count)
      if (data && data.length > 0) {
        console.log('\nSample record structure:')
        console.log(JSON.stringify(data[0], null, 2))
        console.log('\nColumn names in actual table:', Object.keys(data[0]))
      } else {
        console.log('\nNo records found. Creating a test query to see column names...')

        // Get just the columns by trying to select with limit 0
        const { data: testData, error: testError } = await supabase
          .from('mechanic_availability')
          .select('*')
          .limit(0)

        console.log('Test query error:', testError)
      }
    }
  } else {
    console.log('Schema Information:')
    console.table(columns)
  }

  // Check if table exists
  const { data: tableExists, error: existsError } = await supabase
    .from('mechanic_availability')
    .select('id', { count: 'exact', head: true })

  if (existsError) {
    console.error('\n❌ Table access error:', existsError.message)
  } else {
    console.log('\n✓ Table is accessible')
  }
}

checkSchema().catch(console.error)
