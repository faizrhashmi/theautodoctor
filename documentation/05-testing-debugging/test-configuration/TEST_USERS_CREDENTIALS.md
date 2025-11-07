# Test Users - Login Credentials

**Created**: October 27, 2025
**Purpose**: Development and testing accounts

---

## 🎯 Quick Reference

| User Type | Count | Login URL |
|-----------|-------|-----------|
| 👑 Admins | 3 | http://localhost:3000/admin/login |
| 👥 Customers | 3 | http://localhost:3000/customer/login |
| 🏢 Workshops | 3 | N/A (organizational accounts) |
| 👨‍🔧 Virtual Mechanics | 3 | http://localhost:3000/mechanic/login |
| 🏢👨‍🔧 Workshop Mechanics | 3 | http://localhost:3000/mechanic/login |

---

## 👑 ADMIN USERS

Admin users have full platform access including user management, analytics, and system configuration.

### 1. Admin One
- **Email**: `admin1@askautodoctor.com`
- **Password**: `12345678`
- **User ID**: `ffada522-fb5b-4b8b-99c1-64282f0a2e33`
- **Role**: admin
- **Login**: http://localhost:3000/admin/login

### 2. Admin Two
- **Email**: `admin2@askautodoctor.com`
- **Password**: `12345678`
- **User ID**: `07e0beb5-d6b3-49e3-9a7c-880a638a7bcd`
- **Role**: admin
- **Login**: http://localhost:3000/admin/login

### 3. Admin Three
- **Email**: `admin3@askautodoctor.com`
- **Password**: `12345678`
- **User ID**: `5561cd74-d460-4c81-813e-45f32a0a29fe`
- **Role**: admin
- **Login**: http://localhost:3000/admin/login

---

## 👥 CUSTOMER USERS

Customer users can book sessions, manage vehicles, and view service history.

### 1. John Customer
- **Email**: `customer1@test.com`
- **Password**: `12345678`
- **User ID**: `11c26181-e555-4bff-aa16-164056d57335`
- **Full Name**: John Customer
- **Phone**: `+1-416-555-9001`
- **Location**: Toronto, ON
- **Role**: customer
- **Login**: http://localhost:3000/customer/login

### 2. Sarah Customer
- **Email**: `customer2@test.com`
- **Password**: `12345678`
- **User ID**: `05014597-fd42-4dd3-9609-d41f4a0bd6d7`
- **Full Name**: Sarah Customer
- **Phone**: `+1-604-555-9002`
- **Location**: Vancouver, BC
- **Role**: customer
- **Login**: http://localhost:3000/customer/login

### 3. Mike Customer
- **Email**: `customer3@test.com`
- **Password**: `12345678`
- **User ID**: `fd38c720-3ffe-4810-a2b7-3ad5de184f37`
- **Full Name**: Mike Customer
- **Phone**: `+1-403-555-9003`
- **Location**: Calgary, AB
- **Role**: customer
- **Login**: http://localhost:3000/customer/login

---

## 🏢 WORKSHOP ORGANIZATIONS

Workshop organizations represent physical auto repair shops that can employ mechanics.

### 1. Premium Auto Care
- **Workshop ID**: `98aeac24-8fe8-45d9-9838-a632bfcea85a`
- **Email**: `contact@premiumauto.com`
- **Phone**: `+1-416-555-0201`
- **Location**: Toronto, ON M5V 3A8
- **Status**: Active, Verified
- **Affiliated Mechanic**: David Smith (BMW/Mercedes specialist)

### 2. Quick Fix Garage
- **Workshop ID**: `78db0e30-5e16-4092-a6fd-ba9bd31b6b84`
- **Email**: `info@quickfix.com`
- **Phone**: `+1-604-555-0301`
- **Location**: Vancouver, BC V6B 2W9
- **Status**: Active, Verified
- **Affiliated Mechanic**: Lisa Wong (Toyota/Honda specialist)

### 3. Expert Motors
- **Workshop ID**: `2ec0070c-cabf-425c-becd-5e4bd8c1f913`
- **Email**: `service@expertmotors.com`
- **Phone**: `+1-403-555-0401`
- **Location**: Calgary, AB T2P 0Y3
- **Status**: Active, Verified
- **Affiliated Mechanic**: James Taylor (Diesel/Heavy Duty specialist)

---

## 👨‍🔧 VIRTUAL-ONLY MECHANICS

Independent mechanics providing virtual consultations only (no physical repairs).

### 1. Sarah Johnson
- **Email**: `sarah.mechanic@askautodoctor.com`
- **Password**: `12345678`
- **Mechanic ID**: `e03b9b39-190e-477e-b783-3e350f6fcb62`
- **Phone**: `+1-416-555-1001`
- **Service Tier**: `virtual_only`
- **Workshop**: None (Independent)
- **Specializations**:
  - Electrical Systems
  - Engine Diagnostics
- **Experience**: 8 years
- **Status**: Approved, Available
- **Login**: http://localhost:3000/mechanic/login

### 2. Mike Chen
- **Email**: `mike.mechanic@askautodoctor.com`
- **Password**: `12345678`
- **Mechanic ID**: `6140ba18-eecb-4d25-8f96-c75eda24e4e3`
- **Phone**: `+1-604-555-1002`
- **Service Tier**: `virtual_only`
- **Workshop**: None (Independent)
- **Specializations**:
  - Transmission
  - Brakes
- **Experience**: 12 years
- **Status**: Approved, Available
- **Login**: http://localhost:3000/mechanic/login

### 3. Emily Rodriguez
- **Email**: `emily.mechanic@askautodoctor.com`
- **Password**: `12345678`
- **Mechanic ID**: `139d41ca-b991-4b07-94de-9b974abed149`
- **Phone**: `+1-403-555-1003`
- **Service Tier**: `virtual_only`
- **Workshop**: None (Independent)
- **Specializations**:
  - HVAC
  - Suspension
- **Experience**: 6 years
- **Status**: Approved, Available
- **Login**: http://localhost:3000/mechanic/login

---

## 🏢👨‍🔧 WORKSHOP-AFFILIATED MECHANICS

Mechanics employed by or partnered with physical workshops (can do virtual + physical repairs).

### 1. David Smith
- **Email**: `david.mechanic@askautodoctor.com`
- **Password**: `12345678`
- **Mechanic ID**: `18979297-9b8a-4778-b64b-957a15f2986d`
- **Phone**: `+1-416-555-2001`
- **Service Tier**: `workshop_partner`
- **Workshop**: Premium Auto Care (Toronto)
- **Workshop ID**: `98aeac24-8fe8-45d9-9838-a632bfcea85a`
- **Partnership Type**: Employee
- **Specializations**:
  - BMW
  - Mercedes-Benz
- **Experience**: 15 years
- **Can Perform Physical Work**: Yes
- **Status**: Approved, Available
- **Login**: http://localhost:3000/mechanic/login

### 2. Lisa Wong
- **Email**: `lisa.mechanic@askautodoctor.com`
- **Password**: `12345678`
- **Mechanic ID**: `98a812f3-43c6-487f-a40d-a53efdbf596b`
- **Phone**: `+1-604-555-2002`
- **Service Tier**: `workshop_partner`
- **Workshop**: Quick Fix Garage (Vancouver)
- **Workshop ID**: `78db0e30-5e16-4092-a6fd-ba9bd31b6b84`
- **Partnership Type**: Employee
- **Specializations**:
  - Toyota
  - Honda
- **Experience**: 10 years
- **Can Perform Physical Work**: Yes
- **Status**: Approved, Available
- **Login**: http://localhost:3000/mechanic/login

### 3. James Taylor
- **Email**: `james.mechanic@askautodoctor.com`
- **Password**: `12345678`
- **Mechanic ID**: `ac10fb6a-1d45-46bf-9cbb-33e8ba36be62`
- **Phone**: `+1-403-555-2003`
- **Service Tier**: `workshop_partner`
- **Workshop**: Expert Motors (Calgary)
- **Workshop ID**: `2ec0070c-cabf-425c-becd-5e4bd8c1f913`
- **Partnership Type**: Employee
- **Specializations**:
  - Diesel
  - Heavy Duty
- **Experience**: 20 years
- **Can Perform Physical Work**: Yes
- **Status**: Approved, Available
- **Login**: http://localhost:3000/mechanic/login

---

## 📊 Database Summary

### Users Created

```sql
-- Admin users in profiles table
SELECT id, email, role, full_name
FROM profiles
WHERE role = 'admin';
-- Result: 3 admins

-- Customer users in profiles table
SELECT id, email, role, full_name
FROM profiles
WHERE role = 'customer';
-- Result: 6 customers (3 new + 3 existing)

-- Workshop organizations
SELECT id, name, city, province
FROM organizations
WHERE organization_type = 'workshop';
-- Result: 5 workshops (3 new + 2 existing)

-- Virtual-only mechanics
SELECT id, name, email, service_tier
FROM mechanics
WHERE service_tier = 'virtual_only';
-- Result: 3 virtual mechanics

-- Workshop-affiliated mechanics
SELECT id, name, email, service_tier, workshop_id
FROM mechanics
WHERE service_tier = 'workshop_partner';
-- Result: 3 workshop mechanics
```

---

## 🧪 Testing Scenarios

### Test Customer Flow
1. Go to http://localhost:3000/customer/login
2. Login with `customer1@test.com` / `12345678`
3. Should access customer dashboard
4. Test booking a session (intake flow)
5. Test viewing session history
6. Test managing vehicles

### Test Admin Access
1. Go to http://localhost:3000/admin/login
2. Login with `admin1@askautodoctor.com` / `12345678`
3. Should access admin dashboard
4. Verify user management, analytics, settings access

### Test Virtual Mechanic Login
1. Go to http://localhost:3000/mechanic/login
2. Login with `sarah.mechanic@askautodoctor.com` / `Mechanic123!`
3. Should see mechanic dashboard
4. Verify can view/accept session requests
5. Verify availability management
6. Verify virtual-only restrictions

### Test Workshop Mechanic Login
1. Go to http://localhost:3000/mechanic/login
2. Login with `david.mechanic@askautodoctor.com` / `Mechanic123!`
3. Should see mechanic dashboard
4. Verify workshop affiliation displayed
5. Verify can accept both virtual and physical work
6. Verify workshop-specific features

### Test Session Routing
1. Create a customer intake requesting BMW specialist
2. Should route to David Smith (BMW specialist, workshop-affiliated)
3. Create a general diagnostic request
4. Should be visible to all mechanics
5. Test one-session-per-mechanic policy

---

## 🔐 Security Notes

⚠️ **IMPORTANT**: These are TEST CREDENTIALS ONLY

- **DO NOT use in production**
- All passwords are simple and identical within each role
- Change passwords before any production deployment
- Consider implementing 2FA for admin accounts
- Review and adjust permissions as needed

### Password Hash Method

Mechanics use SHA-256 hashing (for development):
```javascript
const crypto = require('crypto')
const hash = crypto.createHash('sha256').update(password).digest('hex')
```

**For production**: Use bcrypt or argon2 for proper password hashing.

---

## 📝 Maintenance Scripts

### Re-seed Users
```bash
# Seed all test users (mechanics & workshops)
node scripts/seed-test-users.js

# Create customer accounts
node scripts/create-customer-users.js

# Fix/update admin users only
node scripts/fix-admin-users-v2.js

# Update all passwords to 12345678
node scripts/update-all-passwords.js

# Analyze current user structure
node scripts/analyze-user-structure.js
```

### Check User Status
```sql
-- Check all admin users
SELECT id, email, full_name, role, account_type
FROM profiles
WHERE role = 'admin';

-- Check all mechanics
SELECT id, email, name, service_tier, workshop_id, is_available
FROM mechanics;

-- Check workshops
SELECT id, name, email, city, status
FROM organizations
WHERE organization_type = 'workshop';
```

---

## ✅ Verification Checklist

After seeding, verify:

- [ ] 3 admin users can login at `/admin/login`
- [ ] 3 customer users can login at `/customer/login`
- [ ] Customers can book sessions
- [ ] 3 workshops exist in organizations table
- [ ] 3 virtual-only mechanics can login
- [ ] 3 workshop-affiliated mechanics can login
- [ ] Mechanics show correct workshop affiliation
- [ ] Mechanics appear in session request routing
- [ ] Mechanics can update availability
- [ ] One-session-per-mechanic policy enforced

---

**Status**: ✅ All test users created successfully
**Last Updated**: October 27, 2025
