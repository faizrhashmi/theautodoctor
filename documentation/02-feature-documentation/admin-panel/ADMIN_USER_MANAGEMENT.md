# Admin User Management System

Comprehensive user management tools for customers and mechanics with advanced filtering, search, and administrative actions.

## Overview

This system provides admin users with complete control over customer and mechanic accounts, including:
- Advanced search and filtering
- Account status management (suspend, ban, activate)
- Performance monitoring for mechanics
- Admin notes and action history
- Email verification and password reset
- Bulk export capabilities

## Database Migration

Run the following migration to set up the necessary database tables:

```bash
# Location: migrations/create_admin_user_management.sql
```

This migration creates:
- `admin_notes` table - For internal admin notes on users
- `admin_actions` table - Audit log of all admin actions
- Additional fields on `profiles` and `mechanics` tables
- Indexes for performance
- Row Level Security policies

## Pages Created

### 1. Customers Management (`/admin/customers`)
**File:** `src/app/admin/(shell)/customers/page.tsx`

Features:
- Paginated list of all customers
- Search by name, email, or phone
- Filter by account status, email verification, registration date
- View total sessions and revenue per customer
- Export to CSV
- Quick actions: View details, suspend, ban, verify email

Columns displayed:
- Customer name and ID
- Contact (email/phone)
- Account status with badges
- Email verification status
- Join date
- Total sessions count
- Last active date
- Actions link

### 2. Mechanics Management (`/admin/mechanics`)
**File:** `src/app/admin/(shell)/mechanics/page.tsx`

Features:
- Paginated list of all mechanics
- Search by name, email, or phone
- Filter by account status, approval status, online status
- Filter by registration date
- Real-time online/offline indicators
- Performance metrics visible at a glance
- Export to CSV

Columns displayed:
- Mechanic name, ID, and specializations
- Contact (email/phone)
- Account status
- Approval status (pending/approved/rejected)
- Online/offline indicator
- Rating with star icon
- Total sessions
- Total earnings
- Average response time
- Actions link

### 3. Customer Detail Page (`/admin/customers/[id]`)
**File:** `src/app/admin/(shell)/customers/[id]/page.tsx`

Features:
- Complete profile information
- Account statistics (total sessions, total spent)
- Admin notes section with ability to add new notes
- Action history timeline
- Quick action buttons:
  - Suspend account (with reason and duration)
  - Ban account permanently
  - Verify email manually
  - Send password reset link
  - Send notification
- Vehicle information display
- Last active tracking

### 4. Mechanic Detail Page (`/admin/mechanics/[id]`)
**File:** `src/app/admin/(shell)/mechanics/[id]/page.tsx`

Features:
- Complete profile information with bio
- Online/offline status indicator
- Performance dashboard:
  - Rating (adjustable by admin)
  - Total sessions
  - Total earnings
  - Average response time
- Specializations display
- Admin notes section
- Action history timeline
- Quick action buttons:
  - Approve mechanic (if pending)
  - Suspend account
  - Adjust rating
- Real-time metrics

### 5. Admin Dashboard (`/admin`)
**File:** `src/app/admin/page.tsx`

Features:
- Card-based navigation to all admin sections
- Visual icons for each section
- Quick access to:
  - Intakes
  - Sessions
  - Customers
  - Mechanics
  - Unattended Requests
  - Deletion Log

## API Endpoints

### Customer APIs

#### GET `/api/admin/users/customers`
List all customers with pagination and filtering.

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20)
- `q` - Search query (name/email/phone)
- `status` - Account status filter
- `emailVerified` - Email verification filter (true/false)
- `from` - Start date (YYYY-MM-DD)
- `to` - End date (YYYY-MM-DD)

**Response:**
```json
{
  "rows": [
    {
      "id": "uuid",
      "email": "customer@example.com",
      "full_name": "John Doe",
      "phone": "555-1234",
      "account_status": "active",
      "email_verified": true,
      "created_at": "2024-01-01T00:00:00Z",
      "last_active_at": "2024-01-15T00:00:00Z",
      "total_sessions": 5,
      "total_spent": 299.99
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

### Mechanic APIs

#### GET `/api/admin/users/mechanics`
List all mechanics with pagination and filtering.

**Query Parameters:**
- `page` - Page number
- `pageSize` - Items per page
- `q` - Search query
- `status` - Account status filter
- `approvalStatus` - Approval status filter
- `onlineOnly` - Filter online mechanics (true/false)
- `from` - Start date
- `to` - End date

**Response:**
```json
{
  "rows": [
    {
      "id": "uuid",
      "name": "Mike Mechanic",
      "email": "mike@example.com",
      "phone": "555-5678",
      "account_status": "active",
      "approval_status": "approved",
      "is_online": true,
      "rating": 4.85,
      "total_sessions": 150,
      "total_earnings": 12500.00,
      "avg_response_time": 180,
      "specializations": ["Engine", "Transmission", "Brakes"]
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20
}
```

### User Detail APIs

#### GET `/api/admin/users/[id]`
Get detailed information about a specific user (customer).

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "account_status": "active",
    "total_sessions": 5,
    "total_spent": 299.99
  },
  "notes": [
    {
      "id": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "admin_email": "admin@example.com",
      "note": "Customer contacted support about..."
    }
  ],
  "actions": [
    {
      "id": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "admin_email": "admin@example.com",
      "action_type": "verify_email",
      "reason": null
    }
  ]
}
```

#### GET `/api/admin/users/mechanics/[id]`
Get detailed information about a specific mechanic.

### User Action APIs

#### POST `/api/admin/users/[id]/suspend`
Suspend a user account.

**Request Body:**
```json
{
  "reason": "Violation of terms",
  "duration_days": 7
}
```

#### POST `/api/admin/users/[id]/ban`
Ban a user account permanently.

**Request Body:**
```json
{
  "reason": "Repeated violations"
}
```

#### POST `/api/admin/users/[id]/verify-email`
Manually verify a user's email.

#### POST `/api/admin/users/[id]/reset-password`
Generate password reset link for a user.

**Response:**
```json
{
  "success": true,
  "reset_link": "https://...",
  "message": "Password reset link generated"
}
```

#### POST `/api/admin/users/[id]/notify`
Send notification to a user.

**Request Body:**
```json
{
  "message": "Your account has been updated..."
}
```

#### POST `/api/admin/users/[id]/notes`
Add an admin note to a user's account.

**Request Body:**
```json
{
  "note": "Customer called about billing issue"
}
```

### Mechanic-Specific APIs

#### POST `/api/admin/users/mechanics/[id]/approve`
Approve a mechanic application.

#### POST `/api/admin/users/mechanics/[id]/adjust-rating`
Manually adjust a mechanic's rating.

**Request Body:**
```json
{
  "rating": 4.75
}
```

### Export API

#### GET `/api/admin/users/export?type=customers`
Export users to CSV format.

**Query Parameters:**
- `type` - Either 'customers' or 'mechanics'

**Response:** CSV file download

## Navigation Updates

### Admin Layout (`src/app/admin/layout.tsx`)
Added navigation links for:
- Customers
- Mechanics

### Admin Dashboard (`src/app/admin/page.tsx`)
Converted from simple redirect to card-based dashboard with links to all admin sections.

## Features

### Search & Filter
- **Real-time search** across name, email, phone
- **Multi-filter support** for status, verification, dates
- **Pagination** with configurable page size
- **Sort options** by various metrics
- **Quick filter reset**

### User Actions
- **Suspend** - Temporary account suspension with duration
- **Ban** - Permanent account ban
- **Verify Email** - Manual email verification
- **Reset Password** - Generate reset link
- **Send Notification** - Send messages to users
- **Add Notes** - Internal admin notes
- **Approve Mechanic** - Approve mechanic applications
- **Adjust Rating** - Manually adjust mechanic ratings

### Audit Trail
- All admin actions are logged in `admin_actions` table
- Includes admin user, target user, action type, reason
- Timestamp and metadata for each action
- Visible in user detail pages

### Admin Notes
- Add internal notes to any user account
- Notes include timestamp and admin email
- Searchable and filterable
- Visible only to admins

### Data Export
- Export customers or mechanics to CSV
- Includes all key fields
- Filterable before export
- GDPR compliance ready

### Real-time Status
- Online/offline indicators for mechanics
- Account status badges with color coding
- Email verification status
- Suspension/ban status with expiry dates

### Performance Metrics
- **For Mechanics:**
  - Rating (0-5 stars)
  - Total sessions completed
  - Total earnings
  - Average response time
  - Approval status

- **For Customers:**
  - Total sessions
  - Total amount spent
  - Last active date
  - Account age

## Security

- **Authentication Required** - All endpoints require admin authentication
- **Row Level Security** - Database policies enforce access control
- **Audit Logging** - All actions are logged with admin attribution
- **Service Role** - Uses Supabase admin client for privileged operations

## UI/UX Features

- **Responsive Design** - Works on all screen sizes
- **Loading States** - Clear loading indicators
- **Error Handling** - User-friendly error messages
- **Confirmation Dialogs** - Prevent accidental actions
- **Toast Notifications** - Success/error feedback
- **Badge System** - Visual status indicators
- **Card Layout** - Clean, organized interface
- **Search Highlighting** - Easy to scan results
- **Empty States** - Helpful messages when no data

## Future Enhancements

### Potential Additions:
1. **Email Integration** - Connect SendGrid/Resend for notifications
2. **Bulk Actions** - Select multiple users for batch operations
3. **Advanced Analytics** - Charts and graphs for user metrics
4. **Session History** - View all sessions for a user
5. **Payment History** - Detailed payment records
6. **User Impersonation** - Admin login as user (with logging)
7. **Export Filters** - Apply filters before CSV export
8. **Custom Reports** - Generate custom user reports
9. **Automated Actions** - Rules-based account actions
10. **SMS Notifications** - Send SMS via Twilio

## Testing Recommendations

1. Test all search and filter combinations
2. Verify pagination works correctly
3. Test all user actions (suspend, ban, etc.)
4. Verify audit logging is working
5. Test CSV export functionality
6. Check responsive design on mobile
7. Verify RLS policies are enforced
8. Test with large datasets (1000+ users)

## Deployment Notes

1. **Run the migration** in Supabase SQL editor
2. **Verify database indexes** are created
3. **Test RLS policies** with different user roles
4. **Configure environment variables** if adding email service
5. **Monitor API performance** under load
6. **Set up error tracking** (Sentry, etc.)

## Support

For issues or questions about the user management system:
1. Check the code comments in each file
2. Review the API endpoint documentation
3. Test with sample data in development
4. Verify database migration ran successfully
