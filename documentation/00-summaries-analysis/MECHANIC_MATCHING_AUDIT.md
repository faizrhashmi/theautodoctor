# MECHANIC MATCHING SYSTEM AUDIT - FINDINGS SUMMARY

Date: November 8, 2025

## EXECUTIVE SUMMARY

Status: 65% Implemented - Strong foundations with critical integration gaps

✅ COMPLETE:
- Smart matching algorithm with 10+ scoring criteria
- Keyword extraction engine (30+ patterns)
- Database schema (all tables, indexes, RLS policies)
- API endpoints (6 working endpoints)
- Reference data (2 countries, 50+ cities, 20 brands, 35 keywords)
- LocationSelector UI component (complete, not integrated)

⚠️ CRITICAL BLOCKERS:
- Matching NOT called during session assignment
- Customer location NOT captured in intake form
- Mechanic location NOT collected at signup
- Session request fields never populated with location/keywords
- Profile completion scoring not implemented


---

## 1. MATCHING ALGORITHM ARCHITECTURE

**Core File:** `/src/lib/mechanicMatching.ts`

**Function:** findMatchingMechanics(criteria: MatchingCriteria)

**Scoring System (175+ total points):**
- Availability: +50 (online) / +20 (available soon)
- Keywords: +15 per match
- Brand Specialist: +30 (if matching brand)
- Experience: +20/+10/+5 (10+/5-9/2-4 years)
- Rating: +15/+10/+5 (4.5+/4.0+/3.5+ stars)
- Red Seal Certified: +10
- Profile Completion: +8/+5 (95%+/90%+)
- Sessions Completed: +12/+8/+4 (50+/20+/5+)
- Same Country: +25
- Same City: +35 (when preferLocalMechanic=true)
- Different Country: -20 (penalty when prefers local)

**Returns:** Top 10 matches sorted by score

**API Endpoint:** POST /api/matching/find-mechanics
- Validation: requestType, brand requirements
- Response: matches array + totalFound + criteria

---

## 2. LOCATION DATA INFRASTRUCTURE

### MECHANIC LOCATION

Database Fields (mechanics table):
- country TEXT
- city TEXT
- state_province TEXT
- timezone TEXT

Indexes: idx_mechanics_country, idx_mechanics_city, idx_mechanics_location

**UI Component:** LocationSelector.tsx (complete but not integrated)
- Country dropdown (Canada, USA)
- Searchable city list (50+ major cities)
- Custom city entry
- Auto-populated timezone

**ISSUE:** Component not integrated into signup forms!

### CUSTOMER LOCATION

Database Fields (session_requests table):
- customer_country TEXT
- customer_city TEXT
- prefer_local_mechanic BOOLEAN

**Intake Form Status:**
- ❌ NO country field
- ⚠️ City field exists but unvalidated
- ❌ NO prefer_local_mechanic checkbox
- ❌ Location never sent to matching API

### REFERENCE TABLES

supported_countries:
- Canada (CA, America/Toronto)
- United States (US, America/New_York)

major_cities: 50+ cities with state/province and timezone

APIs:
- GET /api/countries
- GET /api/cities?country=CA

---

## 3. SPECIALIZATION SYSTEM

### BRANDS

Mechanic Fields:
- is_brand_specialist BOOLEAN
- brand_specializations TEXT[] (array of brand names)
- specialist_tier TEXT ('general', 'brand', 'master')

20 Seeded Brands:
- Luxury: BMW, Mercedes-Benz, Audi, Tesla, Porsche, Jaguar, Land Rover, Lexus
- Standard: Toyota, Honda, Ford, Chevrolet, Nissan, Mazda, VW, Hyundai, Kia, Subaru, GMC, Ram

Matching: Brand specialist requests filter to mechanics with matching brands (+30 pts)

### SERVICE KEYWORDS

Mechanic Fields:
- service_keywords TEXT[] (array of keyword strings)

35 Seeded Keywords:
- Installations (6): backup camera, dashcam, remote starter, audio, GPS tracker, alarm
- Diagnostics (8): check engine, ABS, airbag, transmission, electrical, engine, HVAC, battery
- Repairs (8): brake, suspension, engine, transmission, steering, exhaust, cooling, fuel
- Maintenance (8): oil change, tire rotation, brake pads, timing belt, air filter, spark plugs, coolant, transmission fluid
- Brand-specific (5): BMW coding, Tesla diagnostics, Mercedes STAR, Audi VCDS, Porsche diagnostic

Extraction: extractKeywordsFromDescription() uses 30+ regex patterns
API: POST /api/keywords/extract

---

## 4. POSTAL CODE & PROXIMITY

Status: NOT IMPLEMENTED ❌

Missing:
- Postal code fields
- Postal code validation
- PostGIS/geolocation
- Distance calculations
- Service radius logic
- Geocoding (lat/lng)

Current limitation: Location matching requires EXACT city name match only
- Example: Toronto ≠ Toronto, ON
- No adjacent city handling
- No radius-based search

---

## 5. CRITICAL INTEGRATION GAPS

### BLOCKER 1: Matching Not Called During Assignment

File: /src/lib/sessionFactory.ts (lines 197-231)

Current Flow:
- Session created
- Single assignment created
- Broadcast to ALL mechanics
- First to accept wins

Missing:
- No call to findMatchingMechanics()
- No keyword extraction from concern
- No filtering to top matches
- No smart routing

Impact: Mechanics matched by speed, not skill

### BLOCKER 2: Customer Location Not Captured

File: /src/app/intake/page.tsx (lines 80-92)

Missing:
- No country field in form state
- City is plain text, not validated
- No prefer_local_mechanic checkbox
- Location data not sent to API

Impact: Can't use location for matching

### BLOCKER 3: Mechanic Location Not Collected

Status: LocationSelector component exists but not integrated

Missing:
- Not in signup forms
- Not in profile update forms
- Mechanics can't set location

Impact: Can't filter mechanics by location

### BLOCKER 4: Session Request Fields Never Populated

File: /src/app/api/intake/start/route.ts (lines 140-292)

Missing:
- customer_country not extracted
- customer_city not stored properly
- prefer_local_mechanic not sent
- extracted_keywords not computed
- matching_score not stored

Impact: Matching data lost, analytics broken

---

## 6. IMPLEMENTATION CHECKLIST

### Phase 1: Basic Integration (3-5 days)
- [ ] Add country + city fields to intake form (1 day)
- [ ] Integrate matching into sessionFactory.ts (1-2 days)
- [ ] Collect mechanic location at signup (1 day)
- [ ] Store location/keywords in session_requests (0.5 days)

### Phase 2: Quality (2-3 days)
- [ ] Implement profile completion scoring (1-2 days)
- [ ] Add feature flag checks (0.5 days)
- [ ] Add analytics/monitoring (1 day)

### Phase 3: Enhancement (Future)
- [ ] Add postal code support
- [ ] Implement distance calculations
- [ ] Add radius-based matching

---

## 7. KEY FILES

Core Implementation:
- /src/lib/mechanicMatching.ts (algorithm - complete)
- /src/app/api/matching/find-mechanics/route.ts (API - complete)
- /src/app/api/keywords/extract/route.ts (keyword API - complete)
- /src/components/mechanic/LocationSelector.tsx (UI - complete, not integrated)
- /src/app/intake/page.tsx (form - missing location fields)
- /src/lib/sessionFactory.ts (session creation - missing matching call)

Database Migrations:
- supabase/migrations_backup/20251025000001_brand_specialist_matching.sql
- supabase/migrations_backup/20251025000002_add_location_matching.sql

---

## 8. SUMMARY ASSESSMENT

Architecture Quality: ⭐⭐⭐⭐⭐ Excellent
- Well-designed matching algorithm
- Proper database schema with indexes
- Clean API interfaces
- Good separation of concerns

Implementation Completeness: ⭐⭐⭐ (65%)
- Foundations complete and solid
- Integration points missing
- Feature flags prepared but not used

Critical Issues: 2 blockers, 4 high priority

Recommended Next: Integrate matching into sessionFactory.ts

Estimated Effort: 3-5 days for basic activation

ROI: Significant improvement in match quality and customer satisfaction

---

Report Generated: 2025-11-08
