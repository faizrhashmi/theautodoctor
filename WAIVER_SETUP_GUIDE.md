# Quick Setup Guide: Mandatory Waiver Signature

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies (Already Done ✓)
```bash
npm install react-signature-canvas @types/react-signature-canvas
```

### Step 2: Run Database Migration

**Option A: Supabase CLI**
```bash
cd "C:\Users\Faiz Hashmi\theautodoctor"
npx supabase db push
```

**Option B: Supabase Dashboard (Recommended if CLI fails)**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/create_waiver_signatures.sql`
3. Paste and click "Run"
4. Verify: `SELECT COUNT(*) FROM waiver_signatures;`

### Step 3: Test the Flow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test Journey**
   - Go to `/intake?plan=trial`
   - Fill out the form
   - Submit → Should redirect to `/intake/waiver`
   - Sign the waiver
   - Submit → Should redirect to `/thank-you`

3. **Verify in Database**
   ```sql
   SELECT id, full_name, signed_at, waiver_version
   FROM waiver_signatures
   ORDER BY signed_at DESC
   LIMIT 5;
   ```

## 📋 What Was Changed

### New Files (11 files)
```
✓ supabase/migrations/20251023000001_create_waiver_signatures.sql
✓ supabase/create_waiver_signatures.sql
✓ src/components/intake/WaiverSignature.tsx
✓ src/app/intake/waiver/page.tsx
✓ src/app/api/waiver/submit/route.ts
✓ src/app/api/waiver/check/route.ts
✓ src/app/api/waiver/get/route.ts
✓ src/app/api/auth/me/route.ts
✓ WAIVER_IMPLEMENTATION.md (documentation)
✓ WAIVER_SETUP_GUIDE.md (this file)
```

### Modified Files (2 files)
```
✓ src/app/api/intake/start/route.ts (redirect to waiver)
✓ src/components/layout/SiteFooter.tsx (removed waiver link)
```

### Dependencies Added
```
✓ react-signature-canvas@^1.0.6
✓ @types/react-signature-canvas@^1.0.5
```

## 🎯 Customer Experience

### Before (Old Flow)
```
Intake Form → Thank You Page
```

### After (New Flow)
```
Intake Form → Waiver Signature → Thank You Page/Checkout
```

### Waiver Page Features
- ✅ Step progress indicator (Step 2 of 3)
- ✅ Scrollable legal terms (7 key points)
- ✅ Must scroll to bottom to enable signing
- ✅ Name input field (pre-filled if available)
- ✅ Digital signature canvas
- ✅ Clear signature button
- ✅ "I agree" checkbox
- ✅ Real-time validation
- ✅ Loading states
- ✅ Error messages
- ✅ Mobile-friendly

## 🔒 Security Features

- ✅ Authentication required
- ✅ Email validation (matches intake)
- ✅ IP address captured
- ✅ User agent captured
- ✅ Timestamp recorded
- ✅ Version tracking
- ✅ Duplicate prevention
- ✅ RLS policies enabled
- ✅ Server-side validation

## 📊 Database Table

```sql
waiver_signatures
├── id (uuid, primary key)
├── user_id (uuid, FK to profiles)
├── intake_id (uuid, FK to intakes)
├── signature_data (text, base64 PNG)
├── ip_address (text)
├── user_agent (text)
├── signed_at (timestamptz)
├── waiver_version (varchar, default '1.0')
├── is_valid (boolean, default true)
├── full_name (text)
├── email (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

## 🧪 Testing Checklist

### Basic Flow
- [ ] Intake form submits successfully
- [ ] Redirects to waiver page
- [ ] Waiver page loads with terms
- [ ] Scroll detection works
- [ ] Signature canvas works
- [ ] Clear button works
- [ ] Form validation works
- [ ] Submit button enables when ready
- [ ] Submission succeeds
- [ ] Redirects to thank-you page
- [ ] Signature stored in database

### Edge Cases
- [ ] Try accessing /intake/waiver without intake_id → Shows error
- [ ] Try signing waiver twice → Redirects automatically
- [ ] Try submitting without scrolling → Shows error
- [ ] Try submitting without name → Shows error
- [ ] Try submitting without signature → Shows error
- [ ] Try submitting without checkbox → Shows error

### Mobile Testing
- [ ] Touch signature works on mobile
- [ ] Form is responsive
- [ ] Scroll detection works on mobile
- [ ] Buttons are tap-friendly

### Free Plan
- [ ] Free plan redirects: intake → waiver → thank-you

### Paid Plan
- [ ] Paid plan redirects: intake → waiver → checkout

## 🔧 Configuration

### Waiver Version
To update waiver terms or version:

**File:** `src/components/intake/WaiverSignature.tsx`
```typescript
const WAIVER_VERSION = '1.0'  // Update this
const LAST_UPDATED = 'October 23, 2025'  // Update this

const WAIVER_TERMS = [
  // Update terms here
]
```

### Signature Canvas Size
**File:** `src/components/intake/WaiverSignature.tsx`
```typescript
canvasProps={{
  className: 'signature-canvas w-full h-40', // h-40 = 160px
}}
```

## 📱 API Endpoints

### Submit Waiver
```
POST /api/waiver/submit
Body: { intakeId, signatureData, fullName, ipAddress, userAgent, email, plan }
Returns: { success, waiverId, redirect }
```

### Check Waiver Status
```
GET /api/waiver/check?intake_id={id}
Returns: { signed, waiverId, signedAt, redirect }
```

### Get Waiver Data
```
GET /api/waiver/get?intake_id={id}&include_signature=true
Returns: { found, waiver }
```

### Get User Info
```
GET /api/auth/me
Returns: { id, email, name, phone }
```

## 🐛 Common Issues & Solutions

### Issue: Signature canvas not working
**Solution:** Ensure `react-signature-canvas` is installed:
```bash
npm list react-signature-canvas
```

### Issue: Migration fails with "table already exists"
**Solution:** Table already created, skip migration or use:
```sql
DROP TABLE IF EXISTS waiver_signatures CASCADE;
```
Then run migration again.

### Issue: "Invalid intake ID" error
**Solution:** Ensure intake was created successfully and intake_id is passed in URL.

### Issue: User redirected away from waiver
**Solution:** Check if waiver already signed. Check `/api/waiver/check` endpoint.

### Issue: Signature not saving
**Solution:** Check console logs, verify user is authenticated, check RLS policies.

## 📝 Admin Queries

### View Recent Waivers
```sql
SELECT
  ws.id,
  ws.full_name,
  ws.email,
  ws.signed_at,
  ws.waiver_version,
  ws.is_valid,
  p.full_name as user_name,
  i.plan
FROM waiver_signatures ws
JOIN profiles p ON ws.user_id = p.id
JOIN intakes i ON ws.intake_id = i.id
ORDER BY ws.signed_at DESC
LIMIT 10;
```

### Count Waivers by Date
```sql
SELECT
  DATE(signed_at) as date,
  COUNT(*) as count
FROM waiver_signatures
GROUP BY DATE(signed_at)
ORDER BY date DESC;
```

### Find Unsigned Intakes
```sql
SELECT i.*
FROM intakes i
LEFT JOIN waiver_signatures ws ON i.id = ws.intake_id
WHERE ws.id IS NULL
AND i.created_at > NOW() - INTERVAL '7 days'
ORDER BY i.created_at DESC;
```

### Invalidate Waiver (Admin only)
```sql
UPDATE waiver_signatures
SET is_valid = false
WHERE id = 'waiver-id-here';
```

## 🎓 Key Concepts

### Why Base64 for Signatures?
- Easy to store in database (TEXT column)
- No external file storage needed
- Portable across systems
- Typical size: 10-20KB per signature

### Why IP Address & User Agent?
- Legal compliance (proof of digital signature)
- Audit trail
- Fraud detection
- Dispute resolution

### Why Version Tracking?
- Terms may change over time
- Legal requirement to know what user agreed to
- Ability to require re-signing if terms change significantly

## 📚 Resources

- [react-signature-canvas docs](https://github.com/agilgur5/react-signature-canvas)
- [Digital Signature Best Practices](https://en.wikipedia.org/wiki/Electronic_signature)
- Full documentation: `WAIVER_IMPLEMENTATION.md`

## ✅ Success Criteria

You'll know it's working when:
1. ✅ Intake form redirects to waiver page
2. ✅ Waiver page shows terms and signature pad
3. ✅ Signature can be drawn and cleared
4. ✅ Form validates all requirements
5. ✅ Submission succeeds and redirects
6. ✅ Signature appears in database
7. ✅ Footer no longer shows waiver link
8. ✅ Direct access to /waiver redirects away

## 🎉 You're Done!

The mandatory waiver signature system is now complete. Customers will sign a legal waiver after every intake form submission before accessing their session.

Need help? Check the full documentation in `WAIVER_IMPLEMENTATION.md`.
