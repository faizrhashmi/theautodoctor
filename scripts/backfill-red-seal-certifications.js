/**
 * Phase 3: Backfill Red Seal Certifications
 *
 * Migrates existing Red Seal data from legacy fields to new canonical fields.
 *
 * Strategy:
 * 1. Query all mechanics with red_seal_certified = true
 * 2. Map legacy data to canonical format
 * 3. Update with dual-write payload
 * 4. Verify all Red Seal mechanics have canonical data
 *
 * Safety:
 * - Read-only preview mode available
 * - Transactional updates (one at a time with error handling)
 * - Preserves all legacy data (dual-write)
 * - Can be re-run safely (idempotent)
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  console.error('Please ensure .env.local has:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Command-line arguments
const args = process.argv.slice(2)
const previewMode = args.includes('--preview')
const yesFlag = args.includes('--yes')

/**
 * Map legacy Red Seal data to canonical format
 */
function mapLegacyToCanonical(mechanic) {
  if (!mechanic.red_seal_certified) {
    return null
  }

  return {
    type: 'red_seal',
    number: mechanic.red_seal_number || null,
    authority: 'Red Seal Program',
    region: mechanic.red_seal_province || null,
    expiryDate: mechanic.red_seal_expiry_date ? new Date(mechanic.red_seal_expiry_date) : null,
  }
}

/**
 * Prepare dual-write payload from canonical certification
 */
function prepareCertificationUpdate(cert) {
  if (!cert) {
    return {
      certification_type: null,
      certification_number: null,
      certification_authority: null,
      certification_region: null,
      certification_expiry_date: null,
      red_seal_certified: false,
      red_seal_number: null,
      red_seal_province: null,
      red_seal_expiry_date: null,
    }
  }

  return {
    // New canonical fields
    certification_type: cert.type,
    certification_number: cert.number,
    certification_authority: cert.authority,
    certification_region: cert.region,
    certification_expiry_date: cert.expiryDate?.toISOString().split('T')[0] || null,

    // Legacy fields (dual-write for Red Seal)
    red_seal_certified: cert.type === 'red_seal',
    red_seal_number: cert.type === 'red_seal' ? cert.number : null,
    red_seal_province: cert.type === 'red_seal' ? cert.region : null,
    red_seal_expiry_date:
      cert.type === 'red_seal' && cert.expiryDate
        ? cert.expiryDate.toISOString().split('T')[0]
        : null,
  }
}

async function main() {
  console.log('\n==========================================')
  console.log(' PHASE 3: BACKFILL RED SEAL CERTIFICATIONS')
  console.log('==========================================\n')

  if (previewMode) {
    console.log('🔍 PREVIEW MODE - No changes will be made\n')
  }

  // Step 1: Query all Red Seal mechanics
  console.log('📊 Step 1: Querying Red Seal mechanics...\n')

  const { data: mechanics, error } = await supabase
    .from('mechanics')
    .select('id, name, email, red_seal_certified, red_seal_number, red_seal_province, red_seal_expiry_date, certification_type')
    .eq('red_seal_certified', true)

  if (error) {
    console.error('❌ Error querying mechanics:', error.message)
    process.exit(1)
  }

  console.log(`Found ${mechanics.length} Red Seal certified mechanics\n`)

  if (mechanics.length === 0) {
    console.log('✅ No Red Seal mechanics to backfill')
    console.log('==========================================\n')
    return
  }

  // Step 2: Preview data mapping
  console.log('📋 Step 2: Preview data mapping...\n')

  const mappings = mechanics.map(mechanic => {
    const canonical = mapLegacyToCanonical(mechanic)
    const payload = prepareCertificationUpdate(canonical)

    return {
      mechanic,
      canonical,
      payload,
      alreadyMigrated: mechanic.certification_type === 'red_seal',
    }
  })

  // Show summary
  const needsMigration = mappings.filter(m => !m.alreadyMigrated)
  const alreadyMigrated = mappings.filter(m => m.alreadyMigrated)

  console.log(`Total Red Seal mechanics: ${mechanics.length}`)
  console.log(`  ✅ Already migrated: ${alreadyMigrated.length}`)
  console.log(`  ⏳ Needs migration: ${needsMigration.length}\n`)

  if (needsMigration.length === 0) {
    console.log('✅ All Red Seal mechanics already have canonical data!')
    console.log('==========================================\n')
    return
  }

  // Show sample mappings
  console.log('Sample mappings (first 3):\n')
  needsMigration.slice(0, 3).forEach(({ mechanic, canonical, payload }, idx) => {
    console.log(`${idx + 1}. ${mechanic.name} (${mechanic.email})`)
    console.log(`   Legacy: red_seal_number = ${mechanic.red_seal_number || 'NULL'}`)
    console.log(`   Canonical: certification_type = ${canonical?.type}`)
    console.log(`              certification_number = ${canonical?.number || 'NULL'}`)
    console.log(`              certification_authority = ${canonical?.authority || 'NULL'}`)
    console.log(`              certification_region = ${canonical?.region || 'NULL'}`)
    console.log()
  })

  if (previewMode) {
    console.log('🔍 PREVIEW MODE - Exiting without changes\n')
    console.log('To run backfill, remove --preview flag:\n')
    console.log('  node scripts/backfill-red-seal-certifications.js --yes\n')
    console.log('==========================================\n')
    return
  }

  // Step 3: Confirm before proceeding
  if (!yesFlag) {
    console.log('⚠️  Ready to backfill ${needsMigration.length} mechanics')
    console.log('   Run with --yes flag to proceed:\n')
    console.log('   node scripts/backfill-red-seal-certifications.js --yes\n')
    console.log('==========================================\n')
    return
  }

  // Step 4: Perform backfill
  console.log(`🚀 Step 3: Backfilling ${needsMigration.length} mechanics...\n`)

  let successCount = 0
  let errorCount = 0
  const errors = []

  for (const { mechanic, payload } of needsMigration) {
    try {
      const { error: updateError } = await supabase
        .from('mechanics')
        .update(payload)
        .eq('id', mechanic.id)

      if (updateError) {
        throw updateError
      }

      successCount++
      console.log(`✅ ${mechanic.name} (${mechanic.email})`)
    } catch (err) {
      errorCount++
      errors.push({ mechanic, error: err.message })
      console.error(`❌ ${mechanic.name} (${mechanic.email}): ${err.message}`)
    }
  }

  console.log('\n==========================================')
  console.log(' BACKFILL COMPLETE')
  console.log('==========================================\n')

  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}\n`)

  if (errors.length > 0) {
    console.log('Errors encountered:\n')
    errors.forEach(({ mechanic, error }) => {
      console.log(`- ${mechanic.name}: ${error}`)
    })
    console.log()
  }

  // Step 5: Verify
  console.log('🔍 Step 4: Verifying backfill...\n')

  const { data: verification, error: verifyError } = await supabase
    .from('mechanics')
    .select('id, name, red_seal_certified, certification_type')
    .eq('red_seal_certified', true)

  if (verifyError) {
    console.error('❌ Verification error:', verifyError.message)
    process.exit(1)
  }

  const verified = verification.filter(m => m.certification_type === 'red_seal')
  const missing = verification.filter(m => m.certification_type !== 'red_seal')

  console.log(`Total Red Seal mechanics: ${verification.length}`)
  console.log(`  ✅ Have canonical data: ${verified.length}`)
  console.log(`  ❌ Missing canonical data: ${missing.length}\n`)

  if (missing.length > 0) {
    console.log('⚠️  Mechanics still missing canonical data:\n')
    missing.forEach(m => {
      console.log(`- ${m.name} (ID: ${m.id})`)
    })
    console.log()
  }

  if (verified.length === verification.length) {
    console.log('✅ VERIFICATION PASSED: All Red Seal mechanics have canonical data!\n')
  } else {
    console.log('⚠️  VERIFICATION WARNING: Some mechanics still missing canonical data\n')
  }

  console.log('==========================================\n')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
  })
