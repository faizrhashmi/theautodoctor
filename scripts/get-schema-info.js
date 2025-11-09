const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qtkouemogsymqrzkysar.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getSchemaInfo() {
  console.log('Fetching mechanics table schema...\n');

  // Get actual mechanics table structure by trying to fetch one record
  const { data, error } = await supabase
    .from('mechanics')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Mechanics table columns:');
    console.log(Object.keys(data[0]));
  } else {
    console.log('No mechanics found, checking organizations...');

    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);

    if (orgData && orgData.length > 0) {
      console.log('\nOrganizations table columns:');
      console.log(Object.keys(orgData[0]));
    }
  }
}

getSchemaInfo();
