# MECHANIC TYPES & SCHEDULING INTEGRATION

**Date:** 2025-11-10
**Purpose:** Explain how scheduling system respects business logic for 3 mechanic types

---

## 🎯 THE THREE MECHANIC TYPES

Based on your SCHEDULING_SYSTEM_ANALYSIS_AND_PLAN.md, there are **3 distinct mechanic types**:

### Type 1: Virtual-Only Mechanics
- **Can do:** Online diagnostic sessions (chat/video) ONLY
- **Cannot do:** In-person workshop visits
- **Schedule constraint:** Personal availability (mechanic sets own hours)
- **Location:** Work from anywhere
- **Workshop access:** NO

### Type 2: Independent Workshop Mechanics (with dashboard access)
- **Can do:** BOTH online sessions AND in-person visits
- **In-person location:** Own workshop address
- **Schedule constraint:** Self-managed workshop hours
- **Workshop access:** YES (own workshop)
- **Dashboard:** Full mechanic dashboard access

### Type 3: Workshop-Affiliated Mechanics
- **Can do:** BOTH online sessions AND in-person visits
- **In-person location:** Affiliated workshop address (NOT own)
- **Schedule constraint:** Workshop operating hours (not self-controlled)
- **Workshop access:** YES (workshop they're affiliated with)
- **Dashboard:** Full mechanic dashboard access

---

## 🗄️ DATABASE SCHEMA REVIEW

### `mechanics` table (existing)

```sql
CREATE TABLE mechanics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),

  -- Workshop relationship
  workshop_id UUID REFERENCES workshops(id), -- NULL = virtual-only or independent

  -- Mechanic type (CRITICAL FIELD)
  mechanic_type VARCHAR(50), -- 'virtual_only', 'independent_workshop', 'workshop_affiliated'

  -- Location
  state_province VARCHAR(100),
  city VARCHAR(100),
  postal_code VARCHAR(20),

  -- Availability
  currently_on_shift BOOLEAN DEFAULT false,

  -- Skills
  specialties TEXT[],
  certifications JSONB,

  -- Other fields...
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `workshops` table (existing)

```sql
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,

  -- Address (for in-person visits)
  address_line1 VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),

  -- Contact
  phone VARCHAR(50),
  email VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `workshop_availability` table (existing)

```sql
CREATE TABLE workshop_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) NOT NULL,

  -- Day of week (0 = Sunday, 6 = Saturday)
  day_of_week INTEGER NOT NULL,

  -- Operating hours
  is_open BOOLEAN DEFAULT true,
  open_time TIME, -- e.g., '09:00:00'
  close_time TIME, -- e.g., '18:00:00'

  CONSTRAINT valid_day_of_week CHECK (day_of_week BETWEEN 0 AND 6)
);
```

### `mechanic_availability` table (existing - for virtual/independent)

```sql
CREATE TABLE mechanic_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_user_id UUID REFERENCES mechanics(user_id) NOT NULL,

  -- Personal availability blocks
  day_of_week INTEGER NOT NULL,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,

  CONSTRAINT valid_day_of_week CHECK (day_of_week BETWEEN 0 AND 6)
);
```

---

## 🔍 HOW AVAILABILITY IS DETERMINED (Business Logic)

### AvailabilityService Logic (Respects Mechanic Type)

```typescript
// src/lib/availabilityService.ts

export class AvailabilityService {

  /**
   * Main method: Check if mechanic is available at specific time
   * Respects mechanic type and associated constraints
   */
  async isAvailable(
    mechanicId: string,
    startTime: Date,
    endTime: Date,
    sessionType: 'online' | 'in_person'
  ): Promise<{
    available: boolean
    reason?: string
    mechanicType?: string
  }> {

    // 1. Get mechanic details
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select(`
        user_id,
        mechanic_type,
        workshop_id,
        state_province,
        city,
        workshops (
          id,
          name,
          address_line1,
          city,
          state_province
        )
      `)
      .eq('user_id', mechanicId)
      .single()

    if (!mechanic) {
      return { available: false, reason: 'Mechanic not found' }
    }

    // 2. CHECK MECHANIC TYPE CONSTRAINTS
    const mechanicType = mechanic.mechanic_type

    // ========================================
    // VIRTUAL-ONLY MECHANIC
    // ========================================
    if (mechanicType === 'virtual_only') {
      // Can ONLY do online sessions
      if (sessionType === 'in_person') {
        return {
          available: false,
          reason: 'Virtual-only mechanic cannot do in-person visits',
          mechanicType: 'virtual_only'
        }
      }

      // Check personal availability (mechanic_availability table)
      return await this.checkPersonalAvailability(mechanicId, startTime, endTime)
    }

    // ========================================
    // INDEPENDENT WORKSHOP MECHANIC
    // ========================================
    if (mechanicType === 'independent_workshop') {
      // Has own workshop, sets own hours

      if (sessionType === 'online') {
        // For online: check personal availability
        return await this.checkPersonalAvailability(mechanicId, startTime, endTime)
      }

      if (sessionType === 'in_person') {
        // For in-person: check workshop hours (self-managed)
        if (!mechanic.workshop_id) {
          return {
            available: false,
            reason: 'Independent mechanic has no workshop configured',
            mechanicType: 'independent_workshop'
          }
        }

        return await this.checkWorkshopAvailability(
          mechanic.workshop_id,
          startTime,
          endTime,
          mechanicId
        )
      }
    }

    // ========================================
    // WORKSHOP-AFFILIATED MECHANIC
    // ========================================
    if (mechanicType === 'workshop_affiliated') {
      // Works at another workshop, constrained by their hours

      if (!mechanic.workshop_id) {
        return {
          available: false,
          reason: 'Workshop-affiliated mechanic has no workshop assigned',
          mechanicType: 'workshop_affiliated'
        }
      }

      if (sessionType === 'online') {
        // For online: check workshop hours (must be during workshop time)
        const workshopOpen = await this.checkWorkshopAvailability(
          mechanic.workshop_id,
          startTime,
          endTime,
          mechanicId
        )

        if (!workshopOpen.available) {
          return {
            available: false,
            reason: 'Workshop-affiliated mechanic can only be online during workshop hours',
            mechanicType: 'workshop_affiliated'
          }
        }

        // Also check if mechanic has any personal blocks during this time
        return await this.checkPersonalAvailability(mechanicId, startTime, endTime)
      }

      if (sessionType === 'in_person') {
        // For in-person: MUST be at affiliated workshop during their hours
        return await this.checkWorkshopAvailability(
          mechanic.workshop_id,
          startTime,
          endTime,
          mechanicId
        )
      }
    }

    // Default fallback
    return { available: false, reason: 'Unknown mechanic type' }
  }

  /**
   * Check personal availability (for virtual-only and independent)
   */
  private async checkPersonalAvailability(
    mechanicId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ available: boolean; reason?: string }> {

    const dayOfWeek = startTime.getDay() // 0-6
    const startHour = startTime.getHours()
    const endHour = endTime.getHours()

    // 1. Check mechanic_availability table
    const { data: availBlocks } = await supabase
      .from('mechanic_availability')
      .select('*')
      .eq('mechanic_user_id', mechanicId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)

    if (!availBlocks || availBlocks.length === 0) {
      return {
        available: false,
        reason: 'Mechanic has no availability set for this day'
      }
    }

    // Check if requested time falls within any availability block
    const isWithinAvailability = availBlocks.some(block => {
      const blockStart = parseInt(block.start_time.split(':')[0])
      const blockEnd = parseInt(block.end_time.split(':')[0])
      return startHour >= blockStart && endHour <= blockEnd
    })

    if (!isWithinAvailability) {
      return {
        available: false,
        reason: 'Requested time outside mechanic availability hours'
      }
    }

    // 2. Check time off (vacation, holidays)
    const { data: timeOff } = await supabase
      .from('mechanic_time_off')
      .select('*')
      .eq('mechanic_user_id', mechanicId)
      .lte('start_date', startTime.toISOString())
      .gte('end_date', endTime.toISOString())

    if (timeOff && timeOff.length > 0) {
      return {
        available: false,
        reason: 'Mechanic has time off during this period'
      }
    }

    // 3. Check existing bookings (prevent double-booking)
    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('id, scheduled_for')
      .eq('mechanic_user_id', mechanicId)
      .eq('status', 'scheduled')
      .gte('scheduled_for', startTime.toISOString())
      .lte('scheduled_for', endTime.toISOString())

    if (existingSessions && existingSessions.length > 0) {
      return {
        available: false,
        reason: 'Mechanic already has a session scheduled at this time'
      }
    }

    // 4. Check minimum booking notice (e.g., 2 hours in advance)
    const now = new Date()
    const minNoticeHours = 2
    const minBookingTime = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000)

    if (startTime < minBookingTime) {
      return {
        available: false,
        reason: `Bookings require at least ${minNoticeHours} hours notice`
      }
    }

    return { available: true }
  }

  /**
   * Check workshop availability (for independent & affiliated mechanics)
   */
  private async checkWorkshopAvailability(
    workshopId: string,
    startTime: Date,
    endTime: Date,
    mechanicId: string
  ): Promise<{ available: boolean; reason?: string }> {

    const dayOfWeek = startTime.getDay()
    const startHour = startTime.getHours()
    const endHour = endTime.getHours()

    // 1. Check workshop_availability table
    const { data: workshopHours } = await supabase
      .from('workshop_availability')
      .select('*')
      .eq('workshop_id', workshopId)
      .eq('day_of_week', dayOfWeek)
      .single()

    if (!workshopHours) {
      return {
        available: false,
        reason: 'Workshop hours not configured for this day'
      }
    }

    if (!workshopHours.is_open) {
      return {
        available: false,
        reason: 'Workshop is closed on this day'
      }
    }

    // Check if time falls within workshop hours
    const workshopOpen = parseInt(workshopHours.open_time.split(':')[0])
    const workshopClose = parseInt(workshopHours.close_time.split(':')[0])

    if (startHour < workshopOpen || endHour > workshopClose) {
      return {
        available: false,
        reason: `Workshop hours are ${workshopHours.open_time} - ${workshopHours.close_time}`
      }
    }

    // 2. Check mechanic's personal time off
    const { data: timeOff } = await supabase
      .from('mechanic_time_off')
      .select('*')
      .eq('mechanic_user_id', mechanicId)
      .lte('start_date', startTime.toISOString())
      .gte('end_date', endTime.toISOString())

    if (timeOff && timeOff.length > 0) {
      return {
        available: false,
        reason: 'Mechanic has time off during this period'
      }
    }

    // 3. Check existing bookings for this mechanic
    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('id, scheduled_for')
      .eq('mechanic_user_id', mechanicId)
      .eq('status', 'scheduled')
      .gte('scheduled_for', startTime.toISOString())
      .lte('scheduled_for', endTime.toISOString())

    if (existingSessions && existingSessions.length > 0) {
      return {
        available: false,
        reason: 'Mechanic already has a session scheduled at this time'
      }
    }

    return { available: true }
  }

  /**
   * Get available time slots for a specific mechanic on a specific date
   * Respects mechanic type
   */
  async getAvailableSlots(
    mechanicId: string,
    date: Date,
    sessionType: 'online' | 'in_person'
  ): Promise<TimeSlot[]> {

    const slots: TimeSlot[] = []

    // Determine time range based on mechanic type
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('mechanic_type, workshop_id')
      .eq('user_id', mechanicId)
      .single()

    if (!mechanic) return []

    let startHour = 9
    let endHour = 18

    // For workshop-affiliated or independent with workshop, use workshop hours
    if (
      (mechanic.mechanic_type === 'workshop_affiliated' ||
       mechanic.mechanic_type === 'independent_workshop') &&
      mechanic.workshop_id
    ) {
      const dayOfWeek = date.getDay()
      const { data: workshopHours } = await supabase
        .from('workshop_availability')
        .select('open_time, close_time, is_open')
        .eq('workshop_id', mechanic.workshop_id)
        .eq('day_of_week', dayOfWeek)
        .single()

      if (workshopHours && workshopHours.is_open) {
        startHour = parseInt(workshopHours.open_time.split(':')[0])
        endHour = parseInt(workshopHours.close_time.split(':')[0])
      } else {
        return [] // Workshop closed this day
      }
    }

    // Generate 30-minute slots
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const slotStart = new Date(date)
        slotStart.setHours(hour, minute, 0, 0)

        const slotEnd = new Date(slotStart)
        slotEnd.setMinutes(slotEnd.getMinutes() + 30)

        const availabilityCheck = await this.isAvailable(
          mechanicId,
          slotStart,
          slotEnd,
          sessionType
        )

        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          available: availabilityCheck.available,
          reason: availabilityCheck.reason
        })
      }
    }

    return slots
  }
}

interface TimeSlot {
  startTime: Date
  endTime: Date
  available: boolean
  reason?: string
}
```

---

## 🎨 UI COMPONENTS - HOW THEY RESPECT MECHANIC TYPES

### Component 1: MechanicCard (in SchedulingPage)

```tsx
// src/components/customer/scheduling/MechanicCard.tsx

interface MechanicCardProps {
  mechanic: {
    user_id: string
    full_name: string
    mechanic_type: 'virtual_only' | 'independent_workshop' | 'workshop_affiliated'
    workshop_id: string | null
    workshop?: {
      name: string
      address_line1: string
      city: string
      state_province: string
    }
    specialties: string[]
    rating: number
    total_sessions: number
  }
  sessionType: 'online' | 'in_person'
  onSelect: (mechanicId: string) => void
}

export default function MechanicCard({ mechanic, sessionType, onSelect }: MechanicCardProps) {

  // ========================================
  // BUSINESS LOGIC: Can this mechanic do this session type?
  // ========================================
  const canDoSessionType = () => {
    if (sessionType === 'online') {
      // All mechanic types can do online
      return true
    }

    if (sessionType === 'in_person') {
      // Only independent_workshop and workshop_affiliated can do in-person
      if (mechanic.mechanic_type === 'virtual_only') {
        return false
      }

      // Must have workshop configured
      if (!mechanic.workshop_id || !mechanic.workshop) {
        return false
      }

      return true
    }

    return false
  }

  const isAvailable = canDoSessionType()

  return (
    <div
      className={`
        mechanic-card rounded-lg border p-4
        ${isAvailable
          ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600 cursor-pointer'
          : 'border-slate-800 bg-slate-900/50 opacity-60 cursor-not-allowed'
        }
      `}
      onClick={() => isAvailable && onSelect(mechanic.user_id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{mechanic.full_name}</h3>

          {/* Mechanic Type Badge */}
          <div className="mt-1">
            {mechanic.mechanic_type === 'virtual_only' && (
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                💻 Virtual Only
              </span>
            )}
            {mechanic.mechanic_type === 'independent_workshop' && (
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">
                🏪 Independent Workshop
              </span>
            )}
            {mechanic.mechanic_type === 'workshop_affiliated' && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                🏢 Workshop Affiliated
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-yellow-400 text-sm">★ {mechanic.rating.toFixed(1)}</div>
          <div className="text-xs text-slate-500">{mechanic.total_sessions} sessions</div>
        </div>
      </div>

      {/* Workshop Info (for in-person sessions) */}
      {sessionType === 'in_person' && mechanic.workshop && (
        <div className="mb-3 p-2 bg-slate-700/30 rounded text-sm">
          <div className="font-semibold text-slate-300">📍 Workshop Location</div>
          <div className="text-slate-400 text-xs mt-1">
            {mechanic.workshop.name}
            <br />
            {mechanic.workshop.address_line1}, {mechanic.workshop.city}, {mechanic.workshop.state_province}
          </div>
        </div>
      )}

      {/* Specialties */}
      <div className="mb-3">
        <div className="text-xs text-slate-500 mb-1">Specialties:</div>
        <div className="flex flex-wrap gap-1">
          {mechanic.specialties.slice(0, 3).map((specialty, idx) => (
            <span
              key={idx}
              className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded"
            >
              {specialty}
            </span>
          ))}
        </div>
      </div>

      {/* ========================================
          BUSINESS LOGIC: Show availability status
          ======================================== */}
      {!isAvailable && sessionType === 'in_person' && mechanic.mechanic_type === 'virtual_only' && (
        <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
          ⚠️ This mechanic only offers online sessions
        </div>
      )}

      {!isAvailable && sessionType === 'in_person' && !mechanic.workshop_id && (
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
          ⚠️ No workshop location configured
        </div>
      )}

      {isAvailable && (
        <button className="w-full mt-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 py-2 rounded text-sm font-medium transition">
          Select {mechanic.full_name}
        </button>
      )}
    </div>
  )
}
```

---

### Component 2: ServiceTypeSelector (SchedulingPage Step 1)

```tsx
// src/components/customer/scheduling/ServiceTypeStep.tsx

interface ServiceTypeStepProps {
  onComplete: (data: { serviceType: 'online' | 'in_person' }) => void
}

export default function ServiceTypeStep({ onComplete }: ServiceTypeStepProps) {
  const [selected, setSelected] = useState<'online' | 'in_person' | null>(null)

  return (
    <div className="service-type-step">
      <h2 className="text-2xl font-bold text-white mb-2">Choose Service Type</h2>
      <p className="text-slate-400 mb-6">
        Select whether you need an online diagnostic session or an in-person workshop visit
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Online Diagnostic */}
        <button
          onClick={() => setSelected('online')}
          className={`
            p-6 rounded-lg border-2 transition text-left
            ${selected === 'online'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }
          `}
        >
          <div className="text-4xl mb-3">💻</div>
          <h3 className="text-lg font-bold text-white mb-2">Online Diagnostic Session</h3>
          <p className="text-sm text-slate-400 mb-4">
            Video call or chat with a mechanic from anywhere. Perfect for:
          </p>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>• Diagnosing issues remotely</li>
            <li>• Getting expert advice</li>
            <li>• Pre-purchase inspections (virtual)</li>
            <li>• General automotive questions</li>
          </ul>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="text-xs text-slate-500">Available mechanics:</div>
            <div className="text-sm text-white font-semibold">
              🟢 All mechanics (Virtual-only, Independent, Affiliated)
            </div>
          </div>
        </button>

        {/* In-Person Visit */}
        <button
          onClick={() => setSelected('in_person')}
          className={`
            p-6 rounded-lg border-2 transition text-left
            ${selected === 'in_person'
              ? 'border-green-500 bg-green-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }
          `}
        >
          <div className="text-4xl mb-3">🔧</div>
          <h3 className="text-lg font-bold text-white mb-2">In-Person Workshop Visit</h3>
          <p className="text-sm text-slate-400 mb-4">
            Visit a physical workshop for hands-on service. Perfect for:
          </p>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>• Physical repairs and maintenance</li>
            <li>• Pre-purchase inspections (in-person)</li>
            <li>• Complex diagnostics requiring tools</li>
            <li>• Safety inspections</li>
          </ul>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="text-xs text-slate-500">Available mechanics:</div>
            <div className="text-sm text-white font-semibold">
              🏪 Independent Workshop & 🏢 Workshop-Affiliated only
            </div>
            <div className="text-xs text-slate-500 mt-1">
              (Virtual-only mechanics cannot do in-person)
            </div>
          </div>
        </button>
      </div>

      {/* Continue Button */}
      {selected && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onComplete({ serviceType: selected })}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold"
          >
            Continue with {selected === 'online' ? 'Online Session' : 'In-Person Visit'} →
          </button>
        </div>
      )}
    </div>
  )
}
```

---

### Component 3: TimeSelectionStep (Respects Mechanic Type)

```tsx
// src/components/customer/scheduling/TimeSelectionStep.tsx

interface TimeSelectionStepProps {
  mechanicId: string
  mechanicType: 'virtual_only' | 'independent_workshop' | 'workshop_affiliated'
  sessionType: 'online' | 'in_person'
  onComplete: (data: { scheduledFor: Date }) => void
}

export default function TimeSelectionStep({
  mechanicId,
  mechanicType,
  sessionType,
  onComplete
}: TimeSelectionStepProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)

  // ========================================
  // LOAD AVAILABLE SLOTS (Respects mechanic type)
  // ========================================
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate)
    }
  }, [selectedDate])

  const loadAvailableSlots = async (date: Date) => {
    setLoading(true)
    try {
      const response = await fetch('/api/mechanics/availability/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mechanicId,
          date: date.toISOString(),
          sessionType // ← CRITICAL: Passed to AvailabilityService
        })
      })

      const data = await response.json()
      setAvailableSlots(data.slots)
    } catch (err) {
      console.error('Failed to load slots:', err)
    } finally {
      setLoading(false)
    }
  }

  // ========================================
  // BUSINESS LOGIC: Display mechanic type info
  // ========================================
  const getMechanicTypeInfo = () => {
    if (mechanicType === 'virtual_only') {
      return {
        icon: '💻',
        label: 'Virtual-Only Mechanic',
        description: 'Availability based on mechanic\'s personal schedule',
        color: 'blue'
      }
    }

    if (mechanicType === 'independent_workshop') {
      return {
        icon: '🏪',
        label: 'Independent Workshop',
        description: sessionType === 'online'
          ? 'Availability based on mechanic\'s schedule'
          : 'Availability based on workshop operating hours',
        color: 'green'
      }
    }

    if (mechanicType === 'workshop_affiliated') {
      return {
        icon: '🏢',
        label: 'Workshop-Affiliated Mechanic',
        description: 'Availability constrained by workshop operating hours',
        color: 'purple'
      }
    }

    return {
      icon: '🔧',
      label: 'Mechanic',
      description: 'Select a date to see available times',
      color: 'slate'
    }
  }

  const typeInfo = getMechanicTypeInfo()

  return (
    <div className="time-selection-step">
      {/* Mechanic Type Info Banner */}
      <div className={`p-4 rounded-lg border bg-${typeInfo.color}-500/10 border-${typeInfo.color}-500/30 mb-6`}>
        <div className="flex items-center gap-3">
          <div className="text-3xl">{typeInfo.icon}</div>
          <div>
            <h3 className="font-semibold text-white">{typeInfo.label}</h3>
            <p className="text-sm text-slate-400">{typeInfo.description}</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-6">Select Date & Time</h2>

      {/* Calendar */}
      <div className="mb-6">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) => {
            // Disable past dates
            return date < new Date()
          }}
          className="rounded-md border border-slate-700 bg-slate-800/50"
        />
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="time-slots">
          <h3 className="text-lg font-semibold text-white mb-3">
            Available Times for {selectedDate.toLocaleDateString()}
          </h3>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
              <p className="text-slate-400 mt-2">Loading available times...</p>
            </div>
          ) : (
            <>
              {availableSlots.filter(slot => slot.available).length === 0 ? (
                <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                  <p className="text-amber-300">
                    No available time slots for this date
                  </p>
                  {mechanicType === 'workshop_affiliated' && (
                    <p className="text-xs text-slate-500 mt-2">
                      This mechanic's availability is limited by workshop operating hours
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {availableSlots
                    .filter(slot => slot.available)
                    .map((slot, idx) => (
                      <button
                        key={idx}
                        onClick={() => onComplete({ scheduledFor: slot.startTime })}
                        className="p-3 bg-slate-800/50 hover:bg-blue-500/20 border border-slate-700 hover:border-blue-500/50 rounded-lg text-sm text-white transition"
                      >
                        {slot.startTime.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## 📊 BUSINESS LOGIC SUMMARY

### Decision Matrix: Can Mechanic Do Session Type?

| Mechanic Type | Online Session | In-Person Visit | Constraints |
|---------------|---------------|-----------------|-------------|
| **Virtual-Only** | ✅ YES | ❌ NO | Personal availability only |
| **Independent Workshop** | ✅ YES | ✅ YES | Online: Personal availability<br>In-person: Workshop hours (self-managed) |
| **Workshop-Affiliated** | ✅ YES | ✅ YES | Online: Workshop hours<br>In-person: Workshop hours |

### Availability Check Flow

```
Customer selects mechanic + time
        ↓
AvailabilityService.isAvailable(mechanicId, time, sessionType)
        ↓
    Get mechanic type
        ↓
┌───────┴────────┐
│ Virtual-Only?  │──YES──→ Check mechanic_availability table
│                │          Check time_off
│                │          Check existing bookings
│                │          ✅ Return available/not available
└───────┬────────┘
        │
       NO
        ↓
┌────────────────────┐
│ Independent        │──YES──→ Session type?
│ Workshop?          │         ├─ Online → Check mechanic_availability
└────────┬───────────┘         └─ In-person → Check workshop_availability
         │                                      Check workshop hours
        NO                                      ✅ Return available/not available
         ↓
┌────────────────────┐
│ Workshop-          │──YES──→ Check workshop_availability (BOTH online & in-person)
│ Affiliated?        │         Check workshop hours
└────────────────────┘         Check mechanic time_off
                               ✅ Return available/not available
```

---

## 🎯 KEY UI COMPONENTS THAT RESPECT BUSINESS LOGIC

### 1. **ServiceTypeSelector** (SchedulingPage Step 1)
- Shows two options: Online vs In-Person
- Explains which mechanic types can do which
- Sets `sessionType` for entire flow

### 2. **MechanicCard** (SchedulingPage Step 4)
- Shows mechanic type badge (Virtual/Independent/Affiliated)
- Filters out virtual-only mechanics if `sessionType === 'in_person'`
- Shows workshop address if in-person
- Disables selection if mechanic can't do session type

### 3. **TimeSelectionStep** (SchedulingPage Step 5)
- Calls `/api/mechanics/availability/slots` with `sessionType`
- AvailabilityService checks mechanic type and applies correct constraints
- Shows only slots that respect workshop hours (if applicable)

### 4. **ReviewStep** (SchedulingPage Step 7)
- Shows session type (Online/In-Person)
- Shows workshop address if in-person
- Shows mechanic type
- Clarifies payment (deposit for in-person, full for online)

---

## 🚀 API ENDPOINTS THAT RESPECT MECHANIC TYPES

### `/api/mechanics/availability/slots` (NEW)

```typescript
// src/app/api/mechanics/availability/slots/route.ts

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { mechanicId, date, sessionType } = body

  const availabilityService = new AvailabilityService()

  // ← This respects mechanic type internally
  const slots = await availabilityService.getAvailableSlots(
    mechanicId,
    new Date(date),
    sessionType as 'online' | 'in_person'
  )

  return NextResponse.json({ slots })
}
```

### `/api/scheduling/mechanics/available` (NEW)

```typescript
// src/app/api/scheduling/mechanics/available/route.ts

export async function GET(request: NextRequest) {
  const searchParams = request.searchParams
  const sessionType = searchParams.get('sessionType') as 'online' | 'in_person'

  // Build query based on session type
  let query = supabase
    .from('mechanics')
    .select(`
      user_id,
      full_name,
      mechanic_type,
      workshop_id,
      workshops (name, address_line1, city, state_province),
      specialties,
      rating,
      total_sessions
    `)

  // ========================================
  // BUSINESS LOGIC: Filter by mechanic type
  // ========================================
  if (sessionType === 'in_person') {
    // Only independent_workshop and workshop_affiliated
    query = query.in('mechanic_type', ['independent_workshop', 'workshop_affiliated'])
    // Must have workshop configured
    query = query.not('workshop_id', 'is', null)
  }

  // For online sessions, all types are allowed (no filter needed)

  const { data: mechanics } = await query

  return NextResponse.json({ mechanics })
}
```

---

## ✅ COMPLETE FLOW EXAMPLE

### Scenario 1: Virtual-Only Mechanic

**Customer:** Books online diagnostic session
```
1. ServiceTypeSelector → Selects "Online" ✅
2. MechanicSelector → Shows virtual-only mechanic (John) ✅
3. TimeSelectionStep → Loads slots from mechanic_availability table ✅
4. Shows available times: 9 AM, 10 AM, 2 PM, 3 PM ✅
5. Customer selects 2 PM ✅
6. SessionFactory creates session with scheduledFor=2PM ✅
7. Confirmation sent ✅
```

**Customer:** Tries to book in-person visit
```
1. ServiceTypeSelector → Selects "In-Person" ✅
2. MechanicSelector → John is HIDDEN (virtual-only can't do in-person) ✅
3. Only independent/affiliated mechanics shown ✅
```

---

### Scenario 2: Independent Workshop Mechanic

**Customer:** Books online session
```
1. ServiceTypeSelector → Selects "Online" ✅
2. MechanicSelector → Shows Mike (Independent Workshop) ✅
3. TimeSelectionStep → Loads slots from mechanic_availability ✅
4. Shows available times based on Mike's personal schedule ✅
5. Customer selects time ✅
6. Session created ✅
```

**Customer:** Books in-person visit
```
1. ServiceTypeSelector → Selects "In-Person" ✅
2. MechanicSelector → Shows Mike with workshop address ✅
   "Mike's Auto Shop, 123 Main St, Toronto, ON"
3. TimeSelectionStep → Loads slots from workshop_availability ✅
4. Shows workshop hours: 9 AM - 6 PM ✅
5. Customer selects time ✅
6. Session created with workshop address ✅
7. Payment: $15 deposit ✅
```

---

### Scenario 3: Workshop-Affiliated Mechanic

**Customer:** Books online session
```
1. ServiceTypeSelector → Selects "Online" ✅
2. MechanicSelector → Shows Sarah (Workshop-Affiliated) ✅
3. TimeSelectionStep → Loads slots from workshop_availability ✅
   (Sarah can only be online during workshop hours)
4. Shows times: 9 AM - 6 PM (workshop hours) ✅
5. Customer selects 10 AM ✅
6. Session created ✅
```

**Customer:** Books in-person visit
```
1. ServiceTypeSelector → Selects "In-Person" ✅
2. MechanicSelector → Shows Sarah with affiliated workshop ✅
   "AutoFix Workshop (Affiliated), 456 Queen St, Toronto, ON"
3. TimeSelectionStep → Loads slots from workshop_availability ✅
4. Shows workshop hours: 8 AM - 5 PM ✅
5. Customer selects 11 AM ✅
6. Session created with workshop address ✅
7. Payment: $15 deposit ✅
8. On appointment day: Customer goes to AutoFix Workshop ✅
```

---

## 🎨 COMPLETE UI FLOW MOCKUP

### SchedulingPage - Complete Flow

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Service Type                                     │
├─────────────────────────────────────────────────────────┤
│ Choose Service Type                                      │
│                                                           │
│ ┌──────────────────┐  ┌──────────────────┐            │
│ │ 💻 Online        │  │ 🔧 In-Person     │            │
│ │ Diagnostic       │  │ Workshop Visit   │            │
│ │                  │  │                  │            │
│ │ Available:       │  │ Available:       │            │
│ │ • Virtual-only   │  │ • Independent    │            │
│ │ • Independent    │  │ • Affiliated     │            │
│ │ • Affiliated     │  │                  │            │
│ │                  │  │ (Virtual-only    │            │
│ │ [Selected ✓]    │  │  excluded)       │            │
│ └──────────────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ STEP 4: Select Mechanic                                  │
├─────────────────────────────────────────────────────────┤
│ Choose a mechanic (Session Type: Online)                 │
│                                                           │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 💻 John Doe - Virtual Only                      │   │
│ │ ★ 4.9 • 234 sessions                            │   │
│ │ Specialties: Diagnostics, Engine, Electrical    │   │
│ │ [Select John]                                   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                           │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 🏪 Mike Smith - Independent Workshop            │   │
│ │ ★ 4.7 • 189 sessions                            │   │
│ │ Specialties: BMW, Mercedes, Diagnostics         │   │
│ │ [Select Mike]                                   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                           │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 🏢 Sarah Lee - Workshop Affiliated              │   │
│ │ ★ 4.8 • 156 sessions                            │   │
│ │ Workshop: AutoFix (456 Queen St, Toronto)       │   │
│ │ Specialties: Toyota, Honda, Brakes              │   │
│ │ [Select Sarah]                                  │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ STEP 4: Select Mechanic (In-Person - Virtual Hidden)    │
├─────────────────────────────────────────────────────────┤
│ Choose a mechanic (Session Type: In-Person)              │
│                                                           │
│ ❌ John Doe (Virtual-only) - HIDDEN                     │
│                                                           │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 🏪 Mike Smith - Independent Workshop            │   │
│ │ ★ 4.7 • 189 sessions                            │   │
│ │ 📍 Workshop: Mike's Auto Shop                   │   │
│ │    123 Main St, Toronto, ON M5V 1A1             │   │
│ │ Specialties: BMW, Mercedes, Diagnostics         │   │
│ │ [Select Mike]                                   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                           │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 🏢 Sarah Lee - Workshop Affiliated              │   │
│ │ ★ 4.8 • 156 sessions                            │   │
│ │ 📍 Workshop: AutoFix Workshop                   │   │
│ │    456 Queen St, Toronto, ON M2N 2B2            │   │
│ │ Specialties: Toyota, Honda, Brakes              │   │
│ │ [Select Sarah]                                  │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ STEP 5: Time Selection (Workshop-Affiliated)            │
├─────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐ │
│ │ 🏢 Workshop-Affiliated Mechanic                   │ │
│ │ Availability constrained by workshop hours        │ │
│ └───────────────────────────────────────────────────┘ │
│                                                           │
│ Select Date:                                             │
│ [Calendar: November 2025]                                │
│                                                           │
│ Available Times for Nov 12, 2025:                        │
│ (Workshop hours: 8:00 AM - 5:00 PM)                      │
│                                                           │
│ [ 8:00 AM] [ 8:30 AM] [ 9:00 AM] [ 9:30 AM]            │
│ [10:00 AM] [10:30 AM] [11:00 AM] [11:30 AM]            │
│ [12:00 PM] [12:30 PM] [ 1:00 PM] [ 1:30 PM]            │
│ [ 2:00 PM] [ 2:30 PM] [ 3:00 PM] [ 3:30 PM]            │
│ [ 4:00 PM] [ 4:30 PM]                                   │
│                                                           │
│ ❌ 5:00 PM+ (Workshop closed)                           │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ SUMMARY

### Business Logic Respected ✅

1. **Virtual-Only Mechanics:**
   - Can do: Online sessions ONLY
   - Availability: mechanic_availability table
   - UI: Hidden from in-person mechanic list

2. **Independent Workshop Mechanics:**
   - Can do: BOTH online + in-person
   - Online availability: mechanic_availability
   - In-person availability: workshop_availability (self-managed)
   - UI: Shows workshop address for in-person

3. **Workshop-Affiliated Mechanics:**
   - Can do: BOTH online + in-person
   - ALL availability: workshop_availability (constrained by workshop)
   - UI: Shows affiliated workshop address

### UI Components Built ✅

1. ServiceTypeSelector - Sets session type
2. MechanicCard - Filters by type, shows constraints
3. TimeSelectionStep - Respects mechanic type constraints
4. ReviewStep - Shows correct info per type

### Backend Logic ✅

1. AvailabilityService - Checks correct tables per type
2. API endpoints - Filter mechanics by session type
3. SessionFactory - Handles all types correctly
4. Database - Existing schema supports all types

**The system fully respects all 3 mechanic types! ✅**

---

## 🔔 IMPORTANT SCENARIO: Customer Wants to Book Online Mechanic for Later

### The Question

**"What if a mechanic is currently online, but the customer wants to book them for a future date/time instead of immediately?"**

### The Answer

**YES, the system supports this!** ✅

### Two Separate Paths

```
Customer wants mechanic's help
        │
        ├─────────────────────┬─────────────────────┐
        │                     │                     │
   Need help NOW       Want to schedule      Want specific mechanic
   (Immediate)         for LATER             for LATER
        │                     │                     │
        ↓                     ↓                     ↓
  BookingWizard         SchedulingPage        SchedulingPage
  Shows ONLINE          Shows ALL             Shows ALL
  mechanics only        mechanics             mechanics
        │               (online + offline)    (can select specific)
        ↓                     ↓                     ↓
  Immediate session     Scheduled session     Scheduled session
  Status: pending       Status: scheduled     Status: scheduled
```

### Detailed Explanation

#### Scenario 1: Customer in BookingWizard (Immediate Sessions)

```
Customer Dashboard → [Book Now] → BookingWizard
        ↓
Step 3: Mechanic Selection
        ↓
Shows mechanics who are ONLINE NOW
        ↓
    ┌─────────────────────────┐
    │ John Doe (Online) ✅    │ ← Can book NOW
    │ Mike Smith (Online) ✅  │ ← Can book NOW
    │ Sarah Lee (Offline) ❌  │ ← HIDDEN (offline)
    └─────────────────────────┘
        ↓
Customer selects John
        ↓
Session created IMMEDIATELY
Status: pending → active
```

**Key Point:** BookingWizard is for **immediate sessions ONLY**. It shows only online mechanics because the session will start in minutes.

#### Scenario 2: Customer Wants to Schedule for Later (Even if Mechanic Online)

```
Customer Dashboard → [Schedule Later] → SchedulingPage
        ↓
Step 1: Service Type (Online/In-Person)
Customer selects: Online ✅
        ↓
Step 4: Mechanic Selection
        ↓
Shows ALL mechanics (online + offline)
        ↓
    ┌──────────────────────────────┐
    │ John Doe (🟢 Online)         │ ← Can book for later even though online now
    │ Mike Smith (🟢 Online)       │ ← Can book for later even though online now
    │ Sarah Lee (🔴 Offline)       │ ← Can book for later (offline is fine)
    └──────────────────────────────┘
        ↓
Customer selects John (even though he's online now)
        ↓
Step 5: Time Selection
Customer picks: Nov 15, 2025 at 2:00 PM
        ↓
Session created for FUTURE
Status: scheduled
Scheduled_for: 2025-11-15 14:00:00
        ↓
On Nov 15 at 1:45 PM:
Customer receives email: "Sign waiver to join"
        ↓
At 2:00 PM:
Session status changes: scheduled → pending → active
Matching runs (if no specific mechanic, but John is already assigned)
```

**Key Point:** SchedulingPage shows **ALL mechanics** regardless of online status, because:
1. Customer is booking for future (mechanic might be offline now but online later)
2. Allows selecting specific mechanic regardless of current status
3. Availability check happens for the FUTURE time, not current time

### Code Implementation

#### MechanicStep.tsx (BookingWizard - Immediate)

```typescript
// src/components/customer/booking-steps/MechanicStep.tsx

const fetchMechanics = async () => {
  const response = await fetch('/api/mechanics/available?' + new URLSearchParams({
    // ← ONLY online mechanics
    onlineOnly: 'true',
    country: location.country,
    city: location.city,
    mechanicType: selectedTab
  }))

  const data = await response.json()
  setMechanics(data.mechanics)
}
```

**Why `onlineOnly: 'true'`?**
→ Because BookingWizard creates immediate sessions. The mechanic must be available RIGHT NOW.

#### MechanicSelector.tsx (SchedulingPage - Future)

```typescript
// src/components/customer/scheduling/MechanicSelector.tsx

const fetchMechanics = async () => {
  const response = await fetch('/api/scheduling/mechanics/available?' + new URLSearchParams({
    // ← ALL mechanics (online + offline)
    sessionType: sessionType, // 'online' or 'in_person'
    country: location.country,
    city: location.city
    // NO onlineOnly filter
  }))

  const data = await response.json()
  setMechanics(data.mechanics)
}
```

**Why NO `onlineOnly` filter?**
→ Because SchedulingPage creates future sessions. The mechanic's CURRENT online status doesn't matter. What matters is whether they'll be available at the SCHEDULED time.

### API Endpoint Comparison

#### `/api/mechanics/available` (BookingWizard)

```typescript
// src/app/api/mechanics/available/route.ts

export async function GET(request: NextRequest) {
  const searchParams = request.searchParams
  const onlineOnly = searchParams.get('onlineOnly') === 'true'

  let query = supabase
    .from('mechanics')
    .select('*')

  // ← BookingWizard passes onlineOnly=true
  if (onlineOnly) {
    query = query.eq('currently_on_shift', true) // ← FILTER: Only online mechanics
  }

  const { data: mechanics } = await query

  return NextResponse.json({ mechanics })
}
```

#### `/api/scheduling/mechanics/available` (SchedulingPage)

```typescript
// src/app/api/scheduling/mechanics/available/route.ts

export async function GET(request: NextRequest) {
  const searchParams = request.searchParams
  const sessionType = searchParams.get('sessionType')

  let query = supabase
    .from('mechanics')
    .select('*')

  // NO currently_on_shift filter ← Shows all mechanics
  // Only filter by mechanic_type if in-person
  if (sessionType === 'in_person') {
    query = query.in('mechanic_type', ['independent_workshop', 'workshop_affiliated'])
  }

  const { data: mechanics } = await query

  return NextResponse.json({ mechanics })
}
```

### UI Indication: Online vs Offline (in SchedulingPage)

Even though SchedulingPage shows all mechanics, it should indicate their CURRENT status:

```tsx
// src/components/customer/scheduling/MechanicCard.tsx

export default function MechanicCard({ mechanic }) {
  return (
    <div className="mechanic-card">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3>{mechanic.full_name}</h3>

          {/* Current Online Status Indicator */}
          <div className="flex items-center gap-2 mt-1">
            {mechanic.currently_on_shift ? (
              <>
                <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-xs text-green-400">Online now</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 bg-slate-500 rounded-full"></span>
                <span className="text-xs text-slate-500">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Helpful message */}
      {mechanic.currently_on_shift && (
        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
          💡 This mechanic is online now. You can also book them immediately via "Book Now" if you need help right away.
        </div>
      )}

      {/* Select button */}
      <button className="w-full mt-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 py-2 rounded">
        Select {mechanic.full_name}
      </button>
    </div>
  )
}
```

### Complete Example: Online Mechanic, Customer Wants Later

**Initial State:**
- John Doe is **online now** (currently_on_shift = true)
- Customer logs in at 10:00 AM

**Customer Flow:**

```
10:00 AM - Customer Dashboard
        ↓
[Book Now] button shows "3 mechanics online" ← John is one of them
        ↓
Customer thinks: "I don't need help NOW, but I want to schedule with John for tomorrow"
        ↓
Customer clicks [Schedule Later] instead
        ↓
SchedulingPage loads
        ↓
Step 1: Service Type → Selects "Online Diagnostic"
Step 2: Vehicle → Selects 2020 Honda Civic
Step 3: Plan → Selects Standard ($29)
Step 4: Mechanic Selection
        ↓
Mechanic list shows:
    ┌──────────────────────────────────┐
    │ John Doe                         │
    │ 🟢 Online now                    │ ← Current status shown
    │ ★ 4.9 • 234 sessions             │
    │ 💡 This mechanic is online now.  │
    │    You can also book immediately │
    │    via "Book Now"                │
    │ [Select John]                    │
    └──────────────────────────────────┘
        ↓
Customer clicks "Select John"
        ↓
Step 5: Time Selection
Customer selects: Tomorrow (Nov 11) at 3:00 PM
        ↓
AvailabilityService checks:
- Is John available tomorrow at 3:00 PM?
- Checks mechanic_availability table (John's personal schedule)
- Checks existing bookings (no conflicts)
- ✅ Available
        ↓
Step 6: Concern → "Engine diagnostic needed"
Step 7: Review & Payment → Customer pays $29
        ↓
Session created:
{
  customer_id: user123,
  mechanic_user_id: john456,
  type: 'chat',
  status: 'scheduled',
  scheduled_for: '2025-11-11T15:00:00Z', ← Tomorrow at 3 PM
  plan: 'standard',
  created_at: '2025-11-10T10:15:00Z' ← Today at 10:15 AM
}
        ↓
Confirmation email sent to customer
Calendar invite attached
        ↓
Tomorrow at 2:45 PM:
Email sent: "Your session with John starts in 15 minutes - Sign waiver"
        ↓
Tomorrow at 3:00 PM:
Session starts (if John is online)
Status: scheduled → pending → active
```

**Key Points:**
1. ✅ John was online at booking time, but customer scheduled for later
2. ✅ System allowed this because SchedulingPage doesn't filter by online status
3. ✅ Availability checked for FUTURE time (Nov 11 at 3 PM), not current time
4. ✅ John receives notification 30 min before (system checks if he's online then)

### Edge Case: What if Mechanic is Offline at Scheduled Time?

**Scenario:**
- Customer schedules with John for Nov 11 at 3:00 PM
- Nov 11 at 2:45 PM: System checks if John is online
- John is OFFLINE 😱

**System Behavior:**

```
2:45 PM - Pre-session check
        ↓
System checks: mechanic.currently_on_shift
John: currently_on_shift = false (offline)
        ↓
System sends notification to John:
"You have a scheduled session in 15 minutes - Please come online"
        ↓
2:55 PM - Final check
John still offline
        ↓
System sends email to customer:
"Your mechanic is currently unavailable. Options:
1. Wait a few more minutes
2. Reschedule
3. Choose another available mechanic"
        ↓
Customer chooses another mechanic
        ↓
Matching algorithm runs
Finds online mechanics
Creates new assignment
        ↓
Session proceeds with different mechanic
Customer refunded if dissatisfied
```

**Automated Handling:**

```sql
-- Database function to check scheduled sessions
CREATE OR REPLACE FUNCTION check_scheduled_sessions()
RETURNS void AS $$
DECLARE
  upcoming_session RECORD;
BEGIN
  -- Find sessions starting in 15 minutes
  FOR upcoming_session IN
    SELECT s.id, s.mechanic_user_id, s.customer_user_id, s.scheduled_for
    FROM sessions s
    WHERE s.status = 'scheduled'
    AND s.scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '15 minutes'
  LOOP
    -- Check if assigned mechanic is online
    DECLARE
      mechanic_online BOOLEAN;
    BEGIN
      SELECT currently_on_shift INTO mechanic_online
      FROM mechanics
      WHERE user_id = upcoming_session.mechanic_user_id;

      IF NOT mechanic_online THEN
        -- Mechanic is offline, send alert
        INSERT INTO notifications (user_id, type, message)
        VALUES (
          upcoming_session.mechanic_user_id,
          'scheduled_session_alert',
          'You have a session starting in 15 minutes - Please come online'
        );

        -- Also alert customer
        INSERT INTO notifications (user_id, type, message)
        VALUES (
          upcoming_session.customer_user_id,
          'mechanic_offline_alert',
          'Your mechanic may not be available - We are working to ensure coverage'
        );
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run every 5 minutes
SELECT cron.schedule('check-scheduled-sessions', '*/5 * * * *', 'SELECT check_scheduled_sessions()');
```

### Summary: Customer Scheduling Online Mechanic for Later

| Question | Answer |
|----------|--------|
| **Can customer schedule an online mechanic for later?** | ✅ YES |
| **Does SchedulingPage show online mechanics?** | ✅ YES (shows ALL mechanics) |
| **Is current online status checked?** | ❌ NO (only FUTURE availability matters) |
| **What if mechanic offline at scheduled time?** | System alerts mechanic, offers customer alternatives |
| **Can customer book immediately if mechanic online now?** | ✅ YES (via BookingWizard "Book Now") |

**The system fully supports scheduling online mechanics for future dates, regardless of their current online status!** ✅

---

## 🔍 SEARCH FEATURE: Find Mechanics in SchedulingPage

### The Requirement

**"Also the search option to search the mechanic even offline or online in scheduling"**

### The Solution

Add a **powerful search bar** in SchedulingPage Step 4 (Mechanic Selection) that allows customers to search by:
- Mechanic name
- Workshop name
- Specialties
- Location (city, postal code)
- Certifications
- **Regardless of online/offline status**

### UI Component: SearchableMechanicList

```tsx
// src/components/customer/scheduling/SearchableMechanicList.tsx

'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, X } from 'lucide-react'
import MechanicCard from './MechanicCard'

interface SearchableMechanicListProps {
  mechanics: Mechanic[]
  sessionType: 'online' | 'in_person'
  onSelectMechanic: (mechanicId: string) => void
}

export default function SearchableMechanicList({
  mechanics,
  sessionType,
  onSelectMechanic
}: SearchableMechanicListProps) {

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    onlineOnly: false,
    offlineOnly: false,
    favoritesOnly: false,
    brandSpecialist: false,
    redSealOnly: false
  })

  // ========================================
  // SEARCH & FILTER LOGIC
  // ========================================
  const filteredMechanics = useMemo(() => {
    let result = mechanics

    // 1. Text Search (name, workshop, specialties, location)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(mechanic => {
        const searchableText = [
          mechanic.full_name,
          mechanic.workshop?.name || '',
          mechanic.specialties?.join(' ') || '',
          mechanic.city || '',
          mechanic.state_province || '',
          mechanic.postal_code || '',
          mechanic.certifications?.map(c => c.name).join(' ') || ''
        ].join(' ').toLowerCase()

        return searchableText.includes(query)
      })
    }

    // 2. Online/Offline Filter
    if (filters.onlineOnly) {
      result = result.filter(m => m.currently_on_shift === true)
    }
    if (filters.offlineOnly) {
      result = result.filter(m => m.currently_on_shift === false)
    }

    // 3. Favorites Filter
    if (filters.favoritesOnly) {
      result = result.filter(m => m.is_favorite === true)
    }

    // 4. Brand Specialist Filter
    if (filters.brandSpecialist) {
      result = result.filter(m => m.brand_specialties && m.brand_specialties.length > 0)
    }

    // 5. Red Seal Certification Filter
    if (filters.redSealOnly) {
      result = result.filter(m =>
        m.certifications?.some(c => c.type === 'red_seal')
      )
    }

    return result
  }, [mechanics, searchQuery, filters])

  // ========================================
  // STATS
  // ========================================
  const stats = {
    total: mechanics.length,
    online: mechanics.filter(m => m.currently_on_shift).length,
    offline: mechanics.filter(m => !m.currently_on_shift).length,
    favorites: mechanics.filter(m => m.is_favorite).length,
    brandSpecialists: mechanics.filter(m => m.brand_specialties?.length > 0).length,
    redSeal: mechanics.filter(m => m.certifications?.some(c => c.type === 'red_seal')).length,
    filtered: filteredMechanics.length
  }

  return (
    <div className="searchable-mechanic-list">
      {/* Search Bar */}
      <div className="search-section mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, workshop, specialty, location..."
            className="w-full pl-10 pr-10 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search Examples */}
        {!searchQuery && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-slate-500">Try:</span>
            {['Toronto', 'Honda', 'Red Seal', 'Diagnostics', 'BMW'].map(example => (
              <button
                key={example}
                onClick={() => setSearchQuery(example)}
                className="text-xs bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded transition"
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Chips */}
      <div className="filter-section mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-300">Filters:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Online/Offline Toggle */}
          <button
            onClick={() => setFilters(prev => ({
              ...prev,
              onlineOnly: !prev.onlineOnly,
              offlineOnly: false
            }))}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition
              ${filters.onlineOnly
                ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
              }
            `}
          >
            🟢 Online Only ({stats.online})
          </button>

          <button
            onClick={() => setFilters(prev => ({
              ...prev,
              offlineOnly: !prev.offlineOnly,
              onlineOnly: false
            }))}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition
              ${filters.offlineOnly
                ? 'bg-slate-500/20 text-slate-300 border border-slate-500/50'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
              }
            `}
          >
            🔴 Offline Only ({stats.offline})
          </button>

          {/* Favorites */}
          {stats.favorites > 0 && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition
                ${filters.favoritesOnly
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
                }
              `}
            >
              ⭐ My Favorites ({stats.favorites})
            </button>
          )}

          {/* Brand Specialists */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, brandSpecialist: !prev.brandSpecialist }))}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition
              ${filters.brandSpecialist
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
              }
            `}
          >
            💎 Brand Specialists ({stats.brandSpecialists})
          </button>

          {/* Red Seal */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, redSealOnly: !prev.redSealOnly }))}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition
              ${filters.redSealOnly
                ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
              }
            `}
          >
            🏆 Red Seal ({stats.redSeal})
          </button>

          {/* Clear Filters */}
          {Object.values(filters).some(v => v) && (
            <button
              onClick={() => setFilters({
                onlineOnly: false,
                offlineOnly: false,
                favoritesOnly: false,
                brandSpecialist: false,
                redSealOnly: false
              })}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white transition"
            >
              <X className="h-4 w-4 inline mr-1" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="results-header mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Showing <span className="text-white font-semibold">{stats.filtered}</span> of {stats.total} mechanics
          {searchQuery && (
            <span className="ml-2">
              for "<span className="text-blue-400">{searchQuery}</span>"
            </span>
          )}
        </div>

        {/* Sort Options */}
        <select
          className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
          onChange={(e) => {
            // Implement sorting
            const sortBy = e.target.value
            // TODO: Sort filteredMechanics by selected option
          }}
        >
          <option value="rating">Highest Rated</option>
          <option value="distance">Nearest</option>
          <option value="sessions">Most Sessions</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {/* Mechanics List */}
      {filteredMechanics.length === 0 ? (
        <div className="empty-state py-12 text-center">
          <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No mechanics found</h3>
          <p className="text-sm text-slate-400 mb-4">
            {searchQuery
              ? `No results for "${searchQuery}". Try adjusting your search or filters.`
              : 'No mechanics match your current filters.'
            }
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setFilters({
                onlineOnly: false,
                offlineOnly: false,
                favoritesOnly: false,
                brandSpecialist: false,
                redSealOnly: false
              })
            }}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 rounded-lg transition"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        <div className="mechanics-grid space-y-4">
          {filteredMechanics.map(mechanic => (
            <MechanicCard
              key={mechanic.user_id}
              mechanic={mechanic}
              sessionType={sessionType}
              onSelect={onSelectMechanic}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

### Enhanced MechanicCard (with search highlighting)

```tsx
// src/components/customer/scheduling/MechanicCard.tsx

export default function MechanicCard({
  mechanic,
  sessionType,
  onSelect,
  searchQuery = '' // NEW: For highlighting
}: MechanicCardProps) {

  // Helper to highlight search terms
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-400/30 text-yellow-200">{part}</mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className="mechanic-card bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white text-lg">
            {highlightText(mechanic.full_name)}
          </h3>

          {/* Online Status */}
          <div className="flex items-center gap-2 mt-1">
            {mechanic.currently_on_shift ? (
              <>
                <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-xs text-green-400">Online now</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 bg-slate-500 rounded-full"></span>
                <span className="text-xs text-slate-500">Offline</span>
              </>
            )}

            {/* Mechanic Type Badge */}
            {mechanic.mechanic_type === 'virtual_only' && (
              <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                💻 Virtual
              </span>
            )}
            {mechanic.mechanic_type === 'independent_workshop' && (
              <span className="ml-2 text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">
                🏪 Independent
              </span>
            )}
            {mechanic.mechanic_type === 'workshop_affiliated' && (
              <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                🏢 Affiliated
              </span>
            )}
          </div>
        </div>

        {/* Rating & Stats */}
        <div className="text-right">
          <div className="text-yellow-400 text-sm flex items-center gap-1">
            ★ {mechanic.rating.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500">{mechanic.total_sessions} sessions</div>
        </div>
      </div>

      {/* Workshop Info (for in-person) */}
      {sessionType === 'in_person' && mechanic.workshop && (
        <div className="mb-3 p-2 bg-slate-700/30 rounded text-sm">
          <div className="font-semibold text-slate-300">
            📍 {highlightText(mechanic.workshop.name)}
          </div>
          <div className="text-slate-400 text-xs mt-1">
            {highlightText(`${mechanic.workshop.address_line1}, ${mechanic.workshop.city}, ${mechanic.workshop.state_province}`)}
          </div>
        </div>
      )}

      {/* Specialties */}
      {mechanic.specialties && mechanic.specialties.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-slate-500 mb-1">Specialties:</div>
          <div className="flex flex-wrap gap-1">
            {mechanic.specialties.slice(0, 5).map((specialty, idx) => (
              <span
                key={idx}
                className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded"
              >
                {highlightText(specialty)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {mechanic.certifications && mechanic.certifications.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {mechanic.certifications.map((cert, idx) => (
            <span
              key={idx}
              className={`
                text-xs px-2 py-0.5 rounded
                ${cert.type === 'red_seal'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                  : 'bg-blue-500/20 text-blue-300'
                }
              `}
            >
              {cert.type === 'red_seal' ? '🏆 Red Seal' : cert.name}
            </span>
          ))}
        </div>
      )}

      {/* Location (city, province) */}
      <div className="text-xs text-slate-500 mb-3">
        📍 {highlightText(`${mechanic.city}, ${mechanic.state_province}`)}
        {mechanic.postal_code && ` • ${highlightText(mechanic.postal_code)}`}
      </div>

      {/* Select Button */}
      <button
        onClick={() => onSelect(mechanic.user_id)}
        className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 py-2 rounded font-medium transition"
      >
        Select {mechanic.full_name}
      </button>
    </div>
  )
}
```

### SchedulingPage Integration (Step 4)

```tsx
// src/app/customer/schedule/page.tsx

// ... in Step 4: Mechanic Selection

<SearchableMechanicList
  mechanics={allMechanics} // ← All mechanics (online + offline)
  sessionType={selectedServiceType}
  onSelectMechanic={(mechanicId) => {
    setSelectedMechanic(mechanicId)
    setCurrentStep(5) // Go to time selection
  }}
/>
```

### API Enhancement: Search Endpoint

```typescript
// src/app/api/scheduling/mechanics/search/route.ts (NEW)

export async function GET(request: NextRequest) {
  const searchParams = request.searchParams
  const query = searchParams.get('q') // Search query
  const sessionType = searchParams.get('sessionType')
  const onlineOnly = searchParams.get('onlineOnly') === 'true'

  let dbQuery = supabase
    .from('mechanics')
    .select(`
      user_id,
      full_name,
      mechanic_type,
      currently_on_shift,
      workshop_id,
      workshops (name, address_line1, city, state_province),
      specialties,
      certifications,
      city,
      state_province,
      postal_code,
      rating,
      total_sessions,
      brand_specialties
    `)

  // Filter by mechanic type (if in-person)
  if (sessionType === 'in_person') {
    dbQuery = dbQuery.in('mechanic_type', ['independent_workshop', 'workshop_affiliated'])
  }

  // Filter by online status (if requested)
  if (onlineOnly) {
    dbQuery = dbQuery.eq('currently_on_shift', true)
  }

  // Text search (PostgreSQL full-text search)
  if (query && query.trim()) {
    dbQuery = dbQuery.or(`
      full_name.ilike.%${query}%,
      city.ilike.%${query}%,
      state_province.ilike.%${query}%,
      postal_code.ilike.%${query}%,
      specialties.cs.{${query}}
    `)
  }

  const { data: mechanics } = await dbQuery

  return NextResponse.json({ mechanics })
}
```

### Complete Search UI Flow

```
┌─────────────────────────────────────────────────────────┐
│ SchedulingPage - Step 4: Select Mechanic                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔍 Search by name, workshop, specialty, location...│ │
│ │ [                                               ] │ │
│ │ Try: Toronto  Honda  Red Seal  Diagnostics  BMW  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ 🔧 Filters:                                              │
│ [🟢 Online Only (5)] [🔴 Offline Only (12)]             │
│ [⭐ My Favorites (3)] [💎 Brand Specialists (8)]        │
│ [🏆 Red Seal (6)] [✕ Clear Filters]                    │
│                                                           │
│ Showing 12 of 25 mechanics                               │
│                                 [Sort: Highest Rated ▼]  │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ John Doe ⭐                                         │ │
│ │ 🟢 Online now • 💻 Virtual                         │ │
│ │ ★ 4.9 • 234 sessions                                │ │
│ │ Specialties: Honda, Diagnostics, Electrical         │ │
│ │ 🏆 Red Seal Certified                               │ │
│ │ 📍 Toronto, ON • M5V 1A1                           │ │
│ │ [Select John]                                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Mike's Auto Shop                                    │ │
│ │ 🔴 Offline • 🏪 Independent Workshop               │ │
│ │ ★ 4.7 • 189 sessions                                │ │
│ │ 📍 Mike's Auto Shop                                │ │
│ │    123 Main St, Toronto, ON M5V 1A1                 │ │
│ │ Specialties: BMW, Mercedes, Diagnostics             │ │
│ │ 📍 Toronto, ON • M5V 1A1                           │ │
│ │ [Select Mike]                                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ ... (more mechanics)                                      │
│                                                           │
│ [Load More]                                              │
└─────────────────────────────────────────────────────────┘
```

### Summary: Search Capabilities ✅

| Feature | BookingWizard | SchedulingPage |
|---------|--------------|----------------|
| **Search bar** | ❌ No (shows online only) | ✅ YES (full search) |
| **Filter by online/offline** | N/A (only online shown) | ✅ YES |
| **Search by name** | ❌ No | ✅ YES |
| **Search by location** | ❌ No | ✅ YES |
| **Search by specialty** | ❌ No | ✅ YES |
| **Search by workshop** | ❌ No | ✅ YES |
| **Filter favorites** | ✅ Tab | ✅ Filter chip |
| **Filter brand specialists** | ✅ Tab | ✅ Filter chip |
| **Filter Red Seal** | ❌ No | ✅ YES |
| **Shows offline mechanics** | ❌ NO | ✅ YES |

**The SchedulingPage has complete search functionality to find ANY mechanic (online or offline) by multiple criteria!** ✅
