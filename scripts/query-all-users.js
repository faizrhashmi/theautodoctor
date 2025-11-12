const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryAllUsers() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE USER DATABASE AUDIT');
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
      console.log(`   Is Workshop: ${profile.is_workshop || false}`);
      console.log(`   Location: ${profile.city || 'N/A'}, ${profile.country || 'N/A'}`);
      console.log(`   Postal Code: ${profile.postal_code || 'N/A'}`);
      console.log(`   Created: ${profile.created_at}`);
      console.log(`   Last Seen: ${profile.last_seen_at || 'Never'}`);
    });
  }

  // 2. Get all mechanics
  console.log('\n\n🔧 ALL MECHANICS');
  console.log('-'.repeat(80));
  const { data: mechanics, error: mechanicsError } = await supabase
    .from('mechanics')
    .select(`
      *,
      profile:profiles(email, full_name, phone, city, country, postal_code, last_seen_at)
    `)
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
      console.log(`   Email: ${mech.profile?.email || 'N/A'}`);
      console.log(`   Name: ${mech.profile?.full_name || 'N/A'}`);
      console.log(`   Phone: ${mech.profile?.phone || 'N/A'}`);
      console.log(`   Type: ${mech.is_virtual ? '📱 VIRTUAL' : (mech.workshop_id ? '🏢 WORKSHOP-AFFILIATED' : '👤 INDEPENDENT')}`);
      console.log(`   Workshop ID: ${mech.workshop_id || 'None'}`);
      console.log(`   Online Status: ${mech.is_online ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
      console.log(`   Available: ${mech.is_available ? 'YES' : 'NO'}`);
      console.log(`   Certifications: ${mech.certifications?.join(', ') || 'None'}`);
      console.log(`   Specializations: ${mech.specializations?.join(', ') || 'None'}`);
      console.log(`   Hourly Rate: $${mech.hourly_rate || 'N/A'}`);
      console.log(`   Location: ${mech.profile?.city || 'N/A'}, ${mech.profile?.country || 'N/A'}`);
      console.log(`   Postal Code: ${mech.profile?.postal_code || 'N/A'}`);
      console.log(`   Rating: ${mech.rating || 'N/A'} (${mech.total_reviews || 0} reviews)`);
      console.log(`   Active Sessions: ${mech.active_sessions_count || 0}`);
      console.log(`   Is Suspended: ${mech.is_suspended ? '⚠️ YES' : 'NO'}`);
      console.log(`   Suspension Reason: ${mech.suspension_reason || 'N/A'}`);
      console.log(`   Last Seen: ${mech.profile?.last_seen_at || 'Never'}`);
      console.log(`   Created: ${mech.created_at}`);
    });
  }

  // 3. Get all customers
  console.log('\n\n👥 ALL CUSTOMERS');
  console.log('-'.repeat(80));
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select(`
      *,
      profile:profiles(email, full_name, phone, city, country, postal_code, last_seen_at)
    `)
    .order('created_at', { ascending: false });

  if (customersError) {
    console.error('Error fetching customers:', customersError);
  } else {
    console.log(`Total customers: ${customers?.length || 0}`);
    customers?.forEach((cust, idx) => {
      console.log(`\n[${idx + 1}] Customer ID: ${cust.id}`);
      console.log(`   User ID: ${cust.user_id}`);
      console.log(`   Email: ${cust.profile?.email || 'N/A'}`);
      console.log(`   Name: ${cust.profile?.full_name || 'N/A'}`);
      console.log(`   Phone: ${cust.profile?.phone || 'N/A'}`);
      console.log(`   Location: ${cust.profile?.city || 'N/A'}, ${cust.profile?.country || 'N/A'}`);
      console.log(`   Postal Code: ${cust.profile?.postal_code || 'N/A'}`);
      console.log(`   Vehicle Info: ${cust.vehicle_make || 'N/A'} ${cust.vehicle_model || ''} ${cust.vehicle_year || ''}`);
      console.log(`   Onboarding Complete: ${cust.onboarding_completed ? 'YES' : '❌ NO'}`);
      console.log(`   Last Seen: ${cust.profile?.last_seen_at || 'Never'}`);
      console.log(`   Created: ${cust.created_at}`);
    });
  }

  // 4. Get all workshops
  console.log('\n\n🏢 ALL WORKSHOPS');
  console.log('-'.repeat(80));
  const { data: workshops, error: workshopsError } = await supabase
    .from('workshops')
    .select(`
      *,
      profile:profiles(email, full_name, phone, city, country, postal_code, last_seen_at)
    `)
    .order('created_at', { ascending: false });

  if (workshopsError) {
    console.error('Error fetching workshops:', workshopsError);
  } else {
    console.log(`Total workshops: ${workshops?.length || 0}`);
    workshops?.forEach((shop, idx) => {
      console.log(`\n[${idx + 1}] Workshop ID: ${shop.id}`);
      console.log(`   User ID: ${shop.user_id}`);
      console.log(`   Workshop Name: ${shop.workshop_name || 'N/A'}`);
      console.log(`   Email: ${shop.profile?.email || 'N/A'}`);
      console.log(`   Contact Name: ${shop.profile?.full_name || 'N/A'}`);
      console.log(`   Phone: ${shop.profile?.phone || 'N/A'}`);
      console.log(`   Business Number: ${shop.business_phone || 'N/A'}`);
      console.log(`   Address: ${shop.address || 'N/A'}`);
      console.log(`   Location: ${shop.profile?.city || 'N/A'}, ${shop.profile?.country || 'N/A'}`);
      console.log(`   Status: ${shop.status || 'N/A'}`);
      console.log(`   License: ${shop.business_license || 'N/A'}`);
      console.log(`   Last Seen: ${shop.profile?.last_seen_at || 'Never'}`);
      console.log(`   Created: ${shop.created_at}`);
    });
  }

  // 5. Get all organization memberships (for workshop mechanics)
  console.log('\n\n🔗 ORGANIZATION MEMBERSHIPS (Workshop-Mechanic Relationships)');
  console.log('-'.repeat(80));
  const { data: memberships, error: membershipsError } = await supabase
    .from('organization_members')
    .select(`
      *,
      mechanic:mechanics(id, user_id, is_virtual),
      mechanic_profile:profiles!organization_members_user_id_fkey(email, full_name),
      workshop:workshops!organization_members_organization_id_fkey(id, workshop_name)
    `)
    .order('joined_at', { ascending: false });

  if (membershipsError) {
    console.error('Error fetching memberships:', membershipsError);
  } else {
    console.log(`Total memberships: ${memberships?.length || 0}`);
    memberships?.forEach((mem, idx) => {
      console.log(`\n[${idx + 1}] Membership ID: ${mem.id}`);
      console.log(`   User ID: ${mem.user_id}`);
      console.log(`   Mechanic Name: ${mem.mechanic_profile?.full_name || 'N/A'}`);
      console.log(`   Mechanic Email: ${mem.mechanic_profile?.email || 'N/A'}`);
      console.log(`   Workshop ID: ${mem.organization_id}`);
      console.log(`   Workshop Name: ${mem.workshop?.workshop_name || 'N/A'}`);
      console.log(`   Role: ${mem.role || 'N/A'}`);
      console.log(`   Status: ${mem.status || 'N/A'}`);
      console.log(`   Joined: ${mem.joined_at}`);
    });
  }

  // 6. Check for auth.users (admins and all users)
  console.log('\n\n🔐 AUTH USERS (Supabase Auth)');
  console.log('-'.repeat(80));
  // Note: We can't directly query auth.users from client, but we can check profiles for admin role
  const adminProfiles = profiles?.filter(p => p.role === 'admin') || [];
  console.log(`Total admin profiles: ${adminProfiles.length}`);
  adminProfiles.forEach((admin, idx) => {
    console.log(`\n[${idx + 1}] Admin ID: ${admin.id}`);
    console.log(`   Email: ${admin.email || 'N/A'}`);
    console.log(`   Full Name: ${admin.full_name || 'N/A'}`);
    console.log(`   Last Seen: ${admin.last_seen_at || 'Never'}`);
    console.log(`   Created: ${admin.created_at}`);
  });

  // 7. DATA INTEGRITY ANALYSIS
  console.log('\n\n⚠️  DATA INTEGRITY ISSUES & PROBLEMS');
  console.log('='.repeat(80));

  const issues = [];

  // Check for profiles without corresponding role records
  if (profiles && profiles.length > 0) {
    for (const profile of profiles) {
      if (profile.role === 'mechanic') {
        const hasMechanic = mechanics?.some(m => m.user_id === profile.id);
        if (!hasMechanic) {
          issues.push(`❌ Profile ${profile.id} (${profile.email}) has role 'mechanic' but no mechanics record`);
        }
      } else if (profile.role === 'customer') {
        const hasCustomer = customers?.some(c => c.user_id === profile.id);
        if (!hasCustomer) {
          issues.push(`❌ Profile ${profile.id} (${profile.email}) has role 'customer' but no customers record`);
        }
      } else if (profile.role === 'workshop' || profile.is_workshop) {
        const hasWorkshop = workshops?.some(w => w.user_id === profile.id);
        if (!hasWorkshop) {
          issues.push(`❌ Profile ${profile.id} (${profile.email}) has role 'workshop' but no workshops record`);
        }
      }
    }
  }

  // Check for mechanics without profiles
  if (mechanics && mechanics.length > 0) {
    for (const mech of mechanics) {
      if (!mech.profile) {
        issues.push(`❌ Mechanic ${mech.id} has no associated profile (user_id: ${mech.user_id})`);
      }
      if (mech.workshop_id) {
        const workshopExists = workshops?.some(w => w.id === mech.workshop_id);
        if (!workshopExists) {
          issues.push(`❌ Mechanic ${mech.id} references non-existent workshop ${mech.workshop_id}`);
        }
      }
      if (!mech.profile?.postal_code) {
        issues.push(`⚠️  Mechanic ${mech.id} (${mech.profile?.email}) missing postal_code for matching`);
      }
      if (!mech.certifications || mech.certifications.length === 0) {
        issues.push(`⚠️  Mechanic ${mech.id} (${mech.profile?.email}) has no certifications`);
      }
      if (!mech.specializations || mech.specializations.length === 0) {
        issues.push(`⚠️  Mechanic ${mech.id} (${mech.profile?.email}) has no specializations`);
      }
    }
  }

  // Check for customers without profiles
  if (customers && customers.length > 0) {
    for (const cust of customers) {
      if (!cust.profile) {
        issues.push(`❌ Customer ${cust.id} has no associated profile (user_id: ${cust.user_id})`);
      }
      if (!cust.onboarding_completed) {
        issues.push(`⚠️  Customer ${cust.id} (${cust.profile?.email}) has not completed onboarding`);
      }
      if (!cust.profile?.postal_code) {
        issues.push(`⚠️  Customer ${cust.id} (${cust.profile?.email}) missing postal_code for matching`);
      }
    }
  }

  // Check for workshops without profiles
  if (workshops && workshops.length > 0) {
    for (const shop of workshops) {
      if (!shop.profile) {
        issues.push(`❌ Workshop ${shop.id} has no associated profile (user_id: ${shop.user_id})`);
      }
      if (shop.status !== 'approved') {
        issues.push(`⚠️  Workshop ${shop.id} (${shop.workshop_name}) status is '${shop.status}' (not approved)`);
      }
    }
  }

  // Check for orphaned memberships
  if (memberships && memberships.length > 0) {
    for (const mem of memberships) {
      const mechanicExists = mechanics?.some(m => m.user_id === mem.user_id);
      if (!mechanicExists) {
        issues.push(`❌ Organization membership ${mem.id} references non-existent mechanic (user_id: ${mem.user_id})`);
      }
      const workshopExists = workshops?.some(w => w.id === mem.organization_id);
      if (!workshopExists) {
        issues.push(`❌ Organization membership ${mem.id} references non-existent workshop ${mem.organization_id}`);
      }
    }
  }

  console.log(`\nTotal issues found: ${issues.length}\n`);
  issues.forEach((issue, idx) => {
    console.log(`${idx + 1}. ${issue}`);
  });

  // Summary statistics
  console.log('\n\n📈 SUMMARY STATISTICS');
  console.log('='.repeat(80));
  console.log(`Total Profiles: ${profiles?.length || 0}`);
  console.log(`  - Mechanics: ${profiles?.filter(p => p.role === 'mechanic').length || 0}`);
  console.log(`  - Customers: ${profiles?.filter(p => p.role === 'customer').length || 0}`);
  console.log(`  - Workshops: ${profiles?.filter(p => p.role === 'workshop' || p.is_workshop).length || 0}`);
  console.log(`  - Admins: ${adminProfiles.length}`);
  console.log(`  - Other/Undefined: ${profiles?.filter(p => !p.role || (p.role !== 'mechanic' && p.role !== 'customer' && p.role !== 'workshop' && p.role !== 'admin')).length || 0}`);
  console.log(`\nTotal Mechanics Records: ${mechanics?.length || 0}`);
  console.log(`  - Virtual: ${mechanics?.filter(m => m.is_virtual).length || 0}`);
  console.log(`  - Independent: ${mechanics?.filter(m => !m.is_virtual && !m.workshop_id).length || 0}`);
  console.log(`  - Workshop-Affiliated: ${mechanics?.filter(m => !m.is_virtual && m.workshop_id).length || 0}`);
  console.log(`  - Online Now: ${mechanics?.filter(m => m.is_online).length || 0}`);
  console.log(`  - Suspended: ${mechanics?.filter(m => m.is_suspended).length || 0}`);
  console.log(`\nTotal Customers Records: ${customers?.length || 0}`);
  console.log(`  - Onboarding Complete: ${customers?.filter(c => c.onboarding_completed).length || 0}`);
  console.log(`  - Onboarding Incomplete: ${customers?.filter(c => !c.onboarding_completed).length || 0}`);
  console.log(`\nTotal Workshops Records: ${workshops?.length || 0}`);
  console.log(`  - Approved: ${workshops?.filter(w => w.status === 'approved').length || 0}`);
  console.log(`  - Pending: ${workshops?.filter(w => w.status === 'pending').length || 0}`);
  console.log(`  - Rejected: ${workshops?.filter(w => w.status === 'rejected').length || 0}`);
  console.log(`\nTotal Workshop Memberships: ${memberships?.length || 0}`);
  console.log(`\n⚠️  Total Data Integrity Issues: ${issues.length}`);
  console.log('\n' + '='.repeat(80));
}

queryAllUsers().catch(console.error);
