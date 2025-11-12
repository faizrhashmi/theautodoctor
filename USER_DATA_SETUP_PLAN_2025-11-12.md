# COMPREHENSIVE USER DATA SETUP PLAN
**Date:** November 12, 2025
**Purpose:** Complete testing-ready user data for The Auto Doctor platform

---

## CURRENT STATE ANALYSIS

### Summary
- **Total Users:** 21
- **Active Customers:** 5 (1 deleted)
- **Mechanics:** 0 ❌
- **Workshops:** 0 ❌
- **RFQs:** 0 ❌
- **Quotes:** 0 ❌
- **Session Requests:** 0 ❌
- **Workshop Appointments:** 0 ❌
- **Brand Certifications:** 0 ❌

### Critical Findings
1. **NO MECHANICS EXIST** - Must create all 15 mechanics (5 virtual, 5 workshop, 5 independent)
2. **NO WORKSHOPS EXIST** - Must create 5 workshops
3. **ALL 6 CUSTOMERS MISSING DATA** - Need postal codes, provinces, lat/lng for matching
4. **NO TRANSACTIONAL DATA** - No RFQs, quotes, or appointments to test workflows

---

## IMPLEMENTATION PLAN

### PHASE 1: FIX EXISTING CUSTOMERS (6 customers)
**Goal:** Complete all customer profiles with full addresses and contact information

#### Actions for Each Customer:
1. **Customer A (cust1@test.com)** ✅ Has most data
   - ✅ Has: Full name, phone, address, city, province, postal code
   - ❌ Missing: Latitude/Longitude for matching
   - **Action:** Geocode address to add lat/lng

2. **Customer B (cust2@test.com)**
   - ✅ Has: Full name, phone, city (Toronto)
   - ❌ Missing: Address, province, postal code, lat/lng
   - **Action:** Add complete Toronto address with postal code M5V 3A8

3. **Customer 3 (cust3@test.com)**
   - ✅ Has: Full name, phone
   - ❌ Missing: All location data
   - **Action:** Add Montreal, QC address with postal code H3B 4W8

4. **ktest@askautodoctor.com**
   - ❌ Missing: Everything except email
   - **Action:** Add full name "Kelly Test", Ottawa address K1P 5G4

5. **faizrhashmi@gmail.com**
   - ❌ Missing: Everything except email
   - **Action:** Add full name "Faiz Hashmi", Calgary address T2P 3M3

6. **Deleted User** - SKIP (account_status = 'deleted')

### PHASE 2: CREATE 5 VIRTUAL MECHANICS
**Goal:** 5 complete virtual mechanic profiles with certifications

| # | Email | Name | Province | Specialization | Certifications |
|---|-------|------|----------|----------------|----------------|
| 1 | virtual1@mechanic.com | John Virtual | ON | Engine Specialist | Red Seal (Automotive Service Technician, ON) |
| 2 | virtual2@mechanic.com | Sarah Remote | QC | Transmission Expert | Quebec Certificate (#QC-2024-7891) |
| 3 | virtual3@mechanic.com | Mike Distance | AB | Electrical Systems | Interprovincial + Red Seal (AB) |
| 4 | virtual4@mechanic.com | Emma Online | BC | Diagnostics Expert | Red Seal (BC) + Toyota Brand Specialist |
| 5 | virtual5@mechanic.com | David Cloud | ON | Hybrid/EV Specialist | Red Seal (ON) + Honda Brand Specialist |

**Each Virtual Mechanic Must Have:**
- Full profile: name, phone, email, bio (150-200 chars)
- Location: City, province, postal code, lat/lng
- Experience: 5-15 years
- Hourly rate: $60-$120/hour
- mechanic_type: 'virtual'
- At least 1 certification (Red Seal, Quebec, or Interprovincial)
- 1-2 brand specialist certifications for mechanics #4 and #5

### PHASE 3: CREATE 5 WORKSHOPS
**Goal:** 5 complete workshop organizations with full business details

| # | Business Name | City | Province | Postal Code | Owner Email |
|---|---------------|------|----------|-------------|-------------|
| 1 | Toronto Auto Experts | Toronto | ON | M4B 1B3 | workshop1@business.com |
| 2 | Montreal Garage Pro | Montreal | QC | H3A 1A1 | workshop2@business.com |
| 3 | Calgary Car Care | Calgary | AB | T2G 0P6 | workshop3@business.com |
| 4 | Vancouver Vehicle Services | Vancouver | BC | V6B 1A1 | workshop4@business.com |
| 5 | Ottawa Auto Solutions | Ottawa | ON | K1N 5S3 | workshop5@business.com |

**Each Workshop Must Have:**
- Complete business profile: name, business_name, business_address
- Location: city, province, postal_code, latitude, longitude
- Contact: phone_number
- Business details: business_registration_number, website (optional)
- Owner (will be workshop mechanic #1 for that shop)
- type: 'workshop'

### PHASE 4: CREATE 5 WORKSHOP MECHANICS
**Goal:** 5 mechanics affiliated with workshops (1 per workshop, plus 1 workshop with 2)

| # | Email | Name | Workshop | Province | Certifications |
|---|-------|------|----------|----------|----------------|
| 1 | wm1@mechanic.com | Robert Workshop | Toronto Auto Experts | ON | Red Seal (ON) |
| 2 | wm2@mechanic.com | Marie Atelier | Montreal Garage Pro | QC | Quebec Cert + Red Seal (QC) |
| 3 | wm3@mechanic.com | Tom Garage | Calgary Car Care | AB | Interprovincial (Multiple Provinces) |
| 4 | wm4@mechanic.com | Lisa Shop | Vancouver Vehicle Services | BC | Red Seal (BC) + Nissan Specialist |
| 5 | wm5@mechanic.com | Kevin Workshop | Toronto Auto Experts | ON | Red Seal (ON) + Ford Specialist |

**Each Workshop Mechanic Must Have:**
- Full profile (same as virtual mechanics)
- mechanic_type: 'workshop'
- workshop_id: linked to one of the 5 workshops
- organization_members entry with role 'mechanic'
- At least 1 certification
- Note: Workshop #1 (Toronto Auto Experts) will have 2 mechanics (WM1 as owner, WM5 as employee)

### PHASE 5: CREATE 5 INDEPENDENT MECHANICS
**Goal:** 5 independent garage owners for RFQ participation

| # | Email | Name | Province | Specialization | Certifications |
|---|-------|------|----------|----------------|----------------|
| 1 | indie1@mechanic.com | Frank Independent | ON | General Repair | Red Seal (ON) |
| 2 | indie2@mechanic.com | Sophie Solo | QC | Brakes & Suspension | Quebec Cert + Interprovincial |
| 3 | indie3@mechanic.com | Alex Freelance | AB | Diesel Specialist | Red Seal (AB) + Interprovincial |
| 4 | indie4@mechanic.com | Rachel Garage | BC | European Cars | Red Seal (BC) + BMW + Mercedes Specialist |
| 5 | indie5@mechanic.com | Chris Mobile | ON | Mobile Mechanic | Red Seal (ON) + GM Specialist |

**Each Independent Mechanic Must Have:**
- Full profile (same as virtual/workshop)
- mechanic_type: 'independent'
- workshop_id: null
- At least 1 certification (preferably 2-3 for independent credibility)

### PHASE 6: CREATE BRAND SPECIALIST CERTIFICATIONS
**Goal:** Examples of all certification types

#### Brand Certifications to Create:
1. **Toyota Certification** (virtual4@mechanic.com - Emma Online)
   - brand_name: 'Toyota'
   - certification_type: 'Master Technician'
   - certificate_number: 'TOYOTA-2024-MT-4782'
   - issue_date: '2023-06-15'
   - expiry_date: '2026-06-15'
   - issuing_organization: 'Toyota Canada'
   - verified: true

2. **Honda Certification** (virtual5@mechanic.com - David Cloud)
   - brand_name: 'Honda'
   - certification_type: 'Certified Technician'
   - certificate_number: 'HONDA-2024-CT-8921'
   - issue_date: '2022-09-01'
   - expiry_date: '2025-09-01'
   - issuing_organization: 'Honda Canada'
   - verified: true

3. **Nissan Certification** (wm4@mechanic.com - Lisa Shop)
   - brand_name: 'Nissan'
   - certification_type: 'Advanced Diagnostics'
   - certificate_number: 'NISSAN-2024-AD-3421'
   - issue_date: '2023-03-20'
   - expiry_date: null
   - issuing_organization: 'Nissan Canada'
   - verified: true

4. **Ford Certification** (wm5@mechanic.com - Kevin Workshop)
   - brand_name: 'Ford'
   - certification_type: 'Senior Master Technician'
   - certificate_number: 'FORD-2024-SMT-9012'
   - issue_date: '2021-11-10'
   - expiry_date: '2026-11-10'
   - issuing_organization: 'Ford Motor Company'
   - verified: true

5. **BMW Certification** (indie4@mechanic.com - Rachel Garage)
   - brand_name: 'BMW'
   - certification_type: 'Master Technician'
   - certificate_number: 'BMW-2024-MT-7734'
   - issue_date: '2022-05-15'
   - expiry_date: '2027-05-15'
   - issuing_organization: 'BMW Canada'
   - verified: true

6. **Mercedes-Benz Certification** (indie4@mechanic.com - Rachel Garage)
   - brand_name: 'Mercedes-Benz'
   - certification_type: 'StarTech Certified'
   - certificate_number: 'MBENZ-2024-ST-5629'
   - issue_date: '2023-01-20'
   - expiry_date: null
   - issuing_organization: 'Mercedes-Benz Canada'
   - verified: true

7. **GM Certification** (indie5@mechanic.com - Chris Mobile)
   - brand_name: 'General Motors'
   - certification_type: 'World Class Technician'
   - certificate_number: 'GM-2024-WCT-8845'
   - issue_date: '2022-08-12'
   - expiry_date: '2025-08-12'
   - issuing_organization: 'General Motors Canada'
   - verified: true

### PHASE 7: CREATE 5+ RFQs FROM CUSTOMERS
**Goal:** Active RFQs for quote testing

| # | Customer | Vehicle | Issue | Service Type | Status |
|---|----------|---------|-------|--------------|--------|
| 1 | Customer A | 2020 Honda Civic | Check engine light on, rough idle | diagnostic | open |
| 2 | Customer B | 2018 Toyota Camry | Brake pads worn, squeaking noise | repair | open |
| 3 | Customer 3 | 2019 Ford F-150 | Transmission slipping | diagnostic | open |
| 4 | Kelly Test | 2021 Mazda CX-5 | Oil change + winter tire installation | maintenance | open |
| 5 | Faiz Hashmi | 2017 BMW 3 Series | Air conditioning not working | repair | open |

**Each RFQ Must Have:**
- customer_id
- vehicle_make, vehicle_model, vehicle_year
- issue_description (detailed)
- service_type (diagnostic, repair, maintenance)
- urgency (low, medium, high)
- status: 'open'
- location_city, location_province, location_postal_code
- preferred_date (within next 7-14 days)

### PHASE 8: CREATE QUOTES FROM MECHANICS
**Goal:** Test quote submission from all mechanic types

#### Quotes to Create (15-20 total, 3-4 per RFQ):

**RFQ #1 (Honda Civic - Check Engine):**
- Quote from David Cloud (Virtual, Honda specialist) - $150, 2 hours
- Quote from Frank Independent (Independent) - $180, 2.5 hours
- Quote from Robert Workshop (Workshop) - $200, 3 hours

**RFQ #2 (Toyota Camry - Brakes):**
- Quote from Emma Online (Virtual, Toyota specialist) - $350, 3 hours
- Quote from Sophie Solo (Independent, Brake specialist) - $320, 2.5 hours
- Quote from Marie Atelier (Workshop) - $380, 3 hours

**RFQ #3 (Ford F-150 - Transmission):**
- Quote from Kevin Workshop (Workshop, Ford specialist) - $450, 4 hours
- Quote from Alex Freelance (Independent, Diesel specialist) - $420, 3.5 hours
- Quote from Mike Distance (Virtual) - $400, 4 hours

**RFQ #4 (Mazda CX-5 - Maintenance):**
- Quote from Tom Garage (Workshop) - $180, 2 hours
- Quote from Chris Mobile (Independent, Mobile) - $200, 2.5 hours

**RFQ #5 (BMW - AC Repair):**
- Quote from Rachel Garage (Independent, BMW specialist) - $550, 5 hours
- Quote from Lisa Shop (Workshop) - $600, 5.5 hours
- Quote from Sarah Remote (Virtual) - $500, 4 hours

**Each Quote Must Have:**
- rfq_id
- mechanic_id
- estimated_cost (realistic pricing)
- estimated_duration (in hours)
- message (professional explanation)
- status: 'pending' (some can be 'accepted' for session creation)

### PHASE 9: CREATE 15 APPOINTMENTS/SESSIONS
**Goal:** Test all appointment types and mechanic types

#### 5 Virtual Mechanic Sessions:
1. Customer A → David Cloud (Virtual) - Video diagnostic session (scheduled)
2. Customer B → Emma Online (Virtual) - Quick chat consultation (scheduled)
3. Customer 3 → John Virtual (Virtual) - Video diagnostic (scheduled)
4. Kelly Test → Sarah Remote (Virtual) - Chat support (scheduled)
5. Faiz Hashmi → Mike Distance (Virtual) - Video session (scheduled)

#### 5 Workshop Mechanic Appointments:
1. Customer A → Toronto Auto Experts → Robert Workshop - In-person diagnostic (scheduled)
2. Customer B → Montreal Garage Pro → Marie Atelier - In-person repair (scheduled)
3. Customer 3 → Calgary Car Care → Tom Garage - In-person service (scheduled)
4. Kelly Test → Vancouver Vehicle Services → Lisa Shop - In-person maintenance (scheduled)
5. Faiz Hashmi → Toronto Auto Experts → Kevin Workshop - In-person repair (scheduled)

#### 5 Independent Mechanic Appointments:
1. Customer A → Frank Independent - In-person at garage (scheduled)
2. Customer B → Sophie Solo - In-person at garage (scheduled)
3. Customer 3 → Alex Freelance - In-person at garage (scheduled)
4. Kelly Test → Rachel Garage - In-person at garage (scheduled)
5. Faiz Hashmi → Chris Mobile - Mobile service at customer location (scheduled)

**Each Appointment Must Have:**
- customer_id
- mechanic_id
- session_type or appointment_type
- scheduled_at (mix of past 7 days, today, next 7 days)
- status: mix of 'scheduled', 'completed', 'in_progress'
- location_type: 'virtual', 'in_person', 'mobile'
- location_address (for in-person)

### PHASE 10: WORKSHOP APPOINTMENTS (MIX IN-PERSON + SESSION REQUESTS)
**Goal:** Test workshop-specific appointment flow

#### Create at least 5 workshop_appointments entries:
1. Toronto Auto Experts - Customer A - Oil change - In-person
2. Montreal Garage Pro - Customer B - Brake service - In-person
3. Calgary Car Care - Customer 3 - Inspection - In-person
4. Vancouver Vehicle Services - Kelly Test - Tire rotation - In-person
5. Toronto Auto Experts - Faiz Hashmi - Engine diagnostic - In-person

---

## CERTIFICATION EXAMPLES TO IMPLEMENT

### 1. RED SEAL CERTIFICATION EXAMPLES

#### Ontario Red Seal:
```
red_seal_certified: true
red_seal_trade: 'Automotive Service Technician'
red_seal_province: 'ON'
red_seal_certificate_number: 'RS-ON-2024-847562'
red_seal_issue_date: '2022-07-15'
```

#### Quebec Red Seal:
```
red_seal_certified: true
red_seal_trade: 'Automotive Service Technician'
red_seal_province: 'QC'
red_seal_certificate_number: 'RS-QC-2021-923841'
red_seal_issue_date: '2021-03-20'
```

#### Alberta Red Seal:
```
red_seal_certified: true
red_seal_trade: 'Heavy Duty Equipment Technician'
red_seal_province: 'AB'
red_seal_certificate_number: 'RS-AB-2023-156789'
red_seal_issue_date: '2023-09-10'
```

#### BC Red Seal:
```
red_seal_certified: true
red_seal_trade: 'Automotive Service Technician'
red_seal_province: 'BC'
red_seal_certificate_number: 'RS-BC-2020-734921'
red_seal_issue_date: '2020-11-25'
```

### 2. QUEBEC CERTIFICATE EXAMPLES

```
quebec_certified: true
quebec_qualification_certificate_number: 'QC-ASP-2024-123456'
quebec_trades: ['Automotive Service Technician', 'Transmission Specialist']
```

### 3. INTERPROVINCIAL CERTIFICATE EXAMPLES

```
interprovincial_certified: true
interprovincial_trades: ['Automotive Service Technician', 'Heavy Duty Equipment Technician']
interprovincial_endorsement_provinces: ['ON', 'QC', 'AB', 'BC']
```

---

## IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Review audit report (DATABASE_AUDIT_REPORT_2025-11-12.md)
- [ ] Review this plan with stakeholder
- [ ] Prepare SQL scripts or Supabase API calls

### Phase 1: Customers
- [ ] Update cust1@test.com - add lat/lng
- [ ] Update cust2@test.com - add full address
- [ ] Update cust3@test.com - add Montreal address
- [ ] Update ktest@askautodoctor.com - add all info
- [ ] Update faizrhashmi@gmail.com - add all info

### Phase 2: Virtual Mechanics
- [ ] Create virtual1@mechanic.com (John Virtual)
- [ ] Create virtual2@mechanic.com (Sarah Remote)
- [ ] Create virtual3@mechanic.com (Mike Distance)
- [ ] Create virtual4@mechanic.com (Emma Online)
- [ ] Create virtual5@mechanic.com (David Cloud)

### Phase 3: Workshops
- [ ] Create Toronto Auto Experts workshop
- [ ] Create Montreal Garage Pro workshop
- [ ] Create Calgary Car Care workshop
- [ ] Create Vancouver Vehicle Services workshop
- [ ] Create Ottawa Auto Solutions workshop

### Phase 4: Workshop Mechanics
- [ ] Create wm1@mechanic.com + link to Toronto Auto Experts (owner)
- [ ] Create wm2@mechanic.com + link to Montreal Garage Pro (owner)
- [ ] Create wm3@mechanic.com + link to Calgary Car Care (owner)
- [ ] Create wm4@mechanic.com + link to Vancouver Vehicle Services (owner)
- [ ] Create wm5@mechanic.com + link to Toronto Auto Experts (employee)

### Phase 5: Independent Mechanics
- [ ] Create indie1@mechanic.com (Frank Independent)
- [ ] Create indie2@mechanic.com (Sophie Solo)
- [ ] Create indie3@mechanic.com (Alex Freelance)
- [ ] Create indie4@mechanic.com (Rachel Garage)
- [ ] Create indie5@mechanic.com (Chris Mobile)

### Phase 6: Brand Certifications
- [ ] Create Toyota cert for Emma Online
- [ ] Create Honda cert for David Cloud
- [ ] Create Nissan cert for Lisa Shop
- [ ] Create Ford cert for Kevin Workshop
- [ ] Create BMW cert for Rachel Garage
- [ ] Create Mercedes cert for Rachel Garage
- [ ] Create GM cert for Chris Mobile

### Phase 7: RFQs
- [ ] Create RFQ #1 - Honda Civic
- [ ] Create RFQ #2 - Toyota Camry
- [ ] Create RFQ #3 - Ford F-150
- [ ] Create RFQ #4 - Mazda CX-5
- [ ] Create RFQ #5 - BMW 3 Series

### Phase 8: Quotes
- [ ] Create 3 quotes for RFQ #1
- [ ] Create 3 quotes for RFQ #2
- [ ] Create 3 quotes for RFQ #3
- [ ] Create 2 quotes for RFQ #4
- [ ] Create 3 quotes for RFQ #5

### Phase 9: Virtual Sessions
- [ ] Create 5 virtual session requests

### Phase 10: Workshop Appointments
- [ ] Create 5 workshop appointments (in-person)

### Phase 11: Independent Appointments
- [ ] Create 5 independent mechanic appointments

### Post-Implementation
- [ ] Run audit script again to verify all targets met
- [ ] Test customer matching by postal code
- [ ] Test RFQ quote submission flow
- [ ] Test all 3 mechanic types can submit quotes
- [ ] Test appointment scheduling for all types
- [ ] Document any issues found

---

## SAMPLE ADDRESSES BY PROVINCE

### Ontario (Toronto, Ottawa)
- Toronto: 123 King St W, Toronto, ON M5H 1A1 (43.6487, -79.3816)
- Toronto: 456 Queen St E, Toronto, ON M5A 1T1 (43.6543, -79.3615)
- Ottawa: 789 Wellington St, Ottawa, ON K1A 0A9 (45.4236, -75.6990)

### Quebec (Montreal)
- Montreal: 1001 Rue Sainte-Catherine O, Montreal, QC H3B 1H3 (45.5017, -73.5673)
- Montreal: 234 Rue Saint-Jacques, Montreal, QC H2Y 1M6 (45.5042, -73.5567)

### Alberta (Calgary)
- Calgary: 567 8th Ave SW, Calgary, AB T2P 1G1 (51.0447, -114.0719)
- Calgary: 890 17th Ave SW, Calgary, AB T2T 0A1 (51.0376, -114.0808)

### British Columbia (Vancouver)
- Vancouver: 333 Georgia St W, Vancouver, BC V6B 0A9 (49.2827, -123.1207)
- Vancouver: 678 Robson St, Vancouver, BC V6B 2B7 (49.2832, -123.1214)

---

## SUCCESS CRITERIA

After implementation, we should have:

✅ **5 Complete Customers** with:
- Full name, email, phone
- Complete address with postal code
- Province (for Canadian compliance)
- Latitude/Longitude (for matching)

✅ **15 Complete Mechanics** (5 virtual + 5 workshop + 5 independent) with:
- Full profiles and bio
- Location data with lat/lng
- Years of experience and hourly rate
- mechanic_type correctly set
- At least 1 certification each

✅ **5 Complete Workshops** with:
- Full business information
- Location data with lat/lng
- Phone number and business registration
- 2 mechanics associated with at least 1 workshop

✅ **7+ Brand Certifications** covering:
- Toyota, Honda, Nissan, Ford, BMW, Mercedes, GM
- Mix of verified and expiring certifications

✅ **5+ RFQs** from different customers for:
- Different vehicle types
- Different service types (diagnostic, repair, maintenance)
- Different urgency levels

✅ **15+ Quotes** showing:
- All 3 mechanic types can submit quotes
- Price variation based on mechanic type
- Professional quote messages

✅ **15+ Appointments** covering:
- 5 virtual sessions
- 5 workshop in-person appointments
- 5 independent mechanic appointments
- Mix of scheduled, completed, in-progress statuses
- Past, present, and future dates

---

## NEXT STEPS

1. **Review this plan** - Confirm approach is correct
2. **Generate SQL migration** or **Create Supabase script** to implement all changes
3. **Execute data population** in development/staging first
4. **Run audit script** to verify completion
5. **Test all user flows** with populated data
6. **Document any issues** for fixing

