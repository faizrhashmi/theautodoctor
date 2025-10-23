# Corporate Business Integration System - Complete Guide

## Overview

The Corporate Business Integration System enables B2B fleet management capabilities for AskAutoDoctor. This system allows businesses to manage multiple employees, vehicles, and receive consolidated billing with custom pricing tiers.

## Features

### 1. Corporate Account Management
- Multi-tier subscription system (Basic, Professional, Enterprise, Custom)
- Application and approval workflow
- Fleet size and usage tracking
- Custom pricing and volume discounts
- Dedicated account managers

### 2. Employee Management
- Multi-user access with role-based permissions
- Employee roles: Driver, Fleet Manager, Admin, Technician, Supervisor
- Department and employee number tracking
- Session usage per employee
- Easy onboarding and removal

### 3. Fleet Vehicle Management
- Vehicle registration and tracking
- VIN and license plate management
- Vehicle assignment to employees
- Service date tracking
- Session history per vehicle

### 4. Invoicing & Billing
- Automated monthly invoice generation
- Consolidated billing for all employees
- Volume discounts and custom rates
- Invoice status tracking (Draft, Sent, Paid, Overdue)
- Session breakdown per invoice
- PDF invoice generation (future)

### 5. Usage Analytics
- Monthly session limits
- Real-time usage tracking
- Employee activity monitoring
- Fleet performance metrics
- Session history for compliance

## Database Schema

### Tables Created

#### `corporate_businesses`
Main table for corporate accounts with company information, billing details, subscription tier, approval status, and usage limits.

**Key Fields:**
- `company_name`, `company_email`, `company_phone`
- `business_type`: fleet, dealership, repair_shop, rental, taxi_service, trucking, other
- `subscription_tier`: basic, professional, enterprise, custom
- `approval_status`: pending, approved, rejected, suspended
- `fleet_size`, `monthly_session_limit`, `current_month_sessions`
- `discount_percentage`, `custom_rate_per_session`

#### `corporate_employees`
Links employees to corporate accounts with role-based access.

**Key Fields:**
- `corporate_id` (FK to corporate_businesses)
- `employee_user_id` (FK to auth.users)
- `employee_role`: driver, fleet_manager, admin, technician, supervisor
- `employee_number`, `department`
- `is_active`, `total_sessions`, `last_session_at`

#### `corporate_invoices`
Separate invoicing for corporate clients with billing periods and payment tracking.

**Key Fields:**
- `invoice_number`, `corporate_id`
- `billing_period_start`, `billing_period_end`
- `subtotal_amount`, `discount_amount`, `tax_amount`, `total_amount`
- `sessions_count`, `session_ids`
- `status`: draft, sent, paid, overdue, cancelled, refunded
- `due_date`, `paid_at`

#### `corporate_vehicles`
Fleet vehicle management and tracking.

**Key Fields:**
- `corporate_id`, `vehicle_number`, `vin`
- `make`, `model`, `year`, `license_plate`
- `assigned_to_employee_id`
- `is_active`, `total_sessions`
- `last_service_date`, `next_service_date`

### Session Linking

The `sessions` table has been enhanced with:
- `corporate_id` - Links session to corporate account
- `corporate_employee_id` - Links to specific employee
- `corporate_vehicle_id` - Links to specific vehicle

## User Flows

### 1. Corporate Signup Flow

**Path:** `/corporate/signup`

1. Business fills out comprehensive signup form:
   - Company information
   - Business type and industry
   - Address details
   - Primary contact information
   - Fleet details and estimated usage
   - Current challenges and desired features

2. Application is submitted and stored with `approval_status: pending`

3. Admin receives notification (to be implemented)

4. Business receives confirmation email (to be implemented)

5. Application appears in admin panel at `/admin/corporate`

### 2. Admin Approval Flow

**Path:** `/admin/corporate`

1. Admin views all corporate applications and accounts
2. For pending applications, admin can:
   - **Approve:** Activates account, enables employee access
   - **Reject:** Declines application with optional reason
   - **View Details:** See full application information

3. For approved accounts, admin can:
   - Generate invoices
   - Suspend accounts
   - Assign account managers
   - Monitor usage

### 3. Corporate Dashboard Flow

**Path:** `/corporate/dashboard`

**Prerequisites:**
- User must be added as an employee to a corporate account
- Corporate account must be approved

**Features by Role:**

**Admin/Fleet Manager:**
- View company overview and statistics
- Manage employees (add/remove)
- View all vehicles
- Access full session history
- View and download invoices
- Monitor usage limits

**Driver/Technician:**
- View own session history
- Access company vehicles
- Limited overview access

### 4. Employee Management Flow

1. Corporate admin logs into dashboard
2. Navigates to "Employees" tab
3. Clicks "Add Employee"
4. Enters employee email (must be existing user)
5. Selects role and optional department
6. Employee is immediately added with access

**Removing Employees:**
- Admin can remove employees
- Sets `is_active: false`
- Employee loses corporate access
- Historical data is preserved

### 5. Invoice Generation Flow

**Triggered by:** Admin action at `/admin/corporate`

1. Admin clicks "Generate Invoice" for corporate account
2. System calculates billing period (current month)
3. Fetches all completed sessions for the period
4. Calculates amounts:
   - Base rate per session
   - Volume discount applied
   - Tax calculation (HST)
   - Total amount
5. Invoice is created with unique invoice number
6. Invoice status: `draft`
7. Admin can review and mark as `sent`

## API Endpoints

### Corporate Signup
```
POST /api/corporate/signup
```
**Body:** Company information, contact details, fleet info
**Returns:** Success confirmation, business ID

### Corporate Dashboard
```
GET /api/corporate/dashboard
```
**Auth:** Required (corporate employee)
**Returns:** Account info, employees, vehicles, sessions, invoices

### Employee Management
```
POST /api/corporate/employees
```
**Auth:** Required (admin/fleet_manager role)
**Body:** `{ email, role, employeeNumber, department }`
**Returns:** New employee record

```
GET /api/corporate/employees
```
**Auth:** Required (admin/fleet_manager role)
**Returns:** All employees for corporate account

```
DELETE /api/corporate/employees/:id
```
**Auth:** Required (admin/fleet_manager role)
**Returns:** Success confirmation

### Admin Corporate Management
```
GET /api/admin/corporate
```
**Auth:** Required (admin role)
**Returns:** All corporate businesses with stats

```
POST /api/admin/corporate/:id/approve
```
**Auth:** Required (admin role)
**Returns:** Updated business record

```
POST /api/admin/corporate/:id/reject
```
**Auth:** Required (admin role)
**Body:** `{ reason }`
**Returns:** Updated business record

```
POST /api/admin/corporate/:id/suspend
```
**Auth:** Required (admin role)
**Body:** `{ reason }` (required)
**Returns:** Updated business record

```
POST /api/admin/corporate/:id/generate-invoice
```
**Auth:** Required (admin role)
**Returns:** Generated invoice

## Subscription Tiers

### Basic
- **Fleet Size:** Up to 10 vehicles
- **Monthly Limit:** 100 sessions
- **Discount:** 5%
- **Features:**
  - Basic reporting
  - Email support
  - Standard response time

### Professional
- **Fleet Size:** Up to 50 vehicles
- **Monthly Limit:** 500 sessions
- **Discount:** 10%
- **Features:**
  - Advanced analytics
  - Priority support
  - Dedicated account manager
  - Custom reporting

### Enterprise
- **Fleet Size:** Unlimited
- **Monthly Limit:** Unlimited
- **Discount:** 15%
- **Features:**
  - Custom integrations
  - 24/7 premium support
  - Dedicated account manager
  - Custom SLA
  - API access
  - White-label options

### Custom
- **Pricing:** Negotiated
- **Features:** Tailored to specific business needs

## Pricing Logic

### Base Calculation
```typescript
const baseRatePerSession = 50.00; // $50 per session
const subtotal = sessionsCount * baseRatePerSession;
const discountAmount = (subtotal * discountPercentage) / 100;
const taxRate = 0.13; // 13% HST (Ontario)
const taxableAmount = subtotal - discountAmount;
const taxAmount = taxableAmount * taxRate;
const totalAmount = taxableAmount + taxAmount;
```

### Custom Rates
Corporate accounts can have `custom_rate_per_session` set for non-standard pricing.

## Permissions & RLS

### Row Level Security Policies

**corporate_businesses:**
- Admins can view/manage all accounts
- Corporate employees can view their own account

**corporate_employees:**
- Admins can view all employees
- Corporate admins/fleet_managers can manage employees in their organization
- Employees can view themselves

**corporate_invoices:**
- Admins can view all invoices
- Corporate admins/fleet_managers can view their company's invoices

**corporate_vehicles:**
- Admins can view all vehicles
- Corporate employees can view vehicles in their organization
- Corporate admins/fleet_managers can manage vehicles

## Future Enhancements

### Phase 2
- [ ] PDF invoice generation
- [ ] Email notifications (signup, approval, invoices)
- [ ] Stripe integration for automated billing
- [ ] Employee invitation system (for non-users)
- [ ] Vehicle maintenance scheduling
- [ ] Advanced analytics dashboard

### Phase 3
- [ ] API access for enterprise clients
- [ ] Custom integrations (fleet management systems)
- [ ] White-label corporate portal
- [ ] Multi-location support
- [ ] Service level agreement (SLA) tracking
- [ ] Advanced reporting and exports

### Phase 4
- [ ] Mobile app for fleet managers
- [ ] Real-time fleet tracking
- [ ] Predictive maintenance alerts
- [ ] Cost optimization recommendations
- [ ] Carbon footprint tracking
- [ ] Integration marketplace

## Testing Checklist

### Signup Flow
- [ ] Fill out corporate signup form
- [ ] Verify required field validation
- [ ] Submit application
- [ ] Confirm application appears in admin panel
- [ ] Verify status is "pending"

### Admin Approval
- [ ] Approve pending application
- [ ] Verify status changes to "approved" and is_active: true
- [ ] Reject application with reason
- [ ] Suspend active account

### Employee Management
- [ ] Add employee to corporate account
- [ ] Verify employee gains access to dashboard
- [ ] Test role-based permissions
- [ ] Remove employee
- [ ] Verify employee loses access

### Invoice Generation
- [ ] Create sessions linked to corporate account
- [ ] Generate invoice
- [ ] Verify calculations (subtotal, discount, tax)
- [ ] Check session IDs are included
- [ ] Verify invoice appears in corporate dashboard

### Dashboard Access
- [ ] Test access with different employee roles
- [ ] Verify admin/fleet_manager sees all features
- [ ] Verify driver sees limited features
- [ ] Test unauthorized access (non-employee)

## Migration

To apply the database schema:

```bash
# Run the migration
supabase migration up
```

Or apply manually:
```sql
-- Run the contents of:
-- supabase/migrations/20251024000000_create_corporate_businesses.sql
```

## Support & Documentation

For questions or issues:
1. Check this guide first
2. Review the type definitions in `src/types/corporate.ts`
3. Examine the API endpoints for implementation details
4. Contact development team for system modifications

## Security Considerations

1. **Data Isolation:** Each corporate account's data is isolated via RLS policies
2. **Role-Based Access:** Strict permission checks for sensitive operations
3. **Audit Trail:** All changes tracked with timestamps and user IDs
4. **Financial Data:** Invoice amounts and pricing protected with admin-only access
5. **Employee Privacy:** Session data only accessible to authorized corporate users

## Compliance

- **PIPEDA:** Personal information handling for Canadian businesses
- **Data Retention:** Historical session and employee data preserved
- **Right to Access:** Corporate admins can export all data
- **Right to Delete:** Account deletion removes all associated data (cascade)

---

**Last Updated:** October 24, 2025
**Version:** 1.0.0
**Status:** Production Ready
