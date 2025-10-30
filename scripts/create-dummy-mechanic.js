const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function createDummyMechanic() {
  // Create Supabase client with service role key (bypasses RLS)
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
  console.log('Creating Dummy Workshop & Mechanic...');
  console.log('========================================\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'seed', 'create_dummy_workshop_mechanic.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql function doesn't exist, we'll execute parts manually
      console.log('Running manual creation...\n');

      const password_hash = '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi';

      // Create workshop
      console.log('Creating workshop organization...');

      // First, check if workshop already exists
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

        if (workshopError) {
          console.error('❌ Error updating workshop:', workshopError);
          throw workshopError;
        }
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

        if (workshopError) {
          console.error('❌ Error creating workshop:', workshopError);
          throw workshopError;
        }
        workshop = newWorkshop;
      }

      console.log('✅ Workshop created:', workshop.name);
      console.log('   Email:', workshop.email);
      console.log('   ID:', workshop.id);
      console.log('');

      // Create mechanic
      console.log('Creating mechanic...');

      // Calculate dates
      const now = new Date();
      const inviteAccepted = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const approved = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000); // 25 days ago
      const submitted = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000); // 28 days ago
      const insuranceExpiry = new Date(now.getTime() + 11 * 30 * 24 * 60 * 60 * 1000); // 11 months
      const redSealExpiry = new Date(now.getTime() + 18 * 30 * 24 * 60 * 60 * 1000); // 18 months
      const crcDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

      // Check if mechanic already exists
      const { data: existingMechanic } = await supabase
        .from('mechanics')
        .select('*')
        .eq('email', 'workshop.mechanic@test.com')
        .single();

      let mechanic;

      const mechanicData = {
        name: 'Alex Thompson',
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
        shop_affiliation: 'dealership',  // Working at workshop location
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

      if (existingMechanic) {
        console.log('Mechanic already exists, updating...');
        const { data: updatedMechanic, error: mechanicError } = await supabase
          .from('mechanics')
          .update(mechanicData)
          .eq('id', existingMechanic.id)
          .select()
          .single();

        if (mechanicError) {
          console.error('❌ Error updating mechanic:', mechanicError);
          throw mechanicError;
        }
        mechanic = updatedMechanic;
      } else {
        const { data: newMechanic, error: mechanicError } = await supabase
          .from('mechanics')
          .insert({
            email: 'workshop.mechanic@test.com',
            ...mechanicData
          })
          .select()
          .single();

        if (mechanicError) {
          console.error('❌ Error creating mechanic:', mechanicError);
          throw mechanicError;
        }
        mechanic = newMechanic;
      }

      console.log('✅ Mechanic created:', mechanic.name);
      console.log('   Email:', mechanic.email);
      console.log('   Password: 1234');
      console.log('   ID:', mechanic.id);
      console.log('');

      // Verify the creation
      console.log('========================================');
      console.log('Setup Complete!');
      console.log('========================================');
      console.log('');
      console.log('📋 SUMMARY:');
      console.log('   ✅ Workshop: Elite Auto Care Workshop');
      console.log('   ✅ Mechanic: Alex Thompson');
      console.log('   ✅ Profile Completion:', mechanic.profile_completion_score + '%');
      console.log('   ✅ Application Status:', mechanic.application_status.toUpperCase());
      console.log('   ✅ Background Check:', mechanic.background_check_status.toUpperCase());
      console.log('   ✅ Can Accept Sessions:', mechanic.can_accept_sessions ? 'YES' : 'NO');
      console.log('   ✅ Workshop Affiliation:', mechanic.workshop_id === workshop.id ? 'ACTIVE' : 'INACTIVE');
      console.log('');
      console.log('🔑 LOGIN CREDENTIALS:');
      console.log('   Email: workshop.mechanic@test.com');
      console.log('   Password: 1234');
      console.log('');
      console.log('🎯 NEXT STEPS:');
      console.log('   1. Login at: http://localhost:3000/mechanic/login');
      console.log('   2. Navigate to: /mechanic/dashboard');
      console.log('   3. Test end-to-end customer flow');
      console.log('');

    } else {
      console.log('✅ Script executed successfully!');
      console.log(data);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Run the script
createDummyMechanic();
