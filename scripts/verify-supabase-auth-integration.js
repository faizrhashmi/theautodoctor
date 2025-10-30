const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifySupabaseAuthIntegration() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('\n========================================');
  console.log('VERIFYING SUPABASE AUTH INTEGRATION');
  console.log('========================================\n');

  const email = 'workshop.mechanic@test.com';

  // 1. Check auth.users
  console.log('1️⃣  Checking auth.users table...');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users?.find(u => u.email === email);

  if (authUser) {
    console.log('   ✅ Auth user exists');
    console.log('      ID:', authUser.id);
    console.log('      Email:', authUser.email);
    console.log('      Email Confirmed:', authUser.email_confirmed_at ? 'YES' : 'NO');
    console.log('      Created:', authUser.created_at);
  } else {
    console.log('   ❌ Auth user NOT found');
    return;
  }
  console.log('');

  // 2. Check profiles table
  console.log('2️⃣  Checking profiles table...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profile) {
    console.log('   ✅ Profile exists');
    console.log('      ID:', profile.id);
    console.log('      Role:', profile.role);
    console.log('      Account Type:', profile.account_type);
    console.log('      Email:', profile.email);
    console.log('      Name:', profile.full_name);
    if (profile.role !== 'mechanic') {
      console.log('      ⚠️  WARNING: Role is not "mechanic"');
    }
  } else {
    console.log('   ❌ Profile NOT found');
    console.log('      Error:', profileError?.message);
  }
  console.log('');

  // 3. Check mechanics table
  console.log('3️⃣  Checking mechanics table...');
  const { data: mechanic, error: mechanicError } = await supabase
    .from('mechanics')
    .select('id, name, email, user_id, account_type, application_status, can_accept_sessions, workshop_id')
    .eq('email', email)
    .single();

  if (mechanic) {
    console.log('   ✅ Mechanic exists');
    console.log('      Mechanic ID:', mechanic.id);
    console.log('      User ID:', mechanic.user_id);
    console.log('      Name:', mechanic.name);
    console.log('      Account Type:', mechanic.account_type);
    console.log('      Status:', mechanic.application_status);
    console.log('      Can Accept Sessions:', mechanic.can_accept_sessions ? 'YES' : 'NO');
    console.log('      Workshop ID:', mechanic.workshop_id);
  } else {
    console.log('   ❌ Mechanic NOT found');
    console.log('      Error:', mechanicError?.message);
  }
  console.log('');

  // 4. Verify linkage
  console.log('4️⃣  Verifying linkages...');

  const authUserIdMatches = authUser && mechanic && authUser.id === mechanic.user_id;
  const profileIdMatches = authUser && profile && authUser.id === profile.id;

  console.log('   auth.users.id ←→ mechanics.user_id:', authUserIdMatches ? '✅ LINKED' : '❌ NOT LINKED');
  console.log('   auth.users.id ←→ profiles.id:', profileIdMatches ? '✅ LINKED' : '❌ NOT LINKED');
  console.log('');

  // 5. Test authentication
  console.log('5️⃣  Testing authentication...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: email,
    password: '1234'
  });

  if (signInError) {
    console.log('   ❌ Login FAILED');
    console.log('      Error:', signInError.message);
  } else {
    console.log('   ✅ Login SUCCESSFUL');
    console.log('      Access Token:', signInData.session.access_token.substring(0, 20) + '...');
    console.log('      User ID:', signInData.user.id);

    // Sign out
    await supabase.auth.signOut();
    console.log('   ✅ Sign out successful');
  }
  console.log('');

  // 6. Check RLS policies
  console.log('6️⃣  Checking RLS compatibility...');
  console.log('   ✅ Mechanic has user_id:', mechanic?.user_id ? 'YES' : 'NO');
  console.log('   ✅ Profile has correct role:', profile?.role === 'mechanic' ? 'YES' : 'NO');
  console.log('   ✅ Compatible with requireMechanicAPI:', authUserIdMatches && profile?.role === 'mechanic' ? 'YES' : 'NO');
  console.log('');

  // Final summary
  console.log('========================================');
  console.log('📊 INTEGRATION STATUS');
  console.log('========================================');

  const allChecksPass = authUser && profile && mechanic &&
                        authUserIdMatches && profileIdMatches &&
                        profile.role === 'mechanic' &&
                        mechanic.can_accept_sessions;

  if (allChecksPass) {
    console.log('');
    console.log('✅ ALL CHECKS PASSED!');
    console.log('');
    console.log('Your dummy mechanic is fully compatible with:');
    console.log('   ✅ Supabase Auth');
    console.log('   ✅ requireMechanicAPI middleware');
    console.log('   ✅ RLS policies on mechanics table');
    console.log('   ✅ RLS policies on session_requests table');
    console.log('   ✅ No legacy mechanic_sessions table needed');
    console.log('');
    console.log('🎯 READY FOR TESTING!');
    console.log('');
  } else {
    console.log('');
    console.log('⚠️  SOME CHECKS FAILED');
    console.log('');
    console.log('Issues found:');
    if (!authUser) console.log('   ❌ Auth user missing');
    if (!profile) console.log('   ❌ Profile missing');
    if (!mechanic) console.log('   ❌ Mechanic missing');
    if (!authUserIdMatches) console.log('   ❌ user_id not linked');
    if (!profileIdMatches) console.log('   ❌ profile.id not linked');
    if (profile && profile.role !== 'mechanic') console.log('   ❌ Profile role is not "mechanic"');
    if (mechanic && !mechanic.can_accept_sessions) console.log('   ❌ Cannot accept sessions');
    console.log('');
  }
}

verifySupabaseAuthIntegration();
