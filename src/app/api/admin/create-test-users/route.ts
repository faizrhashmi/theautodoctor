import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards';
import { createClient } from '@supabase/supabase-js';

// CLEANED UP: Removed hashPassword import (deprecated old auth function)
// Mechanic records no longer store password_hash - they use Supabase Auth

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const password = '12345678';
    const results = {
      customers: [] as any[],
      mechanics: [] as any[],
      admins: [] as any[],
      workshops: [] as any[]
    };

    // ========================================================================
    // 1. CREATE CUSTOMERS (3)
    // ========================================================================
    console.log('\n========== CREATING CUSTOMERS ==========');
    const customerEmails = ['cust1@test.com', 'cust2@test.com', 'cust3@test.com'];

    for (let i = 0; i < customerEmails.length; i++) {
      const email = customerEmails[i];
      console.log(`Creating customer: ${email}`);

      // Create or get existing auth user
      let authData = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'customer',
          full_name: `Customer ${i + 1}`,
          phone: `416-555-010${i}`
        }
      });

      // If user already exists, get their ID
      if (authData.error && (authData.error.message.includes('already registered') || authData.error.message.includes('already been registered'))) {
        console.log(`User already exists: ${email}, fetching existing user...`);
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
        if (existingUser) {
          authData = { data: { user: existingUser }, error: null };
        } else {
          console.error(`Failed to create or find customer: ${email}`, authData.error);
          results.customers.push({ email, error: authData.error.message });
          continue;
        }
      } else if (authData.error) {
        console.error(`Failed to create customer auth: ${email}`, authData.error);
        results.customers.push({ email, error: authData.error.message });
        continue;
      }

      // Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.data.user.id,
          email: email,
          full_name: `Customer ${i + 1}`,
          phone: `416-555-010${i}`,
          role: 'customer',
          account_type: 'individual_customer',
          email_verified: true,
          is_18_plus: true,
          profile_completed: true,
          onboarding_completed: true
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error(`Failed to create customer profile: ${email}`, profileError);
        results.customers.push({ email, authId: authData.data.user.id, error: profileError.message });
      } else {
        console.log(`✓ Customer created: ${email}`);
        results.customers.push({ email, authId: authData.data.user.id, success: true });
      }
    }

    // ========================================================================
    // 2. CREATE MECHANICS (3)
    // ========================================================================
    console.log('\n========== CREATING MECHANICS ==========');
    const mechanicEmails = ['mech@test.com', 'mech1@test.com', 'mech2@test.com'];

    for (let i = 0; i < mechanicEmails.length; i++) {
      const email = mechanicEmails[i];
      console.log(`Creating mechanic: ${email}`);

      // Create or get existing auth user
      let authData = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'mechanic',
          full_name: `Mechanic ${i + 1}`,
          phone: `416-555-020${i}`
        }
      });

      // If user already exists, get their ID
      if (authData.error && (authData.error.message.includes('already registered') || authData.error.message.includes('already been registered'))) {
        console.log(`User already exists: ${email}, fetching existing user...`);
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
        if (existingUser) {
          authData = { data: { user: existingUser }, error: null };
        } else {
          console.error(`Failed to create or find mechanic: ${email}`, authData.error);
          results.mechanics.push({ email, error: authData.error.message });
          continue;
        }
      } else if (authData.error) {
        console.error(`Failed to create mechanic auth: ${email}`, authData.error);
        results.mechanics.push({ email, error: authData.error.message });
        continue;
      }

      // CLEANED UP: Removed password_hash - mechanics now use Supabase Auth
      // Check if mechanic record exists
      const { data: existingMech } = await supabase
        .from('mechanics')
        .select('id, account_type')
        .eq('email', email)
        .maybeSingle();

      console.log('[CREATE MECHANIC] Existing mechanic:', existingMech);

      // Create or update mechanic record (linked to Supabase Auth)
      const insertData: any = {
        id: existingMech?.id,  // Preserve existing ID if found
        email: email,
        name: `Mechanic ${i + 1}`,
        phone: `416-555-020${i}`,
        user_id: authData.data.user.id, // Link to Supabase Auth
        application_status: 'approved',
        is_available: true,
        can_accept_sessions: true,
        participation_mode: 'both',  // Must be: micro_only, full_only, or both
        approved_at: new Date().toISOString()
      };

      // Only set account_type if updating existing record
      if (existingMech) {
        insertData.account_type = 'independent';
      }

      // Create or update profile for the mechanic
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.data.user.id,
          email: email,
          full_name: `Mechanic ${i + 1}`,
          phone: `416-555-020${i}`,
          role: 'mechanic',
          account_type: 'individual_customer',
          email_verified: true,
          is_18_plus: true,
          profile_completed: true,
          onboarding_completed: true
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error(`Failed to create mechanic profile: ${email}`, profileError);
      }

      const { data: mechData, error: mechError } = await supabase
        .from('mechanics')
        .upsert(insertData)
        .select()
        .single();

      if (mechError) {
        console.error(`Failed to create mechanic record: ${email}`, mechError);
        results.mechanics.push({ email, authId: authData.data.user.id, error: mechError.message });
      } else {
        console.log(`✓ Mechanic created: ${email}`);
        results.mechanics.push({
          email,
          authId: authData.data.user.id,
          mechanicId: mechData.id,
          success: true
        });
      }
    }

    // ========================================================================
    // 3. CREATE ADMINS (3)
    // ========================================================================
    console.log('\n========== CREATING ADMINS ==========');
    const adminEmails = ['admin@test.com', 'admin1@test.com', 'admin2@test.com'];

    for (let i = 0; i < adminEmails.length; i++) {
      const email = adminEmails[i];
      console.log(`Creating admin: ${email}`);

      // Create or get existing auth user
      let authData = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          full_name: `Admin ${i === 0 ? '' : i}`,
          phone: `416-555-030${i}`
        }
      });

      // If user already exists, get their ID
      if (authData.error && (authData.error.message.includes('already registered') || authData.error.message.includes('already been registered'))) {
        console.log(`User already exists: ${email}, fetching existing user...`);
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
        if (existingUser) {
          authData = { data: { user: existingUser }, error: null };
        } else {
          console.error(`Failed to create or find admin: ${email}`, authData.error);
          results.admins.push({ email, error: authData.error.message });
          continue;
        }
      } else if (authData.error) {
        console.error(`Failed to create admin auth: ${email}`, authData.error);
        results.admins.push({ email, error: authData.error.message });
        continue;
      }

      // Create or update profile with admin role
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.data.user.id,
          email: email,
          full_name: `Admin ${i === 0 ? '' : i}`,
          phone: `416-555-030${i}`,
          role: 'admin',
          account_type: 'individual_customer',  // No 'admin' type, admins use customer type with role='admin'
          email_verified: true,
          is_18_plus: true,
          profile_completed: true,
          onboarding_completed: true
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error(`Failed to create admin profile: ${email}`, profileError);
        results.admins.push({ email, authId: authData.data.user.id, error: profileError.message });
      } else {
        console.log(`✓ Admin created: ${email}`);
        results.admins.push({ email, authId: authData.data.user.id, success: true });
      }
    }

    // ========================================================================
    // 4. CREATE WORKSHOPS (3)
    // ========================================================================
    console.log('\n========== CREATING WORKSHOPS ==========');
    const workshopEmails = ['workshop1@test.com', 'workshop2@test.com', 'workshop3@test.com'];

    for (let i = 0; i < workshopEmails.length; i++) {
      const email = workshopEmails[i];
      const workshopName = `Test Workshop ${i + 1}`;
      const slug = `test-workshop-${i + 1}`;

      console.log(`Creating workshop: ${email}`);

      // Create or get existing auth user
      let authData = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'workshop',
          full_name: workshopName,
          phone: `416-555-040${i}`
        }
      });

      // If user already exists, get their ID
      if (authData.error && (authData.error.message.includes('already registered') || authData.error.message.includes('already been registered'))) {
        console.log(`User already exists: ${email}, fetching existing user...`);
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
        if (existingUser) {
          authData = { data: { user: existingUser }, error: null };
        } else {
          console.error(`Failed to create or find workshop: ${email}`, authData.error);
          results.workshops.push({ email, error: authData.error.message });
          continue;
        }
      } else if (authData.error) {
        console.error(`Failed to create workshop auth: ${email}`, authData.error);
        results.workshops.push({ email, error: authData.error.message });
        continue;
      }

      // Check if organization already exists by email
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      // Create or update organization record
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .upsert({
          id: existingOrg?.id,  // Use existing ID if found, otherwise auto-generate
          email: email,
          name: workshopName,
          slug: slug,
          phone: `416-555-040${i}`,
          organization_type: 'workshop',
          status: 'active',
          verification_status: 'verified',  // Must be: unverified, pending, verified, or rejected
          approved_at: new Date().toISOString(),
          created_by: authData.data.user.id,
          city: 'Toronto',
          country: 'Canada',
          province: 'Ontario'
        })
        .select()
        .single();

      if (orgError) {
        console.error(`Failed to create workshop organization: ${email}`, orgError);
        results.workshops.push({ email, authId: authData.data.user.id, error: orgError.message });
      } else {
        // Create organization_members record to link user to workshop
        const { error: memberError } = await supabase
          .from('organization_members')
          .upsert({
            organization_id: orgData.id,
            user_id: authData.data.user.id,
            role: 'owner',
            status: 'active',
            joined_at: new Date().toISOString()
          });

        if (memberError) {
          console.error(`Failed to create organization member: ${email}`, memberError);
          results.workshops.push({ email, authId: authData.data.user.id, workshopId: orgData.id, error: memberError.message });
        } else {
          console.log(`✓ Workshop created: ${email} (${workshopName})`);
          results.workshops.push({
            email,
            authId: authData.data.user.id,
            workshopId: orgData.id,
            workshopName,
            success: true
          });
        }
      }
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n========== CREATION SUMMARY ==========');
    console.log('Customers created:', results.customers.filter(c => c.success).length);
    console.log('Mechanics created:', results.mechanics.filter(m => m.success).length);
    console.log('Admins created:', results.admins.filter(a => a.success).length);
    console.log('Workshops created:', results.workshops.filter(w => w.success).length);

    return NextResponse.json({
      success: true,
      message: 'Test users created successfully',
      results,
      summary: {
        customers: results.customers.filter(c => c.success).length + '/3',
        mechanics: results.mechanics.filter(m => m.success).length + '/3',
        admins: results.admins.filter(a => a.success).length + '/3',
        workshops: results.workshops.filter(w => w.success).length + '/3'
      }
    });

  } catch (error: unknown) {
    console.error('[CREATE TEST USERS] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
