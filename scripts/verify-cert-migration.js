/**
 * Verify Phase 1 cert expansion migration
 * Checks if the new certification columns exist in the mechanics table
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n==========================================');
  console.log(' PHASE 1 MIGRATION VERIFICATION');
  console.log('==========================================\n');

  try {
    // Try to query the new columns
    const { data, error } = await supabase
      .from('mechanics')
      .select('id, name, certification_type, certification_number, certification_authority, certification_region, certification_expiry_date')
      .limit(1);

    if (error) {
      if (error.message && error.message.includes('does not exist')) {
        console.log('❌ MIGRATION NOT APPLIED');
        console.log('\nThe new certification columns do not exist yet.');
        console.log('Error:', error.message);
        console.log('\n📋 To apply the migration:\n');
        console.log('1. Open Supabase Dashboard SQL Editor');
        console.log('2. Copy and run: migrations/cert-expansion/02_up.sql\n');
        return false;
      } else if (error.code === 'PGRST116') {
        // No rows - table might be empty, but columns exist if no column error
        console.log('✅ MIGRATION APPEARS APPLIED');
        console.log('(Table is empty but query succeeded)\n');
        return true;
      } else {
        console.log('⚠️  Unexpected error:', error.message);
        console.log('Code:', error.code);
        return false;
      }
    }

    console.log('✅ MIGRATION SUCCESSFULLY APPLIED!\n');
    console.log('New columns detected:');
    console.log('  ✓ certification_type');
    console.log('  ✓ certification_number');
    console.log('  ✓ certification_authority');
    console.log('  ✓ certification_region');
    console.log('  ✓ certification_expiry_date\n');

    if (data && data.length > 0) {
      console.log('📊 Sample mechanic record:');
      console.log(JSON.stringify(data[0], null, 2));
      console.log();
    } else {
      console.log('📊 Mechanics table is currently empty\n');
    }

    console.log('==========================================');
    console.log('✅ PHASE 1 VERIFICATION COMPLETE');
    console.log('==========================================\n');

    return true;

  } catch (err) {
    console.error('❌ Error during verification:', err.message);
    return false;
  }
}

main()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
