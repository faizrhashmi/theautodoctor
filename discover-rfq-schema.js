/**
 * Schema Discovery for Customer RFQ Planning
 * Gathers evidence of existing tables/columns for plan document
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

async function discoverSchema() {
  console.log('============================================');
  console.log('Schema Discovery for Customer RFQ Plan');
  console.log('============================================\n');

  // Query 1 & 2: workshop_rfq_marketplace columns
  console.log('1. workshop_rfq_marketplace TABLE\n');
  const { data: marketplaceRow, error: marketplaceError } = await supabase
    .from('workshop_rfq_marketplace')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (marketplaceError) {
    console.log(`Error: ${marketplaceError.message}`);
  } else if (marketplaceRow) {
    console.log('✅ Table exists. Columns (from sample row):');
    Object.keys(marketplaceRow).sort().forEach(col => {
      console.log(`  - ${col}`);
    });
  } else {
    console.log('✅ Table exists (empty)');
  }
  console.log('');

  // Query 2: workshop_rfq_bids columns
  console.log('2. workshop_rfq_bids TABLE\n');
  const { data: bidsRow } = await supabase
    .from('workshop_rfq_bids')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (bidsRow) {
    console.log('✅ Table exists. Columns:');
    Object.keys(bidsRow).sort().forEach(col => {
      console.log(`  - ${col}`);
    });
  } else {
    console.log('✅ Table exists (empty)');
  }
  console.log('');

  // Query 3: Check vehicles table
  console.log('3. vehicles TABLE\n');
  const { data: vehiclesRow } = await supabase
    .from('vehicles')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (vehiclesRow) {
    console.log('✅ Table exists. Columns:');
    Object.keys(vehiclesRow).sort().forEach(col => {
      console.log(`  - ${col}`);
    });
  } else {
    console.log('✅ Table exists (empty or no rows)');
  }
  console.log('');

  // Query 4: Check profiles table (for customer info)
  console.log('4. profiles TABLE\n');
  const { data: profilesRow } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (profilesRow) {
    console.log('✅ Table exists. Columns:');
    Object.keys(profilesRow).sort().forEach(col => {
      console.log(`  - ${col}`);
    });
  }
  console.log('');

  // Query 5: Check diagnostic_sessions table
  console.log('5. diagnostic_sessions TABLE\n');
  const { data: diagRow } = await supabase
    .from('diagnostic_sessions')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (diagRow) {
    console.log('✅ Table exists. Columns:');
    Object.keys(diagRow).sort().forEach(col => {
      console.log(`  - ${col}`);
    });
  } else {
    console.log('✅ Table exists (empty or no rows)');
  }
  console.log('');

  // Query 6: Check intakes table (for prefill)
  console.log('6. intakes TABLE\n');
  const { data: intakesRow } = await supabase
    .from('intakes')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (intakesRow) {
    console.log('✅ Table exists. Columns:');
    Object.keys(intakesRow).sort().forEach(col => {
      console.log(`  - ${col}`);
    });
  } else {
    console.log('✅ Table exists (empty or no rows)');
  }
  console.log('');

  // Query 7: Check feature_flags table
  console.log('7. feature_flags TABLE\n');
  const { data: flags } = await supabase
    .from('feature_flags')
    .select('flag_key, is_enabled')
    .in('flag_key', ['ENABLE_WORKSHOP_RFQ', 'ENABLE_CUSTOMER_RFQ']);

  console.log('Current flags:');
  flags?.forEach(f => {
    console.log(`  - ${f.flag_key}: ${f.is_enabled}`);
  });
  console.log('');

  console.log('============================================');
  console.log('Schema discovery complete!');
  console.log('============================================\n');
}

discoverSchema().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
