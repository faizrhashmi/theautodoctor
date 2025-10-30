const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkMechanicSetup() {
  console.log('\n==============================================');
  console.log('CHECKING MECHANIC SETUP FOR: mechanic@test.com');
  console.log('==============================================\n');

  // 1. Check auth user
  console.log('1️⃣  Checking auth.users table...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching auth users:', authError.message);
    return;
  }

  const authUser = authUsers.users.find(u => u.email === 'mechanic@test.com');

  if (!authUser) {
    console.log('❌ AUTH USER NOT FOUND');
    console.log('   FIX: Create user in Supabase Dashboard → Authentication → Users');
    console.log('   Email: mechanic@test.com');
    console.log('   Password: password123');
    return;
  }

  console.log('✅ AUTH USER EXISTS');
  console.log('   User ID:', authUser.id);
  console.log('   Email:', authUser.email);
  console.log('   Email confirmed:', !!authUser.email_confirmed_at);
  console.log('');

  // 2. Check profile
  console.log('2️⃣  Checking profiles table...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', authUser.id)
    .maybeSingle();

  if (profileError) {
    console.error('❌ Error fetching profile:', profileError.message);
    return;
  }

  if (!profile) {
    console.log('❌ PROFILE NOT FOUND');
    console.log('   FIX: Profile should be auto-created by trigger. Check triggers.');
    return;
  }

  console.log('✅ PROFILE EXISTS');
  console.log('   Profile ID:', profile.id);
  console.log('   Role:', profile.role || '(NULL)');
  console.log('   Full name:', profile.full_name || '(NULL)');
  console.log('');

  if (profile.role !== 'mechanic') {
    console.log('❌ PROFILE ROLE IS WRONG');
    console.log(`   Current role: "${profile.role}"`);
    console.log('   Expected: "mechanic"');
    console.log('   FIX: Run this SQL in Supabase:');
    console.log(`   UPDATE public.profiles SET role = 'mechanic' WHERE id = '${authUser.id}';`);
    console.log('');
  } else {
    console.log('✅ PROFILE ROLE IS CORRECT');
    console.log('');
  }

  // 3. Check mechanics table
  console.log('3️⃣  Checking mechanics table...');
  const { data: mechanic, error: mechanicError } = await supabase
    .from('mechanics')
    .select('id, user_id, name, email, application_status')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (mechanicError) {
    console.error('❌ Error fetching mechanic:', mechanicError.message);
    return;
  }

  if (!mechanic) {
    console.log('❌ MECHANIC RECORD NOT FOUND');
    console.log('   FIX: Run this SQL in Supabase:');
    console.log(`   INSERT INTO public.mechanics (user_id, name, email, application_status)`);
    console.log(`   VALUES ('${authUser.id}', 'Test Mechanic', 'mechanic@test.com', 'approved');`);
    console.log('');
    return;
  }

  console.log('✅ MECHANIC RECORD EXISTS');
  console.log('   Mechanic ID:', mechanic.id);
  console.log('   User ID:', mechanic.user_id);
  console.log('   Name:', mechanic.name);
  console.log('   Email:', mechanic.email);
  console.log('   Status:', mechanic.application_status);
  console.log('');

  // 4. Final summary
  console.log('==============================================');
  if (authUser && profile && profile.role === 'mechanic' && mechanic) {
    console.log('🎉 ALL CHECKS PASSED!');
    console.log('   You should be able to login with:');
    console.log('   Email: mechanic@test.com');
    console.log('   Password: password123');
  } else {
    console.log('⚠️  SETUP INCOMPLETE');
    console.log('   Please follow the FIX instructions above');
  }
  console.log('==============================================\n');
}

checkMechanicSetup().catch(console.error);
