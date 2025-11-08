-- Upgrade mechanics table with professional credential vetting fields
-- This migration adds comprehensive fields for mechanic verification and onboarding

-- Add credential and certification fields
ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS red_seal_certified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS red_seal_number TEXT,
ADD COLUMN IF NOT EXISTS red_seal_province TEXT,
ADD COLUMN IF NOT EXISTS red_seal_expiry_date DATE,
ADD COLUMN IF NOT EXISTS certification_documents TEXT[], -- Array of storage URLs
ADD COLUMN IF NOT EXISTS other_certifications JSONB DEFAULT '{}', -- ASE, NOA, manufacturer certs
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS specializations TEXT[], -- brakes, engine, electrical, etc.

-- Shop and work information
ADD COLUMN IF NOT EXISTS shop_affiliation TEXT CHECK (shop_affiliation IN ('independent', 'dealership', 'franchise', 'mobile')),
ADD COLUMN IF NOT EXISTS shop_name TEXT,
ADD COLUMN IF NOT EXISTS shop_address TEXT,
ADD COLUMN IF NOT EXISTS business_license_number TEXT,
ADD COLUMN IF NOT EXISTS business_license_document TEXT, -- Storage URL

-- Personal information
ADD COLUMN IF NOT EXISTS full_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Canada',
ADD COLUMN IF NOT EXISTS date_of_birth DATE,

-- Insurance and legal
ADD COLUMN IF NOT EXISTS liability_insurance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
ADD COLUMN IF NOT EXISTS insurance_document TEXT, -- Storage URL
ADD COLUMN IF NOT EXISTS criminal_record_check BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS crc_date DATE,
ADD COLUMN IF NOT EXISTS crc_document TEXT, -- Storage URL

-- Sensitive encrypted data (will be encrypted at application level)
ADD COLUMN IF NOT EXISTS sin_or_business_number TEXT,

-- Banking information (for Stripe Connect)
ADD COLUMN IF NOT EXISTS banking_info_completed BOOLEAN DEFAULT FALSE,

-- Approval workflow
ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'draft' CHECK (application_status IN ('draft', 'pending', 'under_review', 'approved', 'rejected', 'additional_info_required')),
ADD COLUMN IF NOT EXISTS background_check_status TEXT DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'in_progress', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by TEXT, -- Admin user ID
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,

-- Draft saving for multi-step form
ADD COLUMN IF NOT EXISTS application_draft JSONB, -- Stores in-progress application data
ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS mechanics_application_status_idx ON public.mechanics(application_status);
CREATE INDEX IF NOT EXISTS mechanics_background_check_status_idx ON public.mechanics(background_check_status);
CREATE INDEX IF NOT EXISTS mechanics_email_idx ON public.mechanics(email);
CREATE INDEX IF NOT EXISTS mechanics_red_seal_number_idx ON public.mechanics(red_seal_number) WHERE red_seal_number IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.mechanics.red_seal_certified IS 'Whether mechanic has Red Seal certification';
COMMENT ON COLUMN public.mechanics.red_seal_number IS 'Red Seal certificate number';
COMMENT ON COLUMN public.mechanics.red_seal_province IS 'Province where Red Seal was obtained';
COMMENT ON COLUMN public.mechanics.other_certifications IS 'JSON object containing other certifications (ASE, NOA, manufacturer certs)';
COMMENT ON COLUMN public.mechanics.specializations IS 'Array of specialization areas (brakes, engine, electrical, etc)';
COMMENT ON COLUMN public.mechanics.shop_affiliation IS 'Type of work arrangement (independent, dealership, franchise, mobile)';
COMMENT ON COLUMN public.mechanics.liability_insurance IS 'Whether mechanic has liability insurance';
COMMENT ON COLUMN public.mechanics.criminal_record_check IS 'Whether criminal record check has been completed';
COMMENT ON COLUMN public.mechanics.sin_or_business_number IS 'SIN (for individuals) or Business Number (for incorporated) - encrypted';
COMMENT ON COLUMN public.mechanics.application_status IS 'Current status of mechanic application';
COMMENT ON COLUMN public.mechanics.background_check_status IS 'Status of background verification process';
COMMENT ON COLUMN public.mechanics.application_draft IS 'Stores in-progress application data for auto-save functionality';

-- Create mechanic_documents table for tracking all uploaded documents
CREATE TABLE IF NOT EXISTS public.mechanic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'red_seal_certificate',
    'other_certification',
    'business_license',
    'insurance_certificate',
    'criminal_record_check',
    'id_verification',
    'other'
  )),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  storage_url TEXT, -- Public or signed URL
  description TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT, -- Admin user ID
  verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for mechanic_documents
CREATE INDEX IF NOT EXISTS mechanic_documents_mechanic_id_idx ON public.mechanic_documents(mechanic_id);
CREATE INDEX IF NOT EXISTS mechanic_documents_document_type_idx ON public.mechanic_documents(document_type);
CREATE INDEX IF NOT EXISTS mechanic_documents_verified_idx ON public.mechanic_documents(verified);

-- Add RLS policies for mechanic_documents
ALTER TABLE public.mechanic_documents ENABLE ROW LEVEL SECURITY;

-- Mechanics can view their own documents
CREATE POLICY "Mechanics can view own documents"
  ON public.mechanic_documents
  FOR SELECT
  USING (mechanic_id IN (
    SELECT id FROM public.mechanics WHERE id = mechanic_id
  ));

-- Mechanics can insert their own documents
CREATE POLICY "Mechanics can insert own documents"
  ON public.mechanic_documents
  FOR INSERT
  WITH CHECK (mechanic_id IN (
    SELECT id FROM public.mechanics WHERE id = mechanic_id
  ));

-- Create admin_actions table for audit trail
CREATE TABLE IF NOT EXISTS public.mechanic_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL, -- Admin user identifier
  action_type TEXT NOT NULL CHECK (action_type IN (
    'application_submitted',
    'under_review',
    'approved',
    'rejected',
    'info_requested',
    'document_verified',
    'note_added'
  )),
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create index for admin actions
CREATE INDEX IF NOT EXISTS mechanic_admin_actions_mechanic_id_idx ON public.mechanic_admin_actions(mechanic_id);
CREATE INDEX IF NOT EXISTS mechanic_admin_actions_created_at_idx ON public.mechanic_admin_actions(created_at DESC);

-- Add RLS for admin actions (admin only)
ALTER TABLE public.mechanic_admin_actions ENABLE ROW LEVEL SECURITY;

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_mechanic_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating last_updated
DROP TRIGGER IF EXISTS update_mechanics_last_updated ON public.mechanics;
CREATE TRIGGER update_mechanics_last_updated
  BEFORE UPDATE ON public.mechanics
  FOR EACH ROW
  EXECUTE FUNCTION update_mechanic_last_updated();

-- Add comment for tables
COMMENT ON TABLE public.mechanic_documents IS 'Stores all documents uploaded by mechanics during application process';
COMMENT ON TABLE public.mechanic_admin_actions IS 'Audit trail of all admin actions on mechanic applications';
