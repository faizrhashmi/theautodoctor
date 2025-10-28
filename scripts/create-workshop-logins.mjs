// Create workshop login credentials
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const workshops = [
  {
    id: '98aeac24-8fe8-45d9-9838-a632bfcea85a',
    name: 'Premium Auto Care',
    email: 'contact@premiumauto.com'
  },
  {
    id: '78db0e30-5e16-4092-a6fd-ba9bd31b6b84',
    name: 'Quick Fix Garage',
    email: 'info@quickfix.com'
  },
  {
    id: '2ec0070c-cabf-425c-becd-5e4bd8c1f913',
    name: 'Expert Motors',
    email: 'service@expertmotors.com'
  }
];

const password = '12345678';

async function createWorkshopLogins() {
  console.log('🔐 Creating workshop login credentials...\n');

  for (const workshop of workshops) {
    try {
      console.log(`\n📝 Processing: ${workshop.name}`);
      console.log(`   Email: ${workshop.email}`);

      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const userExists = existingUser?.users?.find(u => u.email === workshop.email);

      if (userExists) {
        console.log('   ⚠️  User already exists, updating password...');

        // Update password
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          userExists.id,
          { password: password }
        );

        if (updateError) {
          console.log(`   ❌ Error updating password: ${updateError.message}`);
        } else {
          console.log('   ✅ Password updated successfully');
        }
      } else {
        console.log('   Creating new auth user...');

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: workshop.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            name: workshop.name,
            role: 'workshop'
          }
        });

        if (authError) {
          console.log(`   ❌ Error creating auth user: ${authError.message}`);
          continue;
        }

        console.log(`   ✅ Auth user created: ${authData.user.id}`);

        // Create profile entry
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: workshop.email,
            name: workshop.name,
            role: 'workshop',
            created_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (profileError) {
          console.log(`   ⚠️  Profile error: ${profileError.message}`);
        } else {
          console.log('   ✅ Profile created');
        }

        // Link organization to auth user
        const { error: orgUpdateError } = await supabase
          .from('organizations')
          .update({
            owner_id: authData.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', workshop.id);

        if (orgUpdateError) {
          console.log(`   ⚠️  Organization link error: ${orgUpdateError.message}`);
        } else {
          console.log('   ✅ Organization linked to auth user');
        }
      }

      console.log(`   ✅ Complete: ${workshop.name}`);

    } catch (err) {
      console.error(`   ❌ Error processing ${workshop.name}:`, err.message);
    }
  }

  console.log('\n\n✅ Workshop login credentials created!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 LOGIN INFORMATION');
  console.log('═══════════════════════════════════════════════════════\n');

  workshops.forEach((w, i) => {
    console.log(`${i + 1}. ${w.name}`);
    console.log(`   Email:    ${w.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   URL:      http://localhost:3000/workshop/login\n`);
  });

  console.log('═══════════════════════════════════════════════════════');
}

createWorkshopLogins().catch(console.error);
