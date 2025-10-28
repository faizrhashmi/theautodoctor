import { redirect } from 'next/navigation'

/**
 * Stripe Onboarding Complete Redirect Page
 * Note: Authentication is handled by middleware - /mechanic/* routes require mechanic auth
 * This page simply redirects to the dashboard after Stripe onboarding completes
 */
export default async function StripeOnboardingCompletePage() {
  // Middleware already verified mechanic auth via custom token (aad_mech cookie)
  // Just redirect to dashboard with success flag
  redirect('/mechanic/dashboard?stripe_onboarding=complete')
}
