# Mechanic Signup System - Setup Instructions

## Quick Start Guide

### 1. Run Database Migration

```bash
# Connect to your Supabase project
supabase db push

# Or manually run the migration file
psql -h db.xxx.supabase.co -U postgres -d postgres < supabase/migrations/20251023000001_upgrade_mechanics_credentials.sql
```

### 2. Create Supabase Storage Bucket

**Option A: Via Supabase Dashboard**
1. Go to Storage in Supabase Dashboard
2. Click "Create bucket"
3. Name: `documents`
4. Make it private (public: false)
5. Click "Create bucket"

**Option B: Via SQL**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);
```

### 3. Set Up Storage Policies

```sql
-- Allow mechanics to upload their own documents
CREATE POLICY "Mechanics can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'mechanic_documents'
);

-- Allow mechanics to read their own documents
CREATE POLICY "Mechanics can read own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'mechanic_documents'
);

-- Allow admins to read all documents (TODO: add admin role check)
CREATE POLICY "Admins can read all mechanic documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'mechanic_documents'
);
```

### 4. Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# For encryption (generate secure keys)
ENCRYPTION_KEY=your_32_byte_encryption_key
ENCRYPTION_IV=your_16_byte_iv
```

### 5. Test the System

1. **Test Signup Flow**
   - Navigate to `/mechanic/signup`
   - Fill out all 6 steps
   - Upload test documents
   - Submit application

2. **Test Admin Review**
   - Navigate to `/admin/mechanics/applications`
   - View pending applications
   - Click "Review" on an application
   - Test approve/reject/request info actions

3. **Test Document Upload**
   - Try uploading PDF, JPG, PNG files
   - Verify 10MB size limit works
   - Check files appear in Supabase Storage

### 6. Verify Database

Check that everything was created:

```sql
-- Check mechanics table has new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mechanics'
AND column_name IN (
  'red_seal_certified',
  'application_status',
  'years_of_experience'
);

-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN (
  'mechanic_documents',
  'mechanic_admin_actions'
);

-- Check indexes
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('mechanics', 'mechanic_documents', 'mechanic_admin_actions');
```

## Common Issues

### Issue: "Storage bucket 'documents' does not exist"
**Solution:** Create the bucket in Supabase Dashboard or via SQL

### Issue: "Permission denied for storage object"
**Solution:** Check storage policies are set up correctly

### Issue: File upload fails with 413 error
**Solution:** Increase Next.js body size limit in `next.config.js`:
```js
module.exports = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
```

### Issue: "Column does not exist" errors
**Solution:** Run the migration again or check if it was applied successfully

### Issue: Admin can't see applications
**Solution:**
1. Check admin authentication is working
2. Verify RLS policies allow admin access
3. Check browser console for errors

## Post-Deployment Checklist

- [ ] Database migration completed successfully
- [ ] Storage bucket created and accessible
- [ ] Storage policies configured
- [ ] Test mechanic can sign up
- [ ] Test document uploads work
- [ ] Admin can view applications
- [ ] Admin can approve/reject applications
- [ ] Email notifications configured (optional)
- [ ] Stripe Connect integration tested (optional)

## Next Steps

1. **Set up Email Notifications**
   - Configure SendGrid or AWS SES
   - Create email templates
   - Add email sending to API endpoints

2. **Implement Encryption**
   - Generate secure encryption keys
   - Update signup route to encrypt SIN
   - Test encryption/decryption

3. **Add Stripe Connect**
   - Set up Stripe Connect account
   - Implement onboarding flow
   - Test payout functionality

4. **Configure Monitoring**
   - Set up error tracking (Sentry)
   - Add application metrics
   - Create admin alerts

## Development Tips

### Testing Locally

```bash
# Start dev server
npm run dev

# Test signup
open http://localhost:3000/mechanic/signup

# Test admin
open http://localhost:3000/admin/mechanics/applications
```

### Reset Test Data

```sql
-- Delete test applications
DELETE FROM mechanic_admin_actions WHERE mechanic_id IN (
  SELECT id FROM mechanics WHERE email LIKE '%test%'
);
DELETE FROM mechanic_documents WHERE mechanic_id IN (
  SELECT id FROM mechanics WHERE email LIKE '%test%'
);
DELETE FROM mechanics WHERE email LIKE '%test%';

-- Reset application status
UPDATE mechanics SET application_status = 'pending' WHERE application_status = 'draft';
```

### Useful Queries

```sql
-- Count applications by status
SELECT application_status, COUNT(*)
FROM mechanics
GROUP BY application_status;

-- Find applications needing review
SELECT name, email, application_submitted_at
FROM mechanics
WHERE application_status = 'pending'
ORDER BY application_submitted_at DESC;

-- Check recent admin actions
SELECT m.name, a.action_type, a.notes, a.created_at
FROM mechanic_admin_actions a
JOIN mechanics m ON m.id = a.mechanic_id
ORDER BY a.created_at DESC
LIMIT 10;
```

## Support

If you encounter issues:
1. Check the documentation: `MECHANIC_SIGNUP_SYSTEM.md`
2. Review logs in Supabase Dashboard
3. Check browser console for frontend errors
4. Verify environment variables are set correctly

---

**Last Updated:** October 23, 2025
**System Version:** 1.0
