// Cancel old session requests using Supabase client to trigger real-time events
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qtkouemogsymqrzkysar.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0a291ZW1vZ3N5bXFyemt5c2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcxODI5NSwiZXhwIjoyMDc2Mjk0Mjk1fQ.EgxZDU9zBO7XhyGhNFIS-SyQL7BFl-ixZeP_4yhbs6A';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function cancelOldRequests() {
  console.log('\n🔍 Finding old pending session requests...\n');

  // First, find all pending requests older than 30 minutes
  const { data: oldRequests, error: fetchError } = await supabase
    .from('session_requests')
    .select('id, customer_name, created_at, status, mechanic_id')
    .eq('status', 'pending')
    .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching requests:', fetchError);
    return;
  }

  if (!oldRequests || oldRequests.length === 0) {
    console.log('✓ No old pending requests found');

    // Check if there are ANY pending requests
    const { data: allPending } = await supabase
      .from('session_requests')
      .select('id, customer_name, created_at, status, mechanic_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allPending && allPending.length > 0) {
      console.log(`\nFound ${allPending.length} pending requests (not all are old):`);
      allPending.forEach((req, i) => {
        const age = Math.floor((Date.now() - new Date(req.created_at).getTime()) / 60000);
        console.log(`  ${i + 1}. ${req.customer_name || 'Unknown'} - ${req.id}`);
        console.log(`     Created: ${age} minutes ago`);
        console.log(`     Status: ${req.status}, Mechanic: ${req.mechanic_id || 'None'}`);
      });

      console.log('\n❓ Do you want to cancel ALL pending requests? (y/n)');
      console.log('   Press Ctrl+C to abort, or wait 10 seconds to cancel all...');

      await new Promise(resolve => setTimeout(resolve, 10000));

      console.log('\n🗑️ Cancelling ALL pending requests...');

      for (const req of allPending) {
        const { error: updateError } = await supabase
          .from('session_requests')
          .update({ status: 'cancelled' })
          .eq('id', req.id);

        if (updateError) {
          console.error(`❌ Failed to cancel ${req.id}:`, updateError.message);
        } else {
          console.log(`✓ Cancelled request from ${req.customer_name || 'Unknown'}`);
        }

        // Small delay between updates to ensure real-time events process
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return;
  }

  console.log(`Found ${oldRequests.length} old requests to cancel:\n`);

  oldRequests.forEach((req, i) => {
    const age = Math.floor((Date.now() - new Date(req.created_at).getTime()) / 60000);
    console.log(`  ${i + 1}. ${req.customer_name || 'Unknown'}`);
    console.log(`     ID: ${req.id}`);
    console.log(`     Age: ${age} minutes`);
    console.log(`     Mechanic: ${req.mechanic_id || 'None'}`);
  });

  console.log('\n🗑️ Cancelling these requests...\n');

  let successCount = 0;
  let failCount = 0;

  for (const req of oldRequests) {
    // Update using Supabase client - this WILL trigger real-time events
    const { error: updateError } = await supabase
      .from('session_requests')
      .update({ status: 'cancelled' })
      .eq('id', req.id);

    if (updateError) {
      console.error(`❌ Failed to cancel ${req.customer_name}:`, updateError.message);
      failCount++;
    } else {
      console.log(`✓ Cancelled request from ${req.customer_name || 'Unknown'}`);
      successCount++;
    }

    // Small delay between updates to ensure real-time events are processed
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✓ Successfully cancelled: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`\n✅ Done! The dashboard should update automatically via real-time events.`);
  console.log(`   If not, refresh the browser (Ctrl+Shift+R)`);
}

cancelOldRequests().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
