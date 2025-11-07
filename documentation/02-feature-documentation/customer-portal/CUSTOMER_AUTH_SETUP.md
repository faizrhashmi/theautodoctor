# Customer Authentication System - Complete Setup Guide

## 🎉 What's Been Built

A complete, professional customer authentication system with:

### ✅ Core Features
- **18+ Age Verification** with legal waiver
- **Professional Signup** with password strength meter
- **Secure Login** with remember me
- **Password Reset** flow
- **Email Verification** (automatic via Supabase)
- **Customer Dashboard** showing sessions and history
- **Full Integration** with existing chat/video sessions

### 🔒 Legal Protection
- Mandatory 18+ confirmation
- Comprehensive terms of service & liability waiver
- Must scroll to bottom and accept terms
- IP address and timestamp logging
- Waiver acceptance tracked in database

### 🎨 Professional UI
- Modern gradient backgrounds
- Clean forms with validation
- Password strength indicators
- Loading states
- Error handling
- Mobile responsive

## 📁 Files Created

### Pages
```
/customer/signup/page.tsx              - Signup with waiver
/customer/login/page.tsx               - Login page
/customer/forgot-password/page.tsx     - Password reset request
/customer/verify-email/page.tsx        - Email verification confirmation
/customer/dashboard/page.tsx           - Customer dashboard with sessions
```

### API Routes
```
/api/customer/signup/route.ts          - Handle registration
/api/customer/login/route.ts           - Handle login
/api/customer/logout/route.ts          - Handle logout
/api/customer/forgot-password/route.ts - Send reset email
```

### Components
```
/components/customer/WaiverModal.tsx   - Legal waiver modal
```

### Database
```
supabase/customer_auth_schema.sql      - Profiles table with legal fields
```

## 🚀 Setup Steps

### Step 1: Run Database Migration

Go to **Supabase SQL Editor** and run:

```bash
supabase/customer_auth_schema.sql
```

This creates:
- `profiles` table with age verification fields
- `waiver_acceptances` table for logging
- Automatic profile creation trigger
- RLS policies

### Step 2: Verify Supabase Auth Settings

Go to **Supabase Dashboard → Authentication → Settings**:

1. **Enable Email Auth**:
   - ✅ Enable email signup
   - ✅ Enable email confirmations
   - Set confirmation email template

2. **Email Templates** (customize these):
   - Confirmation email
   - Reset password email
   - Change email

3. **URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) or your production URL
   - Redirect URLs: Add these:
     - `http://localhost:3000/customer/dashboard`
     - `http://localhost:3000/customer/verify-email`
     - `http://localhost:3000/customer/reset-password`

### Step 3: Environment Variables

Ensure your `.env.local` has:

```bash
# These should already exist
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# This too
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Update Existing Pages

Update your `/start` page to redirect to customer signup:

```typescript
// src/app/start/page.tsx
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'

export default async function StartPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/customer/dashboard')
  }

  redirect('/customer/signup')
}
```

### Step 5: Update Checkout Success Flow

Your existing checkout success already redirects to `/chat/[id]`. Just ensure users are logged in:

```typescript
// In src/app/api/checkout/create-session/route.ts
// Already checks for user - no changes needed!
```

## 🧪 Testing the Complete Flow

### Test 1: New Customer Signup

1. Visit: `http://localhost:3000/customer/signup`
2. Fill out form:
   - Full Name: John Doe
   - Email: john@test.com
   - Phone: +1 555-123-4567
   - Password: Test1234!
3. Click "Read & Accept Terms & Waiver"
4. Scroll to bottom of waiver
5. Click "I Accept (18+)"
6. Click "Create Account"
7. Should redirect to `/customer/verify-email`

**Check Supabase:**
```sql
SELECT * FROM auth.users WHERE email = 'john@test.com';
SELECT * FROM profiles WHERE id = 'USER_ID_HERE';
SELECT * FROM waiver_acceptances WHERE user_id = 'USER_ID_HERE';
```

### Test 2: Email Verification

1. Check your email for verification link
   - If using local dev, check Supabase logs for email content
   - Or use a tool like Mailpit for local email testing
2. Click verification link
3. Should redirect to login

**Note:** For testing, you can manually verify:
```sql
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'john@test.com';
```

### Test 3: Login

1. Visit: `http://localhost:3000/customer/login`
2. Enter credentials
3. Click "Sign In"
4. Should redirect to `/customer/dashboard`

### Test 4: Customer Dashboard

1. Should see dashboard with:
   - User's name and email
   - "New Service" button
   - Active Sessions (empty if none)
   - Quick actions sidebar

### Test 5: Start a Chat Session

1. From dashboard, click "New Service"
2. Select "Quick Chat"
3. Complete checkout with test card: `4242 4242 4242 4242`
4. Should land in professional chat UI
5. Dashboard should now show this as active session

### Test 6: Password Reset

1. Visit: `http://localhost:3000/customer/forgot-password`
2. Enter email: john@test.com
3. Click "Send Reset Link"
4. Check email for reset link
5. Click link
6. Enter new password
7. Should be able to login with new password

## 🔐 Security Features

### Implemented
- ✅ Password hashing (Supabase Auth handles this)
- ✅ Email verification required
- ✅ 18+ age verification
- ✅ Legal waiver acceptance logging
- ✅ Row Level Security (RLS) on all tables
- ✅ Server-side auth checks
- ✅ CSRF protection (Next.js handles this)
- ✅ IP address logging for waivers

### Best Practices
- Never expose service role key to client
- Always use server components for sensitive data
- RLS enforces database-level security
- Supabase handles secure password storage
- Email enumeration prevention in forgot password

## 🎯 Integration with Existing System

### How It Connects

**Checkout Flow:**
```
Customer Dashboard → /pricing → Checkout → Webhook → Create Session → /chat/[id]
```

**Session Access:**
```
Customer logs in → Dashboard shows sessions → Click "Open Chat" → /chat/[id]
Mechanic sees in /admin/sessions → Joins → Both in same chat
```

**Profile Data:**
```typescript
// Webhook already gets user ID from metadata
const supabaseUserId = session.metadata?.supabase_user_id

// This links payment to customer profile
await fulfillCheckout(plan, {
  supabaseUserId, // ← Customer's auth ID
  customerEmail,
  // ...
})
```

## 🛠️ Customization

### Update Waiver Text

Edit `src/components/customer/WaiverModal.tsx`:
- Update legal language
- Add your jurisdiction
- Modify contact email
- Change version number

### Customize Email Templates

Go to **Supabase Dashboard → Authentication → Email Templates**:
- Confirmation email
- Password reset
- Magic link (if using)

### Branding

All pages use Tailwind classes. To rebrand:
- Change `bg-blue-600` to your brand color
- Update logo in headers
- Modify gradient backgrounds

## 📊 Database Schema

### profiles Table

```sql
id                  UUID (references auth.users)
full_name           TEXT
phone               TEXT
role                TEXT (customer/admin/mechanic)
vehicle_info        JSONB
is_18_plus          BOOLEAN (required true)
waiver_accepted     BOOLEAN (required true)
waiver_accepted_at  TIMESTAMPTZ
waiver_ip_address   TEXT
terms_accepted      BOOLEAN
email_verified      BOOLEAN
account_status      TEXT (active/suspended)
metadata            JSONB
```

### waiver_acceptances Table

```sql
id              UUID
user_id         UUID (references auth.users)
waiver_version  TEXT (e.g., "v1.0")
ip_address      TEXT
user_agent      TEXT
created_at      TIMESTAMPTZ
```

## 🔗 URL Structure

### Customer Routes
```
/customer/signup              - Create account
/customer/login               - Sign in
/customer/logout              - Sign out
/customer/forgot-password     - Request reset
/customer/verify-email        - Email confirmation page
/customer/dashboard           - Main dashboard

/chat/[id]                    - Chat session (existing)
/video/[id]                   - Video session (existing)
/pricing                      - Service plans (existing)
/intake                       - Start intake (existing)
```

### API Routes
```
POST /api/customer/signup
POST /api/customer/login
POST /api/customer/logout
POST /api/customer/forgot-password
```

## ⚠️ Common Issues

### Issue: Email verification not sending
**Solution:**
- Check Supabase logs for email errors
- Verify SMTP settings in Supabase
- For local testing, manually verify user in database

### Issue: Waiver button stays disabled
**Solution:**
- Must scroll to bottom of waiver text
- Check `hasScrolled` state is updating

### Issue: Login redirects to home instead of dashboard
**Solution:**
- Check middleware isn't blocking customer routes
- Verify RLS policies allow user to query their profile

### Issue: Can't create profile
**Solution:**
- Ensure trigger `on_auth_user_created` is created
- Check profiles table exists
- Verify service role key is correct

## 🚀 Production Checklist

Before going live:

### Legal
- [ ] Have lawyer review waiver
- [ ] Update jurisdiction in waiver
- [ ] Add your business entity name
- [ ] Update contact emails
- [ ] Set waiver version to v1.0

### Supabase
- [ ] Configure production Supabase project
- [ ] Set up email SMTP (Sendgrid/AWS SES/etc)
- [ ] Customize email templates
- [ ] Set production redirect URLs
- [ ] Enable rate limiting

### Security
- [ ] Use HTTPS only
- [ ] Set secure cookie flags
- [ ] Configure CORS properly
- [ ] Enable Supabase RLS on all tables
- [ ] Review all policies

### UX
- [ ] Test on mobile devices
- [ ] Test password reset flow
- [ ] Test email verification
- [ ] Check loading states
- [ ] Verify error messages

### Integration
- [ ] Test complete checkout → chat flow
- [ ] Verify mechanic can join sessions
- [ ] Test realtime chat works
- [ ] Check dashboard shows sessions
- [ ] Verify logout works everywhere

## 🎓 User Journey

### First-Time Customer

1. **Discovery** → Lands on marketing page
2. **Pricing** → Sees service options
3. **Signup** → Creates account with 18+ verification
4. **Email** → Verifies email
5. **Login** → Signs in
6. **Dashboard** → Sees empty state
7. **New Service** → Clicks to browse services
8. **Checkout** → Pays for chat session
9. **Chat** → Lands in chat room
10. **Mechanic Joins** → Gets help
11. **Complete** → Session marked complete
12. **Dashboard** → Shows in past sessions

### Returning Customer

1. **Login** → Signs in
2. **Dashboard** → Sees active/past sessions
3. **Resume** → Clicks active session
4. **Or New** → Starts new service

---

## 🎉 You're Done!

The complete customer authentication system is ready. Just run the SQL migration and start testing!

**Next Steps:**
1. Run database migration
2. Test signup/login flow
3. Customize waiver text for your business
4. Configure production email
5. Go live!

Need help? Check the troubleshooting section or contact support.
