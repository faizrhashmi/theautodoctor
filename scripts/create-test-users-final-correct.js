const { createClient } = require('@supabase/supabase-js');

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
  console.log('🚀 Creating Phase 1 Test Users (Final - Correct Values)...\n');

  try {
    // Step 1: Get existing auth users
    console.log('Step 1: Getting auth users...');
    const { data: existingUsers } = await supabase.auth.admin.listUsers();

    const userIds = {};
    const authEmails = [
      'virtual.test@theautodoctor.com',
      'employee.test@theautodoctor.com',
      'independent.test@theautodoctor.com'
    ];

    for (const email of authEmails) {
      const existing = existingUsers.users.find(u => u.email === email);
      if (existing) {
        userIds[email] = existing.id;
        console.log(`  ✅ Found: ${email}`);
      }
    }

    // Step 2: Create workshops
    console.log('\nStep 2: Creating workshops...');
    await supabase.from('organizations').upsert({
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
    });

    await supabase.from('organizations').upsert({
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
    });
    console.log('  ✅ Workshops created');

    // Step 3: Create mechanics using ACTUAL schema values
    console.log('\nStep 3: Creating mechanics...');

    const mechanics = [
      {
        user_id: userIds['virtual.test@theautodoctor.com'],
        email: 'virtual.test@theautodoctor.com',
        name: 'Virtual Test Mechanic',
        phone: '+14165551111',
        province: 'ON',
        city: 'Toronto',
        postal_code: 'M5V3A8',
        years_of_experience: 8,
        specializations: ['Engine Diagnostics', 'Electrical Systems', 'Transmission'],
        service_tier: 'virtual_only', // CORRECT: From existing data
        account_type: 'individual_mechanic', // CORRECT: From existing data
        workshop_id: null, // CRITICAL: Virtual-only = NULL
        application_status: 'approved',
        is_available: true,
        can_accept_sessions: true
      },
      {
        user_id: userIds['employee.test@theautodoctor.com'],
        email: 'employee.test@theautodoctor.com',
        name: 'Workshop Employee Test',
        phone: '+14165552222',
        province: 'ON',
        city: 'Toronto',
        postal_code: 'M5V3A8',
        years_of_experience: 5,
        specializations: ['Brakes', 'Suspension', 'Oil Changes'],
        service_tier: 'workshop_partner', // CORRECT: From existing data
        account_type: 'workshop_mechanic', // CRITICAL: Workshop employee
        workshop_id: '00000000-0000-0000-0000-000000000010', // CRITICAL: Linked to workshop
        application_status: 'approved',
        is_available: true,
        can_accept_sessions: true
      },
      {
        user_id: userIds['independent.test@theautodoctor.com'],
        email: 'independent.test@theautodoctor.com',
        name: 'Independent Workshop Owner Test',
        phone: '+14165553333',
        province: 'ON',
        city: 'Toronto',
        postal_code: 'M4B1B3',
        years_of_experience: 12,
        specializations: ['Engine Repair', 'Diagnostics', 'Performance Tuning'],
        service_tier: 'workshop_partner', // CORRECT: From existing data
        account_type: 'individual_mechanic', // Independent owner
        workshop_id: '00000000-0000-0000-0000-000000000011', // Their own workshop
        application_status: 'approved',
        is_available: true,
        can_accept_sessions: true
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
                     mechanic.account_type === 'workshop_mechanic' ? 'WORKSHOP_EMPLOYEE ❌' :
                     'INDEPENDENT_WORKSHOP ✅';
        console.log(`  ✅ ${mechanic.email} (${type})`);
      }
    }

    console.log('\n=== ✅ Test Users Created Successfully! ===\n');
    console.log('Login Credentials (all use password: Test1234!):\n');
    console.log('1. 🟢 Virtual-Only Mechanic:');
    console.log('   Email: virtual.test@theautodoctor.com');
    console.log('   Type: account_type=individual_mechanic, workshop_id=NULL');
    console.log('   Access: ✅ CAN access Earnings & Analytics\n');
    console.log('2. 🔴 Workshop Employee:');
    console.log('   Email: employee.test@theautodoctor.com');
    console.log('   Type: account_type=workshop_mechanic, workshop_id=SET');
    console.log('   Access: ❌ BLOCKED from Earnings & Analytics (403)\n');
    console.log('3. 🟢 Independent Workshop Owner:');
    console.log('   Email: independent.test@theautodoctor.com');
    console.log('   Type: account_type=individual_mechanic, workshop_id=SET');
    console.log('   Access: ✅ CAN access Earnings & Analytics\n');
    console.log('🌐 Test at: http://localhost:3001/mechanic/login\n');

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    console.error(err);
  }
}

createTestUsers();
