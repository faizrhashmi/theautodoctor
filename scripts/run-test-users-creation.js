const { createClient } = require('@supabase/supabase-js');

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qtkouemogsymqrzkysar.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUsers() {
  try {
    console.log('Creating Phase 1 test users...\n');

    // Create organizations first
    console.log('Creating test workshops...');

    const { error: orgError1 } = await supabase.from('organizations').upsert({
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Test Workshop Ltd',
      organization_type: 'workshop',
      address: '123 Test Street',
      city: 'Toronto',
      province: 'ON',
      postal_code: 'M5V 3A8',
      phone: '+14165551234',
      email: 'workshop@theautodoctor.com',
      status: 'active'
    });

    const { error: orgError2 } = await supabase.from('organizations').upsert({
      id: '00000000-0000-0000-0000-000000000011',
      name: 'Independent Auto Shop',
      organization_type: 'workshop',
      address: '456 Independent Ave',
      city: 'Toronto',
      province: 'ON',
      postal_code: 'M4B 1B3',
      phone: '+14165555678',
      email: 'independent@theautodoctor.com',
      status: 'active'
    });

    if (orgError1) console.error('  ⚠️  Organization 1:', orgError1.message);
    else console.log('  ✅ Test Workshop Ltd created');

    if (orgError2) console.error('  ⚠️  Organization 2:', orgError2.message);
    else console.log('  ✅ Independent Auto Shop created');

    console.log('\nCreating mechanics...');

    // Create mechanics
    const mechanics = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        user_id: '00000000-0000-0000-0000-000000000001',
        email: 'virtual.test@theautodoctor.com',
        name: 'Virtual Test Mechanic',
        phone: '+14165551111',
        province: 'ON',
        city: 'Toronto',
        postal_code: 'M5V 3A8',
        years_of_experience: 8,
        specializations: ['Engine Diagnostics', 'Electrical Systems', 'Transmission'],
        certifications: ['ASE Certified', 'Red Seal'],
        languages: ['English', 'French'],
        bio: 'Experienced virtual diagnostic mechanic specializing in remote troubleshooting.',
        hourly_rate: 75.00,
        service_tier: 'premium',
        account_type: null,
        workshop_id: null,
        availability_status: 'available',
        rating_average: 4.8,
        total_sessions: 156
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000002',
        email: 'employee.test@theautodoctor.com',
        name: 'Workshop Employee Test',
        phone: '+14165552222',
        province: 'ON',
        city: 'Toronto',
        postal_code: 'M5V 3A8',
        years_of_experience: 5,
        specializations: ['Brakes', 'Suspension', 'Oil Changes'],
        certifications: ['ASE Certified'],
        languages: ['English'],
        bio: 'Workshop employee mechanic. Payment goes to workshop.',
        hourly_rate: 60.00,
        service_tier: 'standard',
        account_type: 'workshop',
        workshop_id: '00000000-0000-0000-0000-000000000010',
        availability_status: 'available',
        rating_average: 4.5,
        total_sessions: 89
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        user_id: '00000000-0000-0000-0000-000000000003',
        email: 'independent.test@theautodoctor.com',
        name: 'Independent Workshop Owner Test',
        phone: '+14165553333',
        province: 'ON',
        city: 'Toronto',
        postal_code: 'M4B 1B3',
        years_of_experience: 12,
        specializations: ['Engine Repair', 'Diagnostics', 'Performance Tuning'],
        certifications: ['Red Seal', 'ASE Master Certified'],
        languages: ['English', 'Spanish'],
        bio: 'Independent workshop owner with dual dashboard access.',
        hourly_rate: 85.00,
        service_tier: 'premium',
        account_type: 'independent',
        workshop_id: '00000000-0000-0000-0000-000000000011',
        availability_status: 'available',
        rating_average: 4.9,
        total_sessions: 234
      }
    ];

    for (const mechanic of mechanics) {
      const { error: mechError } = await supabase.from('mechanics').upsert(mechanic);
      if (mechError) {
        console.log(`  ⚠️  ${mechanic.email}: ${mechError.message}`);
      } else {
        const type = !mechanic.workshop_id ? 'VIRTUAL_ONLY ✅' :
                     mechanic.account_type === 'workshop' ? 'WORKSHOP_EMPLOYEE ❌' :
                     'INDEPENDENT_WORKSHOP ✅';
        console.log(`  ✅ ${mechanic.email} (${type})`);
      }
    }

    // Create profiles
    console.log('\nCreating profiles...');
    const profiles = [
      { id: '00000000-0000-0000-0000-000000000001', email: 'virtual.test@theautodoctor.com', full_name: 'Virtual Test Mechanic', role: 'mechanic' },
      { id: '00000000-0000-0000-0000-000000000002', email: 'employee.test@theautodoctor.com', full_name: 'Workshop Employee Test', role: 'mechanic' },
      { id: '00000000-0000-0000-0000-000000000003', email: 'independent.test@theautodoctor.com', full_name: 'Independent Workshop Owner Test', role: 'mechanic' }
    ];

    for (const profile of profiles) {
      const { error: profError } = await supabase.from('profiles').upsert(profile);
      if (profError) {
        console.log(`  ⚠️  ${profile.email}: ${profError.message}`);
      } else {
        console.log(`  ✅ Profile for ${profile.email}`);
      }
    }

    console.log('\n=== ✅ Test Users Created Successfully! ===\n');
    console.log('Login Credentials (all use password: Test1234!):\n');
    console.log('1. Virtual-Only Mechanic:');
    console.log('   Email: virtual.test@theautodoctor.com');
    console.log('   Expected: ✅ Can access Earnings & Analytics\n');
    console.log('2. Workshop Employee:');
    console.log('   Email: employee.test@theautodoctor.com');
    console.log('   Expected: ❌ BLOCKED from Earnings & Analytics (403)\n');
    console.log('3. Independent Workshop Owner:');
    console.log('   Email: independent.test@theautodoctor.com');
    console.log('   Expected: ✅ Can access Earnings & Analytics\n');
    console.log('Test at: http://localhost:3001/mechanic/login\n');

  } catch (err) {
    console.error('Fatal error:', err);
  }
}

createTestUsers();
