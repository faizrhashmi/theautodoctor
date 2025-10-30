const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function fixProfileTo100() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('\n========================================');
  console.log('FIXING PROFILE TO 100%');
  console.log('========================================\n');

  const email = 'workshop.mechanic@test.com';

  // Get current mechanic
  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('*')
    .eq('email', email)
    .single();

  if (!mechanic) {
    console.log('❌ Mechanic not found');
    return;
  }

  console.log('Current status:');
  console.log('  Profile Photo:', mechanic.profile_photo_url ? '✅ Set' : '❌ Missing');
  console.log('  Country:', mechanic.country ? `✅ "${mechanic.country}"` : '❌ Missing');
  console.log('  City:', mechanic.city ? `✅ "${mechanic.city}"` : '❌ Missing');
  console.log('  Full Name:', mechanic.full_name ? `✅ "${mechanic.full_name}"` : mechanic.name ? `⚠️  Using "name" instead: "${mechanic.name}"` : '❌ Missing');
  console.log('');

  console.log('Applying fixes...\n');

  // Prepare updates
  const updates = {};

  // 1. Add profile photo (use a placeholder or default image)
  if (!mechanic.profile_photo_url) {
    updates.profile_photo_url = 'https://ui-avatars.com/api/?name=Alex+Thompson&size=200&background=0ea5e9&color=fff';
    console.log('✅ Added profile photo URL (placeholder avatar)');
  }

  // 2. Ensure country is set (it should be, but make sure)
  if (!mechanic.country) {
    updates.country = 'Canada';
    console.log('✅ Set country to "Canada"');
  } else {
    console.log('✅ Country already set:', mechanic.country);
  }

  // 3. Ensure city is set
  if (!mechanic.city) {
    updates.city = 'Toronto';
    console.log('✅ Set city to "Toronto"');
  } else {
    console.log('✅ City already set:', mechanic.city);
  }

  // 4. Ensure name is set (requirements check for full_name but column is 'name')
  if (!mechanic.name) {
    updates.name = 'Alex Thompson';
    console.log('✅ Set name to "Alex Thompson"');
  } else {
    console.log('✅ Name already set:', mechanic.name);
    console.log('   Note: Requirements check "full_name" but column is "name"');
  }

  // Apply updates if any
  if (Object.keys(updates).length > 0) {
    console.log('\nApplying updates to database...');

    const { error: updateError } = await supabase
      .from('mechanics')
      .update(updates)
      .eq('id', mechanic.id);

    if (updateError) {
      console.error('❌ Error updating mechanic:', updateError);
      return;
    }

    console.log('✅ Database updated successfully');
  } else {
    console.log('\nℹ️  No updates needed');
  }

  console.log('');
  console.log('========================================');
  console.log('RECALCULATING PROFILE COMPLETION');
  console.log('========================================\n');

  // Now trigger a recalculation by calling the profile completion API
  console.log('Fetching updated mechanic data...\n');

  const { data: updatedMechanic } = await supabase
    .from('mechanics')
    .select('*')
    .eq('email', email)
    .single();

  if (!updatedMechanic) {
    console.log('❌ Could not fetch updated mechanic');
    return;
  }

  // Get requirements to recalculate
  const { data: requirements } = await supabase
    .from('mechanic_profile_requirements')
    .select('*');

  if (!requirements) {
    console.log('⚠️  No requirements found in mechanic_profile_requirements table');
    console.log('   Profile completion will default to stored value');
    return;
  }

  // Calculate score
  let totalPoints = 0;
  let earnedPoints = 0;
  const missing = [];

  requirements.forEach(req => {
    const isRequired = updatedMechanic.is_brand_specialist
      ? req.required_for_specialist
      : req.required_for_general;

    if (!isRequired) return;

    totalPoints += req.weight;

    const isFilled = checkField(req.field_name, updatedMechanic);

    if (isFilled) {
      earnedPoints += req.weight;
      console.log(`✅ ${req.field_name.padEnd(30)} +${req.weight} points`);
    } else {
      missing.push(req.field_name);
      console.log(`❌ ${req.field_name.padEnd(30)} missing ${req.weight} points`);
    }
  });

  const newScore = Math.round((earnedPoints / totalPoints) * 100);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('NEW CALCULATED SCORE:', earnedPoints, '/', totalPoints, `= ${newScore}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Update the score in the database
  const { error: scoreError } = await supabase
    .from('mechanics')
    .update({
      profile_completion_score: newScore,
      can_accept_sessions: newScore >= 80
    })
    .eq('id', updatedMechanic.id);

  if (scoreError) {
    console.error('❌ Error updating score:', scoreError);
  } else {
    console.log('✅ Profile completion score updated to', newScore + '%');
    console.log('✅ Can accept sessions:', newScore >= 80 ? 'YES' : 'NO');
  }

  console.log('');
  console.log('========================================');
  if (newScore === 100) {
    console.log('🎉 PROFILE IS NOW 100% COMPLETE!');
  } else if (newScore >= 80) {
    console.log('✅ PROFILE IS ABOVE 80% THRESHOLD!');
    console.log('   Mechanic can accept sessions');
    if (missing.length > 0) {
      console.log('');
      console.log('   Still missing (optional):');
      missing.forEach(f => console.log('   -', f));
    }
  } else {
    console.log('⚠️  PROFILE IS STILL BELOW 80%');
    console.log('   Missing required fields:');
    missing.forEach(f => console.log('   -', f));
  }
  console.log('========================================\n');
}

function checkField(fieldName, mechanic) {
  switch (fieldName) {
    case 'full_name':
      return !!(mechanic.full_name || mechanic.name);
    case 'email':
      return !!mechanic.email;
    case 'phone':
      return !!mechanic.phone && mechanic.phone.length >= 10;
    case 'profile_photo':
      return !!mechanic.profile_photo_url;
    case 'years_experience':
    case 'years_of_experience':
      return typeof mechanic.years_of_experience === 'number' && mechanic.years_of_experience > 0;
    case 'red_seal_certified':
      return mechanic.is_brand_specialist ? mechanic.red_seal_certified === true : true;
    case 'certifications_uploaded':
      return (mechanic.certification_documents && mechanic.certification_documents.length > 0) ||
             (mechanic.other_certifications && Object.keys(mechanic.other_certifications).length > 0);
    case 'specializations':
      return Array.isArray(mechanic.specializations) && mechanic.specializations.length > 0;
    case 'service_keywords':
      return Array.isArray(mechanic.service_keywords) && mechanic.service_keywords.length >= 3;
    case 'availability_set':
      return (mechanic.availability_blocks && mechanic.availability_blocks.length > 0) ||
             !!mechanic.availability_schedule ||
             mechanic.is_available !== null;
    case 'stripe_connected':
      return !!mechanic.stripe_account_id;
    case 'country':
      return !!mechanic.country;
    case 'city':
      return !!mechanic.city;
    default:
      return false;
  }
}

fixProfileTo100();
