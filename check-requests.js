// Check what session requests actually exist
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qtkouemogsymqrzkysar.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0a291ZW1vZ3N5bXFyemt5c2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcxODI5NSwiZXhwIjoyMDc2Mjk0Mjk1fQ.EgxZDU9zBO7XhyGhNFIS-SyQL7BFl-ixZeP_4yhbs6A';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkRequests() {
  console.log('\n🔍 Checking ALL session requests in database...\n');

  const { data: allRequests, error } = await supabase
    .from('session_requests')
    .select('id, customer_name, customer_email, status, created_at, mechanic_id, session_type')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!allRequests || allRequests.length === 0) {
    console.log('No requests found at all!');
    return;
  }

  console.log(`Found ${allRequests.length} requests:\n`);

  allRequests.forEach((req, i) => {
    const age = Math.floor((Date.now() - new Date(req.created_at).getTime()) / 60000);
    const createdDate = new Date(req.created_at).toLocaleString();

    console.log(`${i + 1}. ${req.customer_name || req.customer_email || 'Unknown'}`);
    console.log(`   ID: ${req.id}`);
    console.log(`   Status: ${req.status}`);
    console.log(`   Type: ${req.session_type}`);
    console.log(`   Created: ${createdDate} (${age} min ago)`);
    console.log(`   Mechanic: ${req.mechanic_id || 'None'}`);
    console.log('');
  });

  // Now show only pending
  const pendingRequests = allRequests.filter(r => r.status === 'pending');
  console.log(`\n📋 PENDING requests: ${pendingRequests.length}`);

  if (pendingRequests.length > 0) {
    console.log('\nPending request IDs:');
    pendingRequests.forEach(req => {
      console.log(`  - ${req.id} (${req.customer_name || 'Unknown'})`);
    });
  }
}

checkRequests().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
