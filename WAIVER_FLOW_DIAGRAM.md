# Waiver Signature Flow Diagram

## 📊 Complete Customer Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER INTAKE FLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   Customer   │
    │  Visits Site │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  Selects     │
    │  Plan        │
    └──────┬───────┘
           │
           ▼
┌──────────────────────┐
│  STEP 1: INTAKE FORM │
│  /intake?plan=xxx    │
├──────────────────────┤
│ • Contact details    │
│ • Vehicle info       │
│ • Issue description  │
│ • File uploads       │
└──────────┬───────────┘
           │
           │ Submit Form
           ▼
    ┌──────────────────┐
    │ API: /api/intake │
    │     /start       │
    ├──────────────────┤
    │ • Validates data │
    │ • Creates intake │
    │ • Creates session│
    │ • Returns redirect│
    └──────┬───────────┘
           │
           │ Redirect with intake_id
           ▼
┌────────────────────────────┐
│ STEP 2: WAIVER SIGNATURE   │
│ /intake/waiver?intake_id=..│
├────────────────────────────┤
│ • Progress indicator       │
│ • Scrollable legal terms   │
│ • Name input (pre-filled)  │
│ • Signature canvas         │
│ • "I agree" checkbox       │
│ • Validation               │
└──────────┬─────────────────┘
           │
           │ On page load
           ▼
    ┌──────────────────┐
    │ API: /api/waiver │
    │     /check       │
    ├──────────────────┤
    │ Already signed?  │
    └──────┬───────────┘
           │
           ├─── Yes → Redirect to next step
           │
           └─── No → Show waiver form
                     │
                     │ User signs
                     ▼
              ┌──────────────────┐
              │ API: /api/waiver │
              │     /submit      │
              ├──────────────────┤
              │ • Validates sig  │
              │ • Stores in DB   │
              │ • Captures IP    │
              │ • Captures UA    │
              │ • Returns next   │
              └──────┬───────────┘
                     │
                     ▼
              ┌──────────────┐
              │  Plan Type?  │
              └──────┬───────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
  ┌──────────┐            ┌──────────────┐
  │   FREE   │            │     PAID     │
  │  PLANS   │            │    PLANS     │
  └────┬─────┘            └──────┬───────┘
       │                         │
       ▼                         ▼
┌──────────────┐          ┌──────────────┐
│ STEP 3A:     │          │ STEP 3B:     │
│ THANK YOU    │          │ CHECKOUT     │
│ /thank-you   │          │ Stripe Page  │
├──────────────┤          ├──────────────┤
│ • Show status│          │ • Payment    │
│ • Join chat  │          │ • Then thank │
└──────────────┘          │   you page   │
                          └──────────────┘
```

## 🔄 Waiver Check Flow

```
┌─────────────────────────────────────────────────────────────┐
│              WAIVER VALIDATION & ROUTING                     │
└─────────────────────────────────────────────────────────────┘

User arrives at /intake/waiver?intake_id=xxx
           │
           ▼
    ┌──────────────┐
    │ Has intake_id│
    │  in params?  │
    └──────┬───────┘
           │
    ┌──────┴──────┐
    │             │
   No            Yes
    │             │
    ▼             ▼
┌────────┐   ┌────────────┐
│ ERROR  │   │ Check if   │
│ PAGE   │   │ signed     │
└────────┘   └─────┬──────┘
                   │
          ┌────────┴────────┐
          │                 │
    Already Signed      Not Signed
          │                 │
          ▼                 ▼
    ┌──────────┐      ┌──────────┐
    │ Redirect │      │  Show    │
    │ to next  │      │  Waiver  │
    │   step   │      │   Form   │
    └──────────┘      └──────────┘
```

## 🎨 Waiver Page UI Components

```
┌─────────────────────────────────────────────────────────────┐
│                    WAIVER SIGNATURE PAGE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  [✓] Intake   [2] Waiver   [3] Session            │    │
│  │     Complete      ACTIVE       Pending              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         🖊️  Automotive Consultation Agreement       │    │
│  │                                                      │    │
│  │         Version 1.0 • Last updated: Oct 23, 2025   │    │
│  │                                                      │    │
│  │  Please review terms before joining your session    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Terms of Service                                   │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │ 1. Remote Consultation Nature               │ │    │
│  │  │    Description text...                       │ │    │
│  │  │                                              │ │    │
│  │  │ 2. Limitation of Liability                  │ │    │
│  │  │    Description text...                       │ │    │
│  │  │                                              │ │    │
│  │  │ 3. Vehicle Operation Responsibility         │ ▼    │
│  │  │    Description text...                       │ │    │
│  │  │                                              │ │    │
│  │  │ [Scrollable - must scroll to bottom]        │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  │  ⚠️ Please scroll through all terms to continue    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Sign & Confirm                                     │    │
│  │                                                      │    │
│  │  Full Legal Name *                                  │    │
│  │  ┌────────────────────────────────────────────┐   │    │
│  │  │ John Doe                                   │   │    │
│  │  └────────────────────────────────────────────┘   │    │
│  │                                                      │    │
│  │  Digital Signature *              [Clear]           │    │
│  │  ┌────────────────────────────────────────────┐   │    │
│  │  │                                            │   │    │
│  │  │        [Signature Canvas - White BG]       │   │    │
│  │  │                                            │   │    │
│  │  └────────────────────────────────────────────┘   │    │
│  │  Sign using mouse or touchscreen                   │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │ ☑ I certify I am 18+, have read all terms, │ │    │
│  │  │   and agree to this agreement.              │ │    │
│  │  │   Signing as: john@example.com              │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │  ✓ Submit signature & continue              │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  │                                                      │    │
│  │  Your signature will be securely stored              │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 🗄️ Database Relationships

```
┌──────────────┐         ┌────────────────────┐
│   profiles   │◄────────│ waiver_signatures  │
│              │         │                    │
│ id (PK)      │         │ id (PK)            │
│ full_name    │         │ user_id (FK)       │
│ email        │         │ intake_id (FK)     │
│ role         │         │ signature_data     │
└──────────────┘         │ ip_address         │
                         │ user_agent         │
                         │ signed_at          │
                         │ waiver_version     │
                         │ is_valid           │
                         │ full_name          │
                         │ email              │
                         └────────┬───────────┘
                                  │
                                  │
                         ┌────────▼───────────┐
                         │     intakes        │
                         │                    │
                         │ id (PK)            │
                         │ plan               │
                         │ email              │
                         │ name               │
                         │ vehicle_info       │
                         │ concern            │
                         └────────────────────┘
```

## 🔐 Security & Access Control

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Authentication                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • User must be logged in (auth.uid() exists)      │    │
│  │ • Session cookie validated                         │    │
│  │ • JWT token checked                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 2: Authorization                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • Verify intake belongs to user                    │    │
│  │ • Email must match intake record                   │    │
│  │ • RLS policies enforce user_id match               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 3: Validation                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • Server-side input validation                     │    │
│  │ • Signature must be valid base64 PNG               │    │
│  │ • Name minimum 2 characters                        │    │
│  │ • Prevent duplicate signatures                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 4: Audit Trail                                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • IP address captured                              │    │
│  │ • User agent captured                              │    │
│  │ • Timestamp recorded                               │    │
│  │ • Version tracked                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 📡 API Request/Response Examples

### Submit Waiver

**Request:**
```http
POST /api/waiver/submit
Content-Type: application/json
Cookie: sb-auth-token=...

{
  "intakeId": "550e8400-e29b-41d4-a716-446655440000",
  "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "fullName": "John Doe",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "email": "john@example.com",
  "plan": "trial"
}
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "waiverId": "660e8400-e29b-41d4-a716-446655440001",
  "redirect": "/thank-you?plan=trial&intake_id=550e8400..."
}
```

**Response (Error - Already Signed):**
```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": "Waiver already signed for this intake"
}
```

### Check Waiver

**Request:**
```http
GET /api/waiver/check?intake_id=550e8400-e29b-41d4-a716-446655440000
Cookie: sb-auth-token=...
```

**Response (Signed):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "signed": true,
  "waiverId": "660e8400-e29b-41d4-a716-446655440001",
  "signedAt": "2025-10-23T14:30:00Z",
  "redirect": "/thank-you?plan=trial&intake_id=550e8400..."
}
```

**Response (Not Signed):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "signed": false,
  "exists": true,
  "plan": "trial"
}
```

## 🎯 State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     WAIVER STATES                            │
└─────────────────────────────────────────────────────────────┘

    [START]
       │
       ▼
  ┌─────────┐
  │ No intake│──── Invalid intake_id ───→ [ERROR: No access]
  │   ID     │
  └────┬────┘
       │ Valid intake_id
       ▼
  ┌──────────┐
  │  Check   │
  │ existing │
  │  waiver  │
  └────┬─────┘
       │
   ┌───┴───┐
   │       │
Already   Not signed
signed      │
   │        ▼
   │   ┌──────────┐
   │   │ Loading  │
   │   │  waiver  │
   │   │   form   │
   │   └────┬─────┘
   │        │
   │        ▼
   │   ┌──────────┐
   │   │ Terms    │
   │   │ not      │───── User scrolls ────┐
   │   │ scrolled │                       │
   │   └──────────┘                       │
   │                                      │
   │                                      ▼
   │                                 ┌──────────┐
   │                                 │ Terms    │
   │                                 │ scrolled │
   │                                 └────┬─────┘
   │                                      │
   │                                      ▼
   │                                 ┌──────────┐
   │                                 │ Form     │
   │                                 │ ready    │
   │                                 └────┬─────┘
   │                                      │
   │                                      │ User fills & submits
   │                                      ▼
   │                                 ┌──────────┐
   │                                 │Submitting│
   │                                 └────┬─────┘
   │                                      │
   │                           ┌──────────┴────────┐
   │                           │                   │
   │                        Success             Error
   │                           │                   │
   │                           ▼                   ▼
   │                      ┌──────────┐        ┌────────┐
   │                      │  Signed  │        │ Show   │
   └──────────────────────►  State   │        │ error  │
                          └────┬─────┘        └────┬───┘
                               │                   │
                               │                   └──→ [Retry]
                               ▼
                          ┌──────────┐
                          │ Redirect │
                          │ to next  │
                          └──────────┘
                               │
                               ▼
                            [END]
```

## 💡 Key Features Summary

1. **Mandatory Flow**: Cannot proceed without signing
2. **Smart Routing**: Auto-redirects if already signed
3. **Legal Compliance**: Captures IP, UA, timestamp
4. **Version Tracking**: Tracks waiver version signed
5. **Duplicate Prevention**: One waiver per intake
6. **Mobile Friendly**: Touch signature support
7. **Validation**: Multi-layer validation
8. **Security**: RLS policies + auth checks
9. **Audit Trail**: Complete record of signing
10. **User Experience**: Clear progress indicators

This completes the waiver signature implementation! 🎉
