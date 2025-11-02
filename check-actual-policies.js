/**
 * Check ACTUAL RLS policies on organization_members table
 * to see if they were updated or still have old logic
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

async function checkPolicies() {
  console.log('\n============================================');
  console.log('Checking ACTUAL organization_members Policies');
  console.log('============================================\n');

  // We can't query pg_policies directly via Supabase client
  // But we can test if policies are working correctly

  console.log('Testing policy behavior:\n');

  // Test 1: Try to query organization_members with a fake user ID
  console.log('Test 1: Service role can query organization_members');
  const { data: testData, error: testError } = await supabase
    .from('organization_members')
    .select('*')
    .limit(1);

  if (testError) {
    console.log('❌ Service role CANNOT query (unexpected)');
    console.log('   Error:', testError.message);
  } else {
    console.log('✅ Service role CAN query organization_members');
  }

  // Test 2: Check if workshop_rfq_marketplace exists
  console.log('\nTest 2: Check workshop_rfq_marketplace table');
  const { data: rfqData, error: rfqError } = await supabase
    .from('workshop_rfq_marketplace')
    .select('id')
    .limit(1);

  if (rfqError) {
    console.log('❌ Error querying workshop_rfq_marketplace');
    console.log('   Error:', rfqError.message);
    if (rfqError.code === '42P17') {
      console.log('   ⚠️  RECURSION ERROR FOUND!');
    }
  } else {
    console.log('✅ workshop_rfq_marketplace query works');
  }

  // Test 3: Check workshop_roles table (might be in the chain)
  console.log('\nTest 3: Check workshop_roles table');
  const { data: rolesData, error: rolesError } = await supabase
    .from('workshop_roles')
    .select('id')
    .limit(1);

  if (rolesError) {
    console.log('❌ Error querying workshop_roles');
    console.log('   Error:', rolesError.message);
    if (rolesError.code === '42P17') {
      console.log('   ⚠️  RECURSION ERROR IN workshop_roles!');
    }
  } else {
    console.log('✅ workshop_roles query works');
  }

  console.log('\n============================================');
  console.log('Next Step: Check Supabase Dashboard');
  console.log('============================================\n');
  console.log('Go to: https://supabase.com/dashboard');
  console.log('Your project → Database → Policies');
  console.log('Find: organization_members table');
  console.log('Check: Do policies use is_org_owner_or_admin() function?');
  console.log('\nLook for policy: "Organization owners can manage members"');
  console.log('Should contain: is_org_owner_or_admin(organization_id, auth.uid())');
  console.log('Should NOT contain: EXISTS (SELECT 1 FROM organization_members');
  console.log('\n============================================\n');
}

checkPolicies().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
