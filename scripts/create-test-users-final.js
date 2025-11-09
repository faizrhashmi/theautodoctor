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
  console.log('🚀 Creating Phase 1 Test Users...\n');

  try {
    // Step 1: Create auth users using Admin API
    console.log('Step 1: Creating auth users...');

    const authUsers = [
      {
        email: 'virtual.test@theautodoctor.com',
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: { name: 'Virtual Test Mechanic' }
      },
      {
        email: 'employee.test@theautodoctor.com',
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: { name: 'Workshop Employee Test' }
      },
      {
        email: 'independent.test@theautodoctor.com',
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: { name: 'Independent Workshop Owner Test' }
      }
    ];

    const createdUserIds = {};

    // Get all existing users first
    const { data: existingUsers } = await supabase.auth.admin.listUsers();

    for (const user of authUsers) {
      const existing = existingUsers.users.find(u => u.email === user.email);

      if (existing) {
        console.log(`  ⚠️  ${user.email} already exists, using existing user`);
        createdUserIds[user.email] = existing.id;
      } else {
        const { data, error } = await supabase.auth.admin.createUser(user);
        if (error) {
          console.error(`  ❌ Error creating ${user.email}:`, error.message);
        } else {
          console.log(`  ✅ Created auth user: ${user.email}`);
          createdUserIds[user.email] = data.user.id;
        }
      }
    }

    // Step 2: Create workshop organizations
    console.log('\nStep 2: Creating workshop organizations...');

    const workshops = [
      {
        id: '00000000-0000-0000-0000-000000000010',
        name: 'Test Workshop Ltd',
        slug: 'test-workshop-ltd',
        organization_type: 'workshop',
        address: '123 Test Street',
        city: 'Toronto',
        province: 'ON',
        postal_code: 'M5V3A8',
        phone: '+14165551234',
        email: 'workshop@theautodoctor.com',
        status: 'active'
      },
      {
        id: '00000000-0000-0000-0000-000000000011',
        name: 'Independent Auto Shop',
        slug: 'independent-auto-shop',
        organization_type: 'workshop',
        address: '456 Independent Ave',
        city: 'Toronto',
        province: 'ON',
        postal_code: 'M4B1B3',
        phone: '+14165555678',
        email: 'independent@theautodoctor.com',
        status: 'active'
      }
    ];

    for (const workshop of workshops) {
      const { error } = await supabase.from('organizations').upsert(workshop);
      if (error) {
        console.log(`  ⚠️  ${workshop.name}: ${error.message}`);
      } else {
        console.log(`  ✅ ${workshop.name}`);
      }
    }

    // Step 3: Create mechanic profiles
    console.log('\nStep 3: Creating mechanic profiles...');

    const mechanics = [
      {
        user_id: createdUserIds['virtual.test@theautodoctor.com'],
        email: 'virtual.test@theautodoctor.com',
        name: 'Virtual Test Mechanic',
        phone: '+14165551111',
        province: 'ON',
        city: 'Toronto',
        postal_code: 'M5V3A8',
        years_of_experience: 8,
        specializations: ['Engine Diagnostics', 'Electrical Systems', 'Transmission'],
        certifications: ['ASE Certified', 'Red Seal'],
        languages: ['English', 'French'],
        hourly_rate: 75.00,
        service_tier: 'premium',
        account_type: null,
        workshop_id: null
      },
      {
        user_id: createdUserIds['employee.test@theautodoctor.com'],
        email: 'employee.test@theautodoctor.com',
        name: 'Workshop Employee Test',
        phone: '+14165552222',
        province: 'ON',
        city: 'Toronto',
        postal_code: 'M5V3A8',
        years_of_experience: 5,
        specializations: ['Brakes', 'Suspension', 'Oil Changes'],
        certifications: ['ASE Certified'],
        languages: ['English'],
        hourly_rate: 60.00,
        service_tier: 'standard',
        account_type: 'workshop',
        workshop_id: '00000000-0000-0000-0000-000000000010'
      },
      {
        user_id: createdUserIds['independent.test@theautodoctor.com'],
        email: 'independent.test@theautodoctor.com',
        name: 'Independent Workshop Owner Test',
        phone: '+14165553333',
        province: 'ON',
        city: 'Toronto',
        postal_code: 'M4B1B3',
        years_of_experience: 12,
        specializations: ['Engine Repair', 'Diagnostics', 'Performance Tuning'],
        certifications: ['Red Seal', 'ASE Master Certified'],
        languages: ['English', 'Spanish'],
        hourly_rate: 85.00,
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
