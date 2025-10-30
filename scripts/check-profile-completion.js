const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkProfileCompletion() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('\n========================================');
  console.log('CHECKING PROFILE COMPLETION');
  console.log('========================================\n');

  const { data: mechanic, error } = await supabase
    .from('mechanics')
    .select('*')
    .eq('email', 'workshop.mechanic@test.com')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 CURRENT STATUS');
  console.log('==================');
  console.log('Profile Completion Score:', mechanic.profile_completion_score + '%');
  console.log('Can Accept Sessions:', mechanic.can_accept_sessions ? 'YES ✅' : 'NO ❌');
  console.log('Application Status:', mechanic.application_status);
  console.log('');

  if (mechanic.profile_completion_score < 80) {
    console.log('⚠️  WARNING: Profile completion is below 80%');
    console.log('   Mechanic CANNOT accept sessions until >= 80%');
    console.log('');
  }

  // Check each field category
  console.log('📋 FIELD BREAKDOWN');
  console.log('==================\n');

  console.log('BASIC INFO (40 points):');
  console.log('  Name:', mechanic.name ? `✅ "${mechanic.name}"` : '❌ Missing');
  console.log('  Email:', mechanic.email ? `✅ "${mechanic.email}"` : '❌ Missing');
  console.log('  Phone:', mechanic.phone ? `✅ "${mechanic.phone}"` : '❌ Missing');
  console.log('  Profile Photo:', mechanic.profile_photo_url ? `✅ Set` : '⚠️  Missing (optional but 10 points for specialists)');
  console.log('');

  console.log('CREDENTIALS (30 points):');
  console.log('  Years of Experience:', mechanic.years_of_experience ? `✅ ${mechanic.years_of_experience} years` : '❌ Missing');
  console.log('  Red Seal Certified:', mechanic.red_seal_certified ? '✅ YES' : '⚠️  NO (optional but 10 points)');
  console.log('  Certifications Uploaded:', mechanic.certification_documents?.length > 0 || mechanic.other_certifications ? '✅ YES' : '⚠️  NO (optional but 10 points)');
  console.log('');

  console.log('EXPERIENCE (20 points):');
  console.log('  Specializations:', mechanic.specializations?.length > 0 ? `✅ ${mechanic.specializations.length} specializations` : '❌ Missing');
  console.log('  Service Keywords:', mechanic.service_keywords?.length > 0 ? `✅ ${mechanic.service_keywords.length} keywords` : '⚠️  Missing (optional but 10 points)');
  console.log('');

  console.log('LOCATION (10 points):');
  console.log('  City:', mechanic.city ? `✅ "${mechanic.city}"` : '❌ Missing');
  console.log('  Province:', mechanic.province ? `✅ "${mechanic.province}"` : '❌ Missing');
  console.log('');

  console.log('AVAILABILITY (10 points):');
  console.log('  Availability Set:', mechanic.is_available !== null ? `✅ ${mechanic.is_available ? 'Available' : 'Unavailable'}` : '❌ Missing');
  console.log('');

  console.log('PAYMENT (5 points):');
  console.log('  Stripe Connected:', mechanic.stripe_onboarding_completed ? '✅ YES' : '❌ NO');
  console.log('  Stripe Account ID:', mechanic.stripe_account_id ? `✅ ${mechanic.stripe_account_id}` : '❌ Missing');
  console.log('');

  // Additional important fields
  console.log('🔧 OTHER IMPORTANT FIELDS');
  console.log('==================');
  console.log('  Workshop ID:', mechanic.workshop_id ? `✅ ${mechanic.workshop_id}` : '❌ Not affiliated with workshop');
  console.log('  Account Type:', mechanic.account_type);
  console.log('  Shop Affiliation:', mechanic.shop_affiliation || '❌ Missing');
  console.log('  Can Perform Physical Work:', mechanic.can_perform_physical_work ? 'YES ✅' : 'NO ❌');
  console.log('  Participation Mode:', mechanic.participation_mode || '❌ Missing');
  console.log('  Service Tier:', mechanic.service_tier || '❌ Missing');
  console.log('');

  // Calculate what's missing
  const missing = [];
  if (!mechanic.name) missing.push('Name');
  if (!mechanic.email) missing.push('Email');
  if (!mechanic.phone) missing.push('Phone');
  if (!mechanic.years_of_experience || mechanic.years_of_experience === 0) missing.push('Years of Experience');
  if (!mechanic.specializations || mechanic.specializations.length === 0) missing.push('Specializations');
  if (!mechanic.city) missing.push('City');
  if (!mechanic.province) missing.push('Province');
  if (mechanic.is_available === null) missing.push('Availability');
  if (!mechanic.stripe_onboarding_completed) missing.push('Stripe Onboarding');

  if (missing.length > 0) {
    console.log('❌ MISSING REQUIRED FIELDS:');
    missing.forEach(field => console.log(`   - ${field}`));
    console.log('');
  } else {
    console.log('✅ ALL REQUIRED FIELDS PRESENT');
    console.log('');
  }

  // Recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('==================');
  if (mechanic.profile_completion_score < 80) {
    console.log('⚠️  URGENT: Profile completion is ' + mechanic.profile_completion_score + '%');
    console.log('   Need to reach 80% to accept sessions');
    console.log('   Run: node scripts/fix-profile-completion.js');
  } else if (mechanic.profile_completion_score < 100) {
    console.log('⚠️  Profile is ' + mechanic.profile_completion_score + '% (above threshold but not complete)');
    console.log('   Recommended to reach 100% for best results');
  } else {
    console.log('✅ Profile is 100% complete!');
    console.log('   Mechanic can accept sessions');
  }
  console.log('');
}

checkProfileCompletion();
