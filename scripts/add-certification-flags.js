const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addCertificationFlags() {
  console.log('Adding Certification Expansion Feature Flags...\n');

  const flags = [
    {
      flag_key: 'enable_multi_cert_copy',
      flag_name: 'Multi-Certification Copy',
      description: 'Updates homepage and UI copy from "Red Seal" to inclusive language for all certified mechanics (Red Seal, Provincial, ASE, CPA Quebec, Manufacturer Specialists)',
      is_enabled: false,
      enabled_for_roles: ['admin'],
      rollout_percentage: 0,
      metadata: {
        category: 'certification_expansion',
        phase: 'phase_4',
        safe_to_enable: true
      }
    },
    {
      flag_key: 'enable_multi_cert_badges',
      flag_name: 'Multi-Certification Badges',
      description: 'Enables the new CertificationBadge component that displays all 6 certification types with proper styling and icons',
      is_enabled: false,
      enabled_for_roles: ['admin'],
      rollout_percentage: 0,
      metadata: {
        category: 'certification_expansion',
        phase: 'phase_5',
        safe_to_enable: true
      }
    },
    {
      flag_key: 'enable_multi_cert_forms',
      flag_name: 'Multi-Certification Forms',
      description: 'Updates signup and profile forms to allow mechanics to select and input any certification type (not just Red Seal)',
      is_enabled: false,
      enabled_for_roles: ['admin'],
      rollout_percentage: 0,
      metadata: {
        category: 'certification_expansion',
        phase: 'phase_6',
        safe_to_enable: false,
        note: 'Requires form updates - Phase 6 not yet implemented'
      }
    }
  ];

  let added = 0;
  let skipped = 0;

  for (const flag of flags) {
    // Check if flag already exists
    const { data: existing } = await supabase
      .from('feature_flags')
      .select('id, flag_key')
      .eq('flag_key', flag.flag_key)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  Skipped: ${flag.flag_key} (already exists)`);
      skipped++;
      continue;
    }

    // Insert the flag
    const { data, error } = await supabase
      .from('feature_flags')
      .insert(flag)
      .select();

    if (error) {
      console.error(`❌ Error adding ${flag.flag_key}:`, error.message);
    } else {
      console.log(`✅ Added: ${flag.flag_key}`);
      added++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Added: ${added}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📦 Total: ${flags.length}`);

  // Verify
  console.log('\n🔍 Verifying certification flags in database...');
  const { data: allCertFlags } = await supabase
    .from('feature_flags')
    .select('flag_key, flag_name, is_enabled, rollout_percentage')
    .ilike('flag_key', '%cert%')
    .order('flag_key');

  if (allCertFlags && allCertFlags.length > 0) {
    console.log('✅ Certification flags in database:');
    allCertFlags.forEach(f => {
      console.log(`  - ${f.flag_key}: ${f.flag_name} (enabled: ${f.is_enabled}, rollout: ${f.rollout_percentage}%)`);
    });
  } else {
    console.log('⚠️  No certification flags found in database');
  }
}

addCertificationFlags().catch(console.error);
