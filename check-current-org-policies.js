/**
 * Check Current Organization Members Policies
 * Shows what policies currently exist and their logic
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
  console.log('Current organization_members RLS Policies');
  console.log('============================================\n');

  // Query pg_policies to see current policies
  const { data, error } = await supabase.rpc('exec_pg_query', {
    query: `
      SELECT
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'organization_members'
      ORDER BY policyname;
    `
  });

  if (error) {
    console.log('Note: Cannot query pg_policies via API (expected)');
    console.log('Using alternative method...\n');

    // Try to infer from actual queries
    console.log('Testing current access patterns:\n');

    // Test 1: Can service role read organization_members?
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('*')
      .limit(1);

    if (membersError) {
      console.log('❌ Service role CANNOT read organization_members');
      console.log('   Error:', membersError.message);
    } else {
      console.log('✅ Service role CAN read organization_members');
      console.log('   Current member count:', members?.length || 0);
    }

    // Test 2: Check if policies reference organization_members recursively
    console.log('\n⚠️  Cannot determine exact policy logic via API');
    console.log('   Need to check Supabase Dashboard → Database → Policies');
  } else {
    console.log('Current Policies:\n');
    data.forEach(policy => {
      console.log(`Policy: ${policy.policyname}`);
      console.log(`  Command: ${policy.cmd}`);
      console.log(`  USING: ${policy.qual || 'N/A'}`);
      console.log(`  WITH CHECK: ${policy.with_check || 'N/A'}`);
      console.log('');
    });
  }

  console.log('============================================\n');
}

checkPolicies().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
