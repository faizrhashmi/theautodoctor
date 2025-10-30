const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function finalStatus() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  FINAL PROFILE STATUS REPORT');
  console.log('═══════════════════════════════════════════════════════\n');

  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('*')
    .eq('email', 'workshop.mechanic@test.com')
    .single();

  console.log('🔍 CURRENT STORED VALUES');
  console.log('─────────────────────────────────────────────────────');
  console.log('Profile Completion Score (DB):', mechanic.profile_completion_score + '%');
  console.log('Can Accept Sessions (DB):', mechanic.can_accept_sessions ? 'YES ✅' : 'NO ❌');
  console.log('Application Status:', mechanic.application_status);
  console.log('Background Check:', mechanic.background_check_status);
  console.log('');

  // Get requirements
  const { data: requirements } = await supabase
    .from('mechanic_profile_requirements')
    .select('*');

  if (!requirements || requirements.length === 0) {
    console.log('⚠️  mechanic_profile_requirements table is empty!');
    console.log('   Profile completion cannot be calculated dynamically.');
    console.log('   Using stored value:', mechanic.profile_completion_score + '%');
    console.log('');
    return;
  }

  // Calculate based on requirements
  let totalPoints = 0;
  let earnedPoints = 0;
  const missingFields = [];
  const presentFields = [];

  console.log('📊 DYNAMIC CALCULATION (Based on Requirements Table)');
  console.log('─────────────────────────────────────────────────────');

  requirements.forEach(req => {
    const isRequired = mechanic.is_brand_specialist
      ? req.required_for_specialist
      : req.required_for_general;

    if (!isRequired) return;

    totalPoints += req.weight;

    const isFilled = checkField(req.field_name, mechanic);

    if (isFilled) {
      earnedPoints += req.weight;
      presentFields.push({ field: req.field_name, weight: req.weight });
    } else {
      missingFields.push({ field: req.field_name, weight: req.weight, exists: columnExists(req.field_name) });
    }
  });

  const calculatedScore = Math.round((earnedPoints / totalPoints) * 100);

  console.log('Total Possible Points:', totalPoints);
  console.log('Earned Points:', earnedPoints);
  console.log('Calculated Score:', calculatedScore + '%');
  console.log('Can Accept Sessions:', calculatedScore >= 80 ? 'YES ✅' : 'NO ❌');
  console.log('');

  if (missingFields.length > 0) {
    console.log('❌ MISSING FIELDS (' + missingFields.length + '):');
    console.log('─────────────────────────────────────────────────────');
    missingFields.forEach(f => {
      const columnStatus = f.exists ? '✅ Column exists' : '❌ Column missing from schema';
      console.log(`  • ${f.field.padEnd(30)} -${f.weight} pts   ${columnStatus}`);
    });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  if (calculatedScore >= 80) {
    console.log('✅ MECHANIC CAN ACCEPT SESSIONS!');
    console.log('');
    console.log('   Current Score: ' + calculatedScore + '% (Threshold: 80%)');
    console.log('   Status: ABOVE THRESHOLD ✅');
    console.log('');

    if (calculatedScore < 100) {
      console.log('   📝 To reach 100%:');
      const schemaMissing = missingFields.filter(f => !f.exists);
      const valueMissing = missingFields.filter(f => f.exists);

      if (schemaMissing.length > 0) {
        console.log('');
        console.log('   ⚠️  SCHEMA ISSUES (columns don\'t exist):');
        schemaMissing.forEach(f => {
          console.log('      - ' + f.field + ' (need to add column to mechanics table)');
        });
      }

      if (valueMissing.length > 0) {
        console.log('');
        console.log('   📝 MISSING VALUES (columns exist but empty):');
        valueMissing.forEach(f => {
          console.log('      - ' + f.field);
        });
      }
    } else {
      console.log('   🎉 PROFILE IS 100% COMPLETE!');
    }
  } else {
    console.log('❌ MECHANIC CANNOT ACCEPT SESSIONS');
    console.log('');
    console.log('   Current Score: ' + calculatedScore + '%');
    console.log('   Required: 80%');
    console.log('   Gap: ' + (80 - calculatedScore) + '%');
    console.log('');
    console.log('   Must fix ' + missingFields.length + ' missing fields to reach threshold.');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════\n');
}

function checkField(fieldName, mechanic) {
  const mechanicColumns = Object.keys(mechanic);

  switch (fieldName) {
    case 'full_name':
      return !!(mechanic.full_name || mechanic.name);
    case 'email':
      return !!mechanic.email;
    case 'phone':
      return !!mechanic.phone && mechanic.phone.length >= 10;
    case 'profile_photo':
      // Check various possible photo column names
      return !!(mechanic.profile_photo_url || mechanic.profile_photo || mechanic.avatar_url || mechanic.photo_url);
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
      // Check if column exists and is filled
      return mechanicColumns.includes(fieldName) && mechanic[fieldName] != null && mechanic[fieldName] !== '';
  }
}

function columnExists(fieldName) {
  // Common mechanic table columns based on schema
  const knownColumns = [
    'id', 'created_at', 'name', 'email', 'phone', 'user_id',
    'stripe_account_id', 'stripe_onboarding_completed', 'stripe_charges_enabled',
    'stripe_payouts_enabled', 'stripe_details_submitted',
    'red_seal_certified', 'red_seal_number', 'red_seal_province', 'red_seal_expiry_date',
    'certification_documents', 'other_certifications', 'years_of_experience',
    'specializations', 'shop_affiliation', 'shop_name', 'shop_address',
    'business_license_number', 'business_license_document',
    'full_address', 'city', 'province', 'postal_code', 'country', 'state_province',
    'date_of_birth', 'liability_insurance', 'insurance_policy_number',
    'insurance_expiry', 'insurance_document', 'criminal_record_check',
    'crc_date', 'crc_document', 'sin_or_business_number', 'banking_info_completed',
    'application_status', 'background_check_status', 'approval_notes',
    'reviewed_by', 'reviewed_at', 'application_submitted_at', 'approved_at',
    'application_draft', 'current_step', 'last_updated', 'account_type',
    'workshop_id', 'source', 'requires_sin_collection', 'sin_collection_completed_at',
    'auto_approved', 'sin_encrypted', 'invited_by', 'invite_accepted_at',
    'is_available', 'rating', 'completed_sessions', 'is_brand_specialist',
    'brand_specializations', 'service_keywords', 'profile_completion_score',
    'can_accept_sessions', 'specialist_tier', 'timezone', 'service_tier',
    'partnership_type', 'partnership_terms', 'can_perform_physical_work',
    'prefers_virtual', 'prefers_physical', 'mobile_license_number',
    'mobile_license_expiry', 'mobile_license_province', 'participation_mode',
    'currently_on_shift', 'last_clock_in', 'last_clock_out',
    'daily_micro_minutes_cap', 'daily_micro_minutes_used', 'last_micro_reset_date'
  ];

  // Map requirement field names to actual column names
  const fieldMapping = {
    'full_name': 'name',
    'profile_photo': null, // Doesn't exist
    'years_experience': 'years_of_experience',
    'certifications_uploaded': 'other_certifications',
    'availability_set': 'is_available',
    'stripe_connected': 'stripe_account_id'
  };

  const actualColumn = fieldMapping[fieldName] || fieldName;

  if (actualColumn === null) return false;

  return knownColumns.includes(actualColumn);
}

finalStatus();
