const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qtkouemogsymqrzkysar.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateTestUsers() {
  console.log('🔧 Updating test users to correct schema values...\n');

  try {
    // Get auth users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();

    const testEmails = {
      'virtual.test@theautodoctor.com': {
        service_tier: 'virtual_only',
        account_type: 'individual_mechanic',
        workshop_id: null
      },
      'employee.test@theautodoctor.com': {
        service_tier: 'workshop_partner',
        account_type: 'workshop_mechanic',
        workshop_id: '00000000-0000-0000-0000-000000000010'
      },
      'independent.test@theautodoctor.com': {
        service_tier: 'workshop_partner',
        account_type: 'individual_mechanic',
        workshop_id: '00000000-0000-0000-0000-000000000011'
      }
    };

    for (const [email, updates] of Object.entries(testEmails)) {
      const user = existingUsers.users.find(u => u.email === email);
      if (!user) {
        console.log(`  ❌ User not found: ${email}`);
        continue;
      }

      // Update mechanic record
      const { error } = await supabase
        .from('mechanics')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        console.log(`  ⚠️  ${email}: ${error.message}`);
      } else {
        const type = !updates.workshop_id ? 'VIRTUAL_ONLY ✅' :
                     updates.account_type === 'workshop_mechanic' ? 'WORKSHOP_EMPLOYEE ❌' :
                     'OWNER/OPERATOR ✅🏪';
        console.log(`  ✅ Updated ${email} (${type})`);
      }
    }

    // Update workshop created_by to link ownership
    const independentUser = existingUsers.users.find(u => u.email === 'independent.test@theautodoctor.com');
    if (independentUser) {
      const { error } = await supabase
        .from('organizations')
        .update({ created_by: independentUser.id })
        .eq('id', '00000000-0000-0000-0000-000000000011');

      if (error) {
        console.log(`  ⚠️  Could not link workshop ownership: ${error.message}`);
      } else {
        console.log(`  ✅ Linked workshop ownership to independent.test@theautodoctor.com`);
      }
    }

    console.log('\n=== ✅ All test users updated! ===\n');

    // Verify
    const { data: mechanics } = await supabase
      .from('mechanics')
      .select('email, service_tier, account_type, workshop_id')
      .in('email', Object.keys(testEmails));

    console.log('Verified mechanics:');
    console.table(mechanics);

    console.log('\n📋 Test User Types:\n');
    console.log('1. 🟢 virtual.test@theautodoctor.com');
    console.log('   Type: VIRTUAL_ONLY');
    console.log('   Can access: Mechanic dashboard, earnings, analytics');
    console.log('   Cannot access: Workshop management\n');

    console.log('2. 🔴 employee.test@theautodoctor.com');
    console.log('   Type: WORKSHOP_AFFILIATED');
    console.log('   Can access: Mechanic dashboard (sessions only)');
    console.log('   Cannot access: Earnings, analytics, workshop management\n');

    console.log('3. 🟢🏪 independent.test@theautodoctor.com');
    console.log('   Type: INDEPENDENT_WORKSHOP (Owner/Operator)');
    console.log('   Can access: Mechanic dashboard, earnings, analytics');
    console.log('   Can also access: Workshop management (with role switcher)');
    console.log('   Dashboard header: "Workshop Partner Dashboard"\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

updateTestUsers();
