-- Add Stripe Connect fields to profiles table for mechanic payouts
-- This enables automatic payout transfers to mechanics after sessions

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups when processing payouts
CREATE INDEX IF NOT EXISTS profiles_stripe_account_id_idx ON public.profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.stripe_account_id IS 'Stripe Connect Express account ID for mechanic payouts';
COMMENT ON COLUMN public.profiles.stripe_onboarding_completed IS 'Whether mechanic completed Stripe Connect onboarding';
COMMENT ON COLUMN public.profiles.stripe_charges_enabled IS 'Whether Stripe account can accept charges';
COMMENT ON COLUMN public.profiles.stripe_payouts_enabled IS 'Whether Stripe account can receive payouts';
COMMENT ON COLUMN public.profiles.stripe_details_submitted IS 'Whether mechanic submitted required details to Stripe';
