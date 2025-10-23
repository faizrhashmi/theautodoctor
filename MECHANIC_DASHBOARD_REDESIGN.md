# Mechanic Dashboard Redesign Plan

## Current Issues
- Confusing mix of "Accepted Requests" and "Incoming Requests"
- No clear distinction between active sessions and upcoming sessions
- Session history shows start/undo buttons for completed sessions
- Layout is cluttered and hard to navigate

## New Structure (Top to Bottom)

### 1. **ACTIVE SESSIONS** (Top Priority - Always First When Present)
**Shows**: Accepted sessions that haven't started yet (status='accepted')
**Visual**: Green gradient theme like customer dashboard ActiveSessionsManager
**Features**:
- Large prominent section with pulsing green icon
- "Join Session" button (navigates to /chat/[id] or /video/[id])
- "View Details" button
- "Cancel/Unlock" button (returns to New Requests)
- Real-time updates when session starts/ends
- Automatically moves to top when mechanic accepts any request

**Logic**:
```typescript
const activeSessions = acceptedRequests.filter(r => r.sessionId && !hasStarted(r))
// Show prominently if activeSessions.length > 0
```

### 2. **NEW REQUESTS** (Always Visible at Top)
**Shows**: Pending requests with mechanic_id = null and status='pending'
**Visual**: Orange/amber theme
**Features**:
- List of incoming requests
- "View Details" button → Opens EnhancedRequestDetailModal
- "Accept" button → Moves to Active Sessions
- Badge showing count

**Logic**:
```typescript
const newRequests = incomingRequests.filter(r => r.status === 'pending' && !r.mechanicId)
```

### 3. **UPCOMING SESSIONS** (Scheduled Future Sessions Only)
**Shows**: Sessions with scheduled_start in the future (status='scheduled')
**Visual**: Blue theme
**Features**:
- Shows date/time of scheduled session
- Customer name
- Session type
- "View Details" button
- NO "Start Session" button (can only join at scheduled time)

**Logic**:
```typescript
const upcomingSessions = sessions.filter(s =>
  s.status === 'scheduled' &&
  s.scheduledStart &&
  new Date(s.scheduledStart) > new Date()
)
```

### 4. **SESSION HISTORY** (Past Sessions - View Only)
**Shows**: Completed and cancelled sessions
**Visual**: Neutral gray theme
**Features**:
- "View" button → Shows session details + mechanic notes
- NO "Start Session" button
- NO "Undo" button
- NO "Accept" button
- Shows duration, earnings, date
- Includes mechanic's notes from the session

**Logic**:
```typescript
const sessionHistory = sessions.filter(s =>
  s.status === 'completed' || s.status === 'cancelled'
)
```

## Component Structure Changes

### File: `src/app/mechanic/dashboard/MechanicDashboardClient.tsx`

#### State to Add/Modify:
```typescript
const [activeSessions, setActiveSessions] = useState<any[]>([])
const [newRequests, setNewRequests] = useState<any[]>([])
const [upcomingSessions, setUpcomingSessions] = useState<any[]>([])
const [sessionHistory, setSessionHistory] = useState<any[]>([])
```

#### Functions to Modify:

**fetchRequests()** - Split into fetchNewRequests() and fetchActiveSessions()
```typescript
// Only fetch truly pending requests
const fetchNewRequests = async () => {
  const response = await fetch('/api/mechanics/requests?status=pending')
  setNewRequests(mapped)
}

// Fetch accepted but not started
const fetchActiveSessions = async () => {
  const response = await fetch(`/api/mechanics/requests?status=accepted&mechanicId=${mechanicId}`)
  setActiveSessions(mapped)
}
```

**acceptRequest()** - After accept, refresh BOTH lists
```typescript
const acceptRequest = async (requestId: string) => {
  await fetch(`/api/mechanics/requests/${requestId}/accept`, { method: 'POST' })

  // Refresh both lists
  await fetchNewRequests()
  await fetchActiveSessions() // New request shows in active
}
```

**cancelRequest()** - Returns to new requests
```typescript
const cancelRequest = async (requestId: string) => {
  await fetch(`/api/mechanics/requests/${requestId}/cancel`, { method: 'POST' })

  // Refresh both lists
  await fetchNewRequests() // Request goes back here
  await fetchActiveSessions()
}
```

#### UI Layout Order (Lines ~650-1200):

```jsx
return (
  <div>
    {/* Header with logout */}

    {/* Debug Panel (optional) */}

    {/* Stripe Banner (if needed) */}

    {/* Stats Grid */}

    {/* 1. ACTIVE SESSIONS - Only show if activeSessions.length > 0 */}
    {activeSessions.length > 0 && (
      <section className="mb-8 rounded-3xl border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5">
        <h2>Active Sessions</h2>
        {/* Similar to customer ActiveSessionsManager */}
        {/* Pulsing green icon */}
        {/* Join Session button */}
        {/* Cancel button */}
      </section>
    )}

    {/* 2. NEW REQUESTS - Always visible */}
    <section className="mb-8 rounded-3xl border border-orange-500/30">
      <h2>New Requests</h2>
      <p>Incoming session requests</p>
      {/* List of requests */}
      {/* View Details + Accept buttons */}
    </section>

    {/* 3. UPCOMING SESSIONS */}
    {upcomingSessions.length > 0 && (
      <section className="mb-8 rounded-3xl border border-blue-500/30">
        <h2>Upcoming Scheduled Sessions</h2>
        {/* List with date/time */}
        {/* View Details button only */}
      </section>
    )}

    {/* 4. SESSION HISTORY */}
    <section className="mb-8 rounded-3xl border border-slate-700/50">
      <h2>Session History</h2>
      <p>Past completed and cancelled sessions</p>
      {/* List with view button */}
      {/* NO action buttons */}
      {/* Show mechanic notes */}
    </section>

    {/* Modals */}
  </div>
)
```

## Real-Time Updates

### On 'request_accepted' broadcast:
- Remove from newRequests
- Add to activeSessions
- activeSessions section appears at top

### On 'request_cancelled' broadcast:
- Remove from activeSessions
- Add to newRequests
- If activeSessions becomes empty, section disappears

### On session status UPDATE to 'live':
- Remove from activeSessions
- Don't show anywhere until completed

### On session status UPDATE to 'completed' or 'cancelled':
- Remove from activeSessions
- Add to sessionHistory

## Benefits

1. **Clear Visual Hierarchy**: Active sessions always at top when present
2. **No Confusion**: Each section has a single purpose
3. **Proper Flow**: Request → Accept → Active → Join → History
4. **Like Customer Dashboard**: Familiar pattern for active sessions
5. **View-Only History**: Can't accidentally start completed sessions
6. **Better UX**: Mechanics know exactly where to look

## Implementation Steps

1. ✅ Revert chat interface
2. Modify state management (add 4 separate states)
3. Split fetchRequests into specific fetch functions
4. Reorganize UI sections in correct order
5. Update real-time listeners
6. Remove Start/Undo buttons from history
7. Add mechanic notes display to history view
8. Test accept/cancel flow
9. Test real-time updates
10. Commit changes

## Files to Modify

- `src/app/mechanic/dashboard/MechanicDashboardClient.tsx` (main changes)
- Possibly create separate components:
  - `src/components/mechanic/ActiveSessionsSection.tsx`
  - `src/components/mechanic/NewRequestsSection.tsx`
  - `src/components/mechanic/UpcomingSessionsSection.tsx`
  - `src/components/mechanic/SessionHistorySection.tsx`
