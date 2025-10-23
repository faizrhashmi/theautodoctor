# Quick Setup Reference Card

## 🚀 3-Step Admin Panel Setup

### Step 1: Run Migrations (2 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy contents of **`admin-panel-migrations.sql`**
3. Paste and click **Run**
4. Wait for: "Admin panel migration completed successfully!"

### Step 2: Create Storage Buckets (1 minute)

1. Still in **SQL Editor**, new query
2. Copy contents of **`storage-buckets-setup.sql`**
3. Paste and click **Run**
4. Wait for: "Storage buckets and policies created successfully!"

### Step 3: Create Admin User (30 seconds)

**Option A - Convert Existing User:**
```sql
-- Replace with YOUR email
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

**Option B - Create New Admin:**
1. Dashboard → **Authentication** → **Users** → **Add User**
2. Email: `admin@yourdomain.com`, Password: (secure), Auto Confirm: ✓
3. Then run:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@yourdomain.com';
```

### Done! ✅

Visit: **http://localhost:3000/admin/login**

---

## 📋 Quick Verification

```sql
-- Check admin user exists
SELECT email, role FROM profiles WHERE role = 'admin';

-- Check tables were created (should return counts)
SELECT COUNT(*) FROM admin_logs;
SELECT COUNT(*) FROM corporate_businesses;
SELECT COUNT(*) FROM mechanic_documents;

-- Check storage buckets exist (should show 4 buckets)
SELECT id, name, public FROM storage.buckets
WHERE id IN ('mechanic_documents', 'waiver_signatures', 'session_files', 'corporate_invoices');
```

---

## 🎯 Admin Panel URLs

| Feature | URL |
|---------|-----|
| Login | `/admin/login` |
| Dashboard | `/admin/intakes` |
| Sessions | `/admin/sessions` |
| Customers | `/admin/customers` |
| Mechanics | `/admin/mechanics` |
| Applications | `/admin/mechanics/applications` |
| Corporate | `/admin/corporate` |
| Health Monitor | `/admin/health` |
| Logs | `/admin/logs` |
| Database Tool | `/admin/database` |
| Settings | `/admin/settings` |

---

## ⚡ Common Commands

### Check Migration Status
```sql
-- List all new tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%admin%' OR table_name LIKE '%corporate%' OR table_name = 'waiver_signatures'
ORDER BY table_name;
```

### Add Another Admin
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'email@domain.com';
```

### Remove Admin Role
```sql
UPDATE profiles SET role = 'customer' WHERE email = 'email@domain.com';
```

### View All Admins
```sql
SELECT id, email, role, created_at FROM profiles WHERE role = 'admin';
```

---

## 🔥 Troubleshooting One-Liners

### "Cannot read properties of undefined"
```bash
# Restart dev server
npm run dev
```

### "Permission denied"
```sql
-- Re-run RLS policies section from admin-panel-migrations.sql
```

### "Bucket not found"
```sql
-- Check buckets exist
SELECT * FROM storage.buckets;
```

### Login redirect loop
```bash
# Already fixed in middleware - pull latest code
git pull
```

---

## 📦 What Was Created

**15 Database Tables**
- 6 admin/monitoring tables
- 3 mechanic tables
- 4 corporate tables
- 1 waiver table
- 1 upgraded profiles table

**4 Storage Buckets**
- mechanic_documents
- waiver_signatures
- session_files
- corporate_invoices

**35+ New Features**
- Admin dashboard with analytics
- Mechanic credential vetting
- Corporate B2B platform
- System health monitoring
- Database query tool
- Cleanup utilities

---

## 📖 Full Documentation

See **[ADMIN-PANEL-SETUP.md](./ADMIN-PANEL-SETUP.md)** for complete guide

## 📁 Files

- `admin-panel-migrations.sql` - Main migration
- `storage-buckets-setup.sql` - Storage setup
- `setup-admin-user.sql` - Admin user helper
- `ADMIN-PANEL-SETUP.md` - Full guide
- `QUICK-SETUP-REFERENCE.md` - This file
