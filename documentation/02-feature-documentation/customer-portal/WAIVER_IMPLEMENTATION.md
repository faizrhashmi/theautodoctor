# Waiver Signature Implementation

## Overview
This implementation adds a mandatory digital waiver signature system that customers must complete after filling out the intake form and before accessing their session.

## Workflow

### Customer Journey
```
1. Customer fills out intake form → Submits
2. Redirected to /intake/waiver?intake_id={id}&plan={plan}
3. Customer reads waiver terms (must scroll to bottom)
4. Customer types full name
5. Customer draws digital signature
6. Customer checks "I agree" checkbox
7. Signature submitted and stored in database
8. Redirected to next step (thank-you or payment)
```

### Access Control
- Waiver page only accessible during intake flow
- Requires valid intake_id in URL params
- If waiver already signed, automatically redirects to next step
- Prevents duplicate signatures for same intake

## Files Created

### 1. Database Migration
**File:** `supabase/migrations/20251023000001_create_waiver_signatures.sql`
**File:** `supabase/create_waiver_signatures.sql` (standalone version)

Creates `waiver_signatures` table with:
- User ID (FK to profiles)
- Intake ID (FK to intakes)
- Signature data (base64 PNG)
- IP address and user agent (legal compliance)
- Timestamp and version tracking
- Full name and email at time of signing
- Validity flag

RLS Policies:
- Users can view/insert their own signatures
- Admins can view/update all signatures

### 2. Components

**File:** `src/components/intake/WaiverSignature.tsx`

Reusable signature component featuring:
- Scrollable terms with 7 key agreement points
- Scroll-to-bottom requirement
- Name input field
- Digital signature canvas (react-signature-canvas)
- "I agree" checkbox
- Clear signature button
- Form validation
- Loading states
- Error handling

### 3. Pages

**File:** `src/app/intake/waiver/page.tsx`

Waiver signature page:
- Checks for valid intake_id in URL
- Verifies waiver not already signed
- Pre-fills user info (name, email)
- Shows progress indicator (Step 2 of 3)
- Handles signature submission
- Redirects to appropriate next step

### 4. API Endpoints

#### Submit Waiver
**File:** `src/app/api/waiver/submit/route.ts`
**Endpoint:** `POST /api/waiver/submit`

Request body:
```json
{
  "intakeId": "uuid",
  "signatureData": "data:image/png;base64,...",
  "fullName": "John Doe",
  "ipAddress": "1.2.3.4",
  "userAgent": "Mozilla/5.0...",
  "email": "john@example.com",
  "plan": "trial"
}
```

Features:
- Validates user authentication
- Verifies intake exists and matches email
- Prevents duplicate signatures
- Stores signature with metadata
- Returns redirect URL based on plan

#### Check Waiver Status
**File:** `src/app/api/waiver/check/route.ts`
**Endpoint:** `GET /api/waiver/check?intake_id={id}`

Response:
```json
{
  "signed": true|false,
  "waiverId": "uuid",
  "signedAt": "2025-10-23T...",
  "redirect": "/thank-you?..."
}
```

#### Get Waiver Data
**File:** `src/app/api/waiver/get/route.ts`
**Endpoint:** `GET /api/waiver/get?intake_id={id}&include_signature=true`

Returns waiver details for a specific intake.

#### Get User Info
**File:** `src/app/api/auth/me/route.ts`
**Endpoint:** `GET /api/auth/me`

Returns authenticated user's profile info for pre-filling forms.

### 5. Updated Files

**File:** `src/app/api/intake/start/route.ts`
- Changed redirect from `/thank-you` to `/intake/waiver`
- Both free and paid plans now redirect to waiver first
- Waiver page handles subsequent routing

**File:** `src/components/layout/SiteFooter.tsx`
- Removed "Waiver" link from footer navigation
- Waiver only accessible during intake flow

## Technical Details

### Dependencies
```json
{
  "react-signature-canvas": "^1.0.6",
  "@types/react-signature-canvas": "^1.0.5"
}
```

Installed via:
```bash
npm install react-signature-canvas @types/react-signature-canvas
```

### Security Features

1. **Authentication Required**
   - All waiver endpoints require authenticated user
   - Validates user owns the intake

2. **CSRF Protection**
   - Uses Next.js built-in CSRF protection
   - API routes validate session cookies

3. **Data Validation**
   - Server-side validation of all inputs
   - Signature must be valid base64 PNG
   - Name must be at least 2 characters
   - Email must match intake record

4. **Legal Compliance**
   - Captures IP address
   - Captures user agent
   - Timestamps signature
   - Stores waiver version for tracking changes
   - Immutable after creation (admin can invalidate only)

5. **Duplicate Prevention**
   - Checks for existing waiver before insertion
   - Prevents multiple signatures for same intake

### Waiver Terms

Current version: **1.0**
Last updated: **October 23, 2025**

Seven key agreement points:
1. Remote Consultation Nature
2. Limitation of Liability
3. Vehicle Operation Responsibility
4. Recording and Privacy
5. Professional Recommendations
6. Age and Authorization
7. No Guarantee of Results

### UI/UX Features

- **Progress Indicator:** Shows "Step 2 of 3" with visual steps
- **Scroll Detection:** Requires user to read all terms
- **Visual Feedback:**
  - Disabled submit until all requirements met
  - Clear validation errors
  - Loading states during submission
- **Responsive Design:** Works on mobile and desktop
- **Signature Canvas:**
  - White background for clear signatures
  - Clear button to restart
  - Touch-friendly on mobile devices

## Database Schema

```sql
CREATE TABLE waiver_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES intakes(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  waiver_version VARCHAR(20) DEFAULT '1.0' NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Indexes:**
- `idx_waiver_signatures_user_id` on user_id
- `idx_waiver_signatures_intake_id` on intake_id
- `idx_waiver_signatures_signed_at` on signed_at DESC
- `idx_waiver_signatures_is_valid` on is_valid

## Deployment Steps

1. **Run Database Migration**
   ```bash
   # Option 1: Via Supabase CLI (if linked)
   npx supabase db push

   # Option 2: Via SQL Editor in Supabase Dashboard
   # Copy contents of supabase/create_waiver_signatures.sql
   # Paste and run in SQL Editor
   ```

2. **Verify Migration**
   ```sql
   SELECT * FROM waiver_signatures LIMIT 1;
   ```

3. **Test Flow**
   - Fill out intake form
   - Verify redirect to waiver page
   - Complete waiver signature
   - Verify signature stored in database
   - Verify redirect to next step

4. **Monitor**
   - Check for any errors in logs
   - Verify signature images are being stored correctly
   - Test on multiple devices/browsers

## Future Enhancements

### Potential Additions
1. **PDF Generation:** Generate PDF of signed waiver for records
2. **Email Confirmation:** Send email with signed waiver copy
3. **Admin Dashboard:** View/manage all waivers
4. **Waiver Versioning:** Handle updates to waiver terms
5. **Signature Quality Check:** Validate signature isn't just a dot
6. **Rate Limiting:** Prevent abuse of signature endpoints
7. **Analytics:** Track completion rates
8. **Multi-language Support:** Translate waiver terms

### Waiver Version Updates

When updating waiver terms:
1. Update `WAIVER_VERSION` constant in `WaiverSignature.tsx`
2. Update `LAST_UPDATED` date
3. Update `WAIVER_TERMS` array with new terms
4. Update default version in database migration
5. Consider invalidating old waivers or requiring re-signing

## Troubleshooting

### Common Issues

**Issue:** Signature canvas not working on mobile
- **Solution:** Ensure `touchAction: 'none'` is set on canvas

**Issue:** User redirected away from waiver
- **Solution:** Check intake_id is in URL params and valid

**Issue:** Duplicate signature error
- **Solution:** Check `/api/waiver/check` before showing form

**Issue:** Signature data too large
- **Solution:** Canvas is 400x160px, PNG base64 is ~10-20KB typically

**Issue:** Migration fails
- **Solution:** Ensure profiles and intakes tables exist first

## Testing Checklist

- [ ] Fill intake form and verify redirect to waiver
- [ ] Try submitting without scrolling terms (should fail)
- [ ] Try submitting without signature (should fail)
- [ ] Try submitting without name (should fail)
- [ ] Try submitting without checkbox (should fail)
- [ ] Submit valid waiver and verify stored in database
- [ ] Try accessing waiver without intake_id (should error)
- [ ] Try accessing waiver after already signed (should redirect)
- [ ] Verify footer no longer has waiver link
- [ ] Test on mobile device
- [ ] Test signature canvas clear button
- [ ] Verify IP address and user agent captured
- [ ] Verify timestamp is correct
- [ ] Test free plan redirect (to thank-you)
- [ ] Test paid plan redirect (to checkout)

## Support

For issues or questions:
1. Check console logs for errors
2. Verify database migration completed
3. Check RLS policies are active
4. Verify user is authenticated
5. Check intake_id is valid UUID

## License & Legal

This implementation provides basic waiver signature functionality. Please consult with legal counsel to ensure waiver terms are appropriate for your jurisdiction and use case.
