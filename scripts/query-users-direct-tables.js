const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryAllUsersDirect() {
  console.log('='.repeat(100));
  console.log('USERS IN THE DATABASE - COMPREHENSIVE AUDIT');
  console.log('='.repeat(100));

  // Get mechanics from mechanics table directly
  console.log('\n🔧 ALL MECHANICS (from mechanics table)');
  console.log('-'.repeat(100));
  const { data: mechanics, error: mechError } = await supabase
    .from('mechanics')
    .select('*')
    .order('created_at', { ascending: false });

  if (mechError) {
    console.error('Error:', mechError.message);
  } else {
    console.log(`Total: ${mechanics?.length || 0}`);
    if (mechanics && mechanics.length > 0) {
      console.log('\nColumns:', Object.keys(mechanics[0]).join(', '));
    }
  }

  // Get customers from customers table directly
  console.log('\n\n👥 ALL CUSTOMERS (from customers table)');
  console.log('-'.repeat(100));
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (custError) {
    console.error('Error:', custError.message);
  } else {
    console.log(`Total: ${customers?.length || 0}`);
    if (customers && customers.length > 0) {
      console.log('\nColumns:', Object.keys(customers[0]).join(', '));
    }
  }

  // Get workshops from workshops table directly
  console.log('\n\n🏢 ALL WORKSHOPS (from workshops table)');
  console.log('-'.repeat(100));
  const { data: workshops, error: workshopError } = await supabase
    .from('workshops')
    .select('*')
    .order('created_at', { ascending: false });

  if (workshopError) {
    console.error('Error:', workshopError.message);
  } else {
    console.log(`Total: ${workshops?.length || 0}`);
    if (workshops && workshops.length > 0) {
      console.log('\nColumns:', Object.keys(workshops[0]).join(', '));
    }
  }
}

queryAllUsersDirect().catch(console.error);
