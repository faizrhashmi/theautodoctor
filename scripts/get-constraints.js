const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qtkouemogsymqrzkysar.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getConstraints() {
  console.log('Checking existing mechanics for valid values...\n');

  const { data, error } = await supabase
    .from('mechanics')
    .select('service_tier, account_type, workshop_id')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample mechanics:');
  console.table(data);

  // Get unique values
  const serviceTiers = [...new Set(data.map(m => m.service_tier).filter(Boolean))];
  const accountTypes = [...new Set(data.map(m => m.account_type).filter(Boolean))];

  console.log('\nValid service_tier values:', serviceTiers);
  console.log('Valid account_type values:', accountTypes);
  console.log('Sample workshop_id:', data.find(m => m.workshop_id)?.workshop_id || 'none');
}

getConstraints();
