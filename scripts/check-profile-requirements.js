const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkProfileRequirements() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('\n========================================');
  console.log('CHECKING PROFILE REQUIREMENTS TABLE');
  console.log('========================================\n');

  // Check if table exists and get requirements
  const { data: requirements, error } = await supabase
    .from('mechanic_profile_requirements')
    .select('*')
    .order('weight', { ascending: false });

  if (error) {
    console.error('❌ Error fetching requirements:', error.message);
    console.log('\n⚠️  The mechanic_profile_requirements table may not exist.');
    console.log('   Profile completion calculation depends on this table.');
    return;
  }

  if (!requirements || requirements.length === 0) {
    console.log('⚠️  WARNING: mechanic_profile_requirements table is EMPTY!');
    console.log('');
    console.log('This is why profile completion shows 59% instead of 100%.');
    console.log('The frontend tries to calculate completion but has no requirements to check.');
    console.log('');
    console.log('SOLUTION: Populate the mechanic_profile_requirements table.');
    return;
  }

  console.log(`Found ${requirements.length} profile requirements:\n`);

  let totalWeightGeneral = 0;
  let totalWeightSpecialist = 0;

  console.log('┌─────────────────────────────┬──────────┬──────────┬─────────────┐');
  console.log('│ Field Name                  │ Category │ Weight   │ Required    │');
  console.log('├─────────────────────────────┼──────────┼──────────┼─────────────┤');

  requirements.forEach(req => {
    const generalMark = req.required_for_general ? '✓ Gen' : '';
    const specialistMark = req.required_for_specialist ? '✓ Spec' : '';
    const requiredStr = [generalMark, specialistMark].filter(Boolean).join(', ') || 'Optional';

    console.log(
      `│ ${req.field_name.padEnd(27)} │ ${req.field_category.padEnd(8)} │ ${String(req.weight).padEnd(8)} │ ${requiredStr.padEnd(11)} │`
    );

    if (req.required_for_general) totalWeightGeneral += req.weight;
    if (req.required_for_specialist) totalWeightSpecialist += req.weight;
  });

  console.log('└─────────────────────────────┴──────────┴──────────┴─────────────┘');
  console.log('');
  console.log('Total weight for general mechanics:', totalWeightGeneral);
  console.log('Total weight for brand specialists:', totalWeightSpecialist);
  console.log('');

  // Now check our dummy mechanic against these requirements
  console.log('========================================');
  console.log('CHECKING DUMMY MECHANIC AGAINST REQUIREMENTS');
  console.log('========================================\n');

  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('*')
    .eq('email', 'workshop.mechanic@test.com')
    .single();

  if (!mechanic) {
    console.log('❌ Dummy mechanic not found');
    return;
  }

  console.log('Mechanic:', mechanic.name);
  console.log('Is Brand Specialist:', mechanic.is_brand_specialist ? 'YES' : 'NO');
  console.log('');

  let earnedPoints = 0;
  let totalPoints = 0;
  const missing = [];

  requirements.forEach(req => {
    const isRequired = mechanic.is_brand_specialist
      ? req.required_for_specialist
      : req.required_for_general;

    if (!isRequired) return;

    totalPoints += req.weight;

    // Check field
    const isFilled = checkField(req.field_name, mechanic);

    if (isFilled) {
      earnedPoints += req.weight;
      console.log(`✅ ${req.field_name.padEnd(30)} +${req.weight} points`);
    } else {
      missing.push({
        field: req.field_name,
        weight: req.weight,
        category: req.field_category
      });
      console.log(`❌ ${req.field_name.padEnd(30)} missing ${req.weight} points`);
    }
  });

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CALCULATED SCORE:', earnedPoints, '/', totalPoints, `= ${Math.round((earnedPoints / totalPoints) * 100)}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (missing.length > 0) {
    console.log('🔧 MISSING FIELDS TO FIX:');
    missing.forEach(m => {
      console.log(`   - ${m.field} (${m.category}, -${m.weight} points)`);
    });
    console.log('');
  } else {
    console.log('✅ ALL REQUIRED FIELDS ARE FILLED!');
    console.log('');
  }
}

function checkField(fieldName, mechanic) {
  switch (fieldName) {
    case 'full_name':
      return !!mechanic.full_name || !!mechanic.name;
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
    default:
      console.warn(`Unknown field: ${fieldName}`);
      return false;
  }
}

checkProfileRequirements();
