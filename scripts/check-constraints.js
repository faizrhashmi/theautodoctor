const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkConstraints() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get constraint details using raw SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'public.mechanics'::regclass
      AND conname LIKE '%account_type%';
    `
  });

  if (error) {
    console.log('RPC exec_sql not available, trying alternative...');

    // Try to create a mechanic with account_type 'independent' first
    const { data: testMech, error: testError } = await supabase
      .from('mechanics')
      .insert({
        email: 'test-independent@test.com',
        name: 'Test Independent',
        account_type: 'independent'
      })
      .select();

    if (testError) {
      console.log('Error with independent:', testError);
    } else {
      console.log('✅ Independent account type works');
      await supabase.from('mechanics').delete().eq('email', 'test-independent@test.com');
    }

    // Try workshop
    const { data: testMech2, error: testError2 } = await supabase
      .from('mechanics')
      .insert({
        email: 'test-workshop@test.com',
        name: 'Test Workshop',
        account_type: 'workshop'
      })
      .select();

    if (testError2) {
      console.log('❌ Error with workshop:', testError2);
    } else {
      console.log('✅ Workshop account type works');
      await supabase.from('mechanics').delete().eq('email', 'test-workshop@test.com');
    }
  } else {
    console.log('Constraint details:', data);
  }
}

checkConstraints();
