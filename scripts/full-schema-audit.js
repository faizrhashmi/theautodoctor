// Comprehensive database schema audit script
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

// List of all tables we expect to have based on codebase
const EXPECTED_TABLES = [
  'profiles',
  'mechanics',
  'mechanic_sessions',
  'mechanic_availability',
  'mechanic_time_off',
  'sessions',
  'diagnostic_sessions',
  'session_requests',
  'vehicles',
  'intakes',
  'quotes',
  'reviews',
  'favorites',
  'partnerships',
  'partnership_applications',
  'workshops',
  'workshop_mechanics',
  'admin_users',
  'fees',
  'mechanic_documents',
  'session_recordings',
  'messages',
  'bay_bookings'
]

async function getTableSchema(tableName) {
  try {
    // Try to query the table with limit 0 to get structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (error) {
      return { exists: false, error: error.message, columns: null }
    }

    // If we got data, extract column names
    if (data && data.length > 0) {
      return { exists: true, columns: Object.keys(data[0]), sampleData: data[0] }
    }

    // If no data, try to get just the structure by querying with head
    const { error: headError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (headError) {
      return { exists: false, error: headError.message, columns: null }
    }

    // Table exists but is empty - we need another way to get columns
    // Let's try a test insert/select to infer structure
    return { exists: true, columns: null, isEmpty: true }
  } catch (err) {
    return { exists: false, error: err.message, columns: null }
  }
}

async function testSpecificColumns(tableName, columnsList) {
  const results = {}

  for (const col of columnsList) {
    const { error } = await supabase
      .from(tableName)
      .select(col)
      .limit(1)

    results[col] = !error
    if (error && error.message) {
      results[`${col}_error`] = error.message
    }
  }

  return results
}

async function auditDatabase() {
  console.log('='.repeat(80))
  console.log('COMPREHENSIVE DATABASE SCHEMA AUDIT')
  console.log('='.repeat(80))
  console.log('\nConnecting to Supabase database...')
  console.log(`URL: ${url}\n`)

  const auditResults = {
    timestamp: new Date().toISOString(),
    tables: {},
    mismatches: [],
    recommendations: []
  }

  // Test each expected table
  for (const tableName of EXPECTED_TABLES) {
    console.log(`\n📊 Checking table: ${tableName}`)
    console.log('-'.repeat(80))

    const schema = await getTableSchema(tableName)

    if (!schema.exists) {
      console.log(`❌ Table does not exist or is not accessible`)
      console.log(`   Error: ${schema.error}`)
      auditResults.tables[tableName] = { exists: false, error: schema.error }
      auditResults.mismatches.push({
        type: 'MISSING_TABLE',
        table: tableName,
        issue: schema.error
      })
      continue
    }

    console.log(`✓ Table exists`)

    if (schema.columns) {
      console.log(`✓ Columns found: ${schema.columns.length}`)
      console.log(`   ${schema.columns.join(', ')}`)
      auditResults.tables[tableName] = {
        exists: true,
        columns: schema.columns,
        columnCount: schema.columns.length
      }
    } else if (schema.isEmpty) {
      console.log(`⚠️  Table is empty - will test specific columns`)
      auditResults.tables[tableName] = { exists: true, isEmpty: true, columns: [] }
    }
  }

  // Now test known problematic columns based on codebase analysis
  console.log('\n\n' + '='.repeat(80))
  console.log('TESTING KNOWN COLUMN NAME PATTERNS')
  console.log('='.repeat(80))

  const columnTests = {
    'mechanic_availability': ['day_of_week', 'weekday', 'is_available', 'is_active'],
    'sessions': ['type', 'status', 'mechanic_id', 'customer_user_id', 'metadata', 'parent_session_id'],
    'diagnostic_sessions': ['status', 'mechanic_id', 'customer_id', 'intake_id'],
    'session_requests': ['session_type', 'status', 'mechanic_id', 'customer_user_id'],
    'profiles': ['full_name', 'name', 'role', 'user_type', 'free_session_override'],
    'mechanics': ['name', 'full_name', 'user_id', 'is_available', 'workshop_id'],
    'intakes': ['urgent', 'customer_user_id', 'vehicle_id', 'plan'],
    'vehicles': ['customer_user_id', 'make', 'model', 'year'],
    'quotes': ['session_id', 'diagnostic_session_id', 'mechanic_id', 'status'],
    'favorites': ['customer_id', 'mechanic_id']
  }

  for (const [tableName, columns] of Object.entries(columnTests)) {
    console.log(`\n🔍 Testing columns in: ${tableName}`)
    const results = await testSpecificColumns(tableName, columns)

    const existing = []
    const missing = []

    for (const col of columns) {
      if (results[col]) {
        existing.push(col)
        console.log(`   ✓ ${col}`)
      } else {
        missing.push(col)
        console.log(`   ❌ ${col} - ${results[`${col}_error`] || 'does not exist'}`)

        auditResults.mismatches.push({
          type: 'MISSING_COLUMN',
          table: tableName,
          column: col,
          error: results[`${col}_error`]
        })
      }
    }

    if (auditResults.tables[tableName]) {
      auditResults.tables[tableName].testedColumns = { existing, missing }
    }
  }

  // Check for common mismatch patterns
  console.log('\n\n' + '='.repeat(80))
  console.log('CHECKING FOR COMMON MISMATCH PATTERNS')
  console.log('='.repeat(80))

  // Pattern 1: weekday vs day_of_week
  if (auditResults.tables['mechanic_availability']?.testedColumns) {
    const { existing } = auditResults.tables['mechanic_availability'].testedColumns
    if (existing.includes('day_of_week') && !existing.includes('weekday')) {
      console.log('\n⚠️  PATTERN FOUND: mechanic_availability uses "day_of_week" not "weekday"')
      auditResults.recommendations.push({
        table: 'mechanic_availability',
        issue: 'Column name mismatch',
        actual: 'day_of_week',
        codeMayUse: 'weekday',
        action: 'API should map weekday -> day_of_week'
      })
    }
    if (existing.includes('is_available') && !existing.includes('is_active')) {
      console.log('⚠️  PATTERN FOUND: mechanic_availability uses "is_available" not "is_active"')
      auditResults.recommendations.push({
        table: 'mechanic_availability',
        issue: 'Column name mismatch',
        actual: 'is_available',
        codeMayUse: 'is_active',
        action: 'API should map is_active -> is_available'
      })
    }
  }

  // Pattern 2: metadata vs parent_session_id
  if (auditResults.tables['sessions']?.testedColumns) {
    const { existing, missing } = auditResults.tables['sessions'].testedColumns
    if (missing.includes('parent_session_id') && existing.includes('metadata')) {
      console.log('\n⚠️  PATTERN FOUND: sessions table may not have "parent_session_id" column')
      auditResults.recommendations.push({
        table: 'sessions',
        issue: 'Missing column or using JSON field',
        actual: 'metadata (JSONB)',
        codeMayUse: 'parent_session_id',
        action: 'Use metadata->parent_session_id or add migration'
      })
    }
  }

  // Pattern 3: full_name confusion
  const profilesTest = auditResults.tables['profiles']?.testedColumns
  const mechanicsTest = auditResults.tables['mechanics']?.testedColumns

  if (profilesTest && mechanicsTest) {
    if (profilesTest.existing.includes('full_name') && mechanicsTest.existing.includes('name')) {
      console.log('\n⚠️  PATTERN FOUND: profiles.full_name vs mechanics.name')
      auditResults.recommendations.push({
        table: 'profiles/mechanics',
        issue: 'Different column names for same concept',
        actual: 'profiles.full_name, mechanics.name',
        action: 'APIs should use correct column for each table'
      })
    }
  }

  // Write results to file
  const outputPath = path.join(__dirname, '..', 'SCHEMA_AUDIT_RESULTS.json')
  fs.writeFileSync(outputPath, JSON.stringify(auditResults, null, 2))
  console.log(`\n\n✅ Audit complete! Results saved to: SCHEMA_AUDIT_RESULTS.json`)

  // Summary
  console.log('\n\n' + '='.repeat(80))
  console.log('AUDIT SUMMARY')
  console.log('='.repeat(80))
  console.log(`\nTables checked: ${EXPECTED_TABLES.length}`)
  console.log(`Tables existing: ${Object.values(auditResults.tables).filter(t => t.exists).length}`)
  console.log(`Tables missing: ${Object.values(auditResults.tables).filter(t => !t.exists).length}`)
  console.log(`\nTotal mismatches found: ${auditResults.mismatches.length}`)
  console.log(`Recommendations: ${auditResults.recommendations.length}`)

  if (auditResults.mismatches.length > 0) {
    console.log('\n⚠️  Issues found - review SCHEMA_AUDIT_RESULTS.json for details')
  } else {
    console.log('\n✅ No major issues found!')
  }

  return auditResults
}

auditDatabase().catch(console.error)
