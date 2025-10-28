# Activity-Based Session Timeout Implementation

## Overview

Implemented automatic session timeout after inactivity to enhance security across all user types. Users are automatically logged out after a period of inactivity to prevent unauthorized access to unattended sessions.

## Timeout Durations

- **Admin**: 2 hours (most restrictive - highest security)
- **Mechanic**: 4 hours (moderate security)
- **Customer**: 8 hours (most lenient - best user experience)

## Implementation Details

### 1. Core Hook: `useActivityTimeout`

**Location**: [src/hooks/useActivityTimeout.ts](src/hooks/useActivityTimeout.ts)

**Features**:
- Monitors user activity events: `mousedown`, `keydown`, `scroll`, `touchstart`
- Automatically resets timeout on any user activity
- Configurable timeout duration per user type
- Optional warning system (5 minutes before timeout)
- Clean event listener management with proper cleanup

**Usage Example**:
```typescript
useActivityTimeout({
  timeoutMs: 2 * 60 * 60 * 1000, // 2 hours
  onTimeout: async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }
})
```

### 2. Customer Integration

**Location**: [src/app/customer/layout.tsx](src/app/customer/layout.tsx)

**Implementation**:
- Converted layout to client component to use hooks
- 8-hour timeout (most lenient for better UX)
- On timeout:
  1. Calls `/api/customer/logout` for server-side cleanup
  2. Signs out from Supabase
  3. Clears localStorage and sessionStorage
  4. Hard redirects to home page

### 3. Mechanic Integration

**Location**: [src/app/mechanic/layout.tsx](src/app/mechanic/layout.tsx)

**Implementation**:
- Already a client component (no conversion needed)
- 4-hour timeout (balanced security and UX)
- On timeout:
  1. Calls `/api/mechanics/logout` for server-side cleanup
  2. Hard redirects to mechanic login page

### 4. Admin Integration

**Location**:
- Component: [src/components/admin/AdminActivityTimeout.tsx](src/components/admin/AdminActivityTimeout.tsx)
- Layout: [src/app/admin/(shell)/layout.tsx](src/app/admin/(shell)/layout.tsx)

**Implementation**:
- Created separate client component (layout has metadata, must stay server component)
- 2-hour timeout (most restrictive for highest security)
- On timeout:
  1. Calls `/api/admin/logout` for server-side cleanup
  2. Signs out from Supabase
  3. Clears localStorage and sessionStorage
  4. Hard redirects to admin login page

## Activity Events Monitored

The timeout resets on any of these user interactions:
1. **Mouse clicks** (`mousedown`)
2. **Keyboard input** (`keydown`)
3. **Scrolling** (`scroll`)
4. **Touch gestures** (`touchstart`)

## Security Benefits

1. **Prevents Unauthorized Access**: Unattended sessions are automatically terminated
2. **Defense-in-Depth**: Works alongside existing middleware and page-level auth guards
3. **Role-Appropriate Security**: Different timeouts based on access level
   - Admins have shortest timeout (highest risk)
   - Customers have longest timeout (lowest risk)
4. **Complete Session Cleanup**: Clears both client and server-side session data
5. **Hard Redirects**: Uses `window.location.href` to ensure complete state reset

## User Experience

- **Transparent**: Users won't notice unless they're inactive
- **Graceful**: No data loss during normal use
- **Predictable**: Consistent timeout behavior across all pages
- **Resumable**: Users can simply log back in after timeout

## Testing Recommendations

To test the timeout functionality:

1. **Quick Test** (change timeout temporarily):
   ```typescript
   // In layout file, change to 1 minute for testing
   timeoutMs: 1 * 60 * 1000, // 1 minute for testing
   ```

2. **Test Steps**:
   - Log in as customer/mechanic/admin
   - Don't interact with the page for the timeout duration
   - Verify automatic logout and redirect to login page
   - Verify session data is cleared (check localStorage, cookies)

3. **Activity Reset Test**:
   - Start timeout countdown
   - Move mouse or press a key before timeout
   - Verify timeout resets and user stays logged in

## Optional: Warning Feature

The hook supports showing a warning before timeout (currently disabled):

```typescript
useActivityTimeout({
  timeoutMs: 2 * 60 * 60 * 1000,
  showWarning: true,  // Enable warning
  warningMs: 5 * 60 * 1000,  // Warn 5 minutes before timeout
  onTimeout: async () => { /* ... */ }
})
```

To enable warnings, set `showWarning: true` in the layout files.

## Related Documentation

- [AUTHENTICATION_SESSION_AUDIT.md](AUTHENTICATION_SESSION_AUDIT.md) - Complete auth system audit
- Phase 2 Priority #4 from the audit recommendations

## Implementation Date

2025-10-28

---

**Status**: ✅ Implemented and verified across all user types (Customer, Mechanic, Admin)
