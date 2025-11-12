# FINAL IMPLEMENTATION PLAN - USER DATA SETUP
**Date:** November 12, 2025
**Status:** Ready to Execute
**Based on:** Corrected audit findings + Session analysis

---

## EXECUTIVE SUMMARY

### Current State (ACTUAL)
- ✅ **6 Customers** (target: 5) - BUT all missing location data
- ⚠️ **7 Mechanics** (target: 15) - 4 complete, 3 incomplete
- ✅ **11 Workshops** (target: 5) - 8 complete, 3 incomplete
- ✅ **43 Session Requests** (target: 15) - Mostly test data, but usable
- ❌ **RFQ/Quotes Tables** - Don't exist yet

### What We Need to Do
1. **Fix existing data** - 6 customers + 3 mechanics + 3 workshops
2. **Create 8 more mechanics** - To reach target of 15
3. **Add certifications** - Red Seal, Quebec, Interprovincial, Brand Specialist examples
4. **Run migrations** - Create RFQ/Quotes tables
5. **Create test RFQs and Quotes** - For marketplace testing

---

## PHASE 1: FIX EXISTING CUSTOMERS (6 customers)

### Priority: ⭐⭐⭐ CRITICAL - Postal code matching won't work without this

| Customer ID | Email | Current Issues | Fix Required |
|-------------|-------|----------------|--------------|
| 0af3d300 | cust1@test.com | Missing: province, postal_code, lat/lng (has address_line1, city) | Geocode address, add ON, M1P0G3 |
| c060b46b | cust2@test.com | Missing: province, postal_code, lat/lng (has city: Toronto) | Add: 456 Queen St E, ON, M5A1T1, lat/lng |
| 8dda8cb3 | cust3@test.com | Missing: city, province, postal_code, lat/lng | Add: Montreal, QC, H3B4W8, lat/lng |
| 607a9b1f | ktest@askautodoctor.com | Missing: full_name, phone, all location | Add: Kelly Test, 613-555-0150, Ottawa, ON, K1P5G4, lat/lng |
| 65acc199 | faizrhashmi@gmail.com | Missing: full_name, phone, all location | Add: Faiz Hashmi, 403-555-0180, Calgary, AB, T2P3M3, lat/lng |
| c1838c27 | Deleted User | account_status = 'deleted' | SKIP - leave as is |

### Specific Updates:

#### Customer 1: cust1@test.com
```typescript
UPDATE profiles SET
  state_province = 'Ontario',
  province = 'ON',
  postal_zip_code = 'M1P 0G3',
  postal_code = 'M1P0G3',
  country = 'Canada',
  latitude = 43.7730,
  longitude = -79.2304
WHERE id = '0af3d300-cbca-4019-baa6-e92e402ccd1b';
```

#### Customer 2: cust2@test.com
```typescript
UPDATE profiles SET
  address_line1 = '456 Queen St E',
  city = 'Toronto',
  state_province = 'Ontario',
  province = 'ON',
  postal_zip_code = 'M5A 1T1',
  postal_code = 'M5A1T1',
  country = 'Canada',
  latitude = 43.6543,
  longitude = -79.3615
WHERE id = 'c060b46b-c62c-49cf-aa30-167ce56b0aec';
```

#### Customer 3: cust3@test.com
```typescript
UPDATE profiles SET
  address_line1 = '1001 Rue Sainte-Catherine O',
  city = 'Montreal',
  state_province = 'Quebec',
  province = 'QC',
  postal_zip_code = 'H3B 4W8',
  postal_code = 'H3B4W8',
  country = 'Canada',
  latitude = 45.5017,
  longitude = -73.5673
WHERE id = '8dda8cb3-fea7-48a3-988c-087eb5bd179d';
```

#### Customer 4: ktest@askautodoctor.com
```typescript
UPDATE profiles SET
  full_name = 'Kelly Test',
  phone = '613-555-0150',
  address_line1 = '789 Wellington St',
  city = 'Ottawa',
  state_province = 'Ontario',
  province = 'ON',
  postal_zip_code = 'K1P 5G4',
  postal_code = 'K1P5G4',
  country = 'Canada',
  latitude = 45.4236,
  longitude = -75.6990
WHERE id = '607a9b1f-0eb4-44f4-8a6c-879e674cbd5f';
```

#### Customer 5: faizrhashmi@gmail.com
```typescript
UPDATE profiles SET
  full_name = 'Faiz Hashmi',
  phone = '403-555-0180',
  address_line1 = '567 8th Ave SW',
  city = 'Calgary',
  state_province = 'Alberta',
  province = 'AB',
  postal_zip_code = 'T2P 3M3',
  postal_code = 'T2P3M3',
  country = 'Canada',
  latitude = 51.0447,
  longitude = -114.0719
WHERE id = '65acc199-333b-4f0e-bffd-9b0b319b6e6a';
```

---

## PHASE 2: FIX EXISTING MECHANICS (3 incomplete mechanics)

### Priority: ⭐⭐ HIGH - These mechanics have sessions but can't match properly

| Mechanic ID | Email | Current Issues | Fix Required |
|-------------|-------|----------------|--------------|
| 99c254c1 | mechanic@test.com | Missing: phone, city, province, postal_code, experience | Add all missing data |
| 0d887221 | mech1@test.com | Missing: city, province, postal_code, experience | Add location + experience |
| 2750cdea | mech@test.com | Missing: city, province, postal_code, experience | Add location + experience |

### Specific Updates:

#### Mechanic 1: mechanic@test.com (Test Mechanic)
```typescript
UPDATE mechanics SET
  name = 'Test Mechanic',
  phone = '416-555-0301',
  city = 'Toronto',
  province = 'ON',
  postal_code = 'M5V3A8',
  country = 'Canada',
  years_of_experience = 10,
  specializations = ARRAY['General Repair', 'Diagnostics'],
  red_seal_certified = true,
  red_seal_number = 'RS-ON-2024-901234',
  red_seal_province = 'ON'
WHERE id = '99c254c1-a9f6-42fa-9d3b-6e3f2f8c7d5e';
```

#### Mechanic 2: mech1@test.com (Mechanic 2)
```typescript
UPDATE mechanics SET
  name = 'Sarah Independent',
  city = 'Montreal',
  province = 'QC',
  postal_code = 'H3A1A1',
  country = 'Canada',
  years_of_experience = 7,
  specializations = ARRAY['Brakes', 'Suspension'],
  quebec_certified = true
WHERE id = '0d887221-e3c1-4d4f-a8e5-1e2f3a4b5c6d';
```

#### Mechanic 3: mech@test.com (Mechanic 1)
```typescript
UPDATE mechanics SET
  name = 'Mike Freelance',
  city = 'Vancouver',
  province = 'BC',
  postal_code = 'V6B2W9',
  country = 'Canada',
  years_of_experience = 12,
  specializations = ARRAY['Engine', 'Transmission'],
  red_seal_certified = true,
  red_seal_number = 'RS-BC-2023-856789',
  red_seal_province = 'BC'
WHERE id = '2750cdea-f9e7-4b2a-a1d5-8e9f0a1b2c3d';
```

---

## PHASE 3: FIX EXISTING WORKSHOPS (3 incomplete workshops)

### Priority: ⭐ MEDIUM - Workshops have most data, just missing address

| Workshop ID | Name | Current Issues | Fix Required |
|-------------|------|----------------|--------------|
| a8d9aa15 | Test Workshop 1 | Missing: address, postal_code | Add address |
| 916a447a | Test Workshop 2 | Missing: address, postal_code | Add address |
| a3c3090b | Test Workshop 3 | Missing: address, postal_code | Add address |

### Specific Updates:

```typescript
UPDATE organizations SET
  address = '1200 Yonge St',
  postal_code = 'M4T1W1'
WHERE id = 'a8d9aa15-...';

UPDATE organizations SET
  address = '1300 King St W',
  postal_code = 'M6K1G4'
WHERE id = '916a447a-...';

UPDATE organizations SET
  address = '1400 Dundas St E',
  postal_code = 'M4M1K7'
WHERE id = 'a3c3090b-...';
```

---

## PHASE 4: CREATE 8 NEW MECHANICS (To reach target of 15)

### Priority: ⭐⭐ HIGH - Need diversity in mechanic types and locations

### 4.1 CREATE 2 MORE VIRTUAL MECHANICS

#### Virtual Mechanic 1: Emma Online (EV/Hybrid Specialist)
```typescript
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
  participation_mode: 'virtual_only'
}
// Add Toyota brand certification
```

#### Virtual Mechanic 2: David Remote (Honda Specialist)
```typescript
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
  participation_mode: 'virtual_only'
}
// Add Honda brand certification
```

### 4.2 CREATE 3 MORE WORKSHOP MECHANICS

#### Workshop Mechanic 1: Marie Atelier (Montreal, Quebec Certified)
```typescript
{
  email: 'marie.atelier@montrealgarage.com',
  name: 'Marie Atelier',
  phone: '514-555-0401',
  account_type: 'workshop_mechanic',
  workshop_id: '98aeac24-...' // Premium Auto Care (or Montreal workshop),
  city: 'Montreal',
  province: 'QC',
  postal_code: 'H3A1A1',
  country: 'Canada',
  years_of_experience: 15,
  specializations: ['General Repair', 'French Vehicles', 'European Cars'],
  red_seal_certified: true,
  red_seal_number: 'RS-QC-2019-567234',
  red_seal_province: 'QC',
  quebec_certified: true,
  is_available: true,
  participation_mode: 'workshop_and_virtual'
}
```

#### Workshop Mechanic 2: Tom Workshop (Calgary, Diesel Specialist)
```typescript
{
  email: 'tom.workshop@expertmotors.com',
  name: 'Tom Workshop',
  phone: '403-555-0401',
  account_type: 'workshop_mechanic',
  workshop_id: '2ec0070c-...' // Expert Motors,
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
  participation_mode: 'workshop_and_virtual'
}
```

#### Workshop Mechanic 3: Lisa Tech (Vancouver, Nissan Specialist)
```typescript
{
  email: 'lisa.tech@quickfix.com',
  name: 'Lisa Tech',
  phone: '604-555-0301',
  account_type: 'workshop_mechanic',
  workshop_id: '78db0e30-...' // Quick Fix Garage,
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
  participation_mode: 'workshop_and_virtual'
}
// Add Nissan brand certification
```

### 4.3 CREATE 3 MORE INDEPENDENT MECHANICS

#### Independent 1: Frank Independent (Toronto, Ford Specialist)
```typescript
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
  participation_mode: 'physical_and_virtual'
}
// Add Ford brand certification
```

#### Independent 2: Sophie Solo (Montreal, European Specialist)
```typescript
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
  quebec_certified: true,
  interprovincial_certified: true,
  is_available: true,
  participation_mode: 'physical_and_virtual'
}
// Add BMW and Mercedes certifications
```

#### Independent 3: Chris Mobile (Calgary, Mobile Mechanic)
```typescript
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
  participation_mode: 'physical_only'
}
// Add GM brand certification
```

---

## PHASE 5: ADD BRAND SPECIALIST CERTIFICATIONS

### Priority: ⭐ MEDIUM - Examples of different certification types

**Create brand_specialist_certifications entries:**

### Toyota Certification (for Emma Online)
```typescript
{
  mechanic_id: 'emma-online-id',
  brand_name: 'Toyota',
  certification_type: 'Master Technician',
  certificate_number: 'TOYOTA-2024-MT-4782',
  issue_date: '2023-06-15',
  expiry_date: '2026-06-15',
  issuing_organization: 'Toyota Canada',
  verified: true,
  specialty_areas: ['Hybrid Systems', 'TNGA Platform', 'Advanced Safety Systems']
}
```

### Honda Certification (for David Remote)
```typescript
{
  mechanic_id: 'david-remote-id',
  brand_name: 'Honda',
  certification_type: 'Master Certified Technician',
  certificate_number: 'HONDA-2024-MCT-8921',
  issue_date: '2022-09-01',
  expiry_date: '2025-09-01',
  issuing_organization: 'Honda Canada',
  verified: true,
  specialty_areas: ['Powertrain', 'i-VTEC Systems', 'HondaLink']
}
```

### Nissan Certification (for Lisa Tech)
```typescript
{
  mechanic_id: 'lisa-tech-id',
  brand_name: 'Nissan',
  certification_type: 'Advanced Diagnostics Specialist',
  certificate_number: 'NISSAN-2024-ADS-3421',
  issue_date: '2023-03-20',
  expiry_date: null,
  issuing_organization: 'Nissan Canada',
  verified: true,
  specialty_areas: ['ProPILOT', 'e-POWER', 'Intelligent Mobility']
}
```

### Ford Certification (for Frank Independent)
```typescript
{
  mechanic_id: 'frank-independent-id',
  brand_name: 'Ford',
  certification_type: 'Senior Master Technician',
  certificate_number: 'FORD-2024-SMT-9012',
  issue_date: '2021-11-10',
  expiry_date: '2026-11-10',
  issuing_organization: 'Ford Motor Company',
  verified: true,
  specialty_areas: ['EcoBoost', 'PowerStroke Diesel', 'SYNC Systems']
}
```

### BMW Certification (for Sophie Solo)
```typescript
{
  mechanic_id: 'sophie-solo-id',
  brand_name: 'BMW',
  certification_type: 'Master Technician',
  certificate_number: 'BMW-2024-MT-7734',
  issue_date: '2022-05-15',
  expiry_date: '2027-05-15',
  issuing_organization: 'BMW Canada',
  verified: true,
  specialty_areas: ['iDrive', 'xDrive', 'M Performance']
}
```

### Mercedes-Benz Certification (for Sophie Solo)
```typescript
{
  mechanic_id: 'sophie-solo-id',
  brand_name: 'Mercedes-Benz',
  certification_type: 'StarTech Certified',
  certificate_number: 'MBENZ-2024-ST-5629',
  issue_date: '2023-01-20',
  expiry_date: null,
  issuing_organization: 'Mercedes-Benz Canada',
  verified: true,
  specialty_areas: ['MBUX', 'AMG', '4MATIC']
}
```

### GM Certification (for Chris Mobile)
```typescript
{
  mechanic_id: 'chris-mobile-id',
  brand_name: 'General Motors',
  certification_type: 'World Class Technician',
  certificate_number: 'GM-2024-WCT-8845',
  issue_date: '2022-08-12',
  expiry_date: '2025-08-12',
  issuing_organization: 'General Motors Canada',
  verified: true,
  specialty_areas: ['OnStar', 'Corvette', 'Silverado HD']
}
```

---

## PHASE 6: RUN PENDING MIGRATIONS

### Priority: ⭐⭐⭐ CRITICAL - Required for RFQ/Quotes testing

```bash
npx supabase db push
```

**Expected migrations to apply:**
- `20251112000001_complete_rfq_marketplace_setup.sql`
- `20251112000002_dynamic_referral_fee_system.sql`
- `20251112000003_customer_quote_offers_view.sql`
- (Any other pending migrations)

**Verify tables created:**
- `rfqs`
- `quotes`
- `quote_offers` (view)

---

## PHASE 7: CREATE TEST RFQs (5+ RFQs for quote testing)

### Priority: ⭐⭐ HIGH - Required to test marketplace

### RFQ 1: Honda Civic - Check Engine Light
```typescript
{
  customer_id: '0af3d300-...', // cust1@test.com
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
  preferred_date: '2025-11-15',
  budget_min: 100,
  budget_max: 300,
  preferred_mechanic_type: 'any'
}
```

### RFQ 2: Toyota Camry - Brake Service
```typescript
{
  customer_id: 'c060b46b-...', // cust2@test.com
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
  preferred_date: '2025-11-18',
  budget_min: 300,
  budget_max: 600,
  preferred_mechanic_type: 'workshop'
}
```

### RFQ 3: Ford F-150 - Transmission Issue
```typescript
{
  customer_id: '8dda8cb3-...', // cust3@test.com
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
  preferred_date: '2025-11-16',
  budget_min: 150,
  budget_max: 500,
  preferred_mechanic_type: 'any'
}
```

### RFQ 4: Mazda CX-5 - Maintenance
```typescript
{
  customer_id: '607a9b1f-...', // ktest@askautodoctor.com
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
  preferred_date: '2025-11-20',
  budget_min: 150,
  budget_max: 300,
  preferred_mechanic_type: 'workshop'
}
```

### RFQ 5: BMW 3 Series - AC Not Working
```typescript
{
  customer_id: '65acc199-...', // faizrhashmi@gmail.com
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
  preferred_date: '2025-11-17',
  budget_min: 400,
  budget_max: 1000,
  preferred_mechanic_type: 'independent'
}
```

---

## PHASE 8: CREATE TEST QUOTES (15-20 quotes from mechanics)

### Priority: ⭐⭐ HIGH - Test quote submission and acceptance

**For each RFQ, create 2-4 quotes from different mechanic types:**

### Quotes for RFQ #1 (Honda Civic - Check Engine)

#### Quote from David Remote (Virtual Honda Specialist)
```typescript
{
  rfq_id: 'rfq-1-id',
  mechanic_id: 'david-remote-id',
  estimated_cost: 150,
  estimated_duration: 2.0,
  labor_cost: 120,
  parts_cost: 30,
  message: 'P0300 code indicates random misfire. Based on your description, likely causes are spark plugs, ignition coils, or fuel injector issues. I can diagnose via video session and guide you through basic checks. If parts needed, I can recommend local shops.',
  availability_start: '2025-11-15T09:00:00',
  availability_end: '2025-11-15T17:00:00',
  service_location: 'virtual',
  status: 'pending',
  expires_at: '2025-11-17T23:59:59'
}
```

#### Quote from Frank Independent (Independent Toronto)
```typescript
{
  rfq_id: 'rfq-1-id',
  mechanic_id: 'frank-independent-id',
  estimated_cost: 280,
  estimated_duration: 2.5,
  labor_cost: 180,
  parts_cost: 100,
  message: 'Will diagnose the P0300 misfire code with full diagnostic scan. Common causes include spark plugs ($80), ignition coils ($150), or fuel system issues. Price includes diagnosis and repair of most likely cause.',
  availability_start: '2025-11-15T10:00:00',
  availability_end: '2025-11-15T16:00:00',
  service_location: 'mobile',
  status: 'pending',
  expires_at: '2025-11-17T23:59:59'
}
```

#### Quote from Alex Thompson (Workshop - Elite Auto Care)
```typescript
{
  rfq_id: 'rfq-1-id',
  mechanic_id: 'c62837da-...', // Alex Thompson
  estimated_cost: 320,
  estimated_duration: 3.0,
  labor_cost: 200,
  parts_cost: 120,
  message: 'Complete diagnostic service for misfire. We will scan all systems, perform compression test if needed. Includes spark plug replacement (all 4 cylinders) which is the most common cause. Can have your car ready same day.',
  availability_start: '2025-11-15T08:00:00',
  availability_end: '2025-11-15T18:00:00',
  service_location: 'workshop',
  workshop_id: '573d6fc4-...',
  status: 'pending',
  expires_at: '2025-11-17T23:59:59'
}
```

### Quotes for RFQ #2 (Toyota Camry - Brakes)

#### Quote from Emma Online (Virtual Toyota Specialist)
```typescript
{
  rfq_id: 'rfq-2-id',
  mechanic_id: 'emma-online-id',
  estimated_cost: 100,
  estimated_duration: 1.0,
  labor_cost: 100,
  parts_cost: 0,
  message: 'I can guide you through brake inspection via video to confirm condition. Will help you understand what needs replacement. Can recommend trusted local shops for the actual work.',
  availability_start: '2025-11-18T09:00:00',
  availability_end: '2025-11-18T17:00:00',
  service_location: 'virtual',
  status: 'pending',
  expires_at: '2025-11-20T23:59:59'
}
```

#### Quote from Workshop (Premium Auto Care)
```typescript
{
  rfq_id: 'rfq-2-id',
  mechanic_id: 'premium-mechanic-id',
  estimated_cost: 450,
  estimated_duration: 3.0,
  labor_cost: 200,
  parts_cost: 250,
  message: 'Front brake service: premium ceramic brake pads, resurface or replace rotors as needed. Includes full inspection of rear brakes, brake fluid check, and test drive. 2-year warranty on parts and labor.',
  availability_start: '2025-11-18T08:00:00',
  availability_end: '2025-11-18T17:00:00',
  service_location: 'workshop',
  workshop_id: '98aeac24-...',
  status: 'pending',
  expires_at: '2025-11-20T23:59:59'
}
```

#### Quote from Sophie Solo (Independent - European Specialist)
```typescript
{
  rfq_id: 'rfq-2-id',
  mechanic_id: 'sophie-solo-id',
  estimated_cost: 380,
  estimated_duration: 2.5,
  labor_cost: 180,
  parts_cost: 200,
  message: 'OEM-quality brake pads and rotor service. Will inspect and service calipers, clean and lubricate hardware. Mobile service available at your location. Parts carry 18-month warranty.',
  availability_start: '2025-11-18T10:00:00',
  availability_end: '2025-11-18T16:00:00',
  service_location: 'mobile',
  status: 'pending',
  expires_at: '2025-11-20T23:59:59'
}
```

**Continue this pattern for remaining RFQs #3, #4, #5 with 2-4 quotes each...**

---

## PHASE 9: VERIFICATION & TESTING

### Priority: ⭐⭐⭐ CRITICAL - Ensure everything works

After implementation, verify:

### 1. Run Corrected Audit Again
```bash
npx tsx scripts/correct-audit-database-users.ts
```

**Expected Results:**
- ✅ 5 customers with complete data (6 total, 1 deleted)
- ✅ 15 mechanics (7 fixed + 8 new)
- ✅ 11 workshops (all complete)
- ✅ 43 session requests (existing)
- ✅ 5+ RFQs
- ✅ 15+ Quotes
- ✅ 7+ Brand certifications

### 2. Test Postal Code Matching
```sql
-- Should return customers with matching postal codes
SELECT * FROM profiles
WHERE role = 'customer'
  AND postal_code IS NOT NULL
  AND latitude IS NOT NULL;

-- Should return 5 customers
```

### 3. Test Mechanic Availability
```sql
-- Should return all mechanics with complete profiles
SELECT id, name, email, city, province, postal_code, years_of_experience
FROM mechanics
WHERE city IS NOT NULL
  AND province IS NOT NULL
  AND postal_code IS NOT NULL
  AND years_of_experience IS NOT NULL;

-- Should return 15 mechanics
```

### 4. Test RFQ/Quote System
```sql
-- Should return all open RFQs with quotes
SELECT
  r.id,
  r.vehicle_make,
  r.vehicle_model,
  r.status,
  COUNT(q.id) as quote_count
FROM rfqs r
LEFT JOIN quotes q ON r.id = q.rfq_id
GROUP BY r.id, r.vehicle_make, r.vehicle_model, r.status;

-- Should show 5 RFQs with 2-4 quotes each
```

### 5. Test Geographic Distribution
```sql
-- Should show mechanics in multiple provinces
SELECT province, COUNT(*) as mechanic_count
FROM mechanics
GROUP BY province
ORDER BY mechanic_count DESC;

-- Should show: ON, QC, BC, AB
```

---

## EXECUTION SCRIPT

I will create a TypeScript seed script that implements all phases:

**File:** `scripts/seed-complete-test-data.ts`

**Execution:**
```bash
npx tsx scripts/seed-complete-test-data.ts
```

**What it will do:**
1. Fix 5 customers (add location data)
2. Fix 3 mechanics (add location + experience)
3. Fix 3 workshops (add addresses)
4. Create 8 new mechanics with complete profiles
5. Create 7 brand certifications
6. Create 5 RFQs
7. Create 15-20 quotes
8. Verify all data
9. Generate completion report

---

## SUCCESS CRITERIA

After implementation, you should have:

| Metric | Target | Expected Result |
|--------|--------|----------------|
| ✅ Complete customers | 5 | 5 (6 total, 1 deleted) |
| ✅ Total mechanics | 15 | 15 (7 fixed + 8 new) |
| ✅ Virtual mechanics | 5+ | 5 |
| ✅ Workshop mechanics | 5+ | 6 |
| ✅ Independent mechanics | 5+ | 4 |
| ✅ Workshops with data | 5+ | 11 |
| ✅ Red Seal certifications | 5+ | 10+ |
| ✅ Quebec certifications | 2+ | 2 |
| ✅ Interprovincial certs | 2+ | 2 |
| ✅ Brand certifications | 5+ | 7 |
| ✅ RFQs | 5+ | 5 |
| ✅ Quotes | 15+ | 15-20 |
| ✅ Session requests | 15+ | 43 (existing) |
| ✅ Geographic diversity | 4+ provinces | ON, QC, AB, BC |

---

## NEXT STEPS

1. **Review this plan** - Confirm approach
2. **I will create the seed script** - Complete TypeScript implementation
3. **Run migrations** - `npx supabase db push`
4. **Execute seed script** - `npx tsx scripts/seed-complete-test-data.ts`
5. **Verify results** - Run audit again
6. **Test workflows** - Verify matching, quoting, booking all work

**Ready to proceed with creating the seed script?**

