import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMechanics() {
  console.log('\n=== Checking Mechanic Accounts ===\n');

  const { data, error } = await supabase
    .from('mechanics')
    .select('id, email, account_type, password_hash')
    .ilike('email', 'mech%@test.com')
    .order('email');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No mechanic accounts found matching mech%@test.com');
    console.log('\nSearching for ANY mechanics...');

    const { data: allMechanics } = await supabase
      .from('mechanics')
      .select('id, email, account_type')
      .limit(5);

    if (allMechanics && allMechanics.length > 0) {
      console.log(`\nFound ${allMechanics.length} mechanics (showing first 5):`);
      allMechanics.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.email} (${m.account_type})`);
      });
    } else {
      console.log('❌ No mechanics found in database at all');
    }
    return;
  }

  console.log(`Found ${data.length} matching mechanic(s):\n`);

  data.forEach((mech, i) => {
    console.log(`${i + 1}. Email: ${mech.email}`);
    console.log(`   Account Type: ${mech.account_type}`);
    console.log(`   Has Password: ${mech.password_hash ? '✅ YES' : '❌ NO'}`);
    console.log(`   ID: ${mech.id}`);
    console.log('');
  });
}

checkMechanics()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
