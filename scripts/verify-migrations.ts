#!/usr/bin/env tsx

/**
 * Migration Verification Script
 * Checks if all tables and columns from brand specialist system exist in database
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface CheckResult {
  name: string
  exists: boolean
  details?: string
}

async function checkTableExists(tableName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1)

  return !error
}

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(tableName)
    .select(columnName)
    .limit(1)

  return !error
}

async function countRows(tableName: string): Promise<number> {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  return error ? 0 : (count || 0)
}

async function verifyMigrations() {
  console.log('🔍 Brand Specialist Migration Verification\n')
  console.log('=' .repeat(60))
  console.log('')

  const results: CheckResult[] = []

  // ============================================
  // PHASE 1 & 2: Brand Specialist Core Tables
  // ============================================
  console.log('📊 Phase 1 & 2: Brand Specialist Core System\n')

  // Check new tables
  const phase1Tables = [
    { name: 'brand_specializations', expectedRows: 20 },
    { name: 'service_keywords', expectedRows: 35 },
    { name: 'mechanic_profile_requirements', expectedRows: 11 },
    { name: 'pricing_tiers', expectedRows: 4 },
    { name: 'feature_flags', expectedRows: 5 }
  ]

  for (const table of phase1Tables) {
    const exists = await checkTableExists(table.name)
    const count = exists ? await countRows(table.name) : 0

    results.push({
      name: `Table: ${table.name}`,
      exists,
      details: exists ? `${count} rows (expected ~${table.expectedRows})` : 'Missing'
    })

    if (exists) {
      console.log(`✅ ${table.name.padEnd(35)} ${count} rows`)
    } else {
      console.log(`❌ ${table.name.padEnd(35)} MISSING`)
    }
  }

  console.log('')

  // Check mechanics table extensions
  console.log('🔧 Mechanics Table Extensions:\n')

  const mechanicsColumns = [
    'is_brand_specialist',
    'brand_specializations',
    'service_keywords',
    'profile_completion_score',
    'can_accept_sessions',
    'specialist_tier'
  ]

  for (const column of mechanicsColumns) {
    const exists = await checkColumnExists('mechanics', column)
    results.push({
      name: `mechanics.${column}`,
      exists
    })

    if (exists) {
      console.log(`✅ mechanics.${column}`)
    } else {
      console.log(`❌ mechanics.${column} MISSING`)
    }
  }

  console.log('')

  // Check session_requests extensions
  console.log('📝 Session Requests Extensions:\n')

  const sessionRequestsColumns = [
    'request_type',
    'requested_brand',
    'extracted_keywords',
    'matching_score'
  ]

  for (const column of sessionRequestsColumns) {
    const exists = await checkColumnExists('session_requests', column)
    results.push({
      name: `session_requests.${column}`,
      exists
    })

    if (exists) {
      console.log(`✅ session_requests.${column}`)
    } else {
      console.log(`❌ session_requests.${column} MISSING`)
    }
  }

  console.log('')
  console.log('=' .repeat(60))
  console.log('')

  // ============================================
  // PHASE 3: Location Matching
  // ============================================
  console.log('🗺️  Phase 3: Location Matching System\n')

  // Check location tables
  const phase3Tables = [
    { name: 'supported_countries', expectedRows: 2 },
    { name: 'major_cities', expectedRows: 50 }
  ]

  for (const table of phase3Tables) {
    const exists = await checkTableExists(table.name)
    const count = exists ? await countRows(table.name) : 0

    results.push({
      name: `Table: ${table.name}`,
      exists,
      details: exists ? `${count} rows (expected ~${table.expectedRows})` : 'Missing'
    })

    if (exists) {
      console.log(`✅ ${table.name.padEnd(35)} ${count} rows`)
    } else {
      console.log(`❌ ${table.name.padEnd(35)} MISSING`)
    }
  }

  console.log('')

  // Check mechanics location columns
  console.log('🔧 Mechanics Location Extensions:\n')

  const locationColumns = [
    'country',
    'city',
    'state_province',
    'timezone'
  ]

  for (const column of locationColumns) {
    const exists = await checkColumnExists('mechanics', column)
    results.push({
      name: `mechanics.${column}`,
      exists
    })

    if (exists) {
      console.log(`✅ mechanics.${column}`)
    } else {
      console.log(`❌ mechanics.${column} MISSING`)
    }
  }

  console.log('')

  // Check session_requests location columns
  console.log('📝 Session Requests Location Extensions:\n')

  const sessionLocationColumns = [
    'customer_country',
    'customer_city',
    'prefer_local_mechanic'
  ]

  for (const column of sessionLocationColumns) {
    const exists = await checkColumnExists('session_requests', column)
    results.push({
      name: `session_requests.${column}`,
      exists
    })

    if (exists) {
      console.log(`✅ session_requests.${column}`)
    } else {
      console.log(`❌ session_requests.${column} MISSING`)
    }
  }

  console.log('')
  console.log('=' .repeat(60))
  console.log('')

  // Summary
  const totalChecks = results.length
  const passed = results.filter(r => r.exists).length
  const failed = results.filter(r => !r.exists).length

  console.log('📊 SUMMARY\n')
  console.log(`Total Checks: ${totalChecks}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Success Rate: ${Math.round((passed / totalChecks) * 100)}%`)
  console.log('')

  if (failed === 0) {
    console.log('🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY!')
    console.log('')
    console.log('✅ Your database is fully up to date')
    console.log('✅ All brand specialist features are ready')
    console.log('✅ Location matching is configured')
    console.log('')
  } else {
    console.log('⚠️  SOME MIGRATIONS ARE MISSING!')
    console.log('')
    console.log('Missing items:')
    results.filter(r => !r.exists).forEach(r => {
      console.log(`  ❌ ${r.name}`)
    })
    console.log('')
    console.log('Next steps:')
    console.log('  1. Check migration files in supabase/migrations/')
    console.log('  2. Apply missing migrations via Supabase SQL Editor')
    console.log('  3. Run this script again to verify')
    console.log('')
  }

  console.log('=' .repeat(60))
}

verifyMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('💥 Error:', err)
    process.exit(1)
  })
