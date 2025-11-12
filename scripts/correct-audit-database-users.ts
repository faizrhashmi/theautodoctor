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
    workshopAdmins: number;
    workshops: number;
    admins: number;
    sessionRequests: number;
    workshopAppointments: number;
    rfqsExist: boolean;
    quotesExist: boolean;
  };
  customers: any[];
  mechanics: any[];
  workshopAdmins: any[];
  organizations: any[];
  sessionRequests: any[];
  workshopAppointments: any[];
  gaps: {
    customersWithMissingData: any[];
    mechanicsWithMissingData: any[];
    organizationsWithMissingData: any[];
  };
}

async function auditDatabase(): Promise<AuditReport> {
  console.log('🔍 Starting CORRECT comprehensive database audit...\n');

  // 1. Get all profiles with role counts
  const { data: allProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    throw profilesError;
  }

  console.log(`✅ Found ${allProfiles?.length || 0} total users`);

  // 2. Get customers (role = 'customer')
  const customers = allProfiles?.filter(p => p.role === 'customer') || [];
  console.log(`✅ Found ${customers.length} customers`);

  // 3. Get mechanics from MECHANICS TABLE (not mechanic_profiles!)
  const { data: mechanics, error: mechanicsError } = await supabase
    .from('mechanics')
    .select('*')
    .order('created_at', { ascending: false });

  if (mechanicsError) {
    console.error('Error fetching mechanics:', mechanicsError);
  }

  console.log(`✅ Found ${mechanics?.length || 0} mechanics`);

  // Count mechanic types by account_type
  const mechanicsByType = mechanics?.reduce((acc: any, m: any) => {
    const type = m.account_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}) || {};

  console.log(`  - By account_type:`, mechanicsByType);

  // Count mechanics by workshop association
  const workshopMechanics = mechanics?.filter(m => m.workshop_id !== null) || [];
  const independentMechanics = mechanics?.filter(m => m.workshop_id === null) || [];
  console.log(`  - Workshop mechanics: ${workshopMechanics.length}`);
  console.log(`  - Independent mechanics: ${independentMechanics.length}`);

  // 4. Get workshop admins (role = 'workshop_admin' or 'workshop')
  const workshopAdmins = allProfiles?.filter(p => p.role === 'workshop_admin' || p.role === 'workshop') || [];
  console.log(`✅ Found ${workshopAdmins.length} workshop admins`);

  // 5. Get organizations (workshops)
  const { data: organizations, error: orgsError } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (orgsError) {
    console.error('Error fetching organizations:', orgsError);
  }

  console.log(`✅ Found ${organizations?.length || 0} organizations`);

  // Count by type
  const orgsByType = organizations?.reduce((acc: any, o: any) => {
    const type = o.organization_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}) || {};
  console.log(`  - By type:`, orgsByType);

  // 6. Get session_requests
  const { data: sessionRequests, error: sessionsError } = await supabase
    .from('session_requests')
    .select(`
      *,
      customer:profiles!session_requests_customer_id_fkey (id, email, full_name),
      mechanic:mechanics!session_requests_mechanic_id_fkey (id, email, name)
    `)
    .order('created_at', { ascending: false });

  console.log(`✅ Found ${sessionRequests?.length || 0} session requests`);

  // Status breakdown
  const sessionsByStatus = sessionRequests?.reduce((acc: any, s: any) => {
    const status = s.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {}) || {};
  console.log(`  - By status:`, sessionsByStatus);

  // 7. Get workshop_appointments
  const { data: workshopAppts, error: apptsError } = await supabase
    .from('workshop_appointments')
    .select(`
      *,
      workshop:organizations (id, name),
      customer:profiles!workshop_appointments_customer_id_fkey (id, email, full_name),
      mechanic:mechanics!workshop_appointments_mechanic_id_fkey (id, email, name)
    `)
    .order('created_at', { ascending: false });

  console.log(`✅ Found ${workshopAppts?.length || 0} workshop appointments\n`);

  // 8. Check if RFQs/Quotes tables exist
  let rfqsExist = false;
  let quotesExist = false;

  try {
    const { error: rfqError } = await supabase.from('rfqs').select('id').limit(1);
    rfqsExist = !rfqError;
  } catch (e) {
    rfqsExist = false;
  }

  try {
    const { error: quoteError } = await supabase.from('quotes').select('id').limit(1);
    quotesExist = !quoteError;
  } catch (e) {
    quotesExist = false;
  }

  console.log(`📋 RFQs table exists: ${rfqsExist ? '✅' : '❌'}`);
  console.log(`📋 Quotes table exists: ${quotesExist ? '✅' : '❌'}\n`);

  // Analyze gaps
  console.log('🔎 Analyzing data gaps...\n');

  const customersWithMissingData = customers.filter((c: any) => {
    return !c.postal_code || !c.city || !c.province || !c.phone || !c.latitude || !c.longitude;
  });

  const mechanicsWithMissingData = mechanics?.filter((m: any) => {
    return !m.postal_code ||
           !m.city ||
           !m.province ||
           !m.phone ||
           !m.email ||
           !m.name ||
           !m.years_of_experience;
  }) || [];

  const organizationsWithMissingData = organizations?.filter((o: any) => {
    return !o.address ||
           !o.city ||
           !o.province ||
           !o.postal_code ||
           !o.phone;
  }) || [];

  console.log(`⚠️  Customers with missing data: ${customersWithMissingData.length}`);
  console.log(`⚠️  Mechanics with missing data: ${mechanicsWithMissingData.length}`);
  console.log(`⚠️  Organizations with missing data: ${organizationsWithMissingData.length}\n`);

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalUsers: allProfiles?.length || 0,
      customers: customers.length,
      mechanics: mechanics?.length || 0,
      workshopAdmins: workshopAdmins.length,
      workshops: organizations?.filter(o => o.organization_type === 'workshop').length || 0,
      admins: allProfiles?.filter(p => p.role === 'admin').length || 0,
      sessionRequests: sessionRequests?.length || 0,
      workshopAppointments: workshopAppts?.length || 0,
      rfqsExist,
      quotesExist,
    },
    customers,
    mechanics: mechanics || [],
    workshopAdmins,
    organizations: organizations || [],
    sessionRequests: sessionRequests || [],
    workshopAppointments: workshopAppts || [],
    gaps: {
      customersWithMissingData,
      mechanicsWithMissingData,
      organizationsWithMissingData,
    },
  };

  return report;
}

async function generateMarkdownReport(report: AuditReport) {
  const lines: string[] = [];

  lines.push('# CORRECTED DATABASE USER AUDIT REPORT');
  lines.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}`);
  lines.push('**Status:** Using CORRECT table names (mechanics, organizations, profiles)');
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
  lines.push(`| Mechanics | ${report.summary.mechanics} | 15 | ${report.summary.mechanics >= 15 ? '✅' : '❌'} |`);
  lines.push(`| Workshop Admins | ${report.summary.workshopAdmins} | - | ℹ️ |`);
  lines.push(`| Workshops (Organizations) | ${report.summary.workshops} | 5 | ${report.summary.workshops >= 5 ? '✅' : '❌'} |`);
  lines.push(`| Admins | ${report.summary.admins} | - | ℹ️ |`);
  lines.push(`| Session Requests | ${report.summary.sessionRequests} | 15 | ${report.summary.sessionRequests >= 15 ? '✅' : '❌'} |`);
  lines.push(`| Workshop Appointments | ${report.summary.workshopAppointments} | - | ℹ️ |`);
  lines.push(`| RFQs Table Exists | ${report.summary.rfqsExist ? 'Yes' : 'No'} | Yes | ${report.summary.rfqsExist ? '✅' : '❌'} |`);
  lines.push(`| Quotes Table Exists | ${report.summary.quotesExist ? 'Yes' : 'No'} | Yes | ${report.summary.quotesExist ? '✅' : '❌'} |`);
  lines.push('');

  // Data Quality Issues
  lines.push('## DATA QUALITY ISSUES');
  lines.push('');
  lines.push(`- **Customers with missing data:** ${report.gaps.customersWithMissingData.length}`);
  lines.push(`- **Mechanics with missing data:** ${report.gaps.mechanicsWithMissingData.length}`);
  lines.push(`- **Organizations with missing data:** ${report.gaps.organizationsWithMissingData.length}`);
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
      const hasAllData = c.postal_code && c.city && c.province && c.phone && c.latitude && c.longitude;
      lines.push(`| ${c.id.substring(0, 8)}... | ${c.email || 'N/A'} | ${c.full_name || 'N/A'} | ${c.phone || '❌'} | ${c.city || '❌'} | ${c.province || '❌'} | ${c.postal_code || '❌'} | ${c.latitude && c.longitude ? '✅' : '❌'} | ${hasAllData ? '✅' : '⚠️'} |`);
    });
  }
  lines.push('');

  // Mechanics Detail
  lines.push('## MECHANICS DETAIL');
  lines.push('');
  if (report.mechanics.length === 0) {
    lines.push('❌ **No mechanics found in database**');
  } else {
    lines.push('| ID | Email | Name | Account Type | Workshop ID | Experience | Red Seal | City | Province | Postal | Status |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
    report.mechanics.forEach((m: any) => {
      const hasLocation = m.postal_code && m.city && m.province;
      const hasBasicInfo = m.email && m.name && m.phone && m.years_of_experience;
      const isComplete = hasLocation && hasBasicInfo;

      lines.push(`| ${m.id.substring(0, 8)}... | ${m.email || 'N/A'} | ${m.name || 'N/A'} | ${m.account_type || 'N/A'} | ${m.workshop_id ? m.workshop_id.substring(0, 8) + '...' : 'Independent'} | ${m.years_of_experience || '❌'} | ${m.red_seal_certified ? '✅' : '❌'} | ${m.city || '❌'} | ${m.province || '❌'} | ${m.postal_code || '❌'} | ${isComplete ? '✅' : '⚠️'} |`);
    });
  }
  lines.push('');

  // Organizations Detail
  lines.push('## ORGANIZATIONS DETAIL');
  lines.push('');
  if (report.organizations.length === 0) {
    lines.push('❌ **No organizations found in database**');
  } else {
    lines.push('| ID | Name | Type | Address | City | Province | Postal | Phone | Status | Verified |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|');
    report.organizations.forEach((o: any) => {
      const hasAllData = o.address && o.city && o.province && o.postal_code && o.phone;
      lines.push(`| ${o.id.substring(0, 8)}... | ${o.name || 'N/A'} | ${o.organization_type || 'N/A'} | ${o.address || '❌'} | ${o.city || '❌'} | ${o.province || '❌'} | ${o.postal_code || '❌'} | ${o.phone || '❌'} | ${o.status || 'N/A'} | ${o.verification_status || 'N/A'} |`);
    });
  }
  lines.push('');

  // Workshop Admins
  lines.push('## WORKSHOP ADMINS');
  lines.push('');
  if (report.workshopAdmins.length === 0) {
    lines.push('❌ **No workshop admins found**');
  } else {
    lines.push('| ID | Email | Name | Role | Org ID |');
    lines.push('|---|---|---|---|---|');
    report.workshopAdmins.forEach((wa: any) => {
      lines.push(`| ${wa.id.substring(0, 8)}... | ${wa.email || 'N/A'} | ${wa.full_name || 'N/A'} | ${wa.role} | ${wa.organization_id ? wa.organization_id.substring(0, 8) + '...' : 'N/A'} |`);
    });
  }
  lines.push('');

  // Session Requests
  lines.push('## SESSION REQUESTS');
  lines.push('');
  if (report.sessionRequests.length === 0) {
    lines.push('⚠️ **No session requests found**');
  } else {
    lines.push(`**Total:** ${report.sessionRequests.length} sessions`);
    lines.push('');
    lines.push('| ID | Customer | Mechanic | Type | Status | Scheduled | Created |');
    lines.push('|---|---|---|---|---|---|---|');
    report.sessionRequests.slice(0, 20).forEach((sr: any) => {
      const customerName = sr.customer?.full_name || sr.customer?.email || 'Unknown';
      const mechanicName = sr.mechanic?.name || sr.mechanic?.email || 'Unassigned';
      lines.push(`| ${sr.id.substring(0, 8)}... | ${customerName} | ${mechanicName} | ${sr.session_type || 'N/A'} | ${sr.status} | ${sr.scheduled_at ? new Date(sr.scheduled_at).toLocaleDateString() : 'N/A'} | ${new Date(sr.created_at).toLocaleDateString()} |`);
    });
    if (report.sessionRequests.length > 20) {
      lines.push(`*... and ${report.sessionRequests.length - 20} more sessions*`);
    }
  }
  lines.push('');

  // Workshop Appointments
  lines.push('## WORKSHOP APPOINTMENTS');
  lines.push('');
  if (report.workshopAppointments.length === 0) {
    lines.push('⚠️ **No workshop appointments found**');
  } else {
    lines.push('| ID | Workshop | Customer | Mechanic | Type | Status | Scheduled | Created |');
    lines.push('|---|---|---|---|---|---|---|---|');
    report.workshopAppointments.forEach((wa: any) => {
      const workshopName = wa.workshop?.name || 'Unknown';
      const customerName = wa.customer?.full_name || wa.customer?.email || 'Unknown';
      const mechanicName = wa.mechanic?.name || wa.mechanic?.email || 'Unassigned';
      lines.push(`| ${wa.id.substring(0, 8)}... | ${workshopName} | ${customerName} | ${mechanicName} | ${wa.appointment_type || 'N/A'} | ${wa.status} | ${wa.scheduled_at ? new Date(wa.scheduled_at).toLocaleString() : 'N/A'} | ${new Date(wa.created_at).toLocaleDateString()} |`);
    });
  }
  lines.push('');

  // Missing Data Details
  lines.push('## CUSTOMERS WITH MISSING DATA');
  lines.push('');
  if (report.gaps.customersWithMissingData.length === 0) {
    lines.push('✅ **All customers have complete data**');
  } else {
    lines.push('| ID | Email | Missing Fields |');
    lines.push('|---|---|---|');
    report.gaps.customersWithMissingData.forEach((c: any) => {
      const missing = [];
      if (!c.phone) missing.push('phone');
      if (!c.city) missing.push('city');
      if (!c.province) missing.push('province');
      if (!c.postal_code) missing.push('postal_code');
      if (!c.latitude || !c.longitude) missing.push('lat/lng');
      lines.push(`| ${c.id.substring(0, 8)}... | ${c.email || 'N/A'} | ${missing.join(', ')} |`);
    });
  }
  lines.push('');

  lines.push('## MECHANICS WITH MISSING DATA');
  lines.push('');
  if (report.gaps.mechanicsWithMissingData.length === 0) {
    lines.push('✅ **All mechanics have complete data**');
  } else {
    lines.push('| ID | Email | Missing Fields |');
    lines.push('|---|---|---|');
    report.gaps.mechanicsWithMissingData.forEach((m: any) => {
      const missing = [];
      if (!m.name) missing.push('name');
      if (!m.phone) missing.push('phone');
      if (!m.city) missing.push('city');
      if (!m.province) missing.push('province');
      if (!m.postal_code) missing.push('postal_code');
      if (!m.years_of_experience) missing.push('experience');
      lines.push(`| ${m.id.substring(0, 8)}... | ${m.email || 'N/A'} | ${missing.join(', ')} |`);
    });
  }
  lines.push('');

  lines.push('## ORGANIZATIONS WITH MISSING DATA');
  lines.push('');
  if (report.gaps.organizationsWithMissingData.length === 0) {
    lines.push('✅ **All organizations have complete data**');
  } else {
    lines.push('| ID | Name | Missing Fields |');
    lines.push('|---|---|---|');
    report.gaps.organizationsWithMissingData.forEach((o: any) => {
      const missing = [];
      if (!o.address) missing.push('address');
      if (!o.city) missing.push('city');
      if (!o.province) missing.push('province');
      if (!o.postal_code) missing.push('postal_code');
      if (!o.phone) missing.push('phone');
      lines.push(`| ${o.id.substring(0, 8)}... | ${o.name || 'N/A'} | ${missing.join(', ')} |`);
    });
  }
  lines.push('');

  // Action Items
  lines.push('## REQUIRED ACTIONS');
  lines.push('');

  lines.push('### Immediate Priorities');
  lines.push('');
  if (!report.summary.rfqsExist || !report.summary.quotesExist) {
    lines.push('1. ❌ **RFQ/Quotes System**: Tables are missing or not accessible. Run latest migrations.');
  }
  if (report.gaps.customersWithMissingData.length > 0) {
    lines.push(`2. ⚠️ **Fix ${report.gaps.customersWithMissingData.length} customer(s)** with missing location data`);
  }
  if (report.gaps.mechanicsWithMissingData.length > 0) {
    lines.push(`3. ⚠️ **Fix ${report.gaps.mechanicsWithMissingData.length} mechanic(s)** with missing data`);
  }
  if (report.gaps.organizationsWithMissingData.length > 0) {
    lines.push(`4. ⚠️ **Fix ${report.gaps.organizationsWithMissingData.length} organization(s)** with missing data`);
  }

  lines.push('');
  lines.push('### Testing Readiness');
  lines.push('');
  lines.push(`- Customers: ${report.summary.customers >= 5 ? '✅' : '❌'} (have ${report.summary.customers}, need 5)`);
  lines.push(`- Mechanics: ${report.summary.mechanics >= 15 ? '✅' : '❌'} (have ${report.summary.mechanics}, need 15)`);
  lines.push(`- Workshops: ${report.summary.workshops >= 5 ? '✅' : '❌'} (have ${report.summary.workshops}, need 5)`);
  lines.push(`- Sessions: ${report.summary.sessionRequests >= 15 ? '✅' : '❌'} (have ${report.summary.sessionRequests}, need 15)`);
  lines.push('');

  return lines.join('\n');
}

async function main() {
  try {
    const report = await auditDatabase();

    // Save JSON report
    const jsonPath = path.join(process.cwd(), 'database-audit-report-CORRECTED.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`✅ JSON report saved to: ${jsonPath}\n`);

    // Generate and save markdown report
    const markdown = await generateMarkdownReport(report);
    const mdPath = path.join(process.cwd(), 'DATABASE_AUDIT_REPORT_CORRECTED_2025-11-12.md');
    fs.writeFileSync(mdPath, markdown);
    console.log(`✅ Markdown report saved to: ${mdPath}\n`);

    console.log('🎉 CORRECTED Audit complete!');
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

main();
