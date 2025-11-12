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

async function phase1_fixCustomers() {
  console.log('\n📋 PHASE 1: FIX EXISTING CUSTOMERS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const updates = [
    {
      id: '0af3d300-cbca-4019-baa6-e92e402ccd1b',
      name: 'Customer A (cust1@test.com)',
      data: {
        state_province: 'Ontario',
        province: 'ON',
        postal_zip_code: 'M1P 0G3',
        postal_code: 'M1P0G3',
        country: 'Canada',
        latitude: 43.7730,
        longitude: -79.2304,
      },
    },
    {
      id: 'c060b46b-c62c-49cf-aa30-167ce56b0aec',
      name: 'Customer B (cust2@test.com)',
      data: {
        address_line1: '456 Queen St E',
        city: 'Toronto',
        state_province: 'Ontario',
        province: 'ON',
        postal_zip_code: 'M5A 1T1',
        postal_code: 'M5A1T1',
        country: 'Canada',
        latitude: 43.6543,
        longitude: -79.3615,
      },
    },
    {
      id: '8dda8cb3-fea7-48a3-988c-087eb5bd179d',
      name: 'Customer 3 (cust3@test.com)',
      data: {
        address_line1: '1001 Rue Sainte-Catherine O',
        city: 'Montreal',
        state_province: 'Quebec',
        province: 'QC',
        postal_zip_code: 'H3B 4W8',
        postal_code: 'H3B4W8',
        country: 'Canada',
        latitude: 45.5017,
        longitude: -73.5673,
      },
    },
    {
      id: '607a9b1f-0eb4-44f4-8a6c-879e674cbd5f',
      name: 'Kelly Test (ktest@askautodoctor.com)',
      data: {
        full_name: 'Kelly Test',
        phone: '613-555-0150',
        address_line1: '789 Wellington St',
        city: 'Ottawa',
        state_province: 'Ontario',
        province: 'ON',
        postal_zip_code: 'K1P 5G4',
        postal_code: 'K1P5G4',
        country: 'Canada',
        latitude: 45.4236,
        longitude: -75.6990,
      },
    },
    {
      id: '65acc199-333b-4f0e-bffd-9b0b319b6e6a',
      name: 'Faiz Hashmi (faizrhashmi@gmail.com)',
      data: {
        full_name: 'Faiz Hashmi',
        phone: '403-555-0180',
        address_line1: '567 8th Ave SW',
        city: 'Calgary',
        state_province: 'Alberta',
        province: 'AB',
        postal_zip_code: 'T2P 3M3',
        postal_code: 'T2P3M3',
        country: 'Canada',
        latitude: 51.0447,
        longitude: -114.0719,
      },
    },
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from('profiles')
      .update(update.data)
      .eq('id', update.id);

    if (error) {
      logResult(`Customer: ${update.name}`, false, 'Failed to update', error);
    } else {
      logResult(`Customer: ${update.name}`, true, 'Updated successfully');
    }
  }
}

async function phase2_fixMechanics() {
  console.log('\n📋 PHASE 2: FIX EXISTING MECHANICS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const updates = [
    {
      id: '99c254c1-a9f6-42fa-9d3b-6e3f2f8c7d5e',
      name: 'Test Mechanic (mechanic@test.com)',
      data: {
        name: 'Test Mechanic',
        phone: '416-555-0301',
        city: 'Toronto',
        province: 'ON',
        postal_code: 'M5V3A8',
        country: 'Canada',
        years_of_experience: 10,
        specializations: ['General Repair', 'Diagnostics'],
        red_seal_certified: true,
        red_seal_number: 'RS-ON-2024-901234',
        red_seal_province: 'ON',
      },
    },
    {
      id: '0d887221-e3c1-4d4f-a8e5-1e2f3a4b5c6d',
      name: 'Mechanic 2 (mech1@test.com)',
      data: {
        name: 'Sarah Independent',
        city: 'Montreal',
        province: 'QC',
        postal_code: 'H3A1A1',
        country: 'Canada',
        years_of_experience: 7,
        specializations: ['Brakes', 'Suspension'],
      },
    },
    {
      id: '2750cdea-f9e7-4b2a-a1d5-8e9f0a1b2c3d',
      name: 'Mechanic 1 (mech@test.com)',
      data: {
        name: 'Mike Freelance',
        city: 'Vancouver',
        province: 'BC',
        postal_code: 'V6B2W9',
        country: 'Canada',
        years_of_experience: 12,
        specializations: ['Engine', 'Transmission'],
        red_seal_certified: true,
        red_seal_number: 'RS-BC-2023-856789',
        red_seal_province: 'BC',
      },
    },
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from('mechanics')
      .update(update.data)
      .eq('id', update.id);

    if (error) {
      logResult(`Mechanic: ${update.name}`, false, 'Failed to update', error);
    } else {
      logResult(`Mechanic: ${update.name}`, true, 'Updated successfully');
    }
  }
}

async function phase3_fixWorkshops() {
  console.log('\n📋 PHASE 3: FIX EXISTING WORKSHOPS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const updates = [
    {
      id: 'a8d9aa15-8e7f-4b2a-a1c5-9e0f1a2b3c4d',
      name: 'Test Workshop 1',
      data: {
        address: '1200 Yonge St',
        postal_code: 'M4T1W1',
      },
    },
    {
      id: '916a447a-7d6e-4a1b-9c4d-8f9e0a1b2c3d',
      name: 'Test Workshop 2',
      data: {
        address: '1300 King St W',
        postal_code: 'M6K1G4',
      },
    },
    {
      id: 'a3c3090b-2f1e-4d5c-8b7a-9e0f1a2b3c4d',
      name: 'Test Workshop 3',
      data: {
        address: '1400 Dundas St E',
        postal_code: 'M4M1K7',
      },
    },
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from('organizations')
      .update(update.data)
      .eq('id', update.id);

    if (error) {
      logResult(`Workshop: ${update.name}`, false, 'Failed to update', error);
    } else {
      logResult(`Workshop: ${update.name}`, true, 'Updated successfully');
    }
  }
}

async function phase4_createNewMechanics() {
  console.log('\n📋 PHASE 4: CREATE NEW MECHANICS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get workshop IDs for association
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
    // Virtual Mechanics
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
      participation_mode: 'virtual_only',
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
      participation_mode: 'workshop_and_virtual',
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
      interprovincial_certified: true,
      is_available: true,
      participation_mode: 'workshop_and_virtual',
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
      participation_mode: 'workshop_and_virtual',
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
      participation_mode: 'physical_and_virtual',
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
      interprovincial_certified: true,
      is_available: true,
      participation_mode: 'physical_and_virtual',
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

  // Check if table exists first
  const { error: tableCheckError } = await supabase
    .from('brand_specialist_certifications')
    .select('id')
    .limit(1);

  if (tableCheckError && tableCheckError.code === 'PGRST204') {
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

async function phase6_createRFQs() {
  console.log('\n📋 PHASE 6: CREATE TEST RFQs');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if table exists
  const { error: tableCheckError } = await supabase
    .from('rfqs')
    .select('id')
    .limit(1);

  if (tableCheckError && tableCheckError.code === 'PGRST204') {
    logResult('RFQs', false, 'Table does not exist - need to run migrations first', tableCheckError);
    console.log('\n⚠️  Please run: npx supabase db push\n');
    return [];
  }

  const rfqs = [
    {
      customer_id: '0af3d300-cbca-4019-baa6-e92e402ccd1b',
      vehicle_year: 2020,
      vehicle_make: 'Honda',
      vehicle_model: 'Civic',
      vehicle_vin: 'JHMFC1F38LX123456',
      issue_description: 'Check engine light came on yesterday. Car is running rough at idle. Code reader shows P0300 (random misfire detected).',
      service_type: 'diagnostic',
      urgency: 'high',
      status: 'open',
      location_city: 'Toronto',
      location_province: 'ON',
      location_postal_code: 'M1P0G3',
      preferred_date: new Date('2025-11-15').toISOString(),
      budget_min: 100,
      budget_max: 300,
    },
    {
      customer_id: 'c060b46b-c62c-49cf-aa30-167ce56b0aec',
      vehicle_year: 2018,
      vehicle_make: 'Toyota',
      vehicle_model: 'Camry',
      vehicle_vin: '4T1B11HK5JU123456',
      issue_description: 'Brake pads are worn and making squeaking noise. Need front brake pads and rotors replaced.',
      service_type: 'repair',
      urgency: 'medium',
      status: 'open',
      location_city: 'Toronto',
      location_province: 'ON',
      location_postal_code: 'M5A1T1',
      preferred_date: new Date('2025-11-18').toISOString(),
      budget_min: 300,
      budget_max: 600,
    },
    {
      customer_id: '8dda8cb3-fea7-48a3-988c-087eb5bd179d',
      vehicle_year: 2019,
      vehicle_make: 'Ford',
      vehicle_model: 'F-150',
      vehicle_vin: '1FTEW1EP5KFC12345',
      issue_description: 'Transmission slipping between 3rd and 4th gear. Happens mostly when accelerating on highway.',
      service_type: 'diagnostic',
      urgency: 'high',
      status: 'open',
      location_city: 'Montreal',
      location_province: 'QC',
      location_postal_code: 'H3B4W8',
      preferred_date: new Date('2025-11-16').toISOString(),
      budget_min: 150,
      budget_max: 500,
    },
    {
      customer_id: '607a9b1f-0eb4-44f4-8a6c-879e674cbd5f',
      vehicle_year: 2021,
      vehicle_make: 'Mazda',
      vehicle_model: 'CX-5',
      vehicle_vin: 'JM3KFBCM5M0123456',
      issue_description: 'Due for regular maintenance: oil change, tire rotation, winter tire installation.',
      service_type: 'maintenance',
      urgency: 'low',
      status: 'open',
      location_city: 'Ottawa',
      location_province: 'ON',
      location_postal_code: 'K1P5G4',
      preferred_date: new Date('2025-11-20').toISOString(),
      budget_min: 150,
      budget_max: 300,
    },
    {
      customer_id: '65acc199-333b-4f0e-bffd-9b0b319b6e6a',
      vehicle_year: 2017,
      vehicle_make: 'BMW',
      vehicle_model: '328i',
      vehicle_vin: 'WBA8E5G57HNU12345',
      issue_description: 'Air conditioning stopped working. No cold air coming out. AC compressor might need replacement.',
      service_type: 'repair',
      urgency: 'medium',
      status: 'open',
      location_city: 'Calgary',
      location_province: 'AB',
      location_postal_code: 'T2P3M3',
      preferred_date: new Date('2025-11-17').toISOString(),
      budget_min: 400,
      budget_max: 1000,
    },
  ];

  const createdRFQs: any[] = [];

  for (const rfq of rfqs) {
    const { data, error } = await supabase
      .from('rfqs')
      .insert(rfq)
      .select()
      .single();

    if (error) {
      logResult(`RFQ: ${rfq.vehicle_make} ${rfq.vehicle_model}`, false, 'Failed to create', error);
    } else {
      logResult(`RFQ: ${rfq.vehicle_make} ${rfq.vehicle_model}`, true, 'Created successfully');
      createdRFQs.push(data);
    }
  }

  return createdRFQs;
}

async function phase7_createQuotes(rfqs: any[], mechanics: any[]) {
  console.log('\n📋 PHASE 7: CREATE TEST QUOTES');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (rfqs.length === 0) {
    logResult('Quotes', false, 'No RFQs available to create quotes for');
    return;
  }

  // Check if table exists
  const { error: tableCheckError } = await supabase
    .from('quotes')
    .select('id')
    .limit(1);

  if (tableCheckError && tableCheckError.code === 'PGRST204') {
    logResult('Quotes', false, 'Table does not exist - need to run migrations first', tableCheckError);
    return;
  }

  // Get some mechanics
  const { data: allMechanics } = await supabase
    .from('mechanics')
    .select('id, name, email, specializations')
    .limit(10);

  const mechanicsToUse = allMechanics || [];

  if (mechanicsToUse.length === 0) {
    logResult('Quotes', false, 'No mechanics available to create quotes');
    return;
  }

  // Create 3 quotes per RFQ
  let quotesCreated = 0;

  for (const rfq of rfqs) {
    // Select 3 random mechanics
    const selectedMechanics = mechanicsToUse.slice(0, Math.min(3, mechanicsToUse.length));

    for (let i = 0; i < selectedMechanics.length; i++) {
      const mechanic = selectedMechanics[i];
      const quote = {
        rfq_id: rfq.id,
        mechanic_id: mechanic.id,
        estimated_cost: rfq.budget_min + (i * 100),
        estimated_duration: 2 + i,
        labor_cost: 100 + (i * 50),
        parts_cost: rfq.budget_min - 100,
        message: `Professional ${rfq.service_type} service for your ${rfq.vehicle_make} ${rfq.vehicle_model}. ${i === 0 ? 'Best value option.' : i === 1 ? 'Premium service with warranty.' : 'Comprehensive service package.'}`,
        availability_start: new Date('2025-11-15T09:00:00').toISOString(),
        availability_end: new Date('2025-11-15T17:00:00').toISOString(),
        service_location: i === 0 ? 'virtual' : i === 1 ? 'mobile' : 'workshop',
        status: 'pending',
        expires_at: new Date('2025-11-17T23:59:59').toISOString(),
      };

      const { error } = await supabase
        .from('quotes')
        .insert(quote);

      if (error) {
        logResult(`Quote for ${rfq.vehicle_make}`, false, `Failed (${mechanic.name})`, error);
      } else {
        quotesCreated++;
        logResult(`Quote for ${rfq.vehicle_make}`, true, `Created by ${mechanic.name}`);
      }
    }
  }

  console.log(`\n   Total quotes created: ${quotesCreated}`);
}

async function generateFinalReport() {
  console.log('\n📊 GENERATING FINAL REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Count everything
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

  let rfqsCount = 0;
  let quotesCount = 0;

  try {
    const { count: rfqs } = await supabase
      .from('rfqs')
      .select('*', { count: 'exact', head: true });
    rfqsCount = rfqs || 0;

    const { count: quotes } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true });
    quotesCount = quotes || 0;
  } catch (e) {
    // Tables might not exist yet
  }

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      customers: customersCount || 0,
      mechanics: mechanicsCount || 0,
      workshops: workshopsCount || 0,
      sessionRequests: sessionsCount || 0,
      rfqs: rfqsCount,
      quotes: quotesCount,
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
  console.log(`   RFQs: ${report.summary.rfqs}`);
  console.log(`   Quotes: ${report.summary.quotes}`);
  console.log('');
  console.log('📊 OPERATION RESULTS:');
  console.log(`   ✅ Successful: ${report.success}`);
  console.log(`   ❌ Failed: ${report.failed}`);
  console.log('');

  const reportPath = path.join(process.cwd(), 'seed-completion-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✅ Report saved to: ${reportPath}\n`);

  return report;
}

async function main() {
  console.log('🚀 STARTING DATABASE SEED');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await phase1_fixCustomers();
    await phase2_fixMechanics();
    await phase3_fixWorkshops();

    const newMechanics = await phase4_createNewMechanics();
    await phase5_createBrandCertifications(newMechanics);

    const rfqs = await phase6_createRFQs();
    await phase7_createQuotes(rfqs, newMechanics);

    const report = await generateFinalReport();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 SEED COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (report.failed > 0) {
      console.log(`⚠️  ${report.failed} operation(s) failed. Check the logs above.\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ SEED FAILED:', error);
    process.exit(1);
  }
}

main();
