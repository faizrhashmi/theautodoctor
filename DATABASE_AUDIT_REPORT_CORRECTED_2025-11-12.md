# CORRECTED DATABASE USER AUDIT REPORT
**Generated:** 11/12/2025, 4:02:32 PM
**Status:** Using CORRECT table names (mechanics, organizations, profiles)

---

## EXECUTIVE SUMMARY

| Metric | Count | Target | Status |
|--------|-------|--------|--------|
| Total Users | 21 | - | ℹ️ |
| Customers | 6 | 5 | ✅ |
| Mechanics | 7 | 15 | ❌ |
| Workshop Admins | 6 | - | ℹ️ |
| Workshops (Organizations) | 11 | 5 | ✅ |
| Admins | 2 | - | ℹ️ |
| Session Requests | 0 | 15 | ❌ |
| Workshop Appointments | 0 | - | ℹ️ |
| RFQs Table Exists | No | Yes | ❌ |
| Quotes Table Exists | No | Yes | ❌ |

## DATA QUALITY ISSUES

- **Customers with missing data:** 6
- **Mechanics with missing data:** 3
- **Organizations with missing data:** 3

## CUSTOMERS DETAIL

| ID | Email | Name | Phone | City | Province | Postal Code | Lat/Lng | Status |
|---|---|---|---|---|---|---|---|---|
| 607a9b1f... | ktest@askautodoctor.com | N/A | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| 65acc199... | faizrhashmi@gmail.com | N/A | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| 8dda8cb3... | cust3@test.com | Customer 3 | 416-555-0102 | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| c060b46b... | cust2@test.com | Customer B | 5146592776 | Toronto | ❌ | ❌ | ❌ | ⚠️ |
| 0af3d300... | cust1@test.com | Customer A | 416-555-0100 | Toronto | ❌ | ❌ | ❌ | ⚠️ |
| c1838c27... | N/A | Deleted User | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ |

## MECHANICS DETAIL

| ID | Email | Name | Account Type | Workshop ID | Experience | Red Seal | City | Province | Postal | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1f718999... | independent.test@theautodoctor.com | Independent Workshop Owner Test | individual_mechanic | 00000000... | 12 | ❌ | Toronto | ON | M4B1B3 | ✅ |
| f3986e44... | employee.test@theautodoctor.com | Workshop Employee Test | workshop_mechanic | 00000000... | 5 | ❌ | Toronto | ON | M5V3A8 | ✅ |
| a38623ae... | virtual.test@theautodoctor.com | Virtual Test Mechanic | individual_mechanic | Independent | 8 | ❌ | Toronto | ON | M5V3A8 | ✅ |
| c62837da... | workshop.mechanic@test.com | Alex Thompson | workshop_mechanic | 573d6fc4... | 8 | ✅ | Toronto | ON | M4B 2K9 | ✅ |
| 99c254c1... | mechanic@test.com | Test Mechanic | individual_mechanic | Independent | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| 0d887221... | mech1@test.com | Mechanic 2 | individual_mechanic | Independent | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| 2750cdea... | mech@test.com | Mechanic 1 | individual_mechanic | Independent | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ |

## ORGANIZATIONS DETAIL

| ID | Name | Type | Address | City | Province | Postal | Phone | Status | Verified |
|---|---|---|---|---|---|---|---|---|---|
| 00000000... | Independent Auto Shop | workshop | 456 Independent Ave | Toronto | ON | M4B1B3 | +14165555678 | active | unverified |
| 00000000... | Test Workshop Ltd | workshop | 123 Test Street | Toronto | ON | M5V3A8 | +14165551234 | active | unverified |
| 573d6fc4... | Elite Auto Care Workshop | workshop | 456 Professional Blvd, Unit 12 | Toronto | ON | M4B 1B3 | +14165551234 | active | verified |
| a3c3090b... | Test Workshop 3 | workshop | ❌ | Toronto | Ontario | ❌ | 416-555-0402 | active | verified |
| 916a447a... | Test Workshop 2 | workshop | ❌ | Toronto | Ontario | ❌ | 416-555-0401 | active | verified |
| a8d9aa15... | Test Workshop 1 | workshop | ❌ | Toronto | Ontario | ❌ | 416-555-0400 | active | verified |
| 2ec0070c... | Expert Motors | workshop | 123 Auto Street | Calgary | AB | T2P 0Y3 | +1-403-555-0401 | active | verified |
| 78db0e30... | Quick Fix Garage | workshop | 123 Auto Street | Vancouver | BC | V6B 2W9 | +1-604-555-0301 | active | verified |
| 98aeac24... | Premium Auto Care | workshop | 123 Auto Street | Toronto | ON | M5V 3A8 | +1-416-555-0201 | active | verified |
| eabf9724... | Test Auto Workshop 1761366073077 | workshop | 123 Test Street | Toronto | ON | M5H 2N2 | +1-416-555-0100 | pending | pending |
| 1cd89e23... | Test Auto Workshop 1761366030504 | workshop | 123 Test Street | Toronto | ON | M5H 2N2 | +1-416-555-0100 | pending | pending |

## WORKSHOP ADMINS

| ID | Email | Name | Role | Org ID |
|---|---|---|---|---|
| 85481173... | elite.workshop@test.com | N/A | workshop_admin | 573d6fc4... |
| 1f0202f7... | workshop3@test.com | N/A | workshop | N/A |
| 05223cab... | workshop2@test.com | N/A | workshop | N/A |
| 1079539a... | workshop1@test.com | N/A | workshop | N/A |
| 9a5c8e9b... | service@expertmotors.com | N/A | workshop | N/A |
| 22cdcbd4... | info@quickfix.com | N/A | workshop | N/A |

## SESSION REQUESTS

⚠️ **No session requests found**

## WORKSHOP APPOINTMENTS

⚠️ **No workshop appointments found**

## CUSTOMERS WITH MISSING DATA

| ID | Email | Missing Fields |
|---|---|---|
| 607a9b1f... | ktest@askautodoctor.com | phone, city, province, postal_code, lat/lng |
| 65acc199... | faizrhashmi@gmail.com | phone, city, province, postal_code, lat/lng |
| 8dda8cb3... | cust3@test.com | city, province, postal_code, lat/lng |
| c060b46b... | cust2@test.com | province, postal_code, lat/lng |
| 0af3d300... | cust1@test.com | province, postal_code, lat/lng |
| c1838c27... | N/A | phone, city, province, postal_code, lat/lng |

## MECHANICS WITH MISSING DATA

| ID | Email | Missing Fields |
|---|---|---|
| 99c254c1... | mechanic@test.com | phone, city, province, postal_code, experience |
| 0d887221... | mech1@test.com | city, province, postal_code, experience |
| 2750cdea... | mech@test.com | city, province, postal_code, experience |

## ORGANIZATIONS WITH MISSING DATA

| ID | Name | Missing Fields |
|---|---|---|
| a3c3090b... | Test Workshop 3 | address, postal_code |
| 916a447a... | Test Workshop 2 | address, postal_code |
| a8d9aa15... | Test Workshop 1 | address, postal_code |

## REQUIRED ACTIONS

### Immediate Priorities

1. ❌ **RFQ/Quotes System**: Tables are missing or not accessible. Run latest migrations.
2. ⚠️ **Fix 6 customer(s)** with missing location data
3. ⚠️ **Fix 3 mechanic(s)** with missing data
4. ⚠️ **Fix 3 organization(s)** with missing data

### Testing Readiness

- Customers: ✅ (have 6, need 5)
- Mechanics: ❌ (have 7, need 15)
- Workshops: ✅ (have 11, need 5)
- Sessions: ❌ (have 0, need 15)
