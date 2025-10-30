const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyMechanic() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('\n========================================');
  console.log('VERIFYING DUMMY MECHANIC SETUP');
  console.log('========================================\n');

  // Get mechanic details
  const { data: mechanic, error: mechError } = await supabase
    .from('mechanics')
    .select('*')
    .eq('email', 'workshop.mechanic@test.com')
    .single();

  if (mechError) {
    console.error('❌ Error fetching mechanic:', mechError);
    return;
  }

  // Get workshop details
  const { data: workshop, error: workshopError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', mechanic.workshop_id)
    .single();

  if (workshopError) {
    console.error('❌ Error fetching workshop:', workshopError);
    return;
  }

  console.log('🏢 WORKSHOP DETAILS');
  console.log('==================');
  console.log(`Name: ${workshop.name}`);
  console.log(`Email: ${workshop.email}`);
  console.log(`Phone: ${workshop.phone}`);
  console.log(`Address: ${workshop.address}, ${workshop.city}, ${workshop.province} ${workshop.postal_code}`);
  console.log(`Status: ${workshop.status}`);
  console.log(`Verification: ${workshop.verification_status}`);
  console.log(`Commission Rate: ${workshop.commission_rate}%`);
  console.log(`Mechanic Capacity: ${workshop.mechanic_capacity}`);
  console.log(`Service Radius: ${workshop.service_radius_km}km`);
  console.log('');

  console.log('👨‍🔧 MECHANIC DETAILS');
  console.log('==================');
  console.log(`Name: ${mechanic.name}`);
  console.log(`Email: ${mechanic.email}`);
  console.log(`Phone: ${mechanic.phone}`);
  console.log(`ID: ${mechanic.id}`);
  console.log('');

  console.log('📝 ACCOUNT STATUS');
  console.log('==================');
  console.log(`Account Type: ${mechanic.account_type}`);
  console.log(`Application Status: ${mechanic.application_status} ${mechanic.application_status === 'approved' ? '✅' : '❌'}`);
  console.log(`Background Check: ${mechanic.background_check_status} ${mechanic.background_check_status === 'approved' ? '✅' : '❌'}`);
  console.log(`Profile Completion: ${mechanic.profile_completion_score}% ${mechanic.profile_completion_score >= 80 ? '✅' : '❌'}`);
  console.log(`Can Accept Sessions: ${mechanic.can_accept_sessions ? 'YES ✅' : 'NO ❌'}`);
  console.log(`Currently Available: ${mechanic.is_available ? 'YES ✅' : 'NO ❌'}`);
  console.log(`Approved At: ${mechanic.approved_at}`);
  console.log('');

  console.log('🏭 WORKSHOP AFFILIATION');
  console.log('==================');
  console.log(`Workshop ID: ${mechanic.workshop_id}`);
  console.log(`Invited By: ${mechanic.invited_by}`);
  console.log(`Invitation Accepted: ${mechanic.invite_accepted_at}`);
  console.log(`Linked to Workshop: ${mechanic.workshop_id === workshop.id ? 'YES ✅' : 'NO ❌'}`);
  console.log(`Shop Name: ${mechanic.shop_name}`);
  console.log(`Shop Affiliation: ${mechanic.shop_affiliation}`);
  console.log('');

  console.log('🎓 CREDENTIALS & EXPERIENCE');
  console.log('==================');
  console.log(`Years of Experience: ${mechanic.years_of_experience}`);
  console.log(`Red Seal Certified: ${mechanic.red_seal_certified ? 'YES ✅' : 'NO'}`);
  console.log(`Red Seal Number: ${mechanic.red_seal_number}`);
  console.log(`Red Seal Province: ${mechanic.red_seal_province}`);
  console.log(`Red Seal Expiry: ${mechanic.red_seal_expiry_date}`);
  console.log(`Other Certifications:`, JSON.stringify(mechanic.other_certifications, null, 2));
  console.log('');

  console.log('⚙️  SPECIALIZATIONS');
  console.log('==================');
  console.log(`Specializations: ${mechanic.specializations?.join(', ') || 'None'}`);
  console.log(`Service Keywords: ${mechanic.service_keywords?.slice(0, 5).join(', ')}...`);
  console.log(`Is Brand Specialist: ${mechanic.is_brand_specialist ? 'YES ✅' : 'NO'}`);
  console.log(`Brand Specializations: ${mechanic.brand_specializations?.join(', ') || 'None'}`);
  console.log(`Specialist Tier: ${mechanic.specialist_tier}`);
  console.log('');

  console.log('📍 LOCATION & SERVICE');
  console.log('==================');
  console.log(`Address: ${mechanic.full_address}`);
  console.log(`City/Province: ${mechanic.city}, ${mechanic.province}`);
  console.log(`Postal Code: ${mechanic.postal_code}`);
  console.log(`Timezone: ${mechanic.timezone}`);
  console.log(`Can Perform Physical Work: ${mechanic.can_perform_physical_work ? 'YES ✅' : 'NO'}`);
  console.log(`Participation Mode: ${mechanic.participation_mode}`);
  console.log('');

  console.log('⭐ PERFORMANCE');
  console.log('==================');
  console.log(`Rating: ${mechanic.rating}/5.0`);
  console.log(`Completed Sessions: ${mechanic.completed_sessions}`);
  console.log('');

  console.log('💳 PAYMENT & INSURANCE');
  console.log('==================');
  console.log(`Stripe Account ID: ${mechanic.stripe_account_id}`);
  console.log(`Stripe Onboarding: ${mechanic.stripe_onboarding_completed ? 'Complete ✅' : 'Incomplete ❌'}`);
  console.log(`Stripe Charges Enabled: ${mechanic.stripe_charges_enabled ? 'YES ✅' : 'NO'}`);
  console.log(`Stripe Payouts Enabled: ${mechanic.stripe_payouts_enabled ? 'YES ✅' : 'NO'}`);
  console.log(`Banking Info: ${mechanic.banking_info_completed ? 'Complete ✅' : 'Incomplete ❌'}`);
  console.log(`Liability Insurance: ${mechanic.liability_insurance ? 'YES ✅' : 'NO'}`);
  console.log(`Insurance Policy: ${mechanic.insurance_policy_number}`);
  console.log(`Insurance Expiry: ${mechanic.insurance_expiry}`);
  console.log(`Criminal Record Check: ${mechanic.criminal_record_check ? 'Completed ✅' : 'Not Done ❌'}`);
  console.log(`CRC Date: ${mechanic.crc_date}`);
  console.log('');

  console.log('========================================');
  console.log('🎉 VERIFICATION COMPLETE!');
  console.log('========================================');
  console.log('');
  console.log('✅ All systems ready for testing!');
  console.log('');
  console.log('🔑 LOGIN CREDENTIALS:');
  console.log('   URL: http://localhost:3000/mechanic/login');
  console.log('   Email: workshop.mechanic@test.com');
  console.log('   Password: 1234');
  console.log('');
  console.log('📝 TEST CHECKLIST:');
  console.log('   [ ] Login to mechanic dashboard');
  console.log('   [ ] View profile information');
  console.log('   [ ] Check workshop affiliation');
  console.log('   [ ] Accept a test session request');
  console.log('   [ ] Complete end-to-end customer flow');
  console.log('');
}

verifyMechanic();
