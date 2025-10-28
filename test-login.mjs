import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple password hash for testing (matches common bcrypt-like patterns)
function testPassword(password, hash) {
  // Just check if hash exists for now
  return !!hash;
}

async function testLogin(email, password) {
  console.log(`\n=== Testing Login for ${email} ===\n`);

  const { data: mech, error } = await supabase
    .from('mechanics')
    .select('id, email, password_hash, account_type')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.log(`❌ Database error: ${error.message}`);
    return;
  }

  if (!mech) {
    console.log(`❌ No mechanic found with email: ${email}`);
    console.log(`\nDid you mean one of these?`);
    const { data: similar } = await supabase
      .from('mechanics')
      .select('email')
      .or(`email.ilike.${email.substring(0, 4)}%`)
      .limit(5);

    if (similar) {
      similar.forEach(m => console.log(`  - ${m.email}`));
    }
    return;
  }

  console.log(`✅ Mechanic found!`);
  console.log(`   ID: ${mech.id}`);
  console.log(`   Account Type: ${mech.account_type}`);
  console.log(`   Has Password Hash: ${mech.password_hash ? 'YES' : 'NO'}`);

  if (mech.password_hash) {
    console.log(`\n⚠️  Password hash exists. Testing actual login via API...`);

    // Test actual login
    try {
      const response = await fetch('http://localhost:3000/api/mechanics/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Login SUCCESSFUL!`);
      } else {
        console.log(`❌ Login FAILED: ${data.error || 'Unknown error'}`);
        console.log(`   Status: ${response.status}`);
      }
    } catch (err) {
      console.log(`❌ Could not connect to API: ${err.message}`);
      console.log(`   Make sure dev server is running on http://localhost:3000`);
    }
  } else {
    console.log(`\n❌ No password hash set for this account!`);
  }
}

// Test the accounts the user mentioned
console.log('Testing mechanic logins...\n');

await testLogin('mech1@test.com', '12345678');
await testLogin('mech@test.com', '12345678');
await testLogin('mech2@test.com', '12345678');

console.log('\n=== Testing Complete ===\n');
