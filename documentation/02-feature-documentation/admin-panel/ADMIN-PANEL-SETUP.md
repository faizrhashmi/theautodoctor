# Admin Panel Setup Guide

Complete step-by-step guide to set up the AskAutoDoctor admin panel.

## 📋 Overview

The admin panel includes:
- **Professional Admin Dashboard** - Analytics, system monitoring, quick actions
- **User Management** - Customers and mechanics with detailed profiles
- **Session Management** - View, manage, and bulk operations on sessions
- **Corporate B2B Integration** - Fleet management, invoicing, multi-user accounts
- **Mechanic Vetting** - Credential verification, document uploads, approval workflow
- **Enhanced Customer Signup** - International support, address validation
- **Mandatory Waiver System** - Digital signature collection and tracking
- **System Health Monitoring** - Service status, uptime tracking, error logs
- **Database Query Tool** - Safe SQL execution with saved queries
- **Cleanup Utilities** - Remove expired requests, orphaned sessions

## 🚀 Quick Start

### Prerequisites
- Supabase project set up
- Admin panel code deployed
- Access to Supabase Dashboard

### Step-by-Step Setup

---

## Step 1: Run Database Migrations

### Option A: Using Supabase SQL Editor (Recommended)

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste the migration script**
   - Open `admin-panel-migrations.sql` in this folder
   - Copy ALL contents (Ctrl+A, Ctrl+C)
   - Paste into the SQL Editor

4. **Run the migration**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for completion (should take 5-10 seconds)

5. **Verify success**
   - You should see: "Admin panel migration completed successfully!"
   - Check for any error messages in red

### Option B: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

---

## Step 2: Create Storage Buckets

### Option A: Using SQL (Easier)

1. **In Supabase SQL Editor**, open a new query

2. **Copy and paste the storage script**
   - Open `storage-buckets-setup.sql`
   - Copy ALL contents
   - Paste into SQL Editor

3. **Run the script**
   - Click "Run"
   - Verify: "Storage buckets and policies created successfully!"

### Option B: Using Dashboard UI (More Control)

1. **Go to Storage** in your Supabase Dashboard

2. **Create 4 buckets:**

   **Bucket 1: mechanic_documents**
   - Click "New bucket"
   - Name: `mechanic_documents`
   - Public: **OFF** (private)
   - File size limit: `10 MB`
   - Allowed MIME types: PDF, JPEG, PNG, DOCX

   **Bucket 2: waiver_signatures**
   - Name: `waiver_signatures`
   - Public: **OFF**
   - File size limit: `2 MB`
   - Allowed MIME types: PNG, JPEG

   **Bucket 3: session_files**
   - Name: `session_files`
   - Public: **OFF**
   - File size limit: `50 MB`
   - Allowed MIME types: PDF, JPEG, PNG, MP4, DOCX, XLSX

   **Bucket 4: corporate_invoices**
   - Name: `corporate_invoices`
   - Public: **OFF**
   - File size limit: `10 MB`
   - Allowed MIME types: PDF

3. **Add policies** for each bucket (see `storage-buckets-setup.sql` for details)

---

## Step 3: Create Your First Admin User

### Option A: Convert Existing User

1. **Find your user ID**
   ```sql
   SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';
   ```

2. **Promote to admin**
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```

3. **Verify**
   ```sql
   SELECT email, role FROM profiles WHERE role = 'admin';
   ```

### Option B: Create New Admin User

1. **Go to Authentication** → Users in Supabase Dashboard

2. **Click "Add User"**
   - Email: `admin@yourdomain.com`
   - Password: (create secure password)
   - Auto Confirm User: ✓ **CHECK THIS**

3. **Set role to admin** (run in SQL Editor)
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE email = 'admin@yourdomain.com';
   ```

### Script Provided

Use the `setup-admin-user.sql` file:
1. Open it and replace `your-email@example.com` with your actual email
2. Run in SQL Editor

---

## Step 4: Access the Admin Panel

1. **Start your development server** (if not running)
   ```bash
   npm run dev
   ```

2. **Navigate to the admin login page**
   ```
   http://localhost:3000/admin/login
   ```

3. **Sign in** with your admin credentials

4. **You should see the admin dashboard** at `/admin/intakes`

---

## Step 5: Verify Everything Works

### Check These Pages:

- ✓ `/admin/intakes` - Main dashboard with overview
- ✓ `/admin/sessions` - Session management
- ✓ `/admin/customers` - Customer management
- ✓ `/admin/mechanics` - Mechanic management
- ✓ `/admin/mechanics/applications` - Mechanic application vetting
- ✓ `/admin/corporate` - Corporate business accounts
- ✓ `/admin/health` - System health monitoring
- ✓ `/admin/logs` - Error and activity logs
- ✓ `/admin/database` - Database query tool
- ✓ `/admin/settings` - Configuration panel

### Expected Behavior:

- All pages load without errors ✓
- Shows $0.00 and 0 for empty data (until you have real data) ✓
- No runtime errors or crashes ✓

---

## 📊 What Got Created

### New Database Tables (15)

**Admin & Monitoring:**
- `admin_logs` - Centralized logging
- `admin_errors` - Error tracking and grouping
- `system_health_checks` - Service health monitoring
- `cleanup_history` - Cleanup operation history
- `admin_saved_queries` - Saved SQL queries library
- `admin_query_history` - Query execution history

**Mechanic System:**
- `mechanic_documents` - Document uploads
- `mechanic_admin_actions` - Approval workflow audit trail
- `mechanics` table upgraded with 35+ new fields

**Corporate B2B:**
- `corporate_businesses` - Corporate accounts
- `corporate_employees` - Employee management
- `corporate_invoices` - Billing and invoicing
- `corporate_vehicles` - Fleet management

**Customer & Legal:**
- `waiver_signatures` - Digital waiver tracking
- `profiles` table upgraded with address, location, preferences

### Storage Buckets (4)

1. **mechanic_documents** - Certifications, licenses, insurance
2. **waiver_signatures** - Digital signature images
3. **session_files** - Session-related uploads
4. **corporate_invoices** - PDF invoices for corporate clients

### New Features

**Admin Dashboard:**
- Real-time analytics dashboard
- System health monitoring
- Activity feed and quick actions
- Bulk operations on sessions

**Mechanic Management:**
- Professional credential vetting
- Red Seal certification tracking
- Document verification workflow
- Multi-step application process
- Background check tracking

**Corporate Integration:**
- Fleet management
- Employee role-based access
- Automated invoicing
- Usage tracking and limits

**Customer Experience:**
- International address support
- Location services (lat/long)
- Communication preferences
- Newsletter subscription
- Referral tracking

**Legal Compliance:**
- Mandatory waiver before sessions
- Digital signature capture
- IP and user agent logging
- Waiver version tracking

---

## 🔧 Troubleshooting

### "Cannot read properties of undefined (reading 'toFixed')"

✅ **Fixed!** This was resolved by adding null safety checks. If you still see this:
1. Make sure you pulled the latest code
2. Restart your dev server

### "Admin login redirects in a loop"

✅ **Fixed!** Middleware now allows `/admin/login` without authentication.

### "Storage bucket not found"

- Make sure you ran the storage setup script
- Or manually create buckets in Supabase Dashboard → Storage

### "Permission denied on table X"

- Run the migrations again - RLS policies may not have been created
- Check that you're using the service role key for admin API routes

### Admin pages show no data

- This is normal before migrations! After migrations, you'll see real data
- Default values (0, $0.00) are shown for missing fields

---

## 🎯 Next Steps

### 1. Test Mechanic Signup Flow
- Go to `/mechanic/signup`
- Fill out the enhanced multi-step form
- Upload sample documents
- Test the approval workflow in admin panel

### 2. Test Corporate Signup
- Go to `/corporate/signup`
- Create a test corporate account
- Add employees and vehicles
- Generate test invoices

### 3. Test Customer Flow
- Go to `/customer/signup`
- Complete international address form
- Test waiver signature on intake
- Book a session and verify tracking

### 4. Configure System
- Add your first mechanics
- Set up corporate pricing tiers
- Configure cleanup schedules
- Set up error notifications

---

## 📝 Important Files

- `admin-panel-migrations.sql` - Database schema and tables
- `storage-buckets-setup.sql` - Storage bucket configuration
- `setup-admin-user.sql` - Quick admin user setup
- `ADMIN-PANEL-SETUP.md` - This guide

---

## 🆘 Need Help?

If you encounter issues:

1. **Check browser console** for JavaScript errors
2. **Check Supabase logs** in Dashboard → Logs
3. **Verify migrations ran** by checking table counts:
   ```sql
   SELECT COUNT(*) FROM admin_logs;
   SELECT COUNT(*) FROM corporate_businesses;
   SELECT COUNT(*) FROM mechanic_documents;
   ```

4. **Check storage buckets exist**:
   ```sql
   SELECT * FROM storage.buckets;
   ```

---

## ✅ Setup Checklist

- [ ] Run `admin-panel-migrations.sql`
- [ ] Run `storage-buckets-setup.sql`
- [ ] Create admin user with `setup-admin-user.sql`
- [ ] Test login at `/admin/login`
- [ ] Verify all admin pages load
- [ ] Test mechanic signup flow
- [ ] Test corporate signup flow
- [ ] Test customer waiver flow
- [ ] Configure cleanup schedules
- [ ] Set up monitoring alerts

---

## 🎉 You're Done!

Your admin panel is now fully set up and ready to use. You have:

✅ Professional admin dashboard
✅ Complete user management
✅ Corporate B2B platform
✅ Mechanic credential vetting
✅ Legal compliance with waivers
✅ System monitoring and logging

Start managing your platform like a pro! 🚀
