const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkActiveSessions() {
  // Check for any sessions in waiting or live status
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .in('status', ['waiting', 'live'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Active sessions (waiting or live):');
  console.log(JSON.stringify(data, null, 2));
  console.log('\nCount:', data?.length || 0);
}

checkActiveSessions();
