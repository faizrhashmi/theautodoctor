const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createDummyMechanicWithAuth() {
  // Create admin client with service role key
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('\n========================================');
  console.log('Creating Dummy Mechanic with Supabase Auth');
  console.log('========================================\n');

  try {
    const password = '1234';
    const email = 'workshop.mechanic@test.com';

    // ========================================================================
    // STEP 1: Create/Update Workshop Organization
    // ========================================================================
    console.log('Step 1: Creating/Updating workshop organization...');

    const { data: existingWorkshop } = await supabase
      .from('organizations')
      .select('*')
      .eq('email', 'elite.workshop@test.com')
      .single();

    let workshop;

    if (existingWorkshop) {
      console.log('Workshop already exists, updating...');
      const { data: updatedWorkshop, error: workshopError } = await supabase
        .from('organizations')
        .update({
          status: 'active',
          verification_status: 'verified',
          mechanic_capacity: 15,
          commission_rate: 12.00,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingWorkshop.id)
        .select()
        .single();

      if (workshopError) throw workshopError;
      workshop = updatedWorkshop;
    } else {
      const { data: newWorkshop, error: workshopError } = await supabase
        .from('organizations')
        .insert({
          organization_type: 'workshop',
          name: 'Elite Auto Care Workshop',
          slug: 'elite-auto-care-workshop',
          email: 'elite.workshop@test.com',
          phone: '+14165551234',
          address: '456 Professional Blvd, Unit 12',
          city: 'Toronto',
          province: 'ON',
          postal_code: 'M4B 1B3',
          country: 'Canada',
          status: 'active',
          verification_status: 'verified',
          verification_notes: 'Test workshop - fully approved for development',
          mechanic_capacity: 15,
          commission_rate: 12.00,
          coverage_postal_codes: ['M4B', 'M4C', 'M4E', 'M4K', 'M4L', 'M4M', 'M5A', 'M5B'],
          service_radius_km: 25,
          business_registration_number: 'BN123456789',
          tax_id: 'GST-123456789RT0001',
          stripe_account_status: 'verified',
          stripe_onboarding_completed: true,
          settings: { notifications_enabled: true, auto_assign: true },
          metadata: { test_account: true, created_by: 'seed_script' },
          approved_at: new Date().toISOString()
        })
        .select()
        .single();

      if (workshopError) throw workshopError;
      workshop = newWorkshop;
    }

    console.log('✅ Workshop ready:', workshop.name);
    console.log('   ID:', workshop.id);
    console.log('');

    // ========================================================================
    // STEP 2: Create Supabase Auth User
    // ========================================================================
    console.log('Step 2: Creating Supabase Auth user...');

    // Check if auth user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(u => u.email === email);

    let authUser;

    if (existingAuthUser) {
      console.log('Auth user already exists:', existingAuthUser.id);
      authUser = existingAuthUser;

      // Update password to ensure it's '1234'
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        { password: password }
      );

      if (updateError) {
        console.warn('Warning: Could not update password:', updateError.message);
      } else {
        console.log('✅ Password updated to: 1234');
      }
    } else {
      // Create new auth user
      const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: 'Alex Thompson',
          role: 'mechanic',
          account_type: 'workshop_mechanic'
        }
      });

      if (authError) {
        console.error('❌ Error creating auth user:', authError);
        throw authError;
      }

      authUser = newUser.user;
      console.log('✅ Auth user created:', authUser.id);
    }

    console.log('');

    // ========================================================================
    // STEP 3: Create/Update Profile
    // ========================================================================
    console.log('Step 3: Creating/Updating profile...');

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (existingProfile) {
      console.log('Profile already exists, updating...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'mechanic',
          email: email,
          full_name: 'Alex Thompson',
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id);

      if (profileError) throw profileError;
    } else {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          role: 'mechanic',
          email: email,
          full_name: 'Alex Thompson',
          account_type: 'mechanic',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;
    }

    console.log('✅ Profile ready');
    console.log('');

    // ========================================================================
    // STEP 4: Create/Update Mechanic Record
    // ========================================================================
    console.log('Step 4: Creating/Updating mechanic record...');

    const now = new Date();
    const inviteAccepted = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const approved = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
    const submitted = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const insuranceExpiry = new Date(now.getTime() + 11 * 30 * 24 * 60 * 60 * 1000);
    const redSealExpiry = new Date(now.getTime() + 18 * 30 * 24 * 60 * 60 * 1000);
    const crcDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const mechanicData = {
      user_id: authUser.id,  // ✅ LINKED TO SUPABASE AUTH
      name: 'Alex Thompson',
      email: email,
      phone: '+14165559876',

      // Account Type & Workshop
      account_type: 'workshop_mechanic',
      workshop_id: workshop.id,
      invited_by: workshop.id,
      invite_accepted_at: inviteAccepted.toISOString(),

      // Approval Status
      application_status: 'approved',
      background_check_status: 'approved',
      approved_at: approved.toISOString(),
      application_submitted_at: submitted.toISOString(),

      // Profile Completion
      profile_completion_score: 100,
      can_accept_sessions: true,

      // Credentials
      years_of_experience: 8,
      red_seal_certified: true,
      red_seal_number: 'RS-ON-87654321',
      red_seal_province: 'ON',
      red_seal_expiry_date: redSealExpiry.toISOString().split('T')[0],
      other_certifications: {
        ASE: ['A1', 'A4', 'A6', 'A8'],
        manufacturer: ['Honda Master', 'Toyota Level 2']
      },

      // Specializations
      specializations: ['brakes', 'suspension', 'diagnostics', 'electrical', 'engine', 'transmission'],
      service_keywords: ['brake repair', 'brake inspection', 'suspension repair', 'shock replacement', 'diagnostic scan', 'check engine light', 'electrical troubleshooting', 'alternator repair', 'battery replacement', 'engine repair', 'transmission service'],

      // Brand Specialist
      is_brand_specialist: true,
      brand_specializations: ['Honda', 'Toyota', 'Mazda', 'Nissan'],
      specialist_tier: 'brand',

      // Shop Info
      shop_affiliation: 'dealership',
      shop_name: 'Elite Auto Care Workshop',
      shop_address: '456 Professional Blvd, Unit 12, Toronto, ON',

      // Location
      full_address: '789 Maple Street, Apt 5B, Toronto, ON M4B 2K9',
      city: 'Toronto',
      province: 'ON',
      state_province: 'ON',
      postal_code: 'M4B 2K9',
      country: 'Canada',
      timezone: 'America/Toronto',

      // Service preferences
      can_perform_physical_work: true,
      prefers_virtual: false,
      prefers_physical: true,
      participation_mode: 'both',

      // Availability
      is_available: true,
      currently_on_shift: false,

      // Performance
      rating: 4.9,
      completed_sessions: 47,

      // Payment
      stripe_account_id: 'acct_test_' + Math.random().toString(36).substring(2, 18),
      stripe_onboarding_completed: true,
      stripe_charges_enabled: true,
      stripe_payouts_enabled: true,
      stripe_details_submitted: true,
      banking_info_completed: true,

      // Insurance
      liability_insurance: true,
      insurance_policy_number: 'INS-' + Math.random().toString(36).substring(2, 14).toUpperCase(),
      insurance_expiry: insuranceExpiry.toISOString().split('T')[0],
      criminal_record_check: true,
      crc_date: crcDate.toISOString().split('T')[0],

      last_updated: now.toISOString()
    };

    const { data: existingMechanic } = await supabase
      .from('mechanics')
      .select('*')
      .eq('email', email)
      .single();

    let mechanic;

    if (existingMechanic) {
      console.log('Mechanic already exists, updating...');
      const { data: updatedMechanic, error: mechanicError } = await supabase
        .from('mechanics')
        .update(mechanicData)
        .eq('id', existingMechanic.id)
        .select()
        .single();

      if (mechanicError) throw mechanicError;
      mechanic = updatedMechanic;
    } else {
      const { data: newMechanic, error: mechanicError } = await supabase
        .from('mechanics')
        .insert(mechanicData)
        .select()
        .single();

      if (mechanicError) throw mechanicError;
      mechanic = newMechanic;
    }

    console.log('✅ Mechanic created:', mechanic.name);
    console.log('   Mechanic ID:', mechanic.id);
    console.log('   User ID:', mechanic.user_id);
    console.log('');

    // ========================================================================
    // VERIFICATION
    // ========================================================================
    console.log('========================================');
    console.log('🎉 Setup Complete!');
    console.log('========================================');
    console.log('');
    console.log('📋 SUPABASE AUTH INTEGRATION:');
    console.log('   ✅ Auth User Created:', authUser.id);
    console.log('   ✅ Profile Created: role=mechanic');
    console.log('   ✅ Mechanic Linked: user_id set');
    console.log('');
    console.log('🏢 WORKSHOP:');
    console.log('   ✅ Elite Auto Care Workshop');
    console.log('   ✅ Verified & Active');
    console.log('');
    console.log('👨‍🔧 MECHANIC:');
    console.log('   ✅ Alex Thompson');
    console.log('   ✅ Profile: 100% Complete');
    console.log('   ✅ Status: APPROVED');
    console.log('   ✅ Can Accept Sessions: YES');
    console.log('   ✅ Workshop Affiliated: YES');
    console.log('');
    console.log('🔑 LOGIN CREDENTIALS:');
    console.log('   URL: http://localhost:3000/mechanic/login');
    console.log('   Email: workshop.mechanic@test.com');
    console.log('   Password: 1234');
    console.log('');
    console.log('🧪 AUTHENTICATION METHOD:');
    console.log('   ✅ Supabase Auth (NEW)');
    console.log('   ✅ Uses auth.users table');
    console.log('   ✅ Compatible with requireMechanicAPI');
    console.log('   ✅ No legacy mechanic_sessions needed');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  }
}

createDummyMechanicWithAuth();
