const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSessions() {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('=== RECENT SESSIONS ===');
  sessions?.forEach(s => {
    console.log('ID:', s.id);
    console.log('Type:', s.type);
    console.log('Status:', s.status);
    console.log('Customer:', s.customer_user_id);
    console.log('Mechanic:', s.mechanic_id || 'NULL');
    console.log('Created:', s.created_at);
    console.log('---');
  });

  const { data: requests } = await supabase
    .from('session_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n=== RECENT REQUESTS ===');
  requests?.forEach(r => {
    console.log('ID:', r.id);
    console.log('Status:', r.status);
    console.log('Plan:', r.plan_code);
    console.log('Mechanic:', r.mechanic_id || 'NULL');
    console.log('Created:', r.created_at);
    console.log('---');
  });
}

checkSessions().catch(console.error);
