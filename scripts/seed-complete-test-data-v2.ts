import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface SeedResult {
  phase: string;
  success: boolean;
  details: string;
  error?: any;
}

const results: SeedResult[] = [];

function logResult(phase: string, success: boolean, details: string, error?: any) {
  results.push({ phase, success, details, error });
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${phase}: ${details}`);
  if (error) {
    console.error('   Error:', error.message || error);
  }
}

async function discoverMechanicSchema() {
  // Get one mechanic to see what columns exist
  const { data } = await supabase
    .from('mechanics')
    .select('*')
    .limit(1)
    .single();

  if (data) {
    console.log('📋 Mechanic columns available:', Object.keys(data).slice(0, 20).join(', '));
  }
  return data;
}

async function phase4_createNewMechanics() {
  console.log('\n📋 PHASE 4: CREATE NEW MECHANICS (SIMPLIFIED)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Discover schema first
  await discoverMechanicSchema();

  // Get workshop IDs
  const { data: workshops } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('organization_type', 'workshop')
    .limit(5);

  const workshopIds = workshops?.reduce((acc: any, w: any) => {
    acc[w.name] = w.id;
    return acc;
  }, {}) || {};

  const newMechanics = [
    // Virtual Mechanics - use 'virtual_only' or 'both' based on existing mechanics
    {
      email: 'emma.online@virtualmechanic.com',
      name: 'Emma Online',
      phone: '416-555-0401',
      account_type: 'individual_mechanic',
      city: 'Toronto',
      province: 'ON',
      postal_code: 'M4B2K9',
      country: 'Canada',
      years_of_experience: 9,
      specializations: ['Hybrid Systems', 'EV Diagnostics', 'Battery Systems'],
      red_seal_certified: true,
      red_seal_number: 'RS-ON-2022-745123',
      red_seal_province: 'ON',
      is_available: true,
      participation_mode: 'virtual_only', // Match existing values
    },
    {
      email: 'david.remote@virtualmechanic.com',
      name: 'David Remote',
      phone: '604-555-0401',
      account_type: 'individual_mechanic',
      city: 'Vancouver',
      province: 'BC',
      postal_code: 'V6B1A1',
      country: 'Canada',
      years_of_experience: 11,
      specializations: ['Honda', 'Acura', 'Asian Imports'],
      red_seal_certified: true,
      red_seal_number: 'RS-BC-2021-892341',
      red_seal_province: 'BC',
      is_available: true,
      participation_mode: 'virtual_only',
    },
    // Workshop Mechanics
    {
      email: 'marie.atelier@montrealgarage.com',
      name: 'Marie Atelier',
      phone: '514-555-0401',
      account_type: 'workshop_mechanic',
      workshop_id: workshopIds['Premium Auto Care'] || null,
      city: 'Montreal',
      province: 'QC',
      postal_code: 'H3A1A1',
      country: 'Canada',
      years_of_experience: 15,
      specializations: ['General Repair', 'French Vehicles', 'European Cars'],
      red_seal_certified: true,
      red_seal_number: 'RS-QC-2019-567234',
      red_seal_province: 'QC',
      is_available: true,
      participation_mode: 'both',
    },
    {
      email: 'tom.workshop@expertmotors.com',
      name: 'Tom Workshop',
      phone: '403-555-0401',
      account_type: 'workshop_mechanic',
      workshop_id: workshopIds['Expert Motors'] || null,
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2P0Y3',
      country: 'Canada',
      years_of_experience: 13,
      specializations: ['Diesel Engines', 'Heavy Duty', 'Trucks'],
      red_seal_certified: true,
      red_seal_number: 'RS-AB-2020-789456',
      red_seal_province: 'AB',
      is_available: true,
      participation_mode: 'both',
    },
    {
      email: 'lisa.tech@quickfix.com',
      name: 'Lisa Tech',
      phone: '604-555-0301',
      account_type: 'workshop_mechanic',
      workshop_id: workshopIds['Quick Fix Garage'] || null,
      city: 'Vancouver',
      province: 'BC',
      postal_code: 'V6B2W9',
      country: 'Canada',
      years_of_experience: 8,
      specializations: ['Nissan', 'Infiniti', 'Asian Imports', 'Diagnostics'],
      red_seal_certified: true,
      red_seal_number: 'RS-BC-2023-234567',
      red_seal_province: 'BC',
      is_available: true,
      participation_mode: 'both',
    },
    // Independent Mechanics
    {
      email: 'frank.indie@autorepair.com',
      name: 'Frank Independent',
      phone: '416-555-0501',
      account_type: 'individual_mechanic',
      workshop_id: null,
      city: 'Toronto',
      province: 'ON',
      postal_code: 'M4B1B3',
      country: 'Canada',
      years_of_experience: 20,
      specializations: ['Ford', 'Lincoln', 'Domestic Vehicles'],
      red_seal_certified: true,
      red_seal_number: 'RS-ON-2015-345678',
      red_seal_province: 'ON',
      is_available: true,
      participation_mode: 'both',
    },
    {
      email: 'sophie.solo@europeancar.com',
      name: 'Sophie Solo',
      phone: '514-555-0501',
      account_type: 'individual_mechanic',
      workshop_id: null,
      city: 'Montreal',
      province: 'QC',
      postal_code: 'H2Y1M6',
      country: 'Canada',
      years_of_experience: 14,
      specializations: ['BMW', 'Mercedes', 'Audi', 'European Cars'],
      is_available: true,
      participation_mode: 'both',
    },
    {
      email: 'chris.mobile@onthego.com',
      name: 'Chris Mobile',
      phone: '403-555-0501',
      account_type: 'individual_mechanic',
      workshop_id: null,
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2G0P6',
      country: 'Canada',
      years_of_experience: 10,
      specializations: ['Mobile Service', 'General Repair', 'GM Vehicles'],
      red_seal_certified: true,
      red_seal_number: 'RS-AB-2022-678901',
      red_seal_province: 'AB',
      mobile_license_number: 'AB-MOBILE-2024-001',
      is_available: true,
      participation_mode: 'physical_only',
    },
  ];

  const createdMechanics: any[] = [];

  for (const mechanic of newMechanics) {
    const { data, error } = await supabase
      .from('mechanics')
      .insert(mechanic)
      .select()
      .single();

    if (error) {
      logResult(`New Mechanic: ${mechanic.name}`, false, 'Failed to create', error);
    } else {
      logResult(`New Mechanic: ${mechanic.name}`, true, 'Created successfully');
      createdMechanics.push(data);
    }
  }

  return createdMechanics;
}

async function phase5_createBrandCertifications(mechanics: any[]) {
  console.log('\n📋 PHASE 5: CREATE BRAND CERTIFICATIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if table exists
  const { error: tableCheckError } = await supabase
    .from('brand_specialist_certifications')
    .select('id')
    .limit(1);

  if (tableCheckError) {
    logResult('Brand Certifications', false, 'Table does not exist - skipping', tableCheckError);
    return;
  }

  const mechanicsByEmail = mechanics.reduce((acc: any, m: any) => {
    acc[m.email] = m.id;
    return acc;
  }, {});

  const certifications = [
    {
      mechanic_id: mechanicsByEmail['emma.online@virtualmechanic.com'],
      brand_name: 'Toyota',
      certification_type: 'Master Technician',
      certificate_number: 'TOYOTA-2024-MT-4782',
      issue_date: '2023-06-15',
      expiry_date: '2026-06-15',
      issuing_organization: 'Toyota Canada',
      verified: true,
    },
    {
      mechanic_id: mechanicsByEmail['david.remote@virtualmechanic.com'],
      brand_name: 'Honda',
      certification_type: 'Master Certified Technician',
      certificate_number: 'HONDA-2024-MCT-8921',
      issue_date: '2022-09-01',
      expiry_date: '2025-09-01',
      issuing_organization: 'Honda Canada',
      verified: true,
    },
    {
      mechanic_id: mechanicsByEmail['lisa.tech@quickfix.com'],
      brand_name: 'Nissan',
      certification_type: 'Advanced Diagnostics Specialist',
      certificate_number: 'NISSAN-2024-ADS-3421',
      issue_date: '2023-03-20',
      expiry_date: null,
      issuing_organization: 'Nissan Canada',
      verified: true,
    },
    {
      mechanic_id: mechanicsByEmail['frank.indie@autorepair.com'],
      brand_name: 'Ford',
      certification_type: 'Senior Master Technician',
      certificate_number: 'FORD-2024-SMT-9012',
      issue_date: '2021-11-10',
      expiry_date: '2026-11-10',
      issuing_organization: 'Ford Motor Company',
      verified: true,
    },
    {
      mechanic_id: mechanicsByEmail['sophie.solo@europeancar.com'],
      brand_name: 'BMW',
      certification_type: 'Master Technician',
      certificate_number: 'BMW-2024-MT-7734',
      issue_date: '2022-05-15',
      expiry_date: '2027-05-15',
      issuing_organization: 'BMW Canada',
      verified: true,
    },
    {
      mechanic_id: mechanicsByEmail['sophie.solo@europeancar.com'],
      brand_name: 'Mercedes-Benz',
      certification_type: 'StarTech Certified',
      certificate_number: 'MBENZ-2024-ST-5629',
      issue_date: '2023-01-20',
      expiry_date: null,
      issuing_organization: 'Mercedes-Benz Canada',
      verified: true,
    },
    {
      mechanic_id: mechanicsByEmail['chris.mobile@onthego.com'],
      brand_name: 'General Motors',
      certification_type: 'World Class Technician',
      certificate_number: 'GM-2024-WCT-8845',
      issue_date: '2022-08-12',
      expiry_date: '2025-08-12',
      issuing_organization: 'General Motors Canada',
      verified: true,
    },
  ];

  const validCertifications = certifications.filter(c => c.mechanic_id);

  for (const cert of validCertifications) {
    const { error } = await supabase
      .from('brand_specialist_certifications')
      .insert(cert);

    if (error) {
      logResult(`Certification: ${cert.brand_name}`, false, 'Failed to create', error);
    } else {
      logResult(`Certification: ${cert.brand_name}`, true, 'Created successfully');
    }
  }
}

async function generateFinalReport() {
  console.log('\n📊 GENERATING FINAL REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  const { count: customersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer')
    .neq('account_status', 'deleted');

  const { count: mechanicsCount } = await supabase
    .from('mechanics')
    .select('*', { count: 'exact', head: true });

  const { count: workshopsCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_type', 'workshop');

  const { count: sessionsCount } = await supabase
    .from('session_requests')
    .select('*', { count: 'exact', head: true });

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      customers: customersCount || 0,
      mechanics: mechanicsCount || 0,
      workshops: workshopsCount || 0,
      sessionRequests: sessionsCount || 0,
    },
    results,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
  };

  console.log('📋 FINAL COUNTS:');
  console.log(`   Customers: ${report.summary.customers}`);
  console.log(`   Mechanics: ${report.summary.mechanics}`);
  console.log(`   Workshops: ${report.summary.workshops}`);
  console.log(`   Session Requests: ${report.summary.sessionRequests}`);
  console.log('');
  console.log('📊 OPERATION RESULTS:');
  console.log(`   ✅ Successful: ${report.success}`);
  console.log(`   ❌ Failed: ${report.failed}`);
  console.log('');

  const reportPath = path.join(process.cwd(), 'seed-completion-report-v2.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✅ Report saved to: ${reportPath}\n`);

  return report;
}

async function main() {
  console.log('🚀 STARTING DATABASE SEED (V2 - SIMPLIFIED)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('NOTE: Customers, existing mechanics, and workshops already fixed!');
  console.log('      Focus: Creating 8 new mechanics + certifications\n');

  try {
    const newMechanics = await phase4_createNewMechanics();
    await phase5_createBrandCertifications(newMechanics);

    const report = await generateFinalReport();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 SEED COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (report.failed > 0) {
      console.log(`⚠️  ${report.failed} operation(s) failed. Check the logs above.\n`);
    }

  } catch (error) {
    console.error('\n❌ SEED FAILED:', error);
    process.exit(1);
  }
}

main();
