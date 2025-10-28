import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { randomBytes, scryptSync } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Password hashing function (matches src/lib/auth.ts)
const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derived}`;
}

async function resetPassword(mechanicId, email, newPassword) {
  console.log(`\n=== Resetting password for ${email} ===`);
  console.log(`Mechanic ID: ${mechanicId}`);

  const passwordHash = hashPassword(newPassword);
  console.log(`New password hash generated: ${passwordHash.substring(0, 20)}...`);

  const { error } = await supabase
    .from('mechanics')
    .update({ password_hash: passwordHash })
    .eq('id', mechanicId);

  if (error) {
    console.log(`❌ FAILED: ${error.message}`);
    return false;
  }

  console.log(`✅ SUCCESS: Password reset to "${newPassword}"`);
  return true;
}

async function testLogin(email, password) {
  console.log(`\n=== Testing login for ${email} ===`);

  try {
    const response = await fetch('http://localhost:3000/api/mechanics/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Login SUCCESSFUL!`);
      return true;
    } else {
      console.log(`❌ Login FAILED: ${data.error}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Connection error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║     MECHANIC PASSWORD RESET UTILITY               ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const newPassword = '12345678';
  console.log(`New password for all accounts: "${newPassword}"\n`);

  const mechanics = [
    {
      id: '5005f935-a5de-46f8-940c-3064a3609c72',
      email: 'mech@test.com'
    },
    {
      id: '8611ee8d-420d-4238-b092-3df99f224459',
      email: 'mech2@test.com'
    }
  ];

  // Reset passwords
  for (const mech of mechanics) {
    await resetPassword(mech.id, mech.email, newPassword);
  }

  console.log('\n\n╔════════════════════════════════════════════════════╗');
  console.log('║     TESTING LOGINS                                 ║');
  console.log('╚════════════════════════════════════════════════════╝');

  // Wait a second for database to update
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test logins
  for (const mech of mechanics) {
    await testLogin(mech.email, newPassword);
  }

  console.log('\n\n╔════════════════════════════════════════════════════╗');
  console.log('║     SUMMARY                                        ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  console.log('✅ Passwords have been reset!');
  console.log('\nYou can now login with:');
  console.log(`  - Email: mech@test.com (NOT mech1@test.com)`);
  console.log(`  - Password: ${newPassword}`);
  console.log('');
  console.log(`  - Email: mech2@test.com`);
  console.log(`  - Password: ${newPassword}`);
  console.log('\nNote: Use "mech@test.com" not "mech1@test.com"');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
