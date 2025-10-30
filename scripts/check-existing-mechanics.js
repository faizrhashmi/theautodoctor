const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkExisting() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get all mechanics
  const { data, error } = await supabase
    .from('mechanics')
    .select('id, name, email, account_type, workshop_id, service_tier, participation_mode, can_perform_physical_work')
    .limit(10);

  if (error) {
    console.log('Error:', error);
  } else {
    console.log(`Found ${data.length} mechanics:`);
    console.log(JSON.stringify(data, null, 2));

    if (data.length > 0) {
      console.log('\n✅ Example successful mechanic config:');
      console.log('account_type:', data[0].account_type);
      console.log('workshop_id:', data[0].workshop_id);
      console.log('service_tier:', data[0].service_tier);
      console.log('participation_mode:', data[0].participation_mode);
      console.log('can_perform_physical_work:', data[0].can_perform_physical_work);
    }
  }
}

checkExisting();
