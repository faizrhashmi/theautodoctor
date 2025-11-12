import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function discoverSchema() {
  console.log('🔍 Discovering actual database schema...\n');

  // Query information_schema to find all tables
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (error) {
    console.log('Cannot query information_schema, trying alternative method...\n');
  } else {
    console.log('📋 Tables found in public schema:');
    tables?.forEach((t: any) => console.log(`  - ${t.table_name}`));
    console.log('');
  }

  // Try to query mechanics table
  console.log('🔧 Checking mechanics table...');
  const { data: mechanicsData, error: mechanicsError, count: mechanicsCount } = await supabase
    .from('mechanics')
    .select('*', { count: 'exact' })
    .limit(5);

  if (mechanicsError) {
    console.log(`  ❌ Error: ${mechanicsError.message}`);
  } else {
    console.log(`  ✅ Found ${mechanicsCount} mechanics`);
    if (mechanicsData && mechanicsData.length > 0) {
      console.log(`  📋 Sample columns:`, Object.keys(mechanicsData[0]));
    }
  }
  console.log('');

  // Try to query organizations table
  console.log('🏢 Checking organizations table...');
  const { data: orgsData, error: orgsError, count: orgsCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact' })
    .limit(5);

  if (orgsError) {
    console.log(`  ❌ Error: ${orgsError.message}`);
  } else {
    console.log(`  ✅ Found ${orgsCount} organizations`);
    if (orgsData && orgsData.length > 0) {
      console.log(`  📋 Sample columns:`, Object.keys(orgsData[0]));
    }
  }
  console.log('');

  // Try profiles
  console.log('👤 Checking profiles table...');
  const { data: profilesData, error: profilesError, count: profilesCount } = await supabase
    .from('profiles')
    .select('role', { count: 'exact' });

  if (profilesError) {
    console.log(`  ❌ Error: ${profilesError.message}`);
  } else {
    console.log(`  ✅ Found ${profilesCount} profiles`);
    const roles = profilesData?.map((p: any) => p.role) || [];
    const roleCount = roles.reduce((acc: any, role: string) => {
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    console.log(`  📊 Roles:`, roleCount);
  }
  console.log('');

  // Check if mechanic_profiles exists
  console.log('🔧 Checking mechanic_profiles table (alternative)...');
  const { data: mpData, error: mpError, count: mpCount } = await supabase
    .from('mechanic_profiles')
    .select('*', { count: 'exact' })
    .limit(5);

  if (mpError) {
    console.log(`  ❌ Table doesn't exist or error: ${mpError.message}`);
  } else {
    console.log(`  ✅ Found ${mpCount} mechanic_profiles`);
  }
  console.log('');

  // Check RFQs
  console.log('📝 Checking rfqs table...');
  const { data: rfqsData, error: rfqsError, count: rfqsCount } = await supabase
    .from('rfqs')
    .select('*', { count: 'exact' })
    .limit(5);

  if (rfqsError) {
    console.log(`  ❌ Error: ${rfqsError.message}`);
  } else {
    console.log(`  ✅ Found ${rfqsCount} rfqs`);
  }
  console.log('');

  // Check quotes
  console.log('💰 Checking quotes table...');
  const { data: quotesData, error: quotesError, count: quotesCount } = await supabase
    .from('quotes')
    .select('*', { count: 'exact' })
    .limit(5);

  if (quotesError) {
    console.log(`  ❌ Error: ${quotesError.message}`);
  } else {
    console.log(`  ✅ Found ${quotesCount} quotes`);
  }
  console.log('');

  // Check session_requests
  console.log('📅 Checking session_requests table...');
  const { data: sessionsData, error: sessionsError, count: sessionsCount } = await supabase
    .from('session_requests')
    .select('*', { count: 'exact' })
    .limit(5);

  if (sessionsError) {
    console.log(`  ❌ Error: ${sessionsError.message}`);
  } else {
    console.log(`  ✅ Found ${sessionsCount} session_requests`);
  }
  console.log('');

  // Check workshop_appointments
  console.log('🏭 Checking workshop_appointments table...');
  const { data: waData, error: waError, count: waCount } = await supabase
    .from('workshop_appointments')
    .select('*', { count: 'exact' })
    .limit(5);

  if (waError) {
    console.log(`  ❌ Error: ${waError.message}`);
  } else {
    console.log(`  ✅ Found ${waCount} workshop_appointments`);
  }
  console.log('');

  return {
    mechanicsCount: mechanicsCount || 0,
    orgsCount: orgsCount || 0,
    profilesCount: profilesCount || 0,
    rfqsCount: rfqsCount || 0,
    quotesCount: quotesCount || 0,
    sessionsCount: sessionsCount || 0,
    waCount: waCount || 0,
    mechanicsData: mechanicsData || [],
    orgsData: orgsData || [],
  };
}

async function main() {
  try {
    const result = await discoverSchema();

    console.log('════════════════════════════════════════════════════════════');
    console.log('SCHEMA DISCOVERY COMPLETE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('Summary:');
    console.log(`  - Mechanics: ${result.mechanicsCount}`);
    console.log(`  - Organizations: ${result.orgsCount}`);
    console.log(`  - Profiles: ${result.profilesCount}`);
    console.log(`  - RFQs: ${result.rfqsCount}`);
    console.log(`  - Quotes: ${result.quotesCount}`);
    console.log(`  - Sessions: ${result.sessionsCount}`);
    console.log(`  - Workshop Appointments: ${result.waCount}`);
    console.log('════════════════════════════════════════════════════════════');

    // Save results
    const outputPath = path.join(process.cwd(), 'schema-discovery-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n✅ Results saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Discovery failed:', error);
    process.exit(1);
  }
}

main();
