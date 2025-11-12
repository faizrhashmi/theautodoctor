import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface AuditReport {
  timestamp: string;
  summary: {
    totalUsers: number;
    customers: number;
    mechanics: number;
    virtualMechanics: number;
    workshopMechanics: number;
    independentMechanics: number;
    workshops: number;
    rfqs: number;
    quotes: number;
    sessionRequests: number;
    workshopAppointments: number;
    brandCertifications: number;
  };
  customers: any[];
  mechanics: any[];
  workshops: any[];
  workshopMembers: any[];
  rfqs: any[];
  quotes: any[];
  sessionRequests: any[];
  workshopAppointments: any[];
  brandCertifications: any[];
  gaps: {
    customersWithMissingData: any[];
    mechanicsWithMissingData: any[];
    workshopsWithMissingData: any[];
    mechanicsWithoutCertifications: any[];
  };
}

async function auditDatabase(): Promise<AuditReport> {
  console.log('🔍 Starting comprehensive database audit...\n');

  // 1. Get all profiles
  const { data: allProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    throw profilesError;
  }

  console.log(`✅ Found ${allProfiles?.length || 0} total users`);

  // 2. Get customers
  const { data: customers, error: customersError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  console.log(`✅ Found ${customers?.length || 0} customers`);

  // 3. Get mechanics with their profiles
  const { data: mechanics, error: mechanicsError } = await supabase
    .from('profiles')
    .select(`
      *,
      mechanic_profiles (*)
    `)
    .eq('role', 'mechanic')
    .order('created_at', { ascending: false });

  console.log(`✅ Found ${mechanics?.length || 0} mechanics`);

  // Count mechanic types
  let virtualCount = 0;
  let workshopCount = 0;
  let independentCount = 0;

  mechanics?.forEach((m: any) => {
    const type = m.mechanic_profiles?.[0]?.mechanic_type;
    if (type === 'virtual') virtualCount++;
    else if (type === 'workshop') workshopCount++;
    else if (type === 'independent') independentCount++;
  });

  console.log(`  - Virtual: ${virtualCount}`);
  console.log(`  - Workshop: ${workshopCount}`);
  console.log(`  - Independent: ${independentCount}`);

  // 4. Get brand certifications
  const { data: brandCerts, error: certsError } = await supabase
    .from('brand_specialist_certifications')
    .select(`
      *,
      profiles (full_name, email)
    `)
    .order('created_at', { ascending: false });

  console.log(`✅ Found ${brandCerts?.length || 0} brand certifications`);

  // 5. Get workshops
  const { data: workshops, error: workshopsError } = await supabase
    .from('organizations')
    .select('*')
    .eq('type', 'workshop')
    .order('created_at', { ascending: false });

  console.log(`✅ Found ${workshops?.length || 0} workshops`);

  // 6. Get workshop members
  const { data: workshopMembers, error: membersError } = await supabase
    .from('organization_members')
    .select(`
      *,
      organizations (name, business_name, type),
      profiles (full_name, email, role)
    `)
    .order('joined_at', { ascending: false });

  console.log(`✅ Found ${workshopMembers?.length || 0} workshop members`);

  // 7. Get RFQs
  const { data: rfqs, error: rfqsError } = await supabase
    .from('rfqs')
    .select(`
      *,
      profiles (full_name, email)
    `)
    .order('created_at', { ascending: false });

  console.log(`✅ Found ${rfqs?.length || 0} RFQs`);

  // 8. Get quotes
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select(`
      *,
      profiles (full_name, email),
      mechanic_profiles:mechanic_profiles!quotes_mechanic_id_fkey (mechanic_type)
    `)
    .order('created_at', { ascending: false });

  console.log(`✅ Found ${quotes?.length || 0} quotes`);

  // 9. Get session requests
  const { data: sessionRequests, error: sessionsError } = await supabase
    .from('session_requests')
    .select(`
      *,
      customer:profiles!session_requests_customer_id_fkey (full_name, email),
      mechanic:profiles!session_requests_mechanic_id_fkey (full_name, email)
    `)
    .order('created_at', { ascending: false });

  console.log(`✅ Found ${sessionRequests?.length || 0} session requests`);

  // 10. Get workshop appointments
  const { data: workshopAppts, error: apptsError } = await supabase
    .from('workshop_appointments')
    .select(`
      *,
      workshop:organizations (name, business_name),
      customer:profiles!workshop_appointments_customer_id_fkey (full_name, email),
      mechanic:profiles!workshop_appointments_mechanic_id_fkey (full_name, email)
    `)
    .order('created_at', { ascending: false });

  console.log(`✅ Found ${workshopAppts?.length || 0} workshop appointments\n`);

  // Analyze gaps
  console.log('🔎 Analyzing data gaps...\n');

  const customersWithMissingData = customers?.filter((c: any) => {
    return !c.postal_code || !c.city || !c.province || !c.phone_number || !c.latitude || !c.longitude;
  }) || [];

  const mechanicsWithMissingData = mechanics?.filter((m: any) => {
    const profile = m.mechanic_profiles?.[0];
    return !profile ||
           !profile.mechanic_type ||
           !profile.years_experience ||
           !profile.hourly_rate ||
           !profile.bio ||
           !m.postal_code ||
           !m.city ||
           !m.province ||
           !m.latitude ||
           !m.longitude;
  }) || [];

  const workshopsWithMissingData = workshops?.filter((w: any) => {
    return !w.business_address ||
           !w.city ||
           !w.province ||
           !w.postal_code ||
           !w.phone_number ||
           !w.latitude ||
           !w.longitude;
  }) || [];

  const mechanicsWithoutCertifications = mechanics?.filter((m: any) => {
    const profile = m.mechanic_profiles?.[0];
    if (!profile) return true;

    const hasRedSeal = profile.red_seal_certified;
    const hasInterprovincial = profile.interprovincial_certified;
    const hasQuebec = profile.quebec_certified;
    const hasBrandCerts = brandCerts?.some((bc: any) => bc.mechanic_id === m.id);

    return !hasRedSeal && !hasInterprovincial && !hasQuebec && !hasBrandCerts;
  }) || [];

  console.log(`⚠️  Customers with missing data: ${customersWithMissingData.length}`);
  console.log(`⚠️  Mechanics with missing data: ${mechanicsWithMissingData.length}`);
  console.log(`⚠️  Workshops with missing data: ${workshopsWithMissingData.length}`);
  console.log(`⚠️  Mechanics without certifications: ${mechanicsWithoutCertifications.length}\n`);

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalUsers: allProfiles?.length || 0,
      customers: customers?.length || 0,
      mechanics: mechanics?.length || 0,
      virtualMechanics: virtualCount,
      workshopMechanics: workshopCount,
      independentMechanics: independentCount,
      workshops: workshops?.length || 0,
      rfqs: rfqs?.length || 0,
      quotes: quotes?.length || 0,
      sessionRequests: sessionRequests?.length || 0,
      workshopAppointments: workshopAppts?.length || 0,
      brandCertifications: brandCerts?.length || 0,
    },
    customers: customers || [],
    mechanics: mechanics || [],
    workshops: workshops || [],
    workshopMembers: workshopMembers || [],
    rfqs: rfqs || [],
    quotes: quotes || [],
    sessionRequests: sessionRequests || [],
    workshopAppointments: workshopAppts || [],
    brandCertifications: brandCerts || [],
    gaps: {
      customersWithMissingData,
      mechanicsWithMissingData,
      workshopsWithMissingData,
      mechanicsWithoutCertifications,
    },
  };

  return report;
}

async function generateMarkdownReport(report: AuditReport) {
  const lines: string[] = [];

  lines.push('# DATABASE USER AUDIT REPORT');
  lines.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Summary
  lines.push('## EXECUTIVE SUMMARY');
  lines.push('');
  lines.push('| Metric | Count | Target | Status |');
  lines.push('|--------|-------|--------|--------|');
  lines.push(`| Total Users | ${report.summary.totalUsers} | - | ℹ️ |`);
  lines.push(`| Customers | ${report.summary.customers} | 5 | ${report.summary.customers >= 5 ? '✅' : '❌'} |`);
  lines.push(`| Total Mechanics | ${report.summary.mechanics} | 15 | ${report.summary.mechanics >= 15 ? '✅' : '❌'} |`);
  lines.push(`| - Virtual Mechanics | ${report.summary.virtualMechanics} | 5 | ${report.summary.virtualMechanics >= 5 ? '✅' : '❌'} |`);
  lines.push(`| - Workshop Mechanics | ${report.summary.workshopMechanics} | 5 | ${report.summary.workshopMechanics >= 5 ? '✅' : '❌'} |`);
  lines.push(`| - Independent Mechanics | ${report.summary.independentMechanics} | 5 | ${report.summary.independentMechanics >= 5 ? '✅' : '❌'} |`);
  lines.push(`| Workshops | ${report.summary.workshops} | 5 | ${report.summary.workshops >= 5 ? '✅' : '❌'} |`);
  lines.push(`| RFQs | ${report.summary.rfqs} | - | ℹ️ |`);
  lines.push(`| Quotes | ${report.summary.quotes} | - | ℹ️ |`);
  lines.push(`| Session Requests | ${report.summary.sessionRequests} | 15 | ${report.summary.sessionRequests >= 15 ? '✅' : '❌'} |`);
  lines.push(`| Workshop Appointments | ${report.summary.workshopAppointments} | - | ℹ️ |`);
  lines.push(`| Brand Certifications | ${report.summary.brandCertifications} | - | ℹ️ |`);
  lines.push('');

  // Data Quality Issues
  lines.push('## DATA QUALITY ISSUES');
  lines.push('');
  lines.push(`- **Customers with missing data:** ${report.gaps.customersWithMissingData.length}`);
  lines.push(`- **Mechanics with missing data:** ${report.gaps.mechanicsWithMissingData.length}`);
  lines.push(`- **Workshops with missing data:** ${report.gaps.workshopsWithMissingData.length}`);
  lines.push(`- **Mechanics without certifications:** ${report.gaps.mechanicsWithoutCertifications.length}`);
  lines.push('');

  // Customers Detail
  lines.push('## CUSTOMERS DETAIL');
  lines.push('');
  if (report.customers.length === 0) {
    lines.push('❌ **No customers found in database**');
  } else {
    lines.push('| ID | Email | Name | Phone | City | Province | Postal Code | Lat/Lng | Status |');
    lines.push('|---|---|---|---|---|---|---|---|---|');
    report.customers.forEach((c: any) => {
      const hasAllData = c.postal_code && c.city && c.province && c.phone_number && c.latitude && c.longitude;
      lines.push(`| ${c.id.substring(0, 8)}... | ${c.email || 'N/A'} | ${c.full_name || 'N/A'} | ${c.phone_number || '❌'} | ${c.city || '❌'} | ${c.province || '❌'} | ${c.postal_code || '❌'} | ${c.latitude && c.longitude ? '✅' : '❌'} | ${hasAllData ? '✅' : '⚠️'} |`);
    });
  }
  lines.push('');

  // Mechanics Detail
  lines.push('## MECHANICS DETAIL');
  lines.push('');
  if (report.mechanics.length === 0) {
    lines.push('❌ **No mechanics found in database**');
  } else {
    lines.push('| ID | Email | Name | Type | Experience | Rate | Bio | Certifications | Location | Status |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|');
    report.mechanics.forEach((m: any) => {
      const profile = m.mechanic_profiles?.[0];
      const hasCerts = profile?.red_seal_certified || profile?.interprovincial_certified || profile?.quebec_certified;
      const hasBrandCerts = report.brandCertifications.some((bc: any) => bc.mechanic_id === m.id);
      const hasLocation = m.postal_code && m.city && m.province && m.latitude && m.longitude;
      const hasCompleteProfile = profile && profile.mechanic_type && profile.years_experience && profile.hourly_rate && profile.bio;
      const isComplete = hasCompleteProfile && hasLocation && (hasCerts || hasBrandCerts);

      lines.push(`| ${m.id.substring(0, 8)}... | ${m.email || 'N/A'} | ${m.full_name || 'N/A'} | ${profile?.mechanic_type || '❌'} | ${profile?.years_experience || '❌'} | $${profile?.hourly_rate || '❌'} | ${profile?.bio ? '✅' : '❌'} | ${hasCerts || hasBrandCerts ? '✅' : '❌'} | ${hasLocation ? '✅' : '❌'} | ${isComplete ? '✅' : '⚠️'} |`);
    });
  }
  lines.push('');

  // Brand Certifications
  lines.push('## BRAND CERTIFICATIONS');
  lines.push('');
  if (report.brandCertifications.length === 0) {
    lines.push('❌ **No brand certifications found**');
  } else {
    lines.push('| Mechanic | Brand | Type | Certificate # | Issued | Expires | Verified |');
    lines.push('|---|---|---|---|---|---|---|');
    report.brandCertifications.forEach((bc: any) => {
      lines.push(`| ${bc.profiles?.full_name || 'Unknown'} | ${bc.brand_name} | ${bc.certification_type} | ${bc.certificate_number || 'N/A'} | ${bc.issue_date || 'N/A'} | ${bc.expiry_date || 'N/A'} | ${bc.verified ? '✅' : '❌'} |`);
    });
  }
  lines.push('');

  // Workshops Detail
  lines.push('## WORKSHOPS DETAIL');
  lines.push('');
  if (report.workshops.length === 0) {
    lines.push('❌ **No workshops found in database**');
  } else {
    lines.push('| ID | Name | Business Name | Address | City | Province | Postal | Phone | Members | Status |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|');
    report.workshops.forEach((w: any) => {
      const memberCount = report.workshopMembers.filter((wm: any) => wm.organization_id === w.id).length;
      const hasAllData = w.business_address && w.city && w.province && w.postal_code && w.phone_number && w.latitude && w.longitude;
      lines.push(`| ${w.id.substring(0, 8)}... | ${w.name || 'N/A'} | ${w.business_name || 'N/A'} | ${w.business_address || '❌'} | ${w.city || '❌'} | ${w.province || '❌'} | ${w.postal_code || '❌'} | ${w.phone_number || '❌'} | ${memberCount} | ${hasAllData && memberCount >= 2 ? '✅' : '⚠️'} |`);
    });
  }
  lines.push('');

  // Workshop Members
  lines.push('## WORKSHOP MEMBERS');
  lines.push('');
  if (report.workshopMembers.length === 0) {
    lines.push('❌ **No workshop members found**');
  } else {
    lines.push('| Workshop | Member | Email | Role | Joined |');
    lines.push('|---|---|---|---|---|');
    report.workshopMembers.forEach((wm: any) => {
      lines.push(`| ${wm.organizations?.name || 'Unknown'} | ${wm.profiles?.full_name || 'Unknown'} | ${wm.profiles?.email || 'N/A'} | ${wm.role} | ${wm.joined_at ? new Date(wm.joined_at).toLocaleDateString() : 'N/A'} |`);
    });
  }
  lines.push('');

  // RFQs
  lines.push('## RFQs (REQUEST FOR QUOTES)');
  lines.push('');
  if (report.rfqs.length === 0) {
    lines.push('⚠️ **No RFQs found**');
  } else {
    lines.push('| ID | Customer | Vehicle | Issue | Service Type | Status | Created |');
    lines.push('|---|---|---|---|---|---|---|');
    report.rfqs.forEach((rfq: any) => {
      lines.push(`| ${rfq.id.substring(0, 8)}... | ${rfq.profiles?.full_name || 'Unknown'} | ${rfq.vehicle_year} ${rfq.vehicle_make} ${rfq.vehicle_model} | ${rfq.issue_description?.substring(0, 30)}... | ${rfq.service_type} | ${rfq.status} | ${new Date(rfq.created_at).toLocaleDateString()} |`);
    });
  }
  lines.push('');

  // Quotes
  lines.push('## QUOTES SUBMITTED');
  lines.push('');
  if (report.quotes.length === 0) {
    lines.push('⚠️ **No quotes found**');
  } else {
    lines.push('| ID | RFQ ID | Mechanic | Type | Cost | Duration | Status | Created |');
    lines.push('|---|---|---|---|---|---|---|---|');
    report.quotes.forEach((q: any) => {
      const mechanicType = q.mechanic_profiles?.mechanic_type || 'Unknown';
      lines.push(`| ${q.id.substring(0, 8)}... | ${q.rfq_id.substring(0, 8)}... | ${q.profiles?.full_name || 'Unknown'} | ${mechanicType} | $${q.estimated_cost} | ${q.estimated_duration} | ${q.status} | ${new Date(q.created_at).toLocaleDateString()} |`);
    });
  }
  lines.push('');

  // Session Requests/Appointments
  lines.push('## SESSION REQUESTS / APPOINTMENTS');
  lines.push('');
  if (report.sessionRequests.length === 0) {
    lines.push('⚠️ **No session requests found**');
  } else {
    lines.push('| ID | Customer | Mechanic | Type | Status | Scheduled | Location | Created |');
    lines.push('|---|---|---|---|---|---|---|---|');
    report.sessionRequests.forEach((sr: any) => {
      lines.push(`| ${sr.id.substring(0, 8)}... | ${sr.customer?.full_name || 'Unknown'} | ${sr.mechanic?.full_name || 'Unassigned'} | ${sr.session_type} | ${sr.status} | ${sr.scheduled_at ? new Date(sr.scheduled_at).toLocaleString() : 'N/A'} | ${sr.location_type} | ${new Date(sr.created_at).toLocaleDateString()} |`);
    });
  }
  lines.push('');

  // Workshop Appointments
  lines.push('## WORKSHOP APPOINTMENTS');
  lines.push('');
  if (report.workshopAppointments.length === 0) {
    lines.push('⚠️ **No workshop appointments found**');
  } else {
    lines.push('| ID | Workshop | Customer | Mechanic | Type | Service | Status | Scheduled | Created |');
    lines.push('|---|---|---|---|---|---|---|---|---|');
    report.workshopAppointments.forEach((wa: any) => {
      lines.push(`| ${wa.id.substring(0, 8)}... | ${wa.workshop?.name || 'Unknown'} | ${wa.customer?.full_name || 'Unknown'} | ${wa.mechanic?.full_name || 'Unassigned'} | ${wa.appointment_type} | ${wa.service_type} | ${wa.status} | ${wa.scheduled_at ? new Date(wa.scheduled_at).toLocaleString() : 'N/A'} | ${new Date(wa.created_at).toLocaleDateString()} |`);
    });
  }
  lines.push('');

  // Action Items
  lines.push('## REQUIRED ACTIONS TO MEET TESTING GOALS');
  lines.push('');
  lines.push('### Customers (Target: 5 complete)');
  const customersNeeded = Math.max(0, 5 - report.summary.customers);
  const customersToFix = report.gaps.customersWithMissingData.length;
  if (customersNeeded > 0) {
    lines.push(`- ❌ Create ${customersNeeded} new customer(s)`);
  }
  if (customersToFix > 0) {
    lines.push(`- ⚠️ Fix ${customersToFix} existing customer(s) with missing data`);
  }
  if (customersNeeded === 0 && customersToFix === 0) {
    lines.push('- ✅ All customers complete');
  }
  lines.push('');

  lines.push('### Virtual Mechanics (Target: 5 complete)');
  const virtualNeeded = Math.max(0, 5 - report.summary.virtualMechanics);
  if (virtualNeeded > 0) {
    lines.push(`- ❌ Create ${virtualNeeded} new virtual mechanic(s)`);
  } else {
    lines.push('- ✅ Virtual mechanics target met');
  }
  lines.push('');

  lines.push('### Workshop Mechanics (Target: 5 complete)');
  const workshopMechanicsNeeded = Math.max(0, 5 - report.summary.workshopMechanics);
  if (workshopMechanicsNeeded > 0) {
    lines.push(`- ❌ Create ${workshopMechanicsNeeded} new workshop mechanic(s)`);
  } else {
    lines.push('- ✅ Workshop mechanics target met');
  }
  lines.push('');

  lines.push('### Independent Mechanics (Target: 5 complete)');
  const independentNeeded = Math.max(0, 5 - report.summary.independentMechanics);
  if (independentNeeded > 0) {
    lines.push(`- ❌ Create ${independentNeeded} new independent mechanic(s)`);
  } else {
    lines.push('- ✅ Independent mechanics target met');
  }
  lines.push('');

  lines.push('### Workshops (Target: 5 with 2+ mechanics each)');
  const workshopsNeeded = Math.max(0, 5 - report.summary.workshops);
  if (workshopsNeeded > 0) {
    lines.push(`- ❌ Create ${workshopsNeeded} new workshop(s)`);
  }
  const workshopsToFix = report.gaps.workshopsWithMissingData.length;
  if (workshopsToFix > 0) {
    lines.push(`- ⚠️ Fix ${workshopsToFix} workshop(s) with missing data`);
  }
  if (workshopsNeeded === 0 && workshopsToFix === 0) {
    lines.push('- ✅ Workshops target met');
  }
  lines.push('');

  lines.push('### Certifications');
  if (report.gaps.mechanicsWithoutCertifications.length > 0) {
    lines.push(`- ⚠️ Add certifications to ${report.gaps.mechanicsWithoutCertifications.length} mechanic(s)`);
    lines.push('  - Need examples of: Red Seal, Quebec Certificate, Interprovincial, Brand Specialist');
  } else {
    lines.push('- ✅ All mechanics have certifications');
  }
  lines.push('');

  lines.push('### Appointments (Target: 5 virtual + 5 workshop + 5 independent = 15 total)');
  const appointmentsNeeded = Math.max(0, 15 - report.summary.sessionRequests);
  if (appointmentsNeeded > 0) {
    lines.push(`- ❌ Create ${appointmentsNeeded} appointment(s)`);
    lines.push('  - Mix of virtual sessions, in-person appointments, workshop appointments');
  } else {
    lines.push('- ✅ Appointments target met');
  }
  lines.push('');

  return lines.join('\n');
}

async function main() {
  try {
    const report = await auditDatabase();

    // Save JSON report
    const jsonPath = path.join(process.cwd(), 'database-audit-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`✅ JSON report saved to: ${jsonPath}\n`);

    // Generate and save markdown report
    const markdown = await generateMarkdownReport(report);
    const mdPath = path.join(process.cwd(), 'DATABASE_AUDIT_REPORT_2025-11-12.md');
    fs.writeFileSync(mdPath, markdown);
    console.log(`✅ Markdown report saved to: ${mdPath}\n`);

    console.log('🎉 Audit complete!');
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

main();
