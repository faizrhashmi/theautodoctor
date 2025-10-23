# Admin Session Management - Architecture Diagram

## Component Hierarchy

```
page.tsx (Server Component)
├── Fetch initial sessions data
├── Fetch statistics
└── Pass to AdminSessionsClient
    │
    ├── SessionStats
    │   └── Display 4 stat cards (Live, Waiting, Completed, Revenue)
    │
    ├── Filters & Table Container
    │   ├── SessionFilters
    │   │   ├── Status dropdown
    │   │   ├── Type dropdown
    │   │   ├── Search input
    │   │   ├── Date range picker
    │   │   ├── Export menu (CSV/JSON)
    │   │   └── Bulk action buttons
    │   │
    │   └── SessionsTable
    │       ├── Table header with sortable columns
    │       ├── Select all checkbox
    │       └── Table rows
    │           ├── Individual checkboxes
    │           ├── Session data cells
    │           └── View action button
    │
    ├── Pagination Controls
    │   ├── Items per page selector
    │   ├── Page info display
    │   └── Previous/Next buttons
    │
    └── SessionDetailModal (conditional)
        ├── Header (Session ID, Close button)
        ├── Tab Navigation (5 tabs)
        ├── Tab Content
        │   ├── Details Tab
        │   │   ├── Customer info section
        │   │   ├── Mechanic info section
        │   │   ├── Session info section
        │   │   ├── Vehicle info section
        │   │   ├── Notes section
        │   │   └── Metadata viewer
        │   │
        │   ├── Timeline Tab
        │   │   ├── Created milestone
        │   │   ├── Mechanic Assigned milestone
        │   │   ├── Started milestone
        │   │   └── Ended milestone
        │   │
        │   ├── Chat Tab
        │   │   └── List of chat messages
        │   │
        │   ├── Files Tab
        │   │   └── List of attachments with download links
        │   │
        │   └── Payment Tab
        │       └── Stripe payment information
        │
        └── Action Footer
            ├── Force Cancel button
            ├── Force End button
            ├── Reassign Mechanic button
            └── Close button
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Client                            │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         AdminSessionsClient (State Manager)            │    │
│  │                                                          │    │
│  │  State:                                                  │    │
│  │  - sessions[]                                            │    │
│  │  - stats {}                                              │    │
│  │  - selectedSession                                       │    │
│  │  - selectedSessions Set()                                │    │
│  │  - filters {}                                            │    │
│  │  - sortBy {}                                             │    │
│  │  - currentPage, itemsPerPage                             │    │
│  │                                                          │    │
│  │  Real-time Subscriptions:                                │    │
│  │  - Supabase channel 'admin-sessions'                     │    │
│  │  - Listen to INSERT/UPDATE/DELETE on 'sessions' table    │    │
│  │                                                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                          │                                       │
│                          ├── renders ──→ UI Components          │
│                          │                                       │
│                          └── triggers ──→ API Calls             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP Requests
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                          │
│                                                                   │
│  GET  /api/admin/sessions/stats                                  │
│  POST /api/admin/sessions/force-cancel                           │
│  POST /api/admin/sessions/force-end                              │
│  POST /api/admin/sessions/reassign                               │
│  POST /api/admin/sessions/export                                 │
│  POST /api/admin/sessions/bulk-cancel                            │
│  GET  /api/admin/sessions/[id]/chat                              │
│  GET  /api/admin/sessions/[id]/files                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Database Queries
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                           │
│                                                                   │
│  Tables:                                                          │
│  - sessions (main session data)                                  │
│  - session_participants (user-session relationships)             │
│  - users (customer and mechanic info)                            │
│  - chat_messages (chat history)                                  │
│  - session_files (file attachments)                              │
│  - admin_actions (audit log)                                     │
│                                                                   │
│  Real-time:                                                       │
│  - WebSocket connections for live updates                        │
│  - Broadcasts changes to subscribed clients                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## User Interaction Flow

```
┌──────────────┐
│ Admin Visits │
│   /admin/    │
│  sessions    │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────┐
│ Server Component Loads       │
│ - Check authentication       │
│ - Fetch initial sessions     │
│ - Calculate statistics       │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ Client Component Renders     │
│ - Display stats cards        │
│ - Display sessions table     │
│ - Setup real-time listener   │
└──────────┬───────────────────┘
           │
           ├─────────────────────────────┐
           │                             │
           ↓                             ↓
┌──────────────────────┐    ┌────────────────────────┐
│ User Filters/Sorts   │    │ New Session Created    │
│ - Update filters     │    │ in Database            │
│ - Re-calculate       │    │                        │
│   filtered sessions  │    └──────────┬─────────────┘
│ - Re-render table    │               │
└──────────────────────┘               │
                                       ↓
                          ┌────────────────────────┐
                          │ WebSocket Event        │
                          │ - Receive new session  │
                          │ - Update local state   │
                          │ - Re-render UI         │
                          │ - Refresh stats        │
                          └────────────────────────┘

┌──────────────────────┐
│ User Clicks Row      │
│ - Set selected       │
│   session            │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────────────┐
│ Modal Opens                  │
│ - Display session details    │
│ - Show action buttons        │
└──────────┬───────────────────┘
           │
           ├─────────────────────────────┐
           │                             │
           ↓                             ↓
┌──────────────────────┐    ┌────────────────────────┐
│ User Clicks Tab      │    │ User Clicks Action     │
│ - Load tab data      │    │ - Show confirmation    │
│   (chat/files)       │    │ - Call API             │
│ - Display in tab     │    │ - Update session       │
└──────────────────────┘    │ - Close modal          │
                            └────────────────────────┘

┌──────────────────────┐
│ User Selects Rows    │
│ - Update selected    │
│   set                │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────────────┐
│ User Clicks Bulk Action      │
│ - Confirm action             │
│ - Call bulk API              │
│ - Update multiple sessions   │
│ - Clear selection            │
└──────────────────────────────┘

┌──────────────────────┐
│ User Clicks Export   │
│ - Choose format      │
│ - Collect session    │
│   IDs                │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────────────┐
│ API Generates File           │
│ - Query sessions             │
│ - Format as CSV/JSON         │
│ - Return as blob             │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ Browser Downloads File       │
│ - Create download link       │
│ - Trigger download           │
│ - Clean up                   │
└──────────────────────────────┘
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│                   Component State                        │
└─────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ↓                ↓                ↓
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Source    │  │  Filters &  │  │   Derived   │
│   State     │  │    Sort     │  │    State    │
├─────────────┤  ├─────────────┤  ├─────────────┤
│ - sessions  │  │ - filters   │  │ - filtered  │
│ - stats     │  │ - sortBy    │  │   Sessions  │
│             │  │ - search    │  │   (useMemo) │
│             │  │             │  │             │
│ Updated by: │  │ Updated by: │  │ Computed    │
│ - Initial   │  │ - User      │  │   from:     │
│   fetch     │  │   input     │  │ - sessions  │
│ - Real-time │  │ - Filter    │  │ - filters   │
│   events    │  │   changes   │  │ - sortBy    │
│ - API calls │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
         │                │                │
         └────────────────┼────────────────┘
                          ↓
                  ┌─────────────┐
                  │  Paginated  │
                  │  Sessions   │
                  ├─────────────┤
                  │ Sliced from │
                  │  filtered   │
                  │  sessions   │
                  │             │
                  │ - page      │
                  │ - pageSize  │
                  └─────────────┘
                          │
                          ↓
                  ┌─────────────┐
                  │   Render    │
                  │   Table     │
                  └─────────────┘
```

## API Request/Response Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Force Cancel Flow                          │
└──────────────────────────────────────────────────────────────┘

User clicks "Force Cancel" in modal
         │
         ↓
  Prompt for reason
         │
         ↓
  POST /api/admin/sessions/force-cancel
         │
         ├─ Body: { sessionId, reason }
         │
         ↓
  ┌──────────────────────────────────────┐
  │ API Route Handler                    │
  │ 1. Verify authentication             │
  │ 2. Validate inputs                   │
  │ 3. Fetch current session             │
  │ 4. Check if cancellable              │
  │ 5. Update session status             │
  │ 6. Add metadata (reason, admin ID)   │
  │ 7. Log admin action                  │
  │ 8. Return updated session            │
  └──────────────────────────────────────┘
         │
         ↓
  Response: { success: true, session: {...} }
         │
         ↓
  Update local state (onUpdate callback)
         │
         ↓
  Real-time event fires → All clients updated
         │
         ↓
  Modal shows updated session
         │
         ↓
  User sees success message


┌──────────────────────────────────────────────────────────────┐
│                     Export Sessions Flow                      │
└──────────────────────────────────────────────────────────────┘

User clicks "Export" → Choose "CSV"
         │
         ↓
  Collect session IDs (selected or filtered)
         │
         ↓
  POST /api/admin/sessions/export
         │
         ├─ Body: { sessionIds: [...], format: 'csv' }
         │
         ↓
  ┌──────────────────────────────────────┐
  │ API Route Handler                    │
  │ 1. Verify authentication             │
  │ 2. Validate inputs                   │
  │ 3. Fetch sessions with participants  │
  │ 4. Generate CSV format               │
  │   - Create header row                │
  │   - Create data rows                 │
  │   - Join with newlines               │
  │ 5. Set Content-Disposition header    │
  │ 6. Return CSV as text/csv            │
  └──────────────────────────────────────┘
         │
         ↓
  Response: CSV file as blob
         │
         ↓
  Create object URL from blob
         │
         ↓
  Create <a> element with download attribute
         │
         ↓
  Programmatically click to trigger download
         │
         ↓
  Clean up object URL
         │
         ↓
  User receives file in Downloads folder
```

## Real-Time Update Flow

```
┌──────────────────────────────────────────────────────────────┐
│              Real-Time Subscription Flow                      │
└──────────────────────────────────────────────────────────────┘

Component Mounts
       │
       ↓
Create Supabase client (singleton)
       │
       ↓
Set up channel subscription
       │
       ├─ Channel: 'admin-sessions'
       ├─ Event: '*' (all events)
       ├─ Schema: 'public'
       ├─ Table: 'sessions'
       │
       ↓
Subscribe to channel
       │
       ↓
WebSocket connection established
       │
       ↓
┌──────────────────────────────────────┐
│ Database Event Occurs                │
│ (INSERT, UPDATE, or DELETE)          │
└──────────────────────────────────────┘
       │
       ↓
Supabase broadcasts event to subscribers
       │
       ↓
Client receives event
       │
       ├─ Event Type: INSERT
       │   ├─ Fetch full session with participants
       │   ├─ Add to beginning of sessions array
       │   └─ Trigger re-render
       │
       ├─ Event Type: UPDATE
       │   ├─ Merge updated fields with existing session
       │   ├─ Update session in array
       │   └─ Trigger re-render
       │
       └─ Event Type: DELETE
           ├─ Remove session from array
           └─ Trigger re-render
       │
       ↓
Refresh statistics
       │
       ├─ Call GET /api/admin/sessions/stats
       └─ Update stats state
       │
       ↓
Component re-renders with new data
       │
       ↓
User sees updated information (no manual refresh needed)
       │
       ↓
Component Unmounts
       │
       ↓
Clean up subscription
       │
       └─ Remove channel
```

## Security & Authorization Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   Every API Request                           │
└──────────────────────────────────────────────────────────────┘

Request arrives at API route
       │
       ↓
┌─────────────────────────────────┐
│ 1. Get Supabase server client   │
└─────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│ 2. Get authenticated user        │
│    - supabase.auth.getUser()     │
└─────────────────────────────────┘
       │
       ├─ User found? ──NO──→ Return 401 Unauthorized
       │
       ↓ YES
┌─────────────────────────────────┐
│ 3. Validate request body/params  │
└─────────────────────────────────┘
       │
       ├─ Valid? ──NO──→ Return 400 Bad Request
       │
       ↓ YES
┌─────────────────────────────────┐
│ 4. Check resource exists         │
│    (if applicable)               │
└─────────────────────────────────┘
       │
       ├─ Exists? ──NO──→ Return 404 Not Found
       │
       ↓ YES
┌─────────────────────────────────┐
│ 5. Check business rules          │
│    (e.g., can session be         │
│     cancelled?)                  │
└─────────────────────────────────┘
       │
       ├─ Allowed? ──NO──→ Return 400 Bad Request
       │
       ↓ YES
┌─────────────────────────────────┐
│ 6. Perform database operation    │
│    using supabaseAdmin           │
└─────────────────────────────────┘
       │
       ├─ Success? ──NO──→ Return 500 Internal Error
       │
       ↓ YES
┌─────────────────────────────────┐
│ 7. Log admin action              │
│    (for audit trail)             │
└─────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│ 8. Return success response       │
└─────────────────────────────────┘
       │
       ↓
Response sent to client
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
├─────────────────────────────────────────────────────────────┤
│ React 18                                                     │
│ - Hooks (useState, useEffect, useMemo)                      │
│ - Server Components                                          │
│ - Client Components                                          │
│                                                              │
│ Next.js 14 (App Router)                                      │
│ - File-based routing                                         │
│ - API Routes                                                 │
│ - Server-side rendering                                      │
│                                                              │
│ TypeScript                                                   │
│ - Type safety                                                │
│ - IntelliSense                                               │
│ - Compile-time checks                                        │
│                                                              │
│ Tailwind CSS                                                 │
│ - Utility-first styling                                      │
│ - Responsive design                                          │
│ - Custom color palette                                       │
│                                                              │
│ date-fns                                                     │
│ - Date formatting                                            │
│ - Relative time display                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Backend Layer                           │
├─────────────────────────────────────────────────────────────┤
│ Next.js API Routes                                           │
│ - RESTful endpoints                                          │
│ - Request/response handling                                  │
│ - Middleware support                                         │
│                                                              │
│ Supabase Client                                              │
│ - Database queries                                           │
│ - Real-time subscriptions                                    │
│ - Authentication                                             │
│                                                              │
│ Supabase Admin Client                                        │
│ - Elevated permissions                                       │
│ - Bypass RLS policies                                        │
│ - Admin operations                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├─────────────────────────────────────────────────────────────┤
│ Supabase (PostgreSQL)                                        │
│ - Relational database                                        │
│ - JSONB support                                              │
│ - Full-text search                                           │
│ - Row Level Security (RLS)                                   │
│                                                              │
│ Real-time Engine                                             │
│ - WebSocket connections                                      │
│ - Broadcast/Listen                                           │
│ - Presence tracking                                          │
│                                                              │
│ Storage                                                      │
│ - File uploads                                               │
│ - Signed URLs                                                │
│ - Access control                                             │
└─────────────────────────────────────────────────────────────┘
```

This architecture provides a scalable, maintainable, and performant admin session management system with real-time capabilities and comprehensive functionality.
