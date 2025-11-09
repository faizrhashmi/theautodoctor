const { createClient } = require('@supabase/supabase-js');

// Create Supabase admin client with service role
const supabase = createClient(
  'https://qtkouemogsymqrzkysar.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createTestUsers() {
  console.log('🚀 Creating Phase 1 Test Users (Minimal Fields)...\n');

  try {
    // Get all existing users first
    const { data: existingUsers } = await supabase.auth.admin.listUsers();

    const authEmails = [
      'virtual.test@theautodoctor.com',
      'employee.test@theautodoctor.com',
      'independent.test@theautodoctor.com'
    ];

    const userIds = {};
    for (const email of authEmails) {
      const existing = existingUsers.users.find(u => u.email === email);
      if (existing) {
        userIds[email] = existing.id;
        console.log(`✅ Found auth user: ${email}`);
      }
    }

    // Create workshops
    console.log('\nCreating workshops...');
    await supabase.from('organizations').upsert({
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Test Workshop Ltd',
      slug: 'test-workshop-ltd'
    });
    await supabase.from('organizations').upsert({
      id: '00000000-0000-0000-0000-000000000011',
      name: 'Independent Auto Shop',
      slug: 'independent-auto-shop'
    });
    console.log('✅ Workshops created\n');

    // Create mechanics with minimal fields
    console.log('Creating mechanics with minimal fields...');

    const mechanics = [
      {
        user_id: userIds['virtual.test@theautodoctor.com'],
        email: 'virtual.test@theautodoctor.com',
        name: 'Virtual Test Mechanic',
        service_tier: 'premium',
        account_type: null,
        workshop_id: null
      },
      {
        user_id: userIds['employee.test@theautodoctor.com'],
        email: 'employee.test@theautodoctor.com',
        name: 'Workshop Employee Test',
        service_tier: 'standard',
        account_type: 'workshop',
        workshop_id: '00000000-0000-0000-0000-000000000010'
      },
      {
        user_id: userIds['independent.test@theautodoctor.com'],
        email: 'independent.test@theautodoctor.com',
        name: 'Independent Workshop Owner Test',
        service_tier: 'premium',
        account_type: 'independent',
        workshop_id: '00000000-0000-0000-0000-000000000011'
      }
    ];

    for (const mechanic of mechanics) {
      if (!mechanic.user_id) {
        console.log(`  ❌ Skipping ${mechanic.email} - no user_id`);
        continue;
      }

      const { error } = await supabase.from('mechanics').upsert(mechanic, {
        onConflict: 'user_id'
      });

      if (error) {
        console.log(`  ⚠️  ${mechanic.email}: ${error.message}`);
      } else {
        const type = !mechanic.workshop_id ? 'VIRTUAL_ONLY ✅' :
                     mechanic.account_type === 'workshop' ? 'WORKSHOP_EMPLOYEE ❌' :
                     'INDEPENDENT_WORKSHOP ✅';
        console.log(`  ✅ ${mechanic.email} (${type})`);
      }
    }

    console.log('\n=== ✅ Test Users Created Successfully! ===\n');
    console.log('Login Credentials (all use password: Test1234!):\n');
    console.log('1. 🟢 Virtual-Only Mechanic:');
    console.log('   Email: virtual.test@theautodoctor.com');
    console.log('   Access: ✅ CAN access Earnings & Analytics\n');
    console.log('2. 🔴 Workshop Employee:');
    console.log('   Email: employee.test@theautodoctor.com');
    console.log('   Access: ❌ BLOCKED from Earnings & Analytics (403)\n');
    console.log('3. 🟢 Independent Workshop Owner:');
    console.log('   Email: independent.test@theautodoctor.com');
    console.log('   Access: ✅ CAN access Earnings & Analytics\n');
    console.log('🌐 Test at: http://localhost:3001/mechanic/login\n');

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    console.error(err);
  }
}

createTestUsers();
