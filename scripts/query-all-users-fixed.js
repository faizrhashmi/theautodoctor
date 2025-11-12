const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryAllUsers() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE USER DATABASE AUDIT - USERS IN THE DATABASE');
  console.log('='.repeat(80));
  console.log('');

  // 1. Get all profiles (base user table)
  console.log('\n📊 ALL PROFILES (Base User Table)');
  console.log('-'.repeat(80));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  } else {
    console.log(`Total profiles: ${profiles?.length || 0}`);
    profiles?.forEach((profile, idx) => {
      console.log(`\n[${idx + 1}] Profile ID: ${profile.id}`);
      console.log(`   Email: ${profile.email || 'N/A'}`);
      console.log(`   Full Name: ${profile.full_name || 'N/A'}`);
      console.log(`   Phone: ${profile.phone || 'N/A'}`);
      console.log(`   Role: ${profile.role || 'N/A'}`);
      console.log(`   Account Type: ${profile.account_type || 'N/A'}`);
      console.log(`   Location: ${profile.city || 'N/A'}, ${profile.province || 'N/A'}, ${profile.country || 'N/A'}`);
      console.log(`   Postal Code: ${profile.postal_code || 'N/A'}`);
      console.log(`   Organization ID: ${profile.organization_id || 'None'}`);
      console.log(`   Account Status: ${profile.account_status || 'N/A'}`);
      console.log(`   Email Verified: ${profile.email_verified ? 'YES' : 'NO'}`);
      console.log(`   Profile Completed: ${profile.profile_completed ? 'YES' : 'NO'}`);
      console.log(`   Onboarding Completed: ${profile.onboarding_completed ? 'YES' : 'NO'}`);
      console.log(`   Suspended Until: ${profile.suspended_until || 'Not suspended'}`);
      console.log(`   Ban Reason: ${profile.ban_reason || 'N/A'}`);
      console.log(`   Anonymized: ${profile.anonymized ? 'YES' : 'NO'}`);
      console.log(`   Deleted At: ${profile.deleted_at || 'Not deleted'}`);
      console.log(`   Created: ${profile.created_at}`);
    });
  }

  // 2. Get all mechanics using mechanic_profiles view
  console.log('\n\n🔧 ALL MECHANICS');
  console.log('-'.repeat(80));
  const { data: mechanics, error: mechanicsError } = await supabase
    .from('mechanic_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (mechanicsError) {
    console.error('Error fetching mechanics:', mechanicsError);
  } else {
    console.log(`Total mechanics: ${mechanics?.length || 0}`);

    const virtualMechanics = mechanics?.filter(m => m.is_virtual) || [];
    const independentMechanics = mechanics?.filter(m => !m.is_virtual && !m.workshop_id) || [];
    const workshopAffiliated = mechanics?.filter(m => !m.is_virtual && m.workshop_id) || [];

    console.log(`\n📱 Virtual Mechanics: ${virtualMechanics.length}`);
    console.log(`👤 Independent Mechanics: ${independentMechanics.length}`);
    console.log(`🏢 Workshop-Affiliated Mechanics: ${workshopAffiliated.length}`);

    mechanics?.forEach((mech, idx) => {
      console.log(`\n[${idx + 1}] Mechanic ID: ${mech.id}`);
      console.log(`   User ID: ${mech.user_id}`);
      console.log(`   Email: ${mech.email || 'N/A'}`);
      console.log(`   Name: ${mech.full_name || 'N/A'}`);
      console.log(`   Phone: ${mech.phone || 'N/A'}`);
      console.log(`   Type: ${mech.is_virtual ? '📱 VIRTUAL' : (mech.workshop_id ? '🏢 WORKSHOP-AFFILIATED' : '👤 INDEPENDENT')}`);
      console.log(`   Workshop ID: ${mech.workshop_id || 'None'}`);
      console.log(`   Online Status: ${mech.is_online ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
      console.log(`   Available: ${mech.is_available ? 'YES' : 'NO'}`);
      console.log(`   Certifications: ${mech.certifications?.join(', ') || 'None'}`);
      console.log(`   Specializations: ${mech.specializations?.join(', ') || 'None'}`);
      console.log(`   Hourly Rate: $${mech.hourly_rate || 'N/A'}`);
      console.log(`   Location: ${mech.city || 'N/A'}, ${mech.province || 'N/A'}, ${mech.country || 'N/A'}`);
      console.log(`   Postal Code: ${mech.postal_code || 'N/A'}`);
      console.log(`   Rating: ${mech.rating || 'N/A'} (${mech.total_reviews || 0} reviews)`);
      console.log(`   Active Sessions: ${mech.active_sessions_count || 0}`);
      console.log(`   Is Suspended: ${mech.is_suspended ? '⚠️ YES' : 'NO'}`);
      console.log(`   Suspension Reason: ${mech.suspension_reason || 'N/A'}`);
      console.log(`   Stripe Setup: ${mech.stripe_onboarding_completed ? '✅ Complete' : '❌ Incomplete'}`);
      console.log(`   Created: ${mech.created_at}`);
    });
  }

  // 3. Get all customers using customer_profiles view
  console.log('\n\n👥 ALL CUSTOMERS');
  console.log('-'.repeat(80));
  const { data: customers, error: customersError } = await supabase
    .from('customer_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (customersError) {
    console.error('Error fetching customers:', customersError);
  } else {
    console.log(`Total customers: ${customers?.length || 0}`);
    customers?.forEach((cust, idx) => {
      console.log(`\n[${idx + 1}] Customer ID: ${cust.id}`);
      console.log(`   User ID: ${cust.user_id}`);
      console.log(`   Email: ${cust.email || 'N/A'}`);
      console.log(`   Name: ${cust.full_name || 'N/A'}`);
      console.log(`   Phone: ${cust.phone || 'N/A'}`);
      console.log(`   Location: ${cust.city || 'N/A'}, ${cust.province || 'N/A'}, ${cust.country || 'N/A'}`);
      console.log(`   Postal Code: ${cust.postal_code || 'N/A'}`);
      console.log(`   Vehicle Info: ${JSON.stringify(cust.vehicle_info) || 'N/A'}`);
      console.log(`   Onboarding Complete: ${cust.onboarding_completed ? 'YES' : '❌ NO'}`);
      console.log(`   Profile Complete: ${cust.profile_completed ? 'YES' : '❌ NO'}`);
      console.log(`   Email Verified: ${cust.email_verified ? 'YES' : '❌ NO'}`);
      console.log(`   Referred By Workshop: ${cust.referred_by_workshop_id || 'None'}`);
      console.log(`   Created: ${cust.created_at}`);
    });
  }

  // 4. Get all workshops using workshop_profiles view
  console.log('\n\n🏢 ALL WORKSHOPS');
  console.log('-'.repeat(80));
  const { data: workshops, error: workshopsError } = await supabase
    .from('workshop_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (workshopsError) {
    console.error('Error fetching workshops:', workshopsError);
  } else {
    console.log(`Total workshops: ${workshops?.length || 0}`);
    workshops?.forEach((shop, idx) => {
      console.log(`\n[${idx + 1}] Workshop ID: ${shop.id}`);
      console.log(`   User ID: ${shop.user_id}`);
      console.log(`   Workshop Name: ${shop.workshop_name || 'N/A'}`);
      console.log(`   Email: ${shop.email || 'N/A'}`);
      console.log(`   Contact Name: ${shop.contact_name || 'N/A'}`);
      console.log(`   Phone: ${shop.phone || 'N/A'}`);
      console.log(`   Business Phone: ${shop.business_phone || 'N/A'}`);
      console.log(`   Address: ${shop.address || 'N/A'}`);
      console.log(`   Location: ${shop.city || 'N/A'}, ${shop.province || 'N/A'}, ${shop.country || 'N/A'}`);
      console.log(`   Postal Code: ${shop.postal_code || 'N/A'}`);
      console.log(`   Status: ${shop.approval_status || 'N/A'}`);
      console.log(`   License: ${shop.business_license || 'N/A'}`);
      console.log(`   Email Verified: ${shop.email_verified ? 'YES' : '❌ NO'}`);
      console.log(`   Created: ${shop.created_at}`);
    });
  }

  // 5. Get all organization memberships (for workshop mechanics)
  console.log('\n\n🔗 ORGANIZATION MEMBERSHIPS (Workshop-Mechanic Relationships)');
  console.log('-'.repeat(80));
  const { data: memberships, error: membershipsError } = await supabase
    .from('organization_members')
    .select('*')
    .order('joined_at', { ascending: false });

  if (membershipsError) {
    console.error('Error fetching memberships:', membershipsError);
  } else {
    console.log(`Total memberships: ${memberships?.length || 0}`);
    memberships?.forEach((mem, idx) => {
      console.log(`\n[${idx + 1}] Membership ID: ${mem.id}`);
      console.log(`   User ID: ${mem.user_id}`);
      console.log(`   Organization ID: ${mem.organization_id}`);
      console.log(`   Role: ${mem.role || 'N/A'}`);
      console.log(`   Status: ${mem.status || 'N/A'}`);
      console.log(`   Joined: ${mem.joined_at}`);
    });
  }

  // 6. Check for admins
  console.log('\n\n🔐 ADMIN USERS');
  console.log('-'.repeat(80));
  const adminProfiles = profiles?.filter(p => p.role === 'admin') || [];
  console.log(`Total admin profiles: ${adminProfiles.length}`);
  adminProfiles.forEach((admin, idx) => {
    console.log(`\n[${idx + 1}] Admin ID: ${admin.id}`);
    console.log(`   Email: ${admin.email || 'N/A'}`);
    console.log(`   Full Name: ${admin.full_name || 'N/A'}`);
    console.log(`   Account Status: ${admin.account_status || 'N/A'}`);
    console.log(`   Created: ${admin.created_at}`);
  });

  // 7. DATA INTEGRITY ANALYSIS
  console.log('\n\n⚠️  DATA INTEGRITY ISSUES & PROBLEMS');
  console.log('='.repeat(80));

  const issues = [];

  // Check for profiles without corresponding role records
  if (profiles && profiles.length > 0) {
    for (const profile of profiles) {
      // Skip deleted or anonymized users
      if (profile.deleted_at || profile.anonymized) continue;

      if (profile.role === 'mechanic' || profile.account_type === 'mechanic') {
        const hasMechanic = mechanics?.some(m => m.user_id === profile.id);
        if (!hasMechanic) {
          issues.push({
            severity: 'CRITICAL',
            issue: `❌ Profile ${profile.id} (${profile.email}) has role 'mechanic' but no mechanic record`
          });
        }
      } else if (profile.role === 'customer' || profile.account_type === 'customer') {
        const hasCustomer = customers?.some(c => c.user_id === profile.id);
        if (!hasCustomer) {
          issues.push({
            severity: 'CRITICAL',
            issue: `❌ Profile ${profile.id} (${profile.email}) has role 'customer' but no customer record`
          });
        }
      } else if (profile.role === 'workshop' || profile.role === 'workshop_admin' || profile.account_type === 'workshop') {
        const hasWorkshop = workshops?.some(w => w.user_id === profile.id);
        if (!hasWorkshop) {
          issues.push({
            severity: 'CRITICAL',
            issue: `❌ Profile ${profile.id} (${profile.email}) has role '${profile.role}' but no workshop record`
          });
        }
      }

      // Check for missing location data
      if (!profile.postal_code && (profile.role === 'mechanic' || profile.role === 'customer')) {
        issues.push({
          severity: 'WARNING',
          issue: `⚠️  Profile ${profile.id} (${profile.email}) missing postal_code (needed for matching)`
        });
      }

      // Check for incomplete profiles
      if (!profile.profile_completed && profile.account_status === 'active') {
        issues.push({
          severity: 'WARNING',
          issue: `⚠️  Profile ${profile.id} (${profile.email}) marked active but profile not completed`
        });
      }

      // Check for unverified emails
      if (!profile.email_verified && profile.account_status === 'active') {
        issues.push({
          severity: 'WARNING',
          issue: `⚠️  Profile ${profile.id} (${profile.email}) has unverified email but is active`
        });
      }

      // Check for suspended users
      if (profile.suspended_until && new Date(profile.suspended_until) > new Date()) {
        issues.push({
          severity: 'INFO',
          issue: `ℹ️  Profile ${profile.id} (${profile.email}) is currently suspended until ${profile.suspended_until}. Reason: ${profile.ban_reason || 'N/A'}`
        });
      }
    }
  }

  // Check mechanics for issues
  if (mechanics && mechanics.length > 0) {
    for (const mech of mechanics) {
      // Check for missing certifications
      if (!mech.certifications || mech.certifications.length === 0) {
        issues.push({
          severity: 'WARNING',
          issue: `⚠️  Mechanic ${mech.id} (${mech.email}) has no certifications`
        });
      }

      // Check for missing specializations
      if (!mech.specializations || mech.specializations.length === 0) {
        issues.push({
          severity: 'WARNING',
          issue: `⚠️  Mechanic ${mech.id} (${mech.email}) has no specializations`
        });
      }

      // Check for missing hourly rate
      if (!mech.hourly_rate) {
        issues.push({
          severity: 'WARNING',
          issue: `⚠️  Mechanic ${mech.id} (${mech.email}) has no hourly rate set`
        });
      }

      // Check for incomplete Stripe setup
      if (!mech.stripe_onboarding_completed) {
        issues.push({
          severity: 'WARNING',
          issue: `⚠️  Mechanic ${mech.id} (${mech.email}) has incomplete Stripe onboarding (cannot receive payments)`
        });
      }

      // Check workshop affiliation consistency
      if (mech.workshop_id) {
        const workshopExists = workshops?.some(w => w.id === mech.workshop_id);
        if (!workshopExists) {
          issues.push({
            severity: 'CRITICAL',
            issue: `❌ Mechanic ${mech.id} (${mech.email}) references non-existent workshop ${mech.workshop_id}`
          });
        }

        const hasMembership = memberships?.some(m => m.user_id === mech.user_id && m.organization_id === mech.workshop_id);
        if (!hasMembership) {
          issues.push({
            severity: 'WARNING',
            issue: `⚠️  Mechanic ${mech.id} (${mech.email}) has workshop_id but no organization membership record`
          });
        }
      }

      // Check for suspended mechanics
      if (mech.is_suspended) {
        issues.push({
          severity: 'INFO',
          issue: `ℹ️  Mechanic ${mech.id} (${mech.email}) is suspended. Reason: ${mech.suspension_reason || 'N/A'}`
        });
      }
    }
  }

  // Check customers for issues
  if (customers && customers.length > 0) {
    for (const cust of customers) {
      // Check for incomplete onboarding
      if (!cust.onboarding_completed) {
        issues.push({
          severity: 'WARNING',
          issue: `⚠️  Customer ${cust.id} (${cust.email}) has not completed onboarding`
        });
      }

      // Check for missing vehicle info
      if (!cust.vehicle_info || Object.keys(cust.vehicle_info).length === 0) {
        issues.push({
          severity: 'WARNING',
          issue: `⚠️  Customer ${cust.id} (${cust.email}) has no vehicle information`
        });
      }
    }
  }

  // Check workshops for issues
  if (workshops && workshops.length > 0) {
    for (const shop of workshops) {
      // Check approval status
      if (shop.approval_status !== 'approved') {
        issues.push({
          severity: 'INFO',
          issue: `ℹ️  Workshop ${shop.id} (${shop.workshop_name}) status is '${shop.approval_status}' (not approved)`
        });
      }

      // Check for missing business license
      if (!shop.business_license) {
        issues.push({
          severity: 'WARNING',
          issue: `⚠️  Workshop ${shop.id} (${shop.workshop_name}) has no business license on file`
        });
      }
    }
  }

  // Check for orphaned memberships
  if (memberships && memberships.length > 0) {
    for (const mem of memberships) {
      const mechanicExists = mechanics?.some(m => m.user_id === mem.user_id);
      if (!mechanicExists) {
        issues.push({
          severity: 'CRITICAL',
          issue: `❌ Organization membership ${mem.id} references non-existent mechanic (user_id: ${mem.user_id})`
        });
      }

      const workshopExists = workshops?.some(w => w.id === mem.organization_id);
      if (!workshopExists) {
        issues.push({
          severity: 'CRITICAL',
          issue: `❌ Organization membership ${mem.id} references non-existent workshop ${mem.organization_id}`
        });
      }

      if (mem.status !== 'active') {
        issues.push({
          severity: 'INFO',
          issue: `ℹ️  Organization membership ${mem.id} status is '${mem.status}' (not active)`
        });
      }
    }
  }

  // Sort issues by severity
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
  const warnings = issues.filter(i => i.severity === 'WARNING');
  const infoItems = issues.filter(i => i.severity === 'INFO');

  console.log(`\n🔴 CRITICAL ISSUES: ${criticalIssues.length}`);
  criticalIssues.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.issue}`);
  });

  console.log(`\n⚠️  WARNINGS: ${warnings.length}`);
  warnings.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.issue}`);
  });

  console.log(`\nℹ️  INFORMATIONAL: ${infoItems.length}`);
  infoItems.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.issue}`);
  });

  // Summary statistics
  console.log('\n\n📈 SUMMARY STATISTICS');
  console.log('='.repeat(80));
  console.log(`\n👤 PROFILES: ${profiles?.length || 0}`);
  console.log(`  - Mechanics: ${profiles?.filter(p => p.role === 'mechanic' || p.account_type === 'mechanic').length || 0}`);
  console.log(`  - Customers: ${profiles?.filter(p => p.role === 'customer' || p.account_type === 'customer').length || 0}`);
  console.log(`  - Workshops: ${profiles?.filter(p => p.role === 'workshop' || p.role === 'workshop_admin' || p.account_type === 'workshop').length || 0}`);
  console.log(`  - Admins: ${adminProfiles.length}`);
  console.log(`  - Active: ${profiles?.filter(p => p.account_status === 'active').length || 0}`);
  console.log(`  - Suspended: ${profiles?.filter(p => p.suspended_until && new Date(p.suspended_until) > new Date()).length || 0}`);
  console.log(`  - Deleted: ${profiles?.filter(p => p.deleted_at).length || 0}`);
  console.log(`  - Anonymized: ${profiles?.filter(p => p.anonymized).length || 0}`);

  console.log(`\n🔧 MECHANICS: ${mechanics?.length || 0}`);
  console.log(`  - Virtual: ${mechanics?.filter(m => m.is_virtual).length || 0}`);
  console.log(`  - Independent: ${mechanics?.filter(m => !m.is_virtual && !m.workshop_id).length || 0}`);
  console.log(`  - Workshop-Affiliated: ${mechanics?.filter(m => !m.is_virtual && m.workshop_id).length || 0}`);
  console.log(`  - Online Now: ${mechanics?.filter(m => m.is_online).length || 0}`);
  console.log(`  - Available: ${mechanics?.filter(m => m.is_available).length || 0}`);
  console.log(`  - Suspended: ${mechanics?.filter(m => m.is_suspended).length || 0}`);
  console.log(`  - Stripe Setup Complete: ${mechanics?.filter(m => m.stripe_onboarding_completed).length || 0}`);

  console.log(`\n👥 CUSTOMERS: ${customers?.length || 0}`);
  console.log(`  - Onboarding Complete: ${customers?.filter(c => c.onboarding_completed).length || 0}`);
  console.log(`  - Profile Complete: ${customers?.filter(c => c.profile_completed).length || 0}`);
  console.log(`  - Email Verified: ${customers?.filter(c => c.email_verified).length || 0}`);

  console.log(`\n🏢 WORKSHOPS: ${workshops?.length || 0}`);
  console.log(`  - Approved: ${workshops?.filter(w => w.approval_status === 'approved').length || 0}`);
  console.log(`  - Pending: ${workshops?.filter(w => w.approval_status === 'pending').length || 0}`);
  console.log(`  - Rejected: ${workshops?.filter(w => w.approval_status === 'rejected').length || 0}`);

  console.log(`\n🔗 WORKSHOP MEMBERSHIPS: ${memberships?.length || 0}`);
  console.log(`  - Active: ${memberships?.filter(m => m.status === 'active').length || 0}`);

  console.log(`\n⚠️  TOTAL ISSUES: ${issues.length}`);
  console.log(`  - Critical: ${criticalIssues.length}`);
  console.log(`  - Warnings: ${warnings.length}`);
  console.log(`  - Informational: ${infoItems.length}`);

  console.log('\n' + '='.repeat(80));
  console.log('END OF AUDIT');
  console.log('='.repeat(80));
}

queryAllUsers().catch(console.error);
