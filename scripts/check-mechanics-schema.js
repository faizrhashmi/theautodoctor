const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get a sample mechanic to see all available columns
  const { data, error } = await supabase
    .from('mechanics')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.log('No mechanics found, trying to get schema another way...');
    // Try inserting minimal data to see what columns are required
    const { data: testData, error: testError } = await supabase
      .from('mechanics')
      .insert({
        email: 'test-schema-check@test.com',
        name: 'Test',
        password_hash: 'test'
      })
      .select();

    if (testError) {
      console.log('Error:', testError);
    } else {
      console.log('Available columns from test insert:');
      console.log(Object.keys(testData[0]));

      // Clean up
      await supabase
        .from('mechanics')
        .delete()
        .eq('email', 'test-schema-check@test.com');
    }
  } else {
    console.log('Available columns in mechanics table:');
    console.log(Object.keys(data));
  }
}

checkSchema();
