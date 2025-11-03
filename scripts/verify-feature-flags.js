/**
 * Verification Script for Feature Flag Integration
 * Tests that certification expansion flags are properly integrated
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyFeatureFlags() {
  console.log('🔍 Verifying Feature Flag Integration...\n');

  // 1. Check if certification flags exist in database
  console.log('1️⃣  Checking database for certification flags...');
  const { data: certFlags, error: fetchError } = await supabase
    .from('feature_flags')
    .select('*')
    .ilike('flag_key', '%cert%')
    .order('flag_key');

  if (fetchError) {
    console.error('❌ Error fetching flags:', fetchError.message);
    return false;
  }

  if (!certFlags || certFlags.length === 0) {
    console.error('❌ No certification flags found in database');
    return false;
  }

  console.log(`✅ Found ${certFlags.length} certification flag(s):`);
  certFlags.forEach(flag => {
    console.log(`   - ${flag.flag_key}`);
    console.log(`     Name: ${flag.flag_name}`);
    console.log(`     Enabled: ${flag.is_enabled}`);
    console.log(`     Rollout: ${flag.rollout_percentage}%`);
    console.log(`     Category: ${flag.metadata?.category || 'N/A'}`);
    console.log('');
  });

  // 2. Verify all expected flags exist
  console.log('2️⃣  Verifying all expected flags exist...');
  const expectedFlags = [
    'enable_multi_cert_copy',
    'enable_multi_cert_badges',
    'enable_multi_cert_forms'
  ];

  const foundKeys = certFlags.map(f => f.flag_key);
  const missingFlags = expectedFlags.filter(key => !foundKeys.includes(key));

  if (missingFlags.length > 0) {
    console.error(`❌ Missing flags: ${missingFlags.join(', ')}`);
    return false;
  }

  console.log('✅ All expected flags present\n');

  // 3. Test toggle functionality
  console.log('3️⃣  Testing flag toggle functionality...');
  const testFlag = certFlags[0];
  const originalState = testFlag.is_enabled;

  console.log(`   Testing with flag: ${testFlag.flag_key}`);
  console.log(`   Original state: ${originalState}`);

  // Toggle to opposite state
  const { error: updateError } = await supabase
    .from('feature_flags')
    .update({ is_enabled: !originalState })
    .eq('flag_key', testFlag.flag_key);

  if (updateError) {
    console.error('❌ Error toggling flag:', updateError.message);
    return false;
  }

  // Read back to verify
  const { data: updatedFlag } = await supabase
    .from('feature_flags')
    .select('is_enabled')
    .eq('flag_key', testFlag.flag_key)
    .single();

  if (updatedFlag.is_enabled !== !originalState) {
    console.error('❌ Flag state did not change correctly');
    return false;
  }

  console.log(`   ✅ Successfully toggled to: ${updatedFlag.is_enabled}`);

  // Restore original state
  await supabase
    .from('feature_flags')
    .update({ is_enabled: originalState })
    .eq('flag_key', testFlag.flag_key);

  console.log(`   ✅ Restored original state: ${originalState}\n`);

  // 4. Check API routes exist
  console.log('4️⃣  Checking if admin API routes exist...');
  const fs = require('fs');
  const path = require('path');

  const apiRoutes = [
    'src/app/api/admin/feature-flags/route.ts',
    'src/app/api/admin/feature-flags/[id]/route.ts'
  ];

  let allRoutesExist = true;
  apiRoutes.forEach(route => {
    const fullPath = path.join(process.cwd(), route);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ ${route}`);
    } else {
      console.error(`   ❌ ${route} NOT FOUND`);
      allRoutesExist = false;
    }
  });

  if (!allRoutesExist) return false;

  console.log('');

  // 5. Check admin UI exists
  console.log('5️⃣  Checking if admin UI exists...');
  const adminUIPath = 'src/app/admin/(shell)/feature-flags/page.tsx';
  const fullUIPath = path.join(process.cwd(), adminUIPath);

  if (fs.existsSync(fullUIPath)) {
    console.log(`   ✅ ${adminUIPath}`);
  } else {
    console.error(`   ❌ ${adminUIPath} NOT FOUND`);
    return false;
  }

  console.log('');

  // 6. Check helper library exists
  console.log('6️⃣  Checking if helper library exists...');
  const helperPath = 'src/lib/featureFlags.ts';
  const fullHelperPath = path.join(process.cwd(), helperPath);

  if (fs.existsSync(fullHelperPath)) {
    console.log(`   ✅ ${helperPath}`);
  } else {
    console.error(`   ❌ ${helperPath} NOT FOUND`);
    return false;
  }

  console.log('');

  // 7. Summary
  console.log('═'.repeat(60));
  console.log('🎉 VERIFICATION COMPLETE - ALL CHECKS PASSED!');
  console.log('═'.repeat(60));
  console.log('');
  console.log('✅ Database: Certification flags present and functional');
  console.log('✅ API Routes: Admin endpoints exist');
  console.log('✅ Admin UI: Feature flags page exists');
  console.log('✅ Helper Library: Feature flag helpers exist');
  console.log('');
  console.log('📊 Current Flag States:');
  certFlags.forEach(flag => {
    const status = flag.is_enabled ? '🟢 ENABLED' : '🔴 DISABLED';
    console.log(`   ${status} ${flag.flag_name} (${flag.rollout_percentage}%)`);
  });
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('   1. Start the dev server: npm run dev');
  console.log('   2. Navigate to: /admin/feature-flags');
  console.log('   3. Toggle certification flags as needed');
  console.log('   4. Observe homepage changes in real-time');
  console.log('');

  return true;
}

verifyFeatureFlags()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
