# 🎯 Brand Specialist & Smart Matching Strategy
## TheAutoDoctor Platform - Foundation Architecture

**Created:** October 25, 2024
**Status:** Foundation Phase - Pre-Implementation
**Goal:** Differentiate pricing with value-based specialist matching

---

## 🎨 Vision & Value Proposition

### Customer-Facing Value
- **General Service** ($29.99) - Any certified mechanic handles your request
- **Brand Specialist** ($49.99) - Expert in your specific vehicle brand (BMW, Tesla, Mercedes, etc.)
- **Smart Matching** - Automatic keyword matching for specialized tasks (backup camera, brake repair, etc.)

### Business Value
- **Premium tier justified** - Clear value for higher pricing
- **Better customer satisfaction** - Right expert for the right job
- **Mechanic differentiation** - Specialists can charge more
- **Competitive advantage** - Not just "any mechanic"

---

## 📊 Database Architecture

### Phase 1: Core Schema Extensions

```sql
-- ============================================
-- MECHANICS TABLE EXTENSIONS
-- ============================================

-- Add specialist fields to existing mechanics table
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS is_brand_specialist BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS brand_specializations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS service_keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profile_completion_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_accept_sessions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS specialist_tier TEXT DEFAULT 'general' CHECK (specialist_tier IN ('general', 'brand', 'master'));

-- Index for fast lookups
CREATE INDEX idx_mechanics_brand_specialist ON mechanics(is_brand_specialist) WHERE is_brand_specialist = true;
CREATE INDEX idx_mechanics_brands ON mechanics USING GIN(brand_specializations);
CREATE INDEX idx_mechanics_keywords ON mechanics USING GIN(service_keywords);

-- ============================================
-- BRAND SPECIALIZATIONS REFERENCE TABLE
-- ============================================

CREATE TABLE brand_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT UNIQUE NOT NULL,
  brand_logo_url TEXT,
  is_luxury BOOLEAN DEFAULT false,
  requires_certification BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed with common brands
INSERT INTO brand_specializations (brand_name, is_luxury, requires_certification) VALUES
  ('BMW', true, true),
  ('Mercedes-Benz', true, true),
  ('Audi', true, true),
  ('Tesla', true, true),
  ('Porsche', true, true),
  ('Lexus', true, false),
  ('Toyota', false, false),
  ('Honda', false, false),
  ('Ford', false, false),
  ('Chevrolet', false, false),
  ('Nissan', false, false),
  ('Mazda', false, false),
  ('Volkswagen', false, false),
  ('Hyundai', false, false),
  ('Kia', false, false);

-- ============================================
-- SERVICE KEYWORDS REFERENCE TABLE
-- ============================================

CREATE TABLE service_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- 'diagnostic', 'repair', 'installation', 'maintenance'
  complexity TEXT DEFAULT 'medium', -- 'simple', 'medium', 'complex'
  requires_specialist BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed with common services
INSERT INTO service_keywords (keyword, category, complexity, requires_specialist) VALUES
  -- Installation services
  ('backup camera installation', 'installation', 'medium', false),
  ('dashcam installation', 'installation', 'simple', false),
  ('remote starter installation', 'installation', 'medium', false),
  ('audio system installation', 'installation', 'medium', false),

  -- Diagnostics
  ('check engine light', 'diagnostic', 'medium', false),
  ('ABS warning', 'diagnostic', 'medium', false),
  ('transmission diagnostic', 'diagnostic', 'complex', false),
  ('electrical diagnostic', 'diagnostic', 'complex', false),

  -- Repairs
  ('brake repair', 'repair', 'medium', false),
  ('suspension repair', 'repair', 'complex', false),
  ('engine repair', 'repair', 'complex', false),
  ('transmission repair', 'repair', 'complex', true),

  -- Maintenance
  ('oil change', 'maintenance', 'simple', false),
  ('tire rotation', 'maintenance', 'simple', false),
  ('brake pad replacement', 'maintenance', 'medium', false),
  ('timing belt replacement', 'maintenance', 'complex', false),

  -- Brand-specific
  ('BMW coding', 'diagnostic', 'complex', true),
  ('Tesla diagnostics', 'diagnostic', 'complex', true),
  ('Mercedes STAR diagnostic', 'diagnostic', 'complex', true);

-- ============================================
-- SESSION REQUESTS EXTENSIONS
-- ============================================

ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'general' CHECK (request_type IN ('general', 'brand_specialist')),
ADD COLUMN IF NOT EXISTS requested_brand TEXT,
ADD COLUMN IF NOT EXISTS extracted_keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS matching_score JSONB DEFAULT '{}';

-- ============================================
-- PROFILE COMPLETION TRACKING
-- ============================================

CREATE TABLE mechanic_profile_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  field_category TEXT NOT NULL, -- 'basic', 'credentials', 'experience', 'preferences'
  weight INTEGER NOT NULL, -- Points toward completion score
  required_for_general BOOLEAN DEFAULT true,
  required_for_specialist BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Define completion requirements
INSERT INTO mechanic_profile_requirements (field_name, field_category, weight, required_for_general, required_for_specialist) VALUES
  -- Basic (40 points total)
  ('full_name', 'basic', 10, true, true),
  ('email', 'basic', 10, true, true),
  ('phone', 'basic', 10, true, true),
  ('profile_photo', 'basic', 10, false, true),

  -- Credentials (30 points total)
  ('years_experience', 'credentials', 10, true, true),
  ('red_seal_certified', 'credentials', 10, false, true),
  ('certifications_uploaded', 'credentials', 10, false, true),

  -- Experience (20 points total)
  ('specializations', 'experience', 10, true, true),
  ('service_keywords', 'experience', 10, false, true),

  -- Preferences (10 points total)
  ('availability_set', 'preferences', 5, true, true),
  ('stripe_connected', 'preferences', 5, true, true);

-- ============================================
-- PRICING TIERS
-- ============================================

CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_code TEXT UNIQUE NOT NULL,
  tier_name TEXT NOT NULL,
  mechanic_type TEXT NOT NULL, -- 'general' or 'brand_specialist'
  duration_minutes INTEGER NOT NULL,
  base_price_cents INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed pricing tiers
INSERT INTO pricing_tiers (tier_code, tier_name, mechanic_type, duration_minutes, base_price_cents, description, is_active) VALUES
  -- General mechanics
  ('general_quick', 'Quick Chat', 'general', 30, 2999, '30-min chat with certified mechanic', true),
  ('general_video', 'Video Diagnostic', 'general', 45, 4999, '45-min video diagnostic session', true),

  -- Brand specialists
  ('specialist_quick', 'Quick Chat - Specialist', 'brand_specialist', 30, 4999, '30-min chat with brand specialist', true),
  ('specialist_video', 'Video Diagnostic - Specialist', 'brand_specialist', 45, 6999, '45-min video with brand expert', true);
```

---

## 🔧 Profile Completion System

### Mechanic Dashboard - Completion Gate

```typescript
// /app/mechanic/dashboard/ProfileCompletionGuard.tsx

interface ProfileCompletion {
  score: number // 0-100
  canAcceptSessions: boolean
  missingFields: {
    field: string
    category: string
    required: boolean
  }[]
  nextSteps: string[]
}

const ProfileCompletionBanner = ({ completion }: { completion: ProfileCompletion }) => {
  if (completion.canAcceptSessions) return null

  return (
    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-orange-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-orange-800">
            Complete Your Profile to Accept Sessions
          </h3>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-orange-500 h-2.5 rounded-full transition-all"
                style={{ width: `${completion.score}%` }}
              />
            </div>
            <p className="text-sm text-orange-700 mt-1">
              {completion.score}% complete - {100 - completion.score}% to go
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-orange-800">Missing Required Fields:</p>
            <ul className="list-disc list-inside text-sm text-orange-700">
              {completion.missingFields.map(field => (
                <li key={field.field}>{field.field}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <Link
              href="/mechanic/profile/edit"
              className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
            >
              Complete Profile Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Profile Completion Calculation

```typescript
// /lib/profileCompletion.ts

interface MechanicProfile {
  full_name?: string
  email?: string
  phone?: string
  profile_photo?: string
  years_experience?: number
  red_seal_certified?: boolean
  certifications?: any[]
  specializations?: string[]
  service_keywords?: string[]
  availability?: any[]
  stripe_account_id?: string
  is_brand_specialist?: boolean
}

export async function calculateProfileCompletion(
  mechanicId: string
): Promise<ProfileCompletion> {
  const supabase = createClient()

  // Get mechanic data
  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('*')
    .eq('id', mechanicId)
    .single()

  // Get requirements
  const { data: requirements } = await supabase
    .from('mechanic_profile_requirements')
    .select('*')

  let totalPoints = 0
  let earnedPoints = 0
  const missingFields: any[] = []

  requirements?.forEach(req => {
    const isRequired = mechanic.is_brand_specialist
      ? req.required_for_specialist
      : req.required_for_general

    if (!isRequired) return

    totalPoints += req.weight

    // Check if field is filled
    let isFilled = false
    switch(req.field_name) {
      case 'full_name':
        isFilled = !!mechanic.full_name
        break
      case 'profile_photo':
        isFilled = !!mechanic.profile_photo_url
        break
      case 'specializations':
        isFilled = mechanic.specializations?.length > 0
        break
      case 'service_keywords':
        isFilled = mechanic.service_keywords?.length > 0
        break
      case 'availability_set':
        // Check if they have at least one availability block
        isFilled = mechanic.availability_blocks?.length > 0
        break
      case 'stripe_connected':
        isFilled = !!mechanic.stripe_account_id
        break
      // ... other fields
    }

    if (isFilled) {
      earnedPoints += req.weight
    } else {
      missingFields.push({
        field: req.field_name,
        category: req.field_category,
        required: isRequired
      })
    }
  })

  const score = Math.round((earnedPoints / totalPoints) * 100)

  // Minimum 80% required to accept sessions
  const canAcceptSessions = score >= 80

  // Update mechanic record
  await supabase
    .from('mechanics')
    .update({
      profile_completion_score: score,
      can_accept_sessions: canAcceptSessions
    })
    .eq('id', mechanicId)

  return {
    score,
    canAcceptSessions,
    missingFields,
    nextSteps: generateNextSteps(missingFields)
  }
}

function generateNextSteps(missingFields: any[]): string[] {
  const steps: string[] = []

  if (missingFields.some(f => f.category === 'basic')) {
    steps.push('Complete your basic information')
  }
  if (missingFields.some(f => f.field === 'service_keywords')) {
    steps.push('Add your service expertise (helps match you with customers)')
  }
  if (missingFields.some(f => f.field === 'availability_set')) {
    steps.push('Set your availability schedule')
  }
  if (missingFields.some(f => f.field === 'stripe_connected')) {
    steps.push('Connect your Stripe account for payouts')
  }

  return steps
}
```

---

## 🎯 Customer Intake - Smart Matching

### Enhanced Intake Form

```typescript
// /app/intake/page.tsx - Enhanced Version

export default function EnhancedIntakeForm() {
  const [requestType, setRequestType] = useState<'general' | 'brand_specialist'>('general')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [concernDescription, setConcernDescription] = useState('')
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])
  const [pricingOptions, setPricingOptions] = useState<any[]>([])

  // Extract keywords as user types
  useEffect(() => {
    const extractKeywords = async () => {
      if (concernDescription.length < 10) return

      const response = await fetch('/api/keywords/extract', {
        method: 'POST',
        body: JSON.stringify({ description: concernDescription })
      })

      const { keywords } = await response.json()
      setSuggestedKeywords(keywords)
    }

    const debounce = setTimeout(extractKeywords, 500)
    return () => clearTimeout(debounce)
  }, [concernDescription])

  return (
    <form className="space-y-6">
      {/* Step 1: Request Type */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Select Service Type</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* General Mechanic Option */}
          <button
            type="button"
            onClick={() => setRequestType('general')}
            className={`p-4 border-2 rounded-lg text-left transition ${
              requestType === 'general'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-lg">General Service</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Certified mechanic handles your request
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  $29.99
                </p>
              </div>
              {requestType === 'general' && (
                <CheckCircle className="h-6 w-6 text-blue-500" />
              )}
            </div>
          </button>

          {/* Brand Specialist Option */}
          <button
            type="button"
            onClick={() => setRequestType('brand_specialist')}
            className={`p-4 border-2 rounded-lg text-left transition ${
              requestType === 'brand_specialist'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  Brand Specialist
                  <Star className="h-5 w-5 text-orange-500" />
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Expert in your specific vehicle brand
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  $49.99
                </p>
                <p className="text-xs text-orange-600 font-medium">
                  +$20 for specialist expertise
                </p>
              </div>
              {requestType === 'brand_specialist' && (
                <CheckCircle className="h-6 w-6 text-orange-500" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Step 2: Brand Selection (if specialist) */}
      {requestType === 'brand_specialist' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Select Your Vehicle Brand</h3>
          <BrandSelector
            value={selectedBrand}
            onChange={setSelectedBrand}
          />
        </div>
      )}

      {/* Step 3: Concern Description */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Describe Your Concern</h3>
        <textarea
          className="w-full border rounded-lg p-3"
          rows={5}
          placeholder="e.g., I want to install a backup camera in my 2020 BMW X5"
          value={concernDescription}
          onChange={(e) => setConcernDescription(e.target.value)}
        />

        {/* Suggested Keywords */}
        {suggestedKeywords.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              Detected services:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedKeywords.map(keyword => (
                <span
                  key={keyword}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Matching Preview */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              We'll match you with the best available {
                requestType === 'brand_specialist' ? selectedBrand : ''
              } {requestType === 'brand_specialist' ? 'specialist' : 'mechanic'}
            </p>
            {suggestedKeywords.length > 0 && (
              <p className="text-sm text-blue-700 mt-1">
                Experts in: {suggestedKeywords.join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold">
        Find My Mechanic
      </button>
    </form>
  )
}
```

---

## 🧠 Smart Matching Algorithm

```typescript
// /lib/mechanicMatching.ts

interface MatchingCriteria {
  requestType: 'general' | 'brand_specialist'
  requestedBrand?: string
  extractedKeywords: string[]
  customerLocation?: string
  urgency?: 'immediate' | 'scheduled'
}

interface MechanicMatch {
  mechanicId: string
  mechanicName: string
  profilePhoto: string
  matchScore: number
  matchReasons: string[]
  availability: 'online' | 'offline'
  yearsExperience: number
  rating: number
  isBrandSpecialist: boolean
}

export async function findMatchingMechanics(
  criteria: MatchingCriteria
): Promise<MechanicMatch[]> {
  const supabase = createClient()

  // Step 1: Base query - only mechanics who can accept sessions
  let query = supabase
    .from('mechanics')
    .select('*')
    .eq('can_accept_sessions', true)
    .eq('status', 'approved')

  // Step 2: Filter by request type
  if (criteria.requestType === 'brand_specialist') {
    if (!criteria.requestedBrand) {
      throw new Error('Brand must be specified for specialist request')
    }

    // Only brand specialists with matching brand
    query = query
      .eq('is_brand_specialist', true)
      .contains('brand_specializations', [criteria.requestedBrand])
  } else {
    // For general requests, include ALL mechanics (both general and specialists)
    // Specialists can handle general requests too!
    // No additional filter needed
  }

  const { data: mechanics, error } = await query

  if (error || !mechanics) {
    console.error('Error fetching mechanics:', error)
    return []
  }

  // Step 3: Score each mechanic
  const scoredMechanics: MechanicMatch[] = mechanics.map(mechanic => {
    let score = 0
    const matchReasons: string[] = []

    // Base score for availability
    if (mechanic.is_online) {
      score += 50
      matchReasons.push('Available now')
    } else {
      score += 20
    }

    // Keyword matching
    const keywordMatches = criteria.extractedKeywords.filter(keyword =>
      mechanic.service_keywords?.includes(keyword)
    )

    if (keywordMatches.length > 0) {
      score += keywordMatches.length * 15
      matchReasons.push(`Expertise in: ${keywordMatches.join(', ')}`)
    }

    // Brand specialist bonus (if applicable)
    if (criteria.requestType === 'brand_specialist') {
      score += 30
      matchReasons.push(`${criteria.requestedBrand} specialist`)
    }

    // Experience bonus
    if (mechanic.years_experience >= 10) {
      score += 20
      matchReasons.push('10+ years experience')
    } else if (mechanic.years_experience >= 5) {
      score += 10
      matchReasons.push('5+ years experience')
    }

    // Rating bonus
    if (mechanic.rating >= 4.5) {
      score += 15
      matchReasons.push('Highly rated (4.5+)')
    }

    // Red Seal certification
    if (mechanic.red_seal_certified) {
      score += 10
      matchReasons.push('Red Seal Certified')
    }

    return {
      mechanicId: mechanic.id,
      mechanicName: mechanic.full_name,
      profilePhoto: mechanic.profile_photo_url,
      matchScore: score,
      matchReasons,
      availability: mechanic.is_online ? 'online' : 'offline',
      yearsExperience: mechanic.years_experience,
      rating: mechanic.rating || 0,
      isBrandSpecialist: mechanic.is_brand_specialist
    }
  })

  // Step 4: Sort by score (highest first)
  return scoredMechanics
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10) // Return top 10 matches
}
```

---

## 🔄 Feature Toggle Implementation

```sql
-- Add to feature_flags table
INSERT INTO feature_flags (flag_name, description, enabled) VALUES
  ('enable_brand_specialist_matching', 'Enable brand specialist vs general mechanic selection', false),
  ('show_specialist_pricing', 'Show premium pricing for brand specialists', false),
  ('require_profile_completion', 'Require 80% profile completion before accepting sessions', true),
  ('keyword_extraction_enabled', 'Enable automatic keyword extraction from intake', false);
```

```typescript
// Frontend usage
const { data: flags } = await supabase
  .from('feature_flags')
  .select('flag_name, enabled')

const showBrandSpecialist = flags?.find(f => f.flag_name === 'enable_brand_specialist_matching')?.enabled

{showBrandSpecialist && (
  <BrandSpecialistOption />
)}
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] **Day 1:** Run database migrations
  - [ ] Add specialist fields to mechanics table
  - [ ] Create brand_specializations table
  - [ ] Create service_keywords table
  - [ ] Add profile completion tracking
- [ ] **Day 2:** Profile completion system
  - [ ] Build completion calculator
  - [ ] Add completion banner to mechanic dashboard
  - [ ] Block session acceptance if < 80%
- [ ] **Day 3:** Update mechanic signup
  - [ ] Add "Are you a brand specialist?" checkbox
  - [ ] Brand selection (multi-select)
  - [ ] Service keywords selection
- [ ] **Day 4:** Enhanced intake form
  - [ ] Add general vs specialist selector
  - [ ] Brand picker for specialists
  - [ ] Keyword extraction API
- [ ] **Day 5:** Matching algorithm
  - [ ] Build scoring function
  - [ ] Test matching scenarios
  - [ ] API endpoint for matching

### Phase 2: Testing (Week 2)
- [ ] Create test mechanics (general and specialists)
- [ ] Test all matching scenarios
- [ ] Verify profile completion blocking
- [ ] Test pricing display

### Phase 3: Toggle & Launch (Week 3)
- [ ] Add feature flags
- [ ] Admin toggle UI
- [ ] Gradual rollout to beta users

---

## ✅ Success Criteria

### Technical Success
- [ ] Profile completion calculation accurate
- [ ] Mechanics blocked until 80% complete
- [ ] Matching returns correct specialists
- [ ] General requests match all mechanics
- [ ] Brand specialist requests only match specialists
- [ ] Keyword extraction works 80%+ accuracy

### Business Success
- [ ] 30%+ customers choose specialist option
- [ ] Specialist pricing accepted without complaints
- [ ] Higher satisfaction scores for specialist sessions
- [ ] Specialists earn more than general mechanics

---

*This strategy ensures a solid foundation for brand specialist matching that scales with your B2C → B2B2C evolution.*