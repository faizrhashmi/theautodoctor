const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function discoverSchema() {
  console.log('Discovering actual database schema...\n');

  // Try common table names
  const tablesToCheck = [
    'profiles',
    'mechanics',
    'customers',
    'workshops',
    'mechanic_profiles',
    'customer_profiles',
    'workshop_profiles',
    'users',
    'organization_members',
    'workshop_roles',
    'customer_credits',
    'session_requests',
    'sessions'
  ];

  console.log('Checking which tables exist:\n');
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✅ ${table} - EXISTS`);
      } else {
        console.log(`❌ ${table} - NOT FOUND (${error.code})`);
      }
    } catch (err) {
      console.log(`❌ ${table} - ERROR: ${err.message}`);
    }
  }

  // Now get profiles structure
  console.log('\n\n' + '='.repeat(80));
  console.log('PROFILES TABLE STRUCTURE');
  console.log('='.repeat(80));

  const { data: profileSample } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profileSample && profileSample.length > 0) {
    console.log('\nColumns in profiles table:');
    Object.keys(profileSample[0]).forEach(col => {
      console.log(`  - ${col}: ${typeof profileSample[0][col]} (${profileSample[0][col] === null ? 'null' : 'has value'})`);
    });
  }
}

discoverSchema().catch(console.error);
