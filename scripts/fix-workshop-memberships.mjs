// Fix workshop memberships - create organization_members records
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const workshops = [
  {
    orgId: '98aeac24-8fe8-45d9-9838-a632bfcea85a',
    name: 'Premium Auto Care',
    userId: 'c1838c27-895e-49df-835b-1a0ac3d35614',
    email: 'contact@premiumauto.com'
  },
  {
    orgId: '78db0e30-5e16-4092-a6fd-ba9bd31b6b84',
    name: 'Quick Fix Garage',
    userId: '22cdcbd4-0cd5-420f-a0a7-d3cb2476d09b',
    email: 'info@quickfix.com'
  },
  {
    orgId: '2ec0070c-cabf-425c-becd-5e4bd8c1f913',
    name: 'Expert Motors',
    userId: '9a5c8e9b-f090-4d2b-a235-c3c7f408f2fb',
    email: 'service@expertmotors.com'
  }
];

async function fixWorkshopMemberships() {
  console.log('🔧 Fixing workshop memberships...\n');

  for (const workshop of workshops) {
    try {
      console.log(`\n📝 Processing: ${workshop.name}`);
      console.log(`   Organization ID: ${workshop.orgId}`);
      console.log(`   User ID: ${workshop.userId}`);

      // Check if membership already exists
      const { data: existingMembership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', workshop.orgId)
        .eq('user_id', workshop.userId)
        .maybeSingle();

      if (existingMembership) {
        console.log('   ⚠️  Membership already exists, updating status...');

        const { error: updateError } = await supabase
          .from('organization_members')
          .update({
            status: 'active',
            role: 'owner',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMembership.id);

        if (updateError) {
          console.log(`   ❌ Error updating membership: ${updateError.message}`);
        } else {
          console.log('   ✅ Membership updated to active');
        }
      } else {
        console.log('   Creating new membership...');

        // Create organization_members record
        const { data: membershipData, error: membershipError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: workshop.orgId,
            user_id: workshop.userId,
            role: 'owner',
            status: 'active',
            joined_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (membershipError) {
          console.log(`   ❌ Error creating membership: ${membershipError.message}`);
          continue;
        }

        console.log(`   ✅ Membership created: ${membershipData.id}`);
      }

      // Also update organization status to active if needed
      const { error: orgUpdateError } = await supabase
        .from('organizations')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', workshop.orgId);

      if (orgUpdateError) {
        console.log(`   ⚠️  Org status error: ${orgUpdateError.message}`);
      } else {
        console.log('   ✅ Organization status set to active');
      }

      console.log(`   ✅ Complete: ${workshop.name}`);

    } catch (err) {
      console.error(`   ❌ Error processing ${workshop.name}:`, err.message);
    }
  }

  console.log('\n\n✅ Workshop memberships fixed!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 YOU CAN NOW LOG IN');
  console.log('═══════════════════════════════════════════════════════\n');

  workshops.forEach((w, i) => {
    console.log(`${i + 1}. ${w.name}`);
    console.log(`   Email:    ${w.email}`);
    console.log(`   Password: 12345678`);
    console.log(`   URL:      http://localhost:3000/workshop/login\n`);
  });

  console.log('═══════════════════════════════════════════════════════');
}

fixWorkshopMemberships().catch(console.error);
