# Professional Mechanic Signup System

## Overview

A comprehensive mechanic signup and credential verification system with multi-step forms, document uploads, and admin approval workflow.

## Features

### Multi-Step Signup Process
- **Step 1: Personal Information**
  - Full name, email, phone
  - Complete address (street, city, province, postal code, country)
  - Date of birth (18+ verification)
  - SIN or Business Number (for tax purposes)
  - Password creation

- **Step 2: Credentials & Certifications**
  - Years of experience
  - Specializations (multi-select from 12 options)
  - Red Seal Certification (optional)
    - Certificate number
    - Province issued
    - Expiry date
    - Document upload
  - Other certifications (ASE, NOA, manufacturer certs)

- **Step 3: Shop Information**
  - Work arrangement (independent, dealership, franchise, mobile)
  - Shop name and address (if applicable)
  - Business license number
  - Business license upload

- **Step 4: Insurance & Background**
  - Liability insurance (required)
    - Policy number
    - Expiry date
    - Certificate upload
  - Criminal record check (required)
    - Document upload
    - Must be within 6 months

- **Step 5: Banking & Tax**
  - Stripe Connect integration info
  - Terms & conditions acceptance

- **Step 6: Review & Submit**
  - Summary of all information
  - Edit any section
  - Submit application

### Auto-Save Functionality
- Saves draft every 30 seconds
- Local storage backup
- Backend draft saving
- Resume application on reload

### Document Management
- Secure uploads to Supabase Storage
- File validation (type, size)
- Support for PDF, JPG, PNG, WEBP
- 10MB file size limit
- Document tracking in database

### Admin Approval Workflow
- View all applications by status
- Filter by: pending, under review, approved, rejected
- Search by name or email
- Detailed application viewer
- Document preview/download
- Actions:
  - Approve (send to Stripe onboarding)
  - Reject (with reason)
  - Request additional information
- Audit trail of all actions

## File Structure

```
/supabase/migrations/
  └── 20251023000001_upgrade_mechanics_credentials.sql

/src/app/mechanic/signup/
  ├── page.tsx                    # Multi-step signup form
  ├── success/page.tsx            # Success confirmation
  └── draft/page.tsx              # Resume draft (future)

/src/app/api/mechanic/
  ├── signup/
  │   ├── route.ts               # Create mechanic application
  │   └── draft/route.ts         # Save draft
  └── upload-document/route.ts   # File upload handler

/src/app/admin/(shell)/mechanics/applications/
  └── page.tsx                    # Admin review dashboard

/src/app/api/admin/mechanics/
  ├── applications/route.ts       # Get applications
  └── [id]/
      ├── approve/route.ts        # Approve application
      ├── reject/route.ts         # Reject application
      └── request_info/route.ts   # Request more info

/src/types/supabase.ts            # Updated type definitions
```

## Database Schema

### Tables

#### `mechanics` (enhanced)
New fields added:
- **Personal**: full_address, city, province, postal_code, country, date_of_birth, sin_or_business_number
- **Credentials**: red_seal_certified, red_seal_number, red_seal_province, red_seal_expiry_date, certification_documents[], other_certifications (JSONB), years_of_experience, specializations[]
- **Shop**: shop_affiliation, shop_name, shop_address, business_license_number, business_license_document
- **Insurance**: liability_insurance, insurance_policy_number, insurance_expiry, insurance_document, criminal_record_check, crc_date, crc_document
- **Banking**: banking_info_completed
- **Workflow**: application_status, background_check_status, approval_notes, reviewed_by, reviewed_at, application_submitted_at, approved_at, application_draft (JSONB), current_step, last_updated

#### `mechanic_documents` (new)
Tracks all uploaded documents:
- `id` (UUID)
- `mechanic_id` (FK to mechanics)
- `document_type` (enum: red_seal_certificate, other_certification, business_license, insurance_certificate, criminal_record_check, id_verification, other)
- `file_name`, `file_size`, `file_type`
- `storage_path`, `storage_url`
- `verified`, `verified_by`, `verified_at`
- `metadata` (JSONB)

#### `mechanic_admin_actions` (new)
Audit trail of admin actions:
- `id` (UUID)
- `mechanic_id` (FK to mechanics)
- `admin_id`
- `action_type` (enum: application_submitted, under_review, approved, rejected, info_requested, document_verified, note_added)
- `notes`
- `metadata` (JSONB)

### Indexes
- `mechanics_application_status_idx`
- `mechanics_background_check_status_idx`
- `mechanics_email_idx`
- `mechanics_red_seal_number_idx`
- `mechanic_documents_mechanic_id_idx`
- `mechanic_documents_document_type_idx`
- `mechanic_admin_actions_mechanic_id_idx`

## API Endpoints

### Mechanic Endpoints

#### `POST /api/mechanic/signup`
Creates a new mechanic application.

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "+1 (555) 123-4567",
  "password": "securepassword",
  "address": "123 Main St",
  "city": "Toronto",
  "province": "Ontario",
  "postalCode": "M5V 1A1",
  "country": "Canada",
  "dateOfBirth": "1990-01-01",
  "sinOrBusinessNumber": "123-456-789",
  "redSealCertified": true,
  "redSealNumber": "RS123456",
  "redSealProvince": "Ontario",
  "redSealExpiry": "2025-12-31",
  "yearsOfExperience": "10",
  "specializations": ["Brakes", "Engine Repair", "Diagnostics"],
  "shopAffiliation": "independent",
  "liabilityInsurance": true,
  "insurancePolicyNumber": "INS123456",
  "insuranceExpiry": "2025-12-31",
  "criminalRecordCheck": true,
  "uploadedDocuments": {
    "redSeal": "https://...",
    "insurance": "https://...",
    "crc": "https://..."
  }
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Application submitted successfully!",
  "mechanicId": "uuid"
}
```

#### `POST /api/mechanic/signup/draft`
Saves application draft.

**Request Body:**
```json
{
  "form": { /* form data */ },
  "step": 3
}
```

#### `POST /api/mechanic/upload-document`
Uploads a document to Supabase Storage.

**Form Data:**
- `file`: File (required)
- `type`: string (required) - Document type
- `email`: string (required) - Mechanic email

**Response:**
```json
{
  "success": true,
  "url": "https://...",
  "path": "mechanic_documents/...",
  "fileName": "document.pdf",
  "size": 123456,
  "type": "application/pdf"
}
```

### Admin Endpoints

#### `GET /api/admin/mechanics/applications?status=pending`
Get applications by status.

**Query Params:**
- `status`: pending | under_review | approved | rejected | additional_info_required

**Response:**
```json
{
  "success": true,
  "applications": [
    {
      "id": "uuid",
      "name": "John Smith",
      "email": "john@example.com",
      "application_status": "pending",
      // ... all mechanic fields
    }
  ]
}
```

#### `POST /api/admin/mechanics/[id]/approve`
Approve an application.

**Request Body:**
```json
{
  "notes": "All credentials verified"
}
```

#### `POST /api/admin/mechanics/[id]/reject`
Reject an application.

**Request Body:**
```json
{
  "notes": "Insurance expired, please update and reapply"
}
```

#### `POST /api/admin/mechanics/[id]/request_info`
Request additional information.

**Request Body:**
```json
{
  "notes": "Please provide a clearer copy of your Red Seal certificate"
}
```

## Supabase Storage Setup

Create a `documents` bucket in Supabase Storage:

1. Go to Storage in Supabase Dashboard
2. Create new bucket: `documents`
3. Set to private (authenticated access only)
4. Create folder: `mechanic_documents`

### Storage Policies (RLS)

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow mechanics to read own documents
CREATE POLICY "Allow mechanics to read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'mechanic_documents'
);

-- Allow admins to read all documents
-- (Implement admin role check)
```

## Application States

### Status Flow
```
draft → pending → under_review → approved/rejected
                              ↓
                   additional_info_required → pending
```

### Status Descriptions
- **draft**: Application started but not submitted
- **pending**: Submitted, awaiting admin review
- **under_review**: Admin is actively reviewing
- **approved**: Application approved, mechanic can access platform
- **rejected**: Application rejected
- **additional_info_required**: Admin needs more information

## Frontend Components

### Signup Page Features
- Progressive disclosure (show/hide sections)
- Real-time validation
- Auto-save draft every 30 seconds
- Progress indicator (6 steps)
- Edit capability from review page
- Professional UI/UX
- Mobile responsive
- Accessibility compliant

### Admin Dashboard Features
- Stats cards (pending, under review, approved, rejected)
- Search and filter
- Application cards with key info
- Detailed modal view
- Document viewer/downloader
- Action buttons (approve, reject, request info)
- Notes/comments system

## Security Considerations

### Data Encryption
⚠️ **IMPORTANT**: The current implementation stores SIN/Business Numbers as plain text. In production:

1. Use encryption library (crypto-js or Node crypto)
2. Store encryption key in environment variables
3. Encrypt before storing, decrypt when needed
4. Consider using Supabase Vault for sensitive data

Example encryption setup:
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const ENCRYPTION_IV = process.env.ENCRYPTION_IV!;   // 16 bytes

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, ENCRYPTION_IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(text: string): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, ENCRYPTION_IV);
  let decrypted = decipher.update(text, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### File Upload Security
- File type validation
- File size limits (10MB)
- Virus scanning (recommended: ClamAV integration)
- Secure storage paths
- Signed URLs for sensitive documents

### Access Control
- Mechanics can only access own data
- Admin authentication required for review
- RLS policies on all tables
- Session-based authentication

## Email Notifications

### To Implement
1. **Application Submitted** (to mechanic)
   - Confirmation email
   - What to expect next
   - Timeline

2. **Application Under Review** (to mechanic)
   - Status update
   - Admin is reviewing

3. **Application Approved** (to mechanic)
   - Congratulations message
   - Next steps: Stripe Connect onboarding
   - Access to dashboard

4. **Application Rejected** (to mechanic)
   - Reason for rejection
   - How to appeal or reapply

5. **Additional Info Required** (to mechanic)
   - What information is needed
   - Link to update application

6. **New Application** (to admin)
   - New application submitted
   - Link to review

## Integration with Stripe Connect

After approval, mechanic needs to complete Stripe Connect onboarding:

1. Admin approves application
2. Mechanic receives email with onboarding link
3. Mechanic completes Stripe Connect (banking, tax info)
4. System updates `stripe_account_id`, `stripe_onboarding_completed`
5. Mechanic can start accepting jobs

## Testing

### Test Scenarios

1. **Complete Application Flow**
   - Fill all 6 steps
   - Upload documents
   - Submit
   - Verify in admin dashboard

2. **Draft Save/Resume**
   - Start application
   - Leave page
   - Return and verify data persists

3. **Validation**
   - Try submitting incomplete steps
   - Verify error messages
   - Test file upload limits

4. **Admin Actions**
   - Approve application
   - Reject application
   - Request additional info
   - Verify status changes

5. **Document Upload**
   - Test different file types
   - Test size limits
   - Verify storage

## Future Enhancements

1. **Background Check Integration**
   - API integration with background check providers
   - Automated verification

2. **Red Seal Verification**
   - API to verify Red Seal numbers
   - Province database lookup

3. **Email System**
   - SendGrid or AWS SES integration
   - Email templates

4. **Document Verification**
   - OCR for document validation
   - AI-powered document verification

5. **Analytics**
   - Application completion rates
   - Drop-off analysis
   - Time to approval metrics

6. **Mechanic Profile**
   - Public profile page
   - Ratings and reviews
   - Work history

## Deployment Checklist

- [ ] Run database migration
- [ ] Create Supabase Storage bucket
- [ ] Set up storage policies
- [ ] Configure environment variables
- [ ] Set up encryption keys
- [ ] Test document uploads
- [ ] Configure email service
- [ ] Set up admin authentication
- [ ] Test complete application flow
- [ ] Set up monitoring/alerts

## Support

For questions or issues:
- Check the application logs
- Review Supabase logs
- Check storage bucket permissions
- Verify RLS policies

## License

Internal use only - AskAutoDoctor
