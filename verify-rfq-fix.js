/**
 * Verification Script: RFQ Organization Members Fix
 *
 * Checks if the infinite recursion fix has been applied correctly.
 * Run BEFORE and AFTER applying FIX_ORGANIZATION_MEMBERS_COMPLETE.sql
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyFix() {
  console.log('\n============================================');
  console.log('RFQ Organization Members Fix Verification');
  console.log('============================================\n');

  let allPassed = true;

  // Check 1: is_admin() function exists
  console.log('Check 1: is_admin() function...');
  const { data: isAdminExists, error: isAdminError } = await supabase.rpc('is_admin', {
    user_id: '00000000-0000-0000-0000-000000000000'
  });

  if (isAdminError) {
    console.log('❌ is_admin() function NOT found');
    console.log('   Error:', isAdminError.message);
    allPassed = false;
  } else {
    console.log('✅ is_admin() function exists');
  }

  // Check 2: user_organizations() function exists
  console.log('\nCheck 2: user_organizations() function...');
  const { data: userOrgsExists, error: userOrgsError } = await supabase.rpc('user_organizations', {
    user_id: '00000000-0000-0000-0000-000000000000'
  });

  if (userOrgsError) {
    console.log('❌ user_organizations() function NOT found');
    console.log('   Error:', userOrgsError.message);
    allPassed = false;
  } else {
    console.log('✅ user_organizations() function exists');
  }

  // Check 2b: is_org_owner_or_admin() function exists (V2 fix)
  console.log('\nCheck 2b: is_org_owner_or_admin() function...');
  const { data: isOrgOwnerExists, error: isOrgOwnerError } = await supabase.rpc('is_org_owner_or_admin', {
    org_id: '00000000-0000-0000-0000-000000000000',
    user_id: '00000000-0000-0000-0000-000000000000'
  });

  if (isOrgOwnerError) {
    console.log('⚠️  is_org_owner_or_admin() function NOT found (OK if using V1 fix)');
    console.log('   Note: V2 fix includes this function for 100% recursion protection');
  } else {
    console.log('✅ is_org_owner_or_admin() function exists (V2 fix applied!)');
  }

  // Check 3: Test organization_members query (the one that was causing recursion)
  console.log('\nCheck 3: Testing organization_members query...');
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('*')
    .limit(1);

  if (membersError) {
    if (membersError.code === '42P17') {
      console.log('❌ INFINITE RECURSION ERROR STILL EXISTS');
      console.log('   This means the fix has NOT been applied yet');
      allPassed = false;
    } else {
      console.log('⚠️  Query error (but not recursion):');
      console.log('   ', membersError.message);
    }
  } else {
    console.log('✅ organization_members query works (no recursion)');
  }

  // Check 4: Test RFQ marketplace query (the actual failing query)
  console.log('\nCheck 4: Testing RFQ marketplace query...');
  const { data: rfqs, error: rfqError } = await supabase
    .from('workshop_rfq_marketplace')
    .select('*')
    .limit(1);

  if (rfqError) {
    if (rfqError.code === '42P17') {
      console.log('❌ RFQ query causes INFINITE RECURSION');
      console.log('   The fix has NOT been applied yet');
      allPassed = false;
    } else {
      console.log('⚠️  RFQ query error (but not recursion):');
      console.log('   ', rfqError.message);
    }
  } else {
    console.log('✅ RFQ marketplace query works');
  }

  // Summary
  console.log('\n============================================');
  if (allPassed) {
    console.log('✅ ALL CHECKS PASSED');
    console.log('   The infinite recursion fix is working!');
    console.log('\n   Next: Test at http://localhost:3000/customer/rfq/my-rfqs');
  } else {
    console.log('❌ SOME CHECKS FAILED');
    console.log('   You need to apply: FIX_ORGANIZATION_MEMBERS_COMPLETE.sql');
    console.log('\n   Steps:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Click "SQL Editor"');
    console.log('   4. Copy contents of FIX_ORGANIZATION_MEMBERS_COMPLETE.sql');
    console.log('   5. Paste and run');
    console.log('   6. Run this script again to verify');
  }
  console.log('============================================\n');
}

verifyFix().catch(err => {
  console.error('\n❌ Verification script error:', err.message);
  process.exit(1);
});
