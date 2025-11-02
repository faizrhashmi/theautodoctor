/**
 * Feature Flags Table Discovery
 * Evidence for Phase 1: ENABLE_CUSTOMER_RFQ flag
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function discoverFeatureFlags() {
  console.log('============================================');
  console.log('Feature Flags Table Discovery');
  console.log('============================================\n');

  // Get schema
  console.log('1. TABLE SCHEMA\n');
  const { data: row } = await supabase
    .from('feature_flags')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (row) {
    console.log('Columns:');
    Object.keys(row).sort().forEach(col => {
      const value = row[col];
      const type = typeof value;
      console.log(`  - ${col}: ${type}`);
    });
  }
  console.log('');

  // Get existing flags
  console.log('2. EXISTING FLAGS\n');
  const { data: flags } = await supabase
    .from('feature_flags')
    .select('flag_key, is_enabled, description')
    .order('flag_key');

  flags?.forEach(f => {
    console.log(`  - ${f.flag_key}: ${f.is_enabled}`);
    console.log(`    Description: ${f.description || 'N/A'}`);
  });
  console.log('');

  // Check if ENABLE_CUSTOMER_RFQ exists
  console.log('3. ENABLE_CUSTOMER_RFQ FLAG CHECK\n');
  const { data: customerRfqFlag } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('flag_key', 'ENABLE_CUSTOMER_RFQ')
    .maybeSingle();

  if (customerRfqFlag) {
    console.log('✅ ENABLE_CUSTOMER_RFQ already exists');
    console.log(`   is_enabled: ${customerRfqFlag.is_enabled}`);
    console.log(`   description: ${customerRfqFlag.description}`);
  } else {
    console.log('❌ ENABLE_CUSTOMER_RFQ does not exist (needs migration)');
  }

  console.log('');
  console.log('============================================');
  console.log('Discovery complete!');
  console.log('============================================');
}

discoverFeatureFlags().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
