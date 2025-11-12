# Test Users - Complete Credentials Reference

**Document Purpose:** Central reference for all test user accounts across different user types and roles.

**Last Updated:** 2025-11-10

---

## Quick Reference Table

| User Type | Email | Password | Account Type | Workshop | Access Level |
|-----------|-------|----------|--------------|----------|--------------|
| **Virtual-Only Mechanic** | sarah.mechanic@askautodoctor.com | Mechanic123! | individual_mechanic | None | Full (Earnings) |
| **Workshop Employee** | david.mechanic@askautodoctor.com | Mechanic123! | workshop_mechanic | Premium Auto Care | Limited (No Earnings) |
| **Independent Owner** | james.mechanic@askautodoctor.com | Mechanic123! | individual_mechanic | Own Shop | Full (Earnings) |
| **Workshop Employee (Alt)** | workshop.mechanic@test.com | 1234 | workshop_mechanic | Elite Auto Care | Limited (No Earnings) |

---

## 1. Virtual-Only Mechanic (Independent Contractor)

### Primary Test User: Sarah Johnson

**Login Credentials:**
- **Email:** `sarah.mechanic@askautodoctor.com`
- **Password:** `Mechanic123!`
- **Login URL:** `/mechanic/login`

**Contact Information:**
- **Phone:** +1-416-555-1001
- **Name:** Sarah Johnson

**Account Configuration:**
```javascript
{
  account_type: 'individual_mechanic',
  service_tier: 'virtual_only',
  workshop_id: null,
  can_perform_physical_work: false,
  prefers_virtual: true,
  prefers_physical: false,
  application_status: 'approved',
  is_available: true,
  can_accept_sessions: true
}
```

**Professional Details:**
- **Specializations:** Electrical Systems, Engine Diagnostics
- **Years of Experience:** 8
- **Approved:** Yes

**Access & Permissions:**
- ✅ Can access Earnings page
- ✅ Can access Analytics dashboard
- ✅ Gets paid directly (no workshop cut)
- ✅ Virtual consultations only
- ✅ Independent contractor status
- ❌ Cannot perform physical work

**Business Logic:**
- Payments go directly to mechanic's Stripe Connect account
- Platform takes standard fee (12%)
- No workshop revenue sharing

**Testing Use Cases:**
- Virtual consultation sessions
- Direct payment flows
- Independent contractor workflows
- Remote diagnostic sessions
- Chat and video call features

---

## 2. Workshop Employee Mechanic

### Primary Test User: David Smith

**Login Credentials:**
- **Email:** `david.mechanic@askautodoctor.com`
- **Password:** `Mechanic123!`
- **Login URL:** `/mechanic/login`

**Contact Information:**
- **Phone:** +1-416-555-2001
- **Name:** David Smith

**Account Configuration:**
```javascript
{
  account_type: 'workshop_mechanic',  // KEY: Employee status
  service_tier: 'workshop_partner',
  workshop_id: '<workshop_id>',  // Linked to Premium Auto Care
  partnership_type: 'employee',
  can_perform_physical_work: true,
  prefers_virtual: false,
  prefers_physical: true,
  application_status: 'approved',
  is_available: true,
  can_accept_sessions: true
}
```

**Professional Details:**
- **Workshop:** Premium Auto Care
- **Specializations:** BMW, Mercedes-Benz
- **Years of Experience:** 15
- **Approved:** Yes

**Access & Permissions:**
- ❌ **BLOCKED** from Earnings page (403 Forbidden)
- ❌ **BLOCKED** from Analytics dashboard (403 Forbidden)
- ✅ Can accept sessions
- ✅ Can perform both virtual and physical work
- ✅ Can access mechanic dashboard
- ✅ Can view session details

**Business Logic:**
- Payments go to the **workshop**, NOT the mechanic
- Workshop handles mechanic compensation internally
- Platform takes fee from workshop's share
- Mechanic is an employee, not independent contractor

**Testing Use Cases:**
- Workshop employee workflows
- Access control for earnings pages (should be blocked)
- Physical service sessions
- Workshop-affiliated mechanic features
- Employee permission boundaries

### Alternative Test User: Alex Thompson

**Login Credentials:**
- **Email:** `workshop.mechanic@test.com`
- **Password:** `1234`
- **Login URL:** `/mechanic/login`

**Account Configuration:**
- **Workshop:** Elite Auto Care Workshop
- **Account Type:** `workshop_mechanic`
- **Profile Completion:** 91%
- **Brand Specialist:** Honda, Toyota, Mazda, Nissan

**Database IDs:**
- **Supabase Auth ID:** 8019ea82-9eb3-4df8-b97a-3079d589fe7a
- **Mechanic ID:** c62837da-8ff1-4218-afbe-3da2e940dfd7
- **Workshop ID:** 573d6fc4-fc4b-4422-aebf-737d13226f8a

**Reference:** See [documentation/testing/dummy-mechanic-setup.md](./dummy-mechanic-setup.md)

---

## 3. Independent Workshop Owner

### Primary Test User: James Taylor

**Login Credentials:**
- **Email:** `james.mechanic@askautodoctor.com`
- **Password:** `Mechanic123!`
- **Login URL:** `/mechanic/login`

**Contact Information:**
- **Phone:** +1-403-555-2003
- **Name:** James Taylor

**Account Configuration:**
```javascript
{
  account_type: 'individual_mechanic',  // KEY: Independent owner
  service_tier: 'workshop_partner',
  workshop_id: '<own_workshop_id>',  // Links to their OWN workshop
  can_perform_physical_work: true,
  prefers_virtual: false,
  prefers_physical: true,
  application_status: 'approved',
  is_available: true,
  can_accept_sessions: true
}
```

**Professional Details:**
- **Workshop:** Independent Auto Shop (owns it)
- **Specializations:** Diesel, Heavy Duty
- **Years of Experience:** 20
- **Approved:** Yes

**Access & Permissions:**
- ✅ Can access Earnings page (owns the business)
- ✅ Can access Analytics dashboard
- ✅ Gets paid directly
- ✅ Can perform both virtual and physical work
- ✅ Has workshop affiliation but maintains independent status
- ✅ Full financial visibility

**Business Logic:**
- Payments go directly to mechanic (they own the workshop)
- Platform takes standard fee (12%)
- No revenue sharing with other entities
- Mechanic is both the service provider and business owner

**Testing Use Cases:**
- Independent business owner workflows
- Workshop owner with full access
- Physical and virtual service capability
- Direct payment to business owner
- Workshop-affiliated but independent status

### Alternative Test User

**Login Credentials:**
- **Email:** `independent.test@theautodoctor.com`
- **Password:** `Test1234!`
- **Login URL:** `/mechanic/login`

**Account Configuration:**
- **Workshop:** Independent Auto Shop
- **Years of Experience:** 12
- **Specializations:** Engine Repair, Diagnostics, Performance Tuning

---

## Additional Test Users

### Admin Users

**Login URL:** `/admin/login`

| Name | Email | Password |
|------|-------|----------|
| Admin One | admin1@askautodoctor.com | Admin123!@# |
| Admin Two | admin2@askautodoctor.com | Admin123!@# |
| Admin Three | admin3@askautodoctor.com | Admin123!@# |

**Configuration:**
```javascript
{
  role: 'admin',
  account_type: 'admin',
  email_verified: true
}
```

---

## Virtual-Only Mechanics (Additional)

### Mike Chen

**Email:** `mike.mechanic@askautodoctor.com`
**Password:** `Mechanic123!`
**Phone:** +1-604-555-1002
**Specializations:** Transmission, Brakes
**Experience:** 12 years

### Emily Rodriguez

**Email:** `emily.mechanic@askautodoctor.com`
**Password:** `Mechanic123!`
**Phone:** +1-403-555-1003
**Specializations:** HVAC, Suspension
**Experience:** 6 years

---

## Workshop-Affiliated Mechanics (Additional)

### Lisa Wong

**Email:** `lisa.mechanic@askautodoctor.com`
**Password:** `Mechanic123!`
**Phone:** +1-604-555-2002
**Workshop:** Quick Fix Garage
**Specializations:** Toyota, Honda
**Experience:** 10 years

---

## Test Workshops

### Premium Auto Care
- **Email:** contact@premiumauto.com
- **Phone:** +1-416-555-0201
- **Location:** Toronto, ON M5V 3A8
- **Affiliated Mechanic:** David Smith

### Quick Fix Garage
- **Email:** info@quickfix.com
- **Phone:** +1-604-555-0301
- **Location:** Vancouver, BC V6B 2W9
- **Affiliated Mechanic:** Lisa Wong

### Expert Motors
- **Email:** service@expertmotors.com
- **Phone:** +1-403-555-0401
- **Location:** Calgary, AB T2P 0Y3

### Elite Auto Care Workshop
- **Email:** See dummy-mechanic-setup.md
- **Workshop ID:** 573d6fc4-fc4b-4422-aebf-737d13226f8a
- **Affiliated Mechanic:** Alex Thompson

### Independent Auto Shop
- **Email:** independent@theautodoctor.com
- **Phone:** +1-416-555-5678
- **Location:** Toronto, ON M4B1B3
- **Owner:** James Taylor (independent owner)

---

## Key Differences Between Mechanic Types

### Account Type Field (`account_type`)

| Value | Description | Earnings Access | Payment Goes To |
|-------|-------------|-----------------|-----------------|
| `individual_mechanic` | Independent contractor or owner | ✅ YES | Mechanic directly |
| `workshop_mechanic` | Workshop employee | ❌ NO (403) | Workshop entity |

### Service Tier Field (`service_tier`)

| Value | Description | Physical Work | Workshop Link |
|-------|-------------|---------------|---------------|
| `virtual_only` | Virtual consultations only | ❌ No | Must be NULL |
| `workshop_partner` | Can do physical work | ✅ Yes | Can be SET |

### Workshop ID Field (`workshop_id`)

| Value | Meaning | Independent? | Earnings Access |
|-------|---------|--------------|-----------------|
| `NULL` | No workshop affiliation | ✅ YES | ✅ YES |
| `<workshop_id>` + `individual_mechanic` | Owns the workshop | ✅ YES | ✅ YES |
| `<workshop_id>` + `workshop_mechanic` | Employee of workshop | ❌ NO | ❌ NO (403) |

---

## Testing Scenarios by User Type

### 1. Virtual-Only Mechanic Testing
- [ ] Login successfully
- [ ] View available sessions
- [ ] Accept virtual consultation
- [ ] Conduct chat session
- [ ] Conduct video session
- [ ] View earnings breakdown
- [ ] View analytics dashboard
- [ ] Verify direct payment to mechanic
- [ ] Confirm no physical work options

### 2. Workshop Employee Testing
- [ ] Login successfully
- [ ] View available sessions
- [ ] Accept session
- [ ] Try to access /mechanic/earnings → **Should get 403**
- [ ] Try to access /mechanic/analytics → **Should get 403**
- [ ] View session details (allowed)
- [ ] Verify payment goes to workshop, not mechanic
- [ ] Confirm both virtual and physical work available

### 3. Independent Owner Testing
- [ ] Login successfully
- [ ] View available sessions
- [ ] Accept session
- [ ] Access /mechanic/earnings → **Should succeed**
- [ ] Access /mechanic/analytics → **Should succeed**
- [ ] View earnings breakdown
- [ ] Verify direct payment to mechanic/owner
- [ ] Confirm workshop link shows own business
- [ ] Confirm both virtual and physical work available

---

## Database Schema Reference

### mechanics Table Key Fields

```sql
CREATE TABLE mechanics (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT,

  -- Critical classification fields
  account_type TEXT CHECK (account_type IN (
    'individual_mechanic',  -- Independent or owner
    'workshop_mechanic'     -- Employee
  )),

  service_tier TEXT CHECK (service_tier IN (
    'virtual_only',        -- Virtual consultations only
    'workshop_partner'     -- Can do physical work
  )),

  workshop_id UUID REFERENCES organizations(id),

  -- Work preferences
  can_perform_physical_work BOOLEAN DEFAULT false,
  prefers_virtual BOOLEAN DEFAULT true,
  prefers_physical BOOLEAN DEFAULT false,

  -- Status fields
  application_status TEXT DEFAULT 'pending',
  is_available BOOLEAN DEFAULT true,
  can_accept_sessions BOOLEAN DEFAULT false,

  -- Professional info
  specializations TEXT[],
  years_of_experience INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);
```

---

## Payment Flow Reference

### Virtual-Only Mechanic (Sarah)
```
Customer pays → Platform → (Platform Fee 12%) → Mechanic 88%
                                                  └→ Sarah's Stripe Connect
```

### Workshop Employee (David)
```
Customer pays → Platform → (Platform Fee 12%) → Workshop 88%
                                                  └→ Premium Auto Care
                                                      └→ (Internal payroll to David)
```

### Independent Owner (James)
```
Customer pays → Platform → (Platform Fee 12%) → Mechanic/Owner 88%
                                                  └→ James's Stripe Connect
```

---

## Seeding Script Reference

All test users can be created using:

```bash
node scripts/seed-test-users.js
```

**Script Location:** [scripts/seed-test-users.js](../../scripts/seed-test-users.js)

**What it creates:**
- 3 Admin users
- 3 Workshop organizations
- 3 Virtual-only mechanics
- 3 Workshop-affiliated mechanics

**Output:** Script prints all credentials after completion.

---

## Security Notes

⚠️ **IMPORTANT:** These are test credentials only. Do not use in production.

- All passwords are intentionally simple for testing
- Test users should be disabled in production environment
- Use environment variable `NODE_ENV=development` to ensure test endpoints are properly protected
- Consider adding `TEST_USER` flag in database for easy identification and cleanup

---

## Troubleshooting

### Issue: Cannot access Earnings page (403 error)

**Expected Behavior:**
- Workshop employees (`account_type = 'workshop_mechanic'`) should get 403
- This is correct and intentional

**Check:**
```sql
SELECT
  email,
  account_type,
  workshop_id,
  service_tier
FROM mechanics
WHERE email = 'your.test@email.com';
```

### Issue: Virtual mechanic trying to accept physical work sessions

**Check:**
```sql
SELECT
  service_tier,
  can_perform_physical_work,
  workshop_id
FROM mechanics
WHERE email = 'sarah.mechanic@askautodoctor.com';
```

**Expected Values:**
- `service_tier`: 'virtual_only'
- `can_perform_physical_work`: false
- `workshop_id`: NULL

---

## Related Documentation

- [Dummy Mechanic Setup](./dummy-mechanic-setup.md) - Alex Thompson detailed setup
- [Mechanic Dashboard Access Analysis](../00-summaries-analysis/MECHANIC_DASHBOARD_ACCESS_ANALYSIS.md)
- [Implementation Status](../00-summaries-analysis/IMPLEMENTATION_STATUS_AND_NEXT_STEPS.md)
- [Stripe Connect Payment Splits](../00-summaries-analysis/STRIPE_CONNECT_PAYMENT_SPLITS_ANALYSIS.md)

---

**Document Maintained By:** Development Team
**For Questions:** Refer to project documentation or contact dev team
**Last Verified:** 2025-11-10
