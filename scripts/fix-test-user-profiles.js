const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qtkouemogsymqrzkysar.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixProfiles() {
  console.log('🔧 Fixing test user profiles...\n');

  try {
    // Get auth users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();

    const testEmails = [
      'virtual.test@theautodoctor.com',
      'employee.test@theautodoctor.com',
      'independent.test@theautodoctor.com'
    ];

    for (const email of testEmails) {
      const user = existingUsers.users.find(u => u.email === email);
      if (!user) {
        console.log(`  ❌ User not found: ${email}`);
        continue;
      }

      // Update profile to have role='mechanic'
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: email,
          full_name: user.user_metadata.name,
          role: 'mechanic' // CRITICAL: Must be 'mechanic' not 'customer'
        });

      if (error) {
        console.log(`  ⚠️  ${email}: ${error.message}`);
      } else {
        console.log(`  ✅ Fixed profile for ${email} (role=mechanic)`);
      }
    }

    console.log('\n✅ All profiles fixed!\n');

    // Verify
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email, full_name, role')
      .in('email', testEmails);

    console.log('Verified profiles:');
    console.table(profiles);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

fixProfiles();
