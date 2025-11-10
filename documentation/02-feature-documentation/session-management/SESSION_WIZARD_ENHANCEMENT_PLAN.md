# SessionWizard Enhancement - Comprehensive Implementation Plan

**Date**: January 9, 2025
**Status**: Design Complete - Ready for Implementation
**Priority**: HIGH - Core customer experience improvement

---

## Executive Summary

This document outlines the comprehensive plan to enhance the SessionWizard component with intelligent mechanic selection, embedded intake form, and real-time availability indicators. The goal is to create an elegant, non-cluttered user experience that guides customers through vehicle selection, plan selection, mechanic selection, intake details, and waiver acceptance - all in one seamless flow.

---

## Table of Contents

1. [Mechanic Type System Analysis](#1-mechanic-type-system-analysis)
2. [Availability States & Presence Logic](#2-availability-states--presence-logic)
3. [SessionWizard Flow Architecture](#3-sessionwizard-flow-architecture)
4. [Smart Matching Algorithm](#4-smart-matching-algorithm)
5. [UI/UX Design Wireframes](#5-uiux-design-wireframes)
6. [Technical Implementation](#6-technical-implementation)
7. [Database Requirements](#7-database-requirements)
8. [API Endpoints](#8-api-endpoints)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Mechanic Type System Analysis

### 1.1 Mechanic Types (Business Classification)

Based on codebase analysis, we have **three distinct mechanic types**:

#### A. `VIRTUAL_ONLY` (Virtual-Only Mechanics)
**Identification Logic**:
```typescript
// No workshop_id = Virtual only
if (!mechanic.workshop_id) {
  return MechanicType.VIRTUAL_ONLY
}
```

**Characteristics**:
- Remote diagnostics only
- Earn 70% on sessions + 2% referral fees on RFQs
- Can create draft RFQs for customers
- Cannot create quotes directly
- Payment goes directly to mechanic

**Access Rights**:
- Mechanic dashboard
- Session management
- Referrals page
- Earnings page

---

#### B. `INDEPENDENT_WORKSHOP` (Independent Workshop Owners)
**Identification Logic**:
```typescript
// Has workshop_id + account_type='individual_mechanic' = Owner/Operator
if (mechanic.account_type === 'individual_mechanic' && mechanic.workshop_id) {
  return MechanicType.INDEPENDENT_WORKSHOP
}
```

**Characteristics**:
- Own their workshop
- Earn 70% on virtual sessions
- Receive workshop rates on repair quotes they accept
- Can perform both virtual diagnostics AND physical work
- Dual access to mechanic AND workshop dashboards

**Access Rights**:
- Mechanic dashboard
- Workshop dashboard (via "Workshop View" button)
- Session management
- Quote creation (workshop side)
- Referrals page
- Earnings page

---

#### C. `WORKSHOP_AFFILIATED` (Workshop Employees/Contractors)
**Identification Logic**:
```typescript
// Has workshop_id + account_type='workshop_mechanic' = Employee
if (mechanic.account_type === 'workshop_mechanic' && mechanic.workshop_id) {
  return MechanicType.WORKSHOP_AFFILIATED
}
```

**Characteristics**:
- Employed by or contracted to a workshop
- Session payments go to workshop (not mechanic)
- Workshop handles their compensation
- Cannot access personal earnings
- Cannot create quotes (role-based permission)

**Access Rights**:
- Mechanic dashboard
- Session management
- NO earnings page
- NO referrals page
- NO quotes page

---

### 1.2 Workshop Association & Cooling Period

**Cooling Period Rule** (30-Day Suspension):
```sql
-- When mechanic is removed from workshop:
NEW.account_status := 'suspended';
NEW.suspended_until := (NOW() + INTERVAL '30 days')::timestamp;
NEW.ban_reason := 'Cooling period after workshop termination. You can resume work in 30 days.';
```

**Purpose**: Prevents abuse of workshop switching, ensures clean transitions

**Impact on Matching**:
- Mechanics with `account_status = 'suspended'` are **excluded** from matching
- Must check `suspended_until` date before showing in available mechanics list
- After 30 days, mechanic can resume as VIRTUAL_ONLY or join new workshop

---

## 2. Availability States & Presence Logic

### 2.1 Mechanic Availability States

Based on analysis of [mechanics/available/route.ts](src/app/api/mechanics/available/route.ts:168-188) and [PresenceIndicator.tsx](src/components/customer/PresenceIndicator.tsx:34-54):

| State | Condition | Badge Color | Display Text | Pulsing Animation |
|-------|-----------|-------------|--------------|-------------------|
| **Online** | `is_available = true` | Green | "Available now" | Yes |
| **Away** | `last_seen_at < 5 mins ago` | Yellow | "Active recently" | No |
| **Offline** | `last_seen_at >= 5 mins ago` OR `null` | Gray | "Offline" / "{X}m ago" / "{X}h ago" | No |

### 2.2 Presence Status Calculation Logic

```typescript
// From /api/mechanics/available
let presenceStatus: 'online' | 'offline' | 'away' = 'offline'
let lastSeenText = 'Offline'

if (mechanic.is_available) {
  presenceStatus = 'online'
  lastSeenText = 'Available now'
} else if (mechanic.last_seen_at) {
  const lastSeen = new Date(mechanic.last_seen_at)
  const minutesAgo = Math.floor((Date.now() - lastSeen.getTime()) / 60000)

  if (minutesAgo < 5) {
    presenceStatus = 'away'
    lastSeenText = 'Active recently'
  } else if (minutesAgo < 60) {
    lastSeenText = `${minutesAgo}m ago`
  } else if (minutesAgo < 1440) {
    lastSeenText = `${Math.floor(minutesAgo / 60)}h ago`
  } else {
    lastSeenText = 'Offline'
  }
}
```

### 2.3 Additional Status Flags

**Other Statuses to Check**:
1. **Clocked In**: `clocked_in = true` (mechanic is "on shift")
2. **In Session**: Check if mechanic has active session in `diagnostic_sessions` table
3. **Availability Toggle**: `availability_enabled = true` (mechanic has availability ON)
4. **Account Status**: `status = 'approved'` (not suspended/banned)
5. **Can Accept Sessions**: `can_accept_sessions = true`

**Composite Availability Logic**:
```sql
-- A mechanic is TRULY available if ALL are true:
status = 'approved'
AND can_accept_sessions = true
AND is_available = true
AND account_status != 'suspended'
AND (suspended_until IS NULL OR suspended_until < NOW())
```

---

## 3. SessionWizard Flow Architecture

### 3.1 Current Flow (Existing)
```
Step 1: Vehicle Selection
  ↓
Step 2: Plan Selection (Quick/Standard/Diagnostic)
  ↓
Step 3: Mechanic Type Selection (Standard vs Brand Specialist)
  ↓
[LAUNCHES INTAKE FORM AS SEPARATE PAGE]
```

### 3.2 Enhanced Flow (Proposed)
```
Step 1: Vehicle Selection
  ↓
Step 2: Plan Selection
  ↓
Step 3: Mechanic Selection (ENHANCED)
  ├── Mechanic Type (Standard / Specialist)
  ├── Location Input (Postal Code)
  ├── Selection Mode (First Available / Choose Specific)
  └── Mechanic List (with real-time status indicators)
  ↓
Step 4: Intake Form (EMBEDDED)
  ├── Issue Description
  ├── Uploaded Photos
  └── Additional Details
  ↓
Step 5: Waiver & Payment Confirmation
  ↓
[LAUNCH SESSION]
```

### 3.3 Flow Benefits

**For Customers**:
- ✅ All in one place - no context switching
- ✅ See mechanic availability BEFORE committing
- ✅ Choose favorite or trust auto-match
- ✅ Faster session start (fewer clicks)

**For Platform**:
- ✅ Higher conversion rate (fewer drop-offs)
- ✅ Better matching accuracy (more data collected upfront)
- ✅ Improved customer satisfaction

---

## 4. Smart Matching Algorithm

### 4.1 Current Matching Criteria (from [mechanicMatching.ts](src/lib/mechanicMatching.ts:104-256))

The existing algorithm scores mechanics based on:

| Criteria | Max Points | Notes |
|----------|-----------|-------|
| **Availability** | 50 | Online now (50pts) vs Available soon (20pts) |
| **Location - Country Match** | 25 | Same country bonus |
| **Location - Postal Code FSA** | 40 | Same Forward Sortation Area (first 3 chars) |
| **Location - Same City** | 35 | City match (if no postal code) |
| **Brand Specialist** | 30 | If request_type = 'brand_specialist' |
| **Keyword Matching** | 15 per match | Service keywords from customer description |
| **Experience 10+ years** | 20 | High experience bonus |
| **Experience 5-10 years** | 10 | Medium experience bonus |
| **Experience 2-5 years** | 5 | Low experience bonus |
| **Rating 4.5+** | 15 | Highly rated |
| **Rating 4.0-4.5** | 10 | Well rated |
| **Rating 3.5-4.0** | 5 | Decent rated |
| **Red Seal Certified** | 10 | Professional certification |
| **Profile Completion 95%+** | 8 | Complete profile |
| **Profile Completion 90%+** | 5 | Nearly complete |
| **Completed Sessions 50+** | 12 | Very experienced on platform |
| **Completed Sessions 20-50** | 8 | Experienced on platform |
| **Completed Sessions 5-20** | 4 | Somewhat experienced |

**Total Possible Score**: ~250+ points (depending on keyword matches)

### 4.2 Enhanced Matching Criteria (Proposed Additions)

| New Criteria | Points | Logic |
|--------------|--------|-------|
| **Profile Completion 80%+ (REQUIRED)** | -∞ | MUST be >= 80% to appear in results |
| **Certification NOT Expired** | -∞ | MUST have valid certification OR none |
| **NOT in Cooling Period** | -∞ | MUST not be suspended |
| **Clocked In Status** | +5 | Currently on shift |
| **Not In Session** | +10 | Immediately available (no wait) |
| **Favorites Priority** | +100 | Customer favorited this mechanic |
| **Previous Session With Customer** | +50 | Has worked with this customer before |
| **Response Time < 2 min** | +8 | Fast responder (historical avg) |

### 4.3 Filtering Requirements

**BEFORE Scoring** (Hard Requirements):
```typescript
const eligibleMechanics = mechanics.filter(mechanic => {
  // 1. Must be approved
  if (mechanic.status !== 'approved') return false

  // 2. Must be able to accept sessions
  if (!mechanic.can_accept_sessions) return false

  // 3. Profile completion >= 80%
  if ((mechanic.profile_completion_score || 0) < 80) return false

  // 4. Certification must be valid (if they have one)
  if (mechanic.red_seal_certified) {
    const certExpiry = mechanic.certification_expiry_date
    if (certExpiry && new Date(certExpiry) < new Date()) {
      return false // Expired certification
    }
  }

  // 5. NOT in cooling period
  if (mechanic.account_status === 'suspended') {
    if (mechanic.suspended_until && new Date(mechanic.suspended_until) > new Date()) {
      return false // Still suspended
    }
  }

  // 6. For brand specialists, must match requested brand
  if (requestType === 'brand_specialist' && requestedBrand) {
    if (!mechanic.is_brand_specialist) return false
    if (!mechanic.brand_specializations?.includes(requestedBrand)) return false
  }

  return true
})
```

---

## 5. UI/UX Design Wireframes

### 5.1 Step 3: Enhanced Mechanic Selection UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 3 of 5: Choose Your Mechanic                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ MECHANIC TYPE ─────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  ○ Standard Mechanic                                     │   │
│  │    Certified mechanics with general automotive expertise │   │
│  │    Standard pricing                                      │   │
│  │                                                           │   │
│  │  ● Brand Specialist (+$10 premium)                       │   │
│  │    Experts specialized in your vehicle's make and model  │   │
│  │    BMW • Tesla • +18 brands                              │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ YOUR LOCATION (Optional) ────────────────────────────────┐  │
│  │  📍 Postal Code: [M5V 3A8______________]                  │  │
│  │     Helps match you with local mechanics in your area     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ MECHANIC SELECTION ──────────────────────────────────────┐  │
│  │                                                           │  │
│  │  ● First Available ⚡ Recommended                         │  │
│  │    Fastest response - auto-matched with best mechanic     │  │
│  │                                                           │  │
│  │    ┌─────────────────────────────────────────────────┐   │  │
│  │    │ ✓ Perfect Match Found!                          │   │  │
│  │    │   We found the best mechanic for your needs     │   │  │
│  │    ├─────────────────────────────────────────────────┤   │  │
│  │    │ [Photo] John Smith                        [95]  │   │  │
│  │    │         ● Available now                   Match │   │  │
│  │    │         ⭐ 4.8 • 12 yrs exp • 50+ sessions      │   │  │
│  │    │         Honda • Toyota specialist               │   │  │
│  │    │         📍 Toronto, Canada (M5V)                 │   │  │
│  │    │         🏆 Red Seal Certified                    │   │  │
│  │    │                                                  │   │  │
│  │    │         Why this mechanic:                       │   │  │
│  │    │         • Available now                          │   │  │
│  │    │         • Honda specialist                       │   │  │
│  │    │         • Same area (M5V)                        │   │  │
│  │    │         • Highly rated (4.5+)                    │   │  │
│  │    ├─────────────────────────────────────────────────┤   │  │
│  │    │ [✓ You'll be matched with John Smith      ]     │   │  │
│  │    │ [   See Other Options                     ]     │   │  │
│  │    └─────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │  ○ Choose Specific Mechanic                               │  │
│  │    Browse and select from available mechanics             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [< Back]                               [Continue to Intake >]  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Step 3 (Alternative): Choose Specific Mechanic

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 3 of 5: Choose Your Mechanic                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ MECHANIC SELECTION ──────────────────────────────────────┐  │
│  │                                                           │  │
│  │  ○ First Available ⚡ Recommended                         │  │
│  │                                                           │  │
│  │  ● Choose Specific Mechanic                               │  │
│  │    Browse and select from available mechanics             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ AVAILABLE MECHANICS ─────────────────────────────────────┐  │
│  │                                                           │  │
│  │  🔍 [Search by name___________________]  [⭐ Favorites]  │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐     │  │
│  │  │ [Photo] Sarah Johnson ● Online         [92]     │  ✓  │  │
│  │  │         ⭐ 4.9 • 15 yrs exp • 75+ sessions      │     │  │
│  │  │         BMW • Mercedes • Audi specialist        │     │  │
│  │  │         📍 Toronto, Canada (M5H)                 │     │  │
│  │  │         🏆 Red Seal Certified                    │     │  │
│  │  └─────────────────────────────────────────────────┘     │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐     │  │
│  │  │ [Photo] Mike Chen 🟡 Active recently    [85]    │     │  │
│  │  │         ⭐ 4.7 • 10 yrs exp • 40+ sessions      │     │  │
│  │  │         Honda • Toyota specialist               │     │  │
│  │  │         📍 Mississauga, Canada (L5B)             │     │  │
│  │  └─────────────────────────────────────────────────┘     │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐     │  │
│  │  │ [Photo] David Lee ⚫ Offline (2h ago)    [78]   │     │  │
│  │  │         ⭐ 4.6 • 12 yrs exp • 60+ sessions      │     │  │
│  │  │         General mechanic                        │     │  │
│  │  │         📍 Toronto, Canada (M4B)                 │     │  │
│  │  └─────────────────────────────────────────────────┘     │  │
│  │                                                           │  │
│  │  +5 more mechanics available                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [< Back]                               [Continue to Intake >]  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Step 4: Embedded Intake Form (NEW)

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 4 of 5: Session Details                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ VEHICLE INFORMATION ─────────────────────────────────────┐  │
│  │  🚗 2024 Honda Civic                                      │  │
│  │     Selected Mechanic: John Smith (Honda specialist)      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ WHAT'S THE ISSUE? ───────────────────────────────────────┐  │
│  │  [_____________________________________________________]  │  │
│  │  [_____________________________________________________]  │  │
│  │  [_____________________________________________________]  │  │
│  │  [_____________________________________________________]  │  │
│  │                                                           │  │
│  │  Detected keywords: brake repair, brake pad replacement  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ UPLOAD PHOTOS (Optional) ────────────────────────────────┐  │
│  │  📷 [Drag & drop or click to upload]                      │  │
│  │                                                           │  │
│  │  [Thumbnail 1] [Thumbnail 2]                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ WHEN DO YOU NEED HELP? ──────────────────────────────────┐  │
│  │  ● Right Now (Immediate)                                  │  │
│  │  ○ Schedule For Later                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [< Back]                            [Continue to Waiver >]     │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Step 5: Waiver & Payment Confirmation (Existing with Minor Updates)

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 5 of 5: Review & Confirm                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ SESSION SUMMARY ─────────────────────────────────────────┐  │
│  │  Vehicle:    2024 Honda Civic                             │  │
│  │  Plan:       Standard Video Session ($49)                 │  │
│  │  Mechanic:   John Smith (Honda specialist)                │  │
│  │  Duration:   30 minutes                                   │  │
│  │  Urgency:    Immediate                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ TERMS & WAIVER ──────────────────────────────────────────┐  │
│  │  [X] I understand this is a diagnostic consultation only  │  │
│  │  [X] I agree to the Terms of Service                      │  │
│  │  [X] I understand pricing and cancellation policy         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [< Back]                              [Launch Session - $49]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Technical Implementation

### 6.1 Component Structure

```
SessionWizard.tsx (Main Component)
├── Step 1: VehicleSelectionStep
│   └── Existing logic (no changes)
│
├── Step 2: PlanSelectionStep
│   └── Existing logic (no changes)
│
├── Step 3: MechanicSelectionStep (ENHANCED)
│   ├── MechanicTypeSelector (Standard/Specialist)
│   ├── PostalCodeInput
│   ├── MechanicSelectionModeToggle (First Available / Choose Specific)
│   ├── AutoMatchPreview (shows top match with score)
│   │   └── MechanicSelectionCard (enhanced with status indicators)
│   └── SpecificMechanicBrowser
│       ├── SearchBar
│       ├── FavoritesFilter
│       ├── MechanicGrid
│       │   └── MechanicSelectionCard[] (list of mechanics)
│       └── Pagination/LoadMore
│
├── Step 4: IntakeFormStep (NEW - Embedded)
│   ├── IssueDescriptionTextarea
│   ├── PhotoUpload
│   ├── UrgencySelector
│   └── KeywordExtractor (auto-detect service keywords)
│
└── Step 5: WaiverConfirmationStep
    ├── SessionSummary
    ├── WaiverCheckboxes
    └── LaunchButton
```

### 6.2 State Management

```typescript
interface SessionWizardState {
  // Existing state
  currentStep: 1 | 2 | 3 | 4 | 5
  selectedVehicle: string | null
  selectedPlan: string

  // Enhanced mechanic selection state
  mechanicType: 'standard' | 'specialist'
  customerPostalCode: string
  mechanicSelectionMode: 'first-available' | 'specific'
  selectedMechanicId: string | null
  topMatchedMechanic: MechanicCardData | null
  availableMechanics: MechanicCardData[]
  loadingMechanics: boolean

  // NEW: Intake form state
  issueDescription: string
  uploadedPhotos: File[]
  urgency: 'immediate' | 'scheduled'
  scheduledDateTime: Date | null
  extractedKeywords: string[]

  // Existing waiver state
  agreedToTerms: boolean
  agreedToWaiver: boolean
}
```

### 6.3 Data Flow

```typescript
// Step 3: Mechanic Selection
const fetchAvailableMechanics = async () => {
  const params = new URLSearchParams()
  params.set('request_type', mechanicType === 'specialist' ? 'brand_specialist' : 'general')
  params.set('customer_country', 'Canada') // From user profile or default

  if (mechanicType === 'specialist' && selectedVehicle) {
    const vehicle = vehicles.find(v => v.id === selectedVehicle)
    params.set('requested_brand', vehicle.make)
  }

  if (customerPostalCode) {
    params.set('customer_postal_code', customerPostalCode)
  }

  params.set('limit', '10')

  const response = await fetch(`/api/mechanics/available?${params}`)
  const data = await response.json()

  setAvailableMechanics(data.mechanics)

  // Auto-select top match if "first-available" mode
  if (mechanicSelectionMode === 'first-available' && data.mechanics.length > 0) {
    setTopMatchedMechanic(data.mechanics[0])
    setSelectedMechanicId(data.mechanics[0].id)
  }
}

// Step 4: Extract keywords from issue description
const handleIssueDescriptionChange = (value: string) => {
  setIssueDescription(value)

  // Auto-extract keywords for better mechanic matching
  const keywords = extractKeywordsFromDescription(value)
  setExtractedKeywords(keywords)
}

// Step 5: Launch session with all collected data
const handleLaunchSession = async () => {
  const sessionData = {
    vehicle_id: selectedVehicle,
    plan_slug: selectedPlan,
    mechanic_id: selectedMechanicId,
    mechanic_type: mechanicType,
    issue_description: issueDescription,
    extracted_keywords: extractedKeywords,
    urgency: urgency,
    postal_code: customerPostalCode,
    routing_type: mechanicSelectionMode === 'specific' ? 'priority_broadcast' : 'broadcast'
  }

  // Create session request with photos
  const formData = new FormData()
  Object.entries(sessionData).forEach(([key, value]) => {
    formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value)
  })

  uploadedPhotos.forEach((photo, index) => {
    formData.append(`photo_${index}`, photo)
  })

  const response = await fetch('/api/sessions/create', {
    method: 'POST',
    body: formData
  })

  const { session_id } = await response.json()
  router.push(`/sessions/${session_id}`)
}
```

---

## 7. Database Requirements

### 7.1 Required Fields in `mechanics` Table

Ensure these fields exist and are populated:

| Field | Type | Purpose | Required |
|-------|------|---------|----------|
| `id` | UUID | Primary key | ✅ |
| `user_id` | UUID | Link to profiles | ✅ |
| `name` | TEXT | Display name | ✅ |
| `email` | TEXT | Contact | ✅ |
| `status` | TEXT | 'approved' / 'pending' / 'rejected' | ✅ |
| `account_status` | TEXT | 'active' / 'suspended' / 'banned' | ✅ |
| `suspended_until` | TIMESTAMP | Cooling period end date | ⚠️ |
| `account_type` | TEXT | 'individual_mechanic' / 'workshop_mechanic' | ✅ |
| `workshop_id` | UUID | Link to organizations | ⚠️ |
| `service_tier` | TEXT | 'virtual_only' / 'workshop_partner' | ✅ |
| `is_available` | BOOLEAN | Real-time availability | ✅ |
| `can_accept_sessions` | BOOLEAN | Can take new sessions | ✅ |
| `last_seen_at` | TIMESTAMP | Last activity timestamp | ✅ |
| `clocked_in` | BOOLEAN | Currently on shift | ⚠️ |
| `clock_in_time` | TIMESTAMP | Shift start time | ⚠️ |
| `is_brand_specialist` | BOOLEAN | Specialist flag | ✅ |
| `brand_specializations` | TEXT[] | Array of car makes | ⚠️ |
| `service_keywords` | TEXT[] | Array of service types | ⚠️ |
| `rating` | DECIMAL | Average rating | ✅ |
| `years_of_experience` | INTEGER | Years in field | ✅ |
| `completed_sessions` | INTEGER | Total sessions done | ✅ |
| `red_seal_certified` | BOOLEAN | Certification flag | ✅ |
| `certification_expiry_date` | DATE | Cert expiration | ⚠️ |
| `profile_completion_score` | INTEGER | 0-100 percentage | ✅ |
| `country` | TEXT | Location | ✅ |
| `city` | TEXT | Location | ✅ |
| `postal_code` | TEXT | Canadian postal code | ⚠️ |
| `profile_photo_url` | TEXT | Photo URL | ⚠️ |

✅ = Already exists
⚠️ = Verify exists or needs migration

### 7.2 Required Migration (if fields missing)

```sql
-- Add missing fields to mechanics table
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS clocked_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS clock_in_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS certification_expiry_date DATE,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';

-- Create index for suspended_until queries
CREATE INDEX IF NOT EXISTS idx_mechanics_suspended_until
ON mechanics(suspended_until)
WHERE suspended_until IS NOT NULL;

-- Create index for availability queries
CREATE INDEX IF NOT EXISTS idx_mechanics_availability
ON mechanics(is_available, can_accept_sessions, status)
WHERE status = 'approved' AND can_accept_sessions = true;

-- Create index for location-based matching
CREATE INDEX IF NOT EXISTS idx_mechanics_location
ON mechanics(country, city, postal_code)
WHERE status = 'approved';
```

---

## 8. API Endpoints

### 8.1 Existing Endpoints (Leverage)

#### `GET /api/mechanics/available`
**Purpose**: Fetch and score available mechanics
**Status**: ✅ Already exists
**Enhancements Needed**:
- Add filtering for `profile_completion_score >= 80`
- Add filtering for certification expiry
- Add filtering for cooling period (suspended_until)
- Add `clocked_in` status to response

**Updated Response**:
```typescript
{
  mechanics: [
    {
      id: string
      name: string
      rating: number
      yearsExperience: number
      isAvailable: boolean
      presenceStatus: 'online' | 'offline' | 'away'
      lastSeenText: string
      isBrandSpecialist: boolean
      brandSpecializations: string[]
      city: string | null
      country: string | null
      matchScore: number
      matchReasons: string[]
      redSealCertified: boolean
      profileCompletionScore: number
      // NEW FIELDS:
      clockedIn: boolean
      inActiveSession: boolean
      certificationExpired: boolean
      profilePhotoUrl: string | null
    }
  ]
  count: number
  total: number
}
```

### 8.2 New Endpoints Required

#### `POST /api/sessions/create-with-intake`
**Purpose**: Create session with embedded intake form data
**Method**: POST
**Body**:
```typescript
{
  vehicle_id: string
  plan_slug: string
  mechanic_id: string | null
  mechanic_type: 'standard' | 'specialist'
  routing_type: 'broadcast' | 'priority_broadcast'

  // Intake form data
  issue_description: string
  extracted_keywords: string[]
  urgency: 'immediate' | 'scheduled'
  scheduled_date_time?: Date
  postal_code?: string

  // Photos (FormData)
  photo_0?: File
  photo_1?: File
  // ... up to 5 photos
}
```

**Response**:
```typescript
{
  success: boolean
  session_id: string
  session: {
    id: string
    status: 'pending' | 'matched'
    assigned_mechanic_id?: string
    created_at: string
  }
}
```

**Business Logic**:
1. Validate customer authentication
2. Validate vehicle ownership
3. Upload photos to storage (Supabase Storage or S3)
4. Extract keywords from description using `extractKeywordsFromDescription()`
5. Create diagnostic_sessions record
6. Create session_requests record
7. If `routing_type = 'priority_broadcast'` and `mechanic_id` provided:
   - Send notification to preferred mechanic first
   - Wait 60 seconds, then broadcast to others if no response
8. If `routing_type = 'broadcast'`:
   - Use smart matching to find top 5 mechanics
   - Broadcast to all simultaneously
9. Create session_intake_metadata record (store issue_description, keywords, photos)

---

## 9. Implementation Phases

### Phase 1: Database & API Preparation (Week 1)
**Tasks**:
- ✅ Verify all required fields exist in `mechanics` table
- ✅ Create migration for missing fields (if any)
- ✅ Update `/api/mechanics/available` endpoint with enhanced filtering
- ✅ Add certification expiry check
- ✅ Add cooling period check
- ✅ Add profile completion score filtering
- ✅ Create `/api/sessions/create-with-intake` endpoint
- ✅ Test API endpoints with Postman/Thunder Client

**Deliverables**:
- Migration file (if needed)
- Updated API endpoint
- API documentation

---

### Phase 2: Mechanic Selection UI Components (Week 1-2)
**Tasks**:
- ✅ Create `PostalCodeInput` component with validation
- ✅ Enhance `MechanicSelectionCard` component with:
  - Presence indicator integration
  - Profile completion badge
  - Certification status
  - Clocked in status
- ✅ Create `AutoMatchPreview` component
- ✅ Create `SpecificMechanicBrowser` component with:
  - Search functionality
  - Favorites filter
  - Grid layout
- ✅ Update Step 3 in `SessionWizard.tsx`

**Deliverables**:
- Reusable components
- Storybook stories (optional)
- Unit tests

---

### Phase 3: Intake Form Integration (Week 2)
**Tasks**:
- ✅ Create `IntakeFormStep` component
- ✅ Integrate keyword extraction logic
- ✅ Add photo upload with preview
- ✅ Add urgency selector
- ✅ Update wizard state management
- ✅ Add Step 4 to `SessionWizard.tsx`

**Deliverables**:
- IntakeFormStep component
- Keyword extraction function
- Form validation

---

### Phase 4: Waiver & Launch Integration (Week 2-3)
**Tasks**:
- ✅ Update Step 5 with session summary preview
- ✅ Integrate waiver checkboxes
- ✅ Connect `handleLaunchSession` to new API endpoint
- ✅ Add loading states and error handling
- ✅ Add success animation/redirect

**Deliverables**:
- Complete SessionWizard flow
- Error handling
- Success states

---

### Phase 5: Testing & Optimization (Week 3)
**Tasks**:
- ✅ End-to-end testing of full wizard flow
- ✅ Test with different mechanic availability scenarios
- ✅ Test with expired certifications
- ✅ Test with cooling period mechanics
- ✅ Performance optimization (lazy loading, memoization)
- ✅ Mobile responsiveness testing
- ✅ Accessibility audit (WCAG compliance)

**Deliverables**:
- Test report
- Bug fixes
- Performance improvements

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Components to Test**:
```typescript
// MechanicSelectionCard.test.tsx
describe('MechanicSelectionCard', () => {
  it('shows green indicator for online mechanics', () => {})
  it('shows yellow indicator for away mechanics', () => {})
  it('shows gray indicator for offline mechanics', () => {})
  it('displays match score correctly', () => {})
  it('shows Red Seal badge if certified', () => {})
  it('hides expired certification', () => {})
})

// AutoMatchPreview.test.tsx
describe('AutoMatchPreview', () => {
  it('displays top matched mechanic', () => {})
  it('shows "No mechanics available" message when empty', () => {})
  it('allows switching to specific selection mode', () => {})
})

// IntakeFormStep.test.tsx
describe('IntakeFormStep', () => {
  it('extracts keywords from issue description', () => {})
  it('validates minimum description length', () => {})
  it('uploads photos successfully', () => {})
  it('limits photo uploads to 5 files', () => {})
})
```

### 10.2 Integration Tests

**Scenarios**:
1. **Happy Path**: Customer selects vehicle → plan → auto-match mechanic → fills intake → launches session
2. **Specific Mechanic Selection**: Customer browses mechanics → selects specific one → completes flow
3. **No Mechanics Available**: System shows fallback message
4. **Cooling Period Mechanic**: Mechanic in cooling period doesn't appear in results
5. **Expired Certification**: Mechanic with expired cert is filtered out
6. **Low Profile Completion**: Mechanic with <80% profile doesn't appear

### 10.3 E2E Tests (Playwright/Cypress)

```typescript
// e2e/session-wizard.spec.ts
test('complete session wizard flow with auto-match', async ({ page }) => {
  await page.goto('/customer/dashboard')
  await page.click('[data-testid="start-session-button"]')

  // Step 1: Select vehicle
  await page.click('[data-testid="vehicle-card-1"]')
  await page.click('[data-testid="continue-button"]')

  // Step 2: Select plan
  await page.click('[data-testid="plan-standard"]')
  await page.click('[data-testid="continue-button"]')

  // Step 3: Mechanic selection (auto-match)
  await page.fill('[data-testid="postal-code-input"]', 'M5V 3A8')
  await page.click('[data-testid="mechanic-mode-first-available"]')
  await expect(page.locator('[data-testid="top-matched-mechanic"]')).toBeVisible()
  await page.click('[data-testid="continue-button"]')

  // Step 4: Intake form
  await page.fill('[data-testid="issue-description"]', 'Brake pads making squeaking noise when stopping')
  await expect(page.locator('text=brake repair')).toBeVisible() // Keyword extracted
  await page.click('[data-testid="urgency-immediate"]')
  await page.click('[data-testid="continue-button"]')

  // Step 5: Waiver
  await page.check('[data-testid="agree-terms"]')
  await page.check('[data-testid="agree-waiver"]')
  await page.click('[data-testid="launch-session-button"]')

  // Verify session created
  await expect(page).toHaveURL(/\/sessions\/[a-z0-9-]+/)
})
```

---

## Summary

This comprehensive plan provides a **clear roadmap** for implementing the enhanced SessionWizard with:

✅ **Intelligent mechanic matching** based on availability, location, skills, and profile quality
✅ **Real-time status indicators** showing online/away/offline mechanics
✅ **Embedded intake form** reducing friction and drop-offs
✅ **Elegant, non-cluttered UI** with progressive disclosure
✅ **Robust filtering** for cooling periods, expired certifications, profile completion

**Estimated Timeline**: 3 weeks
**Complexity**: Medium-High
**Impact**: High - Core customer experience improvement

---

**Next Steps**:
1. Review and approve this plan
2. Assign implementation tasks to development team
3. Create GitHub issues/tickets for each phase
4. Begin Phase 1: Database & API preparation
