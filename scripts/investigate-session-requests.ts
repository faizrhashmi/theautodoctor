import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateSessionRequests() {
  console.log('🔍 INVESTIGATING SESSION_REQUESTS DISCREPANCY');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('🌐 Connection Info:');
  console.log(`  URL: ${supabaseUrl}`);
  console.log(`  Using: SERVICE_ROLE_KEY\n`);

  // Test 1: Simple count without any filters
  console.log('TEST 1: Simple count (no filters, no joins)');
  console.log('─────────────────────────────────────────────────────');
  const { count: simpleCount, error: simpleError } = await supabase
    .from('session_requests')
    .select('*', { count: 'exact', head: true });

  if (simpleError) {
    console.log(`  ❌ Error: ${simpleError.message}`);
    console.log(`  Code: ${simpleError.code}`);
    console.log(`  Details:`, simpleError.details);
    console.log(`  Hint: ${simpleError.hint}\n`);
  } else {
    console.log(`  ✅ Count: ${simpleCount} session requests\n`);
  }

  // Test 2: Get first 5 records without joins
  console.log('TEST 2: Fetch first 5 records (no joins)');
  console.log('─────────────────────────────────────────────────────');
  const { data: simpleData, error: simpleDataError } = await supabase
    .from('session_requests')
    .select('*')
    .limit(5);

  if (simpleDataError) {
    console.log(`  ❌ Error: ${simpleDataError.message}\n`);
  } else {
    console.log(`  ✅ Retrieved: ${simpleData?.length || 0} records`);
    if (simpleData && simpleData.length > 0) {
      console.log(`  📋 Sample columns:`, Object.keys(simpleData[0]));
      console.log(`  📋 First record ID: ${simpleData[0].id}`);
      console.log(`  📋 First record customer_id: ${simpleData[0].customer_id}`);
      console.log(`  📋 First record mechanic_id: ${simpleData[0].mechanic_id}`);
      console.log(`  📋 First record status: ${simpleData[0].status}\n`);
    }
  }

  // Test 3: Try with joins (like the audit script did)
  console.log('TEST 3: Fetch with joins (customer + mechanic)');
  console.log('─────────────────────────────────────────────────────');
  const { data: joinedData, error: joinedError, count: joinedCount } = await supabase
    .from('session_requests')
    .select(`
      *,
      customer:profiles!session_requests_customer_id_fkey (id, email, full_name),
      mechanic:mechanics!session_requests_mechanic_id_fkey (id, email, name)
    `, { count: 'exact' })
    .limit(5);

  if (joinedError) {
    console.log(`  ❌ Error: ${joinedError.message}`);
    console.log(`  Code: ${joinedError.code}`);
    console.log(`  Details:`, joinedError.details);
    console.log(`  Hint: ${joinedError.hint}\n`);
  } else {
    console.log(`  ✅ Count: ${joinedCount}`);
    console.log(`  ✅ Retrieved: ${joinedData?.length || 0} records`);
    if (joinedData && joinedData.length > 0) {
      console.log(`  📋 First record has customer:`, joinedData[0].customer);
      console.log(`  📋 First record has mechanic:`, joinedData[0].mechanic);
    }
    console.log('');
  }

  // Test 4: Skip RLS check
  console.log('TEST 4: Check if RLS is enabled');
  console.log('─────────────────────────────────────────────────────');
  console.log(`  ⚠️ Skipping RLS check (requires direct SQL access)\n`);

  // Test 5: Try to get table schema info
  console.log('TEST 5: Get session_requests table info');
  console.log('─────────────────────────────────────────────────────');

  // Skip SQL query - not needed for investigation
  console.log(`  ⚠️ Skipping direct SQL query (not available via service role)\n`);

  // Test 6: Count by status
  console.log('TEST 6: Count by status');
  console.log('─────────────────────────────────────────────────────');
  const { data: statusData, error: statusError } = await supabase
    .from('session_requests')
    .select('status');

  if (statusError) {
    console.log(`  ❌ Error: ${statusError.message}\n`);
  } else {
    const statusCounts = statusData?.reduce((acc: any, row: any) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {}) || {};
    console.log(`  ✅ Total records: ${statusData?.length || 0}`);
    console.log(`  📊 By status:`, statusCounts);
    console.log('');
  }

  // Test 7: Get all records to see full dataset
  console.log('TEST 7: Get ALL session_requests (no limit)');
  console.log('─────────────────────────────────────────────────────');
  const { data: allData, error: allError, count: allCount } = await supabase
    .from('session_requests')
    .select('id, customer_id, mechanic_id, status, session_type, created_at', { count: 'exact' });

  if (allError) {
    console.log(`  ❌ Error: ${allError.message}\n`);
  } else {
    console.log(`  ✅ Total count: ${allCount}`);
    console.log(`  ✅ Retrieved: ${allData?.length || 0} records`);

    if (allData && allData.length > 0) {
      // Show summary
      const withMechanic = allData.filter(s => s.mechanic_id !== null).length;
      const withoutMechanic = allData.filter(s => s.mechanic_id === null).length;

      console.log(`\n  📊 Summary:`);
      console.log(`     - With mechanic assigned: ${withMechanic}`);
      console.log(`     - Without mechanic: ${withoutMechanic}`);

      // Show first 10 IDs
      console.log(`\n  📋 First 10 session IDs:`);
      allData.slice(0, 10).forEach((s: any, i: number) => {
        console.log(`     ${i + 1}. ${s.id.substring(0, 8)}... (${s.status}, ${s.session_type || 'no type'})`);
      });

      if (allData.length > 10) {
        console.log(`     ... and ${allData.length - 10} more`);
      }
    }
    console.log('');
  }

  // Test 8: Compare with direct SQL count (if possible)
  console.log('TEST 8: Alternative count method');
  console.log('─────────────────────────────────────────────────────');
  const { count: headCount, error: headError } = await supabase
    .from('session_requests')
    .select('*', { count: 'exact', head: true });

  if (headError) {
    console.log(`  ❌ Error: ${headError.message}\n`);
  } else {
    console.log(`  ✅ HEAD count: ${headCount}\n`);
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('SUMMARY OF FINDINGS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Query Results:');
  console.log(`  - Test 1 (simple count): ${simpleCount ?? 'ERROR'}`);
  console.log(`  - Test 2 (fetch 5 records): ${simpleData?.length ?? 'ERROR'} records retrieved`);
  console.log(`  - Test 3 (with joins): ${joinedCount ?? 'ERROR'} count, ${joinedData?.length ?? 'ERROR'} retrieved`);
  console.log(`  - Test 6 (all with status): ${statusData?.length ?? 'ERROR'} records`);
  console.log(`  - Test 7 (all records): ${allCount ?? 'ERROR'} count, ${allData?.length ?? 'ERROR'} retrieved`);
  console.log(`  - Test 8 (HEAD method): ${headCount ?? 'ERROR'}`);

  console.log('\n📊 CONCLUSION:');

  if (simpleCount !== null && simpleCount > 0) {
    console.log(`  ✅ SESSION_REQUESTS TABLE HAS ${simpleCount} RECORDS`);
    console.log(`  ✅ This is the SOURCE OF TRUTH`);

    if (joinedCount !== simpleCount) {
      console.log(`\n  ⚠️ WARNING: Join query returned different count (${joinedCount})`);
      console.log(`     Possible causes:`);
      console.log(`     - Foreign key references are broken (customer_id or mechanic_id invalid)`);
      console.log(`     - RLS policies blocking the join`);
      console.log(`     - Join relationship names are incorrect`);
    }
  } else if (simpleCount === 0) {
    console.log(`  ⚠️ SESSION_REQUESTS TABLE IS EMPTY`);
    console.log(`  ⚠️ The "43 records" from schema discovery was likely an error`);
  } else {
    console.log(`  ❌ UNABLE TO QUERY SESSION_REQUESTS`);
    console.log(`  ❌ Check database permissions and RLS policies`);
  }

  return {
    simpleCount,
    simpleData,
    joinedCount,
    joinedData,
    allCount,
    allData,
  };
}

async function main() {
  try {
    await investigateSessionRequests();
  } catch (error) {
    console.error('\n❌ Investigation failed:', error);
    process.exit(1);
  }
}

main();
